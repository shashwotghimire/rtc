import express from "express";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
const app = express();

// middlewares
app.use(express.json());

// routes

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);

export default app;
