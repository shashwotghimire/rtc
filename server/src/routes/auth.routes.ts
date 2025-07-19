import { registerUser, login } from "../controllers/auth.controller";
import { Router } from "express";

const router = Router();
router.post("/register", registerUser as any);
router.post("/login", login as any);

export default router;
