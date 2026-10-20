import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js"
import workspaceRouter from "./routes/workspaceRoutes.js";
import { protect } from './middlewares/authMiddleware.js';
import taskRouter from "./routes/taskRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import commentRouter from "./routes/commentRoutes.js";

const app = express();

app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

app.get('/', (req, res) => res.send('Server is live!'));
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.use("/api/inngest", serve({ client: inngest, functions }));

// Routes
app.use("/api/workspaces", protect, workspaceRouter);
app.use("/api/projects", protect, projectRouter);
app.use("/api/tasks", protect, taskRouter);
app.use("/api/comments", protect, commentRouter);

// Unknown API routes
app.use("/api", (req, res) => res.status(404).json({ message: "Route not found" }));

// Malformed JSON and any other unhandled error: answer with JSON instead of an HTML stack trace
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON body" });
    }
    console.error(err);
    res.status(err.status || 500).json({ message: err.status ? err.message : "Internal server error" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
