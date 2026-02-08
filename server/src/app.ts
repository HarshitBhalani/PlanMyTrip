import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import tripRoutes from "./routes/trip.routes";

import userRoutes from "./routes/user.routes";
dotenv.config();

const app = express();

/* ✅ BODY PARSERS (MUST BE FIRST) */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ✅ CORS */
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://planmytrip-8hkz.onrender.com",
    ],
    credentials: true,
  })
);


/* ✅ HEALTH CHECK */
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PlanMyTrip API is running",
  });
});

app.use("/api/user", userRoutes);

/* ✅ ROUTES */
app.use("/api/auth", authRoutes);
app.use("/api/trip", tripRoutes);

/* ✅ FALLBACK (OPTIONAL – DEBUG HELPER) */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});


export default app;
