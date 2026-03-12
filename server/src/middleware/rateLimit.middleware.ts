import { NextFunction, Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { verifyToken } from "../utils/jwt";

type LimitConfig = {
  max: number;
  windowSec: number;
};

type EnvironmentLimitConfig = {
  burst: LimitConfig;
  user: LimitConfig;
  ip: LimitConfig;
};

const DEFAULT_LIMITS: Record<"development" | "production", EnvironmentLimitConfig> = {
  development: {
    burst: { max: 20, windowSec: 30 },
    user: { max: 100, windowSec: 3600 },
    ip: { max: 50, windowSec: 3600 },
  },
  production: {
    burst: { max: 2, windowSec: 30 },
    user: { max: 10, windowSec: 3600 },
    ip: { max: 5, windowSec: 3600 },
  },
};

const isProduction = process.env.NODE_ENV === "production";
const currentEnvironment = isProduction ? "production" : "development";
const currentPrefix = isProduction ? "PROD" : "DEV";

const readPositiveInteger = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const getLimitConfig = (name: keyof EnvironmentLimitConfig): LimitConfig => {
  const defaults = DEFAULT_LIMITS[currentEnvironment][name];

  return {
    max: readPositiveInteger(`${currentPrefix}_RATE_LIMIT_${name.toUpperCase()}_MAX`, defaults.max),
    windowSec: readPositiveInteger(
      `${currentPrefix}_RATE_LIMIT_${name.toUpperCase()}_WINDOW_SEC`,
      defaults.windowSec
    ),
  };
};

const rateLimitExceeded = (_req: Request, res: Response) => {
  return res.status(429).json({
    success: false,
    error: "Too many requests",
    message:
      "You have exceeded the allowed number of requests. Please try again later.",
  });
};

const getIpKey = (req: Request) => {
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || "unknown");
};

export const attachRateLimitIdentity = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (req.user?._id) {
    return next();
  }

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = await verifyToken(token);

    if (decoded?.userId) {
      req.user = {
        _id: decoded.userId,
      };
    }
  } catch {
    // Ignore token failures here; the auth middleware enforces access later.
  }

  return next();
};

const burstConfig = getLimitConfig("burst");
const userConfig = getLimitConfig("user");
const ipConfig = getLimitConfig("ip");

export const burstRateLimiter = rateLimit({
  windowMs: burstConfig.windowSec * 1000,
  max: burstConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user?._id ? `user:${req.user._id}` : `ip:${getIpKey(req)}`),
  handler: rateLimitExceeded,
});

export const authenticatedUserRateLimiter = rateLimit({
  windowMs: userConfig.windowSec * 1000,
  max: userConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !req.user?._id,
  keyGenerator: (req) => `user:${req.user!._id}`,
  handler: rateLimitExceeded,
});

export const anonymousIpRateLimiter = rateLimit({
  windowMs: ipConfig.windowSec * 1000,
  max: ipConfig.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => Boolean(req.user?._id),
  keyGenerator: (req) => `ip:${getIpKey(req)}`,
  handler: rateLimitExceeded,
});
