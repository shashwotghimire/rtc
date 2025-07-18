import express from "express";
import { json } from "zod";

const app = express();

// middlewares
app.use(express.json());

// routes
app.get("/", (req, res) => {
  res.send("ts + node + express");
});

export default app;
