import prisma from "../prisma/client";
import { Request, Response } from "express";

interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}
export const getUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: "user not found" });
    }
    return res.status(200).json({
      user: {
        id: userId,
        name: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: "server error" });
  }
};
