import { Inngest } from "inngest";
import prisma from "../configs/prisma.js";
import sendEmail from "../configs/nodemailer.js";

// Create a client to send and receive events
export const inngest = new Inngest({ id: "NeatDesk" });

// Clerk sends null for a missing first or last name; avoid names like "Aryan null"
const fullName = (data) => [data?.first_name, data?.last_name].filter(Boolean).join(" ") || data?.username || "User";

// Inngest Function to save user data to a database
const syncUserCreation = inngest.createFunction({ id: "sync-user-from-clerk", triggers: { event: "clerk/user.created" } }, async ({ event }) => {
    const { data } = event;
    // upsert so a retried webhook doesn't fail on the unique id
    const user = {
        email: data?.email_addresses?.[0]?.email_address,
        name: fullName(data),
        image: data?.image_url || "",
    };
    await prisma.user.upsert({
        where: { id: data.id },
        create: { id: data.id, ...user },
        update: user,
    });
});

// Inngest Function to delete user from database
const syncUserDeletion = inngest.createFunction({ id: "delete-user-with-clerk", triggers: { event: "clerk/user.deleted" } }, async ({ event }) => {
    const { data } = event;

    // deleteMany: no error if the user was never synced or is already gone
    await prisma.user.deleteMany({
        where: {
            id: data.id,
        },
    });
});

// Inngest Function to update user data in database
const syncUserUpdation = inngest.createFunction({ id: "update-user-from-clerk", triggers: { event: "clerk/user.updated" } }, async ({ event }) => {
    const { data } = event;
    await prisma.user.update({
        where: {
            id: data.id,
        },
        data: {
            email: data?.email_addresses?.[0]?.email_address,
            name: fullName(data),
            image: data?.image_url || "",
        },
    });
});

// Inngest Function to save workspace data to a database
const syncWorkspaceCreation = inngest.createFunction({ id: "sync-workspace-from-clerk", triggers: { event: "clerk/organization.created" } }, async ({ event }) => {
    const { data } = event;
    const workspace = { name: data.name, slug: data.slug, image_url: data.image_url || "" };
    await prisma.workspace.upsert({
        where: { id: data.id },
        create: { id: data.id, ownerId: data.created_by, ...workspace },
        update: workspace,
    });

    // Add creator as ADMIN member
    await prisma.workspaceMember.upsert({
        where: { userId_workspaceId: { userId: data.created_by, workspaceId: data.id } },
        create: { userId: data.created_by, workspaceId: data.id, role: "ADMIN" },
        update: { role: "ADMIN" },
    });
});

// Inngest Function to update workspace data in database
const syncWorkspaceUpdation = inngest.createFunction({ id: "update-workspace-from-clerk", triggers: { event: "clerk/organization.updated" } }, async ({ event }) => {
    const { data } = event;
    await prisma.workspace.update({
        where: {
            id: data.id,
        },
        data: {
            name: data.name,
            slug: data.slug,
            image_url: data.image_url || "",
        },
    });
});

const syncWorkspaceDeletion = inngest.createFunction({ id: "delete-workspace-with-clerk", triggers: { event: "clerk/organization.deleted" } }, async ({ event }) => {
    const { data } = event;
    await prisma.workspace.deleteMany({
        where: {
            id: data.id,
        },
    });
});

// Inngest Function to save workspace member data to a database
const syncWorkspaceMemberCreation = inngest.createFunction({ id: "sync-workspace-member-from-clerk", triggers: { event: "clerk/organizationInvitation.accepted" } }, async ({ event }) => {
    const { data } = event;
    // Clerk role names look like "org:admin" / "org:member" (or "Admin" / "Member")
    const role = String(data.role_name || data.role || "").toLowerCase().includes("admin") ? "ADMIN" : "MEMBER";
    await prisma.workspaceMember.upsert({
        where: { userId_workspaceId: { userId: data.user_id, workspaceId: data.organization_id } },
        create: { userId: data.user_id, workspaceId: data.organization_id, role },
        update: { role },
    });
});

const taskEmail = (task, origin, heading) => `
    <div style="max-width: 600px;">
    <h2>Hi ${task.assignee.name}, 👋</h2>

    <p style="font-size: 16px;">${heading}</p>
    <p style="font-size: 18px; font-weight: bold; color: #007bff; margin: 8px 0;">${task.title}</p>

    <div style="border: 1px solid #ddd; padding: 12px 16px; border-radius: 6px; margin-bottom: 30px;">
        <p style="margin: 6px 0;"><strong>Description:</strong> ${task.description || "—"}</p>
        <p style="margin: 6px 0;"><strong>Due Date:</strong> ${new Date(task.due_date).toLocaleDateString()}</p>
    </div>

    <a href="${origin || ""}" style="background-color: #007bff; padding: 12px 24px; border-radius: 5px; color: #fff; font-weight: 600; font-size: 16px; text-decoration: none;">
        View Task
    </a>

    <p style="margin-top: 20px; font-size: 14px; color: #6c757d;">
        Please make sure to review and complete it before the due date.
    </p>
    </div>
`;

const findTask = (taskId) =>
    prisma.task.findUnique({
        where: { id: taskId },
        include: { assignee: true, project: true },
    });

// Email the assignee when a task is created, then remind them on the due date if it isn't done
const sendTaskAssignmentEmail = inngest.createFunction({ id: "send-task-assignment-mail", triggers: { event: "app/task.assigned" } }, async ({ event, step }) => {
    const { taskId, origin } = event.data;

    const sent = await step.run("send-assignment-mail", async () => {
        const task = await findTask(taskId);
        if (!task) return false; // deleted before the job ran

        await sendEmail({
            to: task.assignee.email,
            subject: `New Task Assignment in ${task.project.name}`,
            body: taskEmail(task, origin, "You've been assigned a new task:"),
        });
        return { dueDate: task.due_date };
    });

    if (!sent) return;

    const dueDate = new Date(sent.dueDate);
    if (dueDate.toDateString() === new Date().toDateString() || dueDate < new Date()) return;

    await step.sleepUntil("wait-for-the-due-date", dueDate);

    // steps can't be nested in Inngest, so the check and the reminder are one step
    await step.run("send-reminder-if-not-done", async () => {
        const task = await findTask(taskId);
        if (!task || task.status === "DONE") return;

        await sendEmail({
            to: task.assignee.email,
            subject: `Reminder for ${task.project.name}`,
            body: taskEmail(task, origin, `You have a task due in ${task.project.name}:`),
        });
    });
});

// All Inngest functions served at /api/inngest
export const functions = [syncUserCreation, syncUserDeletion, syncUserUpdation, syncWorkspaceCreation, syncWorkspaceUpdation, syncWorkspaceDeletion, syncWorkspaceMemberCreation, sendTaskAssignmentEmail];