import express, { Request, Response, NextFunction } from "express";
import { identifyContact } from "./identityService";

export const app = express();
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/identify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      res.status(400).json({ error: "need at least email or phoneNumber" });
      return;
    }

    const result = await identifyContact({
      email: email ?? null,
      phoneNumber: phoneNumber ? String(phoneNumber) : null,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "something went wrong" });
});