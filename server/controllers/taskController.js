import prisma from "../configs/prisma.js";
import { inngest } from "../inngest/index.js";

// Create task
export const createTask = async (req, res) => {
    try {

        const { userId } = await req.auth();
        const { projectId, title, description, type, status, priority, assigneeId, due_date } = req.body;
        const origin = req.get('origin');

        // Check if user has admin role for project
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: { include: { user: true } } },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }
        else if (assigneeId && !project.members.find((member) => member.user.id === assigneeId)) {
            return res.status(403).json({ message: "assignee is not a member of the project / workspace" });
        }

        if (!title?.trim() || !assigneeId || !due_date || Number.isNaN(new Date(due_date).getTime())) {
            return res.status(400).json({ message: "Title, assignee and a valid due date are required" });
        }

        const task = await prisma.task.create({
            data: {
                projectId,
                title,
                description,
                type,
                priority,
                assigneeId,
                status,
                due_date: new Date(due_date),
            }
        });

        const taskWithAssignee = await prisma.task.findUnique({
            where: { id: task.id },
            include: { assignee: true },
        });

        // the task is saved either way; a failed email job must not turn this into an error
        try {
            await inngest.send({
                name: "app/task.assigned",
                data: { taskId: task.id, origin },
            });
        } catch (error) {
            console.error("Failed to queue task-assignment email:", error.message);
        }

        res.json({ task: taskWithAssignee, message: "Task created successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};


// Update task
export const updateTask = async (req, res) => {
    try {

        const task = await prisma.task.findUnique({
            where: { id: req.params.id },
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        const { userId } = await req.auth();

        const project = await prisma.project.findUnique({
            where: { id: task.projectId },
            include: { members: { include: { user: true } } },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        // only these fields may be changed; projectId, ids and timestamps are never taken from the client
        const allowed = ["title", "description", "status", "type", "priority", "assigneeId", "due_date"];
        const data = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) data[key] = req.body[key];
        }
        if (data.due_date !== undefined) {
            data.due_date = new Date(data.due_date);
            if (Number.isNaN(data.due_date.getTime())) {
                return res.status(400).json({ message: "Invalid due date" });
            }
        }
        if (data.assigneeId && !project.members.some((member) => member.userId === data.assigneeId)) {
            return res.status(403).json({ message: "assignee is not a member of the project" });
        }

        const updatedTask = await prisma.task.update({
            where: { id: req.params.id },
            data,
        });

        res.json({ message: "Task updated successfully", task: updatedTask });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};

// Delete task
export const deleteTask = async (req, res) => {
    try {

        const { userId } = await req.auth();
        const { tasksIds } = req.body;

        if (!Array.isArray(tasksIds) || tasksIds.length === 0) {
            return res.status(400).json({ message: "tasksIds must be a non-empty array" });
        }

        const tasks = await prisma.task.findMany({
            where: { id: { in: tasksIds } },
        });

        if (tasks.length === 0) {
            return res.status(404).json({ message: "Task not found" });
        }

        // a single request may only delete tasks of one project, so one permission check covers all of them
        if (tasks.some((task) => task.projectId !== tasks[0].projectId)) {
            return res.status(400).json({ message: "All tasks must belong to the same project" });
        }

        const project = await prisma.project.findUnique({
            where: { id: tasks[0].projectId },
            include: { members: { include: { user: true } } },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        } else if (project.team_lead !== userId) {
            return res.status(403).json({ message: "You don't have admin privileges for this project" });
        }

        await prisma.task.deleteMany({
            where: { id: { in: tasksIds }, projectId: project.id },
        });

        res.json({ message: "Task deleted successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.code || error.message });
    }
};