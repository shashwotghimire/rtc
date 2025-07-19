import { Request, Response } from "express";
import prisma from "../prisma/client";
import { hashPassword, comparePassword } from "../utils/hash";
import { signToken } from "../utils/jwt";
export const registerUser = async (req: Request, res: Response) => {
  const { email, password, username } = req.body;
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "email already exists" });
    }
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        username,
      },
    });
    const token = signToken({ id: user.id, email });
    return res.status(201).json({
      user: {
        id: user.id,
        username,
        email,
        avatarUrl: user.avatarUrl,
      },
      token,
    });
  } catch (e) {
    console.error(`server error${e}`);
  }
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: "invalid email or password" });
    }
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(404).json({ error: "invalid email or password" });
    }
    const token = signToken({ id: user.id, email: user.email });
    return res.status(200).json({
      user,
      token,
    });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
};
