<div align="center">

# 🗂️ NeatDesk

### Plan projects, assign tasks, and keep your team in sync.

A full-stack team project-management app: workspaces with roles, projects, tasks,
comments, analytics, a calendar, and email reminders that go out automatically when a task is assigned and again on its due date.

[![Live app](https://img.shields.io/badge/▶_Live_app-neat--desk.vercel.app-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://neat-desk.vercel.app/)
[![CI](https://img.shields.io/github/actions/workflow/status/ARYAN10227/NeatDesk/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/ARYAN10227/NeatDesk/actions/workflows/ci.yml)

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-2-764ABC?logo=redux&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![Clerk](https://img.shields.io/badge/Auth-Clerk-6C47FF?logo=clerk&logoColor=white)
![Inngest](https://img.shields.io/badge/Jobs-Inngest-000000)
![License: MIT](https://img.shields.io/badge/license-MIT-green)

<img src="docs/screenshots/dashboard.png" alt="NeatDesk dashboard" width="100%"/>

</div>

---

## ✨ Features

| | |
|---|---|
| 🏢 **Workspaces** | Separate workspaces (Clerk organizations) with **Admin** and **Member** roles; switch between them from the sidebar |
| 📁 **Projects** | Status, priority, start/end dates, progress, a team lead and project members |
| ✅ **Tasks** | Task / Bug / Feature / Improvement types, priorities, assignees, due dates; filter by status, type, priority and assignee; bulk delete |
| 💬 **Comments** | Discuss each task in a thread that refreshes every 10 seconds |
| 📊 **Analytics** | Completion rate, overdue count, and charts of tasks by status, type and priority |
| 📅 **Calendar** | Month view of due dates, plus a list of upcoming tasks |
| 👥 **Team** | Invite people to a workspace by email; see members and their roles |
| 📧 **Email reminders** | When a task is assigned, the assignee gets an email; on the due date, a reminder goes out if the task isn't done (Inngest + Brevo SMTP) |
| 🔄 **Clerk sync** | Clerk webhooks (users, organizations, invitations) keep the PostgreSQL database in step, through Inngest |
| 🌗 **Dark mode** | Theme toggle that's remembered between visits |
| 📱 **Responsive** | Collapsible sidebar; works on phones |

## 🖼️ Screenshots

<table>
<tr>
<td width="50%"><b>Projects</b><br/><img src="docs/screenshots/projects.png" alt="Projects page"/></td>
<td width="50%"><b>Project tasks</b> — filters, inline status changes<br/><img src="docs/screenshots/tasks.png" alt="Project task list"/></td>
</tr>
<tr>
<td width="50%"><b>Analytics</b><br/><img src="docs/screenshots/analytics.png" alt="Project analytics"/></td>
<td width="50%"><b>Calendar</b><br/><img src="docs/screenshots/calendar.png" alt="Project calendar"/></td>
</tr>
<tr>
<td width="50%"><b>Task details & discussion</b><br/><img src="docs/screenshots/task-details.png" alt="Task details with comments"/></td>
<td width="50%"><b>Team</b><br/><img src="docs/screenshots/team.png" alt="Team page"/></td>
</tr>
<tr>
<td width="50%"><b>Dark mode</b><br/><img src="docs/screenshots/dashboard-dark.png" alt="Dashboard in dark mode"/></td>
<td width="50%" align="center"><b>Mobile</b><br/><img src="docs/screenshots/mobile.png" alt="Mobile view" width="45%"/></td>
</tr>
</table>

<sub>Screenshots use sample data.</sub>

## 🧩 Architecture

```mermaid
flowchart LR
    user["👤 User"] --> web["⚛️ React client<br/>Vite · Redux Toolkit · Tailwind<br/>Vercel"]
    web -->|"sign in, workspaces"| clerk["🔐 Clerk"]
    web -->|"REST + Clerk session token"| api["🟢 Express API<br/>@clerk/express auth"]
    api -->|"Prisma (Neon adapter)"| db[("🐘 PostgreSQL<br/>Neon")]
    clerk -->|"webhooks: user / org / invitation"| inngest["⚡ Inngest"]
    api -->|"app/task.assigned"| inngest
    inngest -->|"runs functions at /api/inngest"| api
    api -->|"SMTP"| mail["📧 Brevo<br/>assignment + due-date emails"]
```

**How a request flows**

1. The client gets a session token from Clerk and sends it as `Authorization: Bearer …`.
2. `clerkMiddleware()` verifies it; the `protect` middleware rejects anything without a user (401).
3. Controllers check permissions against the database, never against ids sent by the client:
   only workspace **admins** create projects, the **team lead** manages a project's tasks and members, and only
   **workspace members** can read or post comments.
4. Creating a task emits an `app/task.assigned` event. An Inngest function emails the assignee, sleeps until
   the due date, and sends a reminder if the task still isn't `DONE`.

**Data model** (`server/prisma/schema.prisma`): `User`, `Workspace`, `WorkspaceMember` (ADMIN/MEMBER),
`Project`, `ProjectMember`, `Task`, `Comment`; cascading deletes and unique membership constraints.

## 🛠️ Tech stack

| Layer | Tools |
|---|---|
| **Frontend** | React 19, Vite 7, Tailwind CSS 4, Redux Toolkit, React Router 7, Recharts, date-fns, lucide-react, react-hot-toast, Axios |
| **Backend** | Node.js, Express 5, Prisma 7 with the Neon serverless adapter, PostgreSQL (Neon) |
| **Auth** | Clerk (`@clerk/clerk-react` on the client, `@clerk/express` on the server), organizations as workspaces |
| **Jobs & email** | Inngest (webhook sync, delayed reminders), Nodemailer over Brevo SMTP |
| **Tooling** | ESLint, nodemon, GitHub Actions CI, Vercel |

## 🚀 Run locally

**Prerequisites:** Node.js 20+, a [Neon](https://neon.tech) (or any PostgreSQL) database, a [Clerk](https://clerk.com) app
with **Organizations** enabled, and optionally [Inngest](https://www.inngest.com) and Brevo SMTP for emails.

```sh
git clone https://github.com/ARYAN10227/NeatDesk.git
cd NeatDesk

# 1. API
cd server
npm install
cp .env.example .env        # fill in DATABASE_URL, Clerk keys, Inngest and SMTP
npx prisma generate
npx prisma db push          # create the tables
npm run server              # → http://localhost:5000

# 2. Inngest dev server (second terminal, optional — needed for webhooks and emails)
npx inngest-cli@latest dev -u http://localhost:5000/api/inngest

# 3. Client (third terminal)
cd client
npm install
cp .env.example .env        # VITE_CLERK_PUBLISHABLE_KEY, VITE_BASEURL=http://localhost:5000
npm run dev                 # → http://localhost:5173
```

> Users and workspaces reach the database through Clerk webhooks, so in Clerk add a webhook that points to your
> Inngest endpoint (Inngest → *Integrations → Clerk*) for `user.*`, `organization.*` and `organizationInvitation.accepted`.

### Environment variables

| Where | Variable | Purpose |
|---|---|---|
| client | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| client | `VITE_BASEURL` | Base URL of the API, e.g. `http://localhost:5000` |
| client | `VITE_DEMO_EMAIL`, `VITE_DEMO_PASSWORD` | Optional: show a one-click demo sign-in card |
| server | `DATABASE_URL` | Neon / PostgreSQL connection string |
| server | `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Verify Clerk session tokens |
| server | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Send events / secure the Inngest endpoint (production) |
| server | `SMTP_USER`, `SMTP_PASS`, `SENDER_EMAIL` | Brevo SMTP for task emails |
| server | `PORT` | Defaults to `5000` |

### Scripts

| | Script | What it does |
|---|---|---|
| client | `npm run dev` / `build` / `preview` / `lint` | Vite dev server, production build, preview, ESLint |
| server | `npm run server` | API with auto-reload (nodemon) |
| server | `npm start` | API in production mode |
| server | `npm run generate` / `db:push` | Generate the Prisma client / sync the schema to the database |
| server | `npm run check` | Syntax-check every server file (used in CI) |

## 📡 API

All routes except `/`, `/health` and `/api/inngest` need a Clerk session token.

| Method | Route | Who | Description |
|---|---|---|---|
| `GET` | `/api/workspaces` | member | Your workspaces, with members, projects, tasks and comments |
| `POST` | `/api/projects` | workspace admin | Create a project (optional team lead and members by email) |
| `PUT` | `/api/projects` | admin or team lead | Update a project |
| `POST` | `/api/projects/:projectId/addMember` | team lead | Add a workspace member to the project |
| `POST` | `/api/tasks` | team lead | Create a task and queue the assignment email |
| `PUT` | `/api/tasks/:id` | team lead | Update a task's title, description, status, type, priority, assignee or due date |
| `POST` | `/api/tasks/delete` | team lead | Delete several tasks of one project (`{ tasksIds: [...] }`) |
| `POST` | `/api/comments` | project member | Comment on a task |
| `GET` | `/api/comments/:taskId` | workspace member | A task's comments, oldest first |
| `GET` | `/health` | public | Health check |

## 📁 Project structure

```
NeatDesk/
├── client/                  React app (deployed to Vercel)
│   ├── src/
│   │   ├── pages/           Dashboard, Projects, ProjectDetails, TaskDetails, Team, Layout
│   │   ├── components/      Sidebar, Navbar, dialogs, task table, analytics, calendar, DemoSignIn …
│   │   ├── features/        Redux slices (workspace, theme)
│   │   ├── config/api.js    Axios instance (VITE_BASEURL)
│   │   └── app/store.js     Redux store
│   └── vercel.json          SPA rewrites so deep links survive a refresh
├── server/                  Express API
│   ├── controllers/         workspace, project, task, comment
│   ├── routes/              route definitions
│   ├── middlewares/         protect (Clerk auth)
│   ├── inngest/             Clerk sync + task email functions
│   ├── configs/             Prisma client, Nodemailer
│   └── prisma/              schema.prisma
├── docs/screenshots/
└── .github/workflows/ci.yml
```

## 🌐 Deployment

- **Client:** Vercel, root directory `client`; `vercel.json` rewrites every path to `index.html`.
  Set `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_BASEURL` in the Vercel project.
- **API:** any Node host. Set the server variables above and make sure `prisma generate` runs at build time.
- **Inngest:** register the deployed `/api/inngest` URL in the Inngest dashboard.
- **CI:** every push and pull request lints and builds the client and validates the server (GitHub Actions).

## 🙏 Credits

The UI is based on [GreatStackDev/project-management](https://github.com/GreatStackDev/project-management) (MIT).
NeatDesk extends it with a one-click demo sign-in, stricter server-side permission checks, retry-safe Clerk sync,
input validation, bug fixes, CI and documentation. See [LICENSE](LICENSE).

---

<div align="center">

### 👋 Built by Aryan Raj

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ARYAN10227)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/aryan-raj-2b3868340)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:aryanrajpersonal12@gmail.com)

⭐ If you like this project, consider giving it a star!

</div>
