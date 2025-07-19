import jwt from "jsonwebtoken";

export const signToken = (payload: object) => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: "28d",
  });
};

export const verifyJwt = (token: string) => {
  return jwt.verify(token, process.env.JWT_SECRET!);
};
