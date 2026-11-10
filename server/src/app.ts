import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import tripRoutes from "./routes/trip.routes";

import userRoutes from "./routes/user.routes";
dotenv.config();

const app = express();
// Number of proxy hops in front of the app (Render = 1; + Next.js/Vercel rewrite proxy = 2).
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS) || 1);
app.disable("x-powered-by");

const allowedOrigins = Array.from(
  new Set(
    [
      "http://localhost:3000",
      "https://plan-my-trip-iota.vercel.app", // ⬅️VERCEL DOMAIN
      ...(process.env.CLIENT_URL || "").split(","),
    ]
      .map((origin) => origin.trim().replace(/\/+$/, ""))
      .filter(Boolean)
  )
);

/* ✅ BASIC SECURITY HEADERS */
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  }
  next();
});

/* ✅ BODY PARSERS (MUST BE FIRST) */
app.use(express.json({ limit: "300kb" }));
app.use(express.urlencoded({ extended: false, limit: "50kb" }));

/* ✅ CORS */
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
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

/* ✅ GLOBAL ERROR HANDLER (bad JSON, payload too large, unexpected errors) */
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    if (err?.type === "entity.parse.failed") {
      return res.status(400).json({ success: false, message: "Invalid JSON body" });
    }

    if (err?.type === "entity.too.large") {
      return res.status(413).json({ success: false, message: "Request payload is too large" });
    }

    console.error("UNHANDLED ERROR:", err);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
);

export default app;
