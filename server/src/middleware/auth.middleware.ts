import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload extends jwt.JwtPayload {
  id: string;
  email: string;
}
interface AuthRequest extends Request {
  user?: JwtPayload;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer")) {
      return res.status(401).json({ error: "token expired or unauthorized" });
    }
    const token = authHeader.split(" ")[1];
    const decoded = (await jwt.verify(
      token,
      process.env.JWT_SECRET!
    )) as JwtPayload;
    req.user = decoded;
    next();
  } catch (e) {
    console.error(e);
    return res.status(401).json({ error: "token expired or unauthorized" });
  }
};
