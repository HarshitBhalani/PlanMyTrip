import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { getRequestToken } from "../utils/authCookie";

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = getRequestToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    const decoded = await verifyToken(token);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = {
      _id: decoded.userId,
    };

    return next();
  } catch (error) {
    console.error("AUTH MIDDLEWARE ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Authorization failed",
    });
  }
};
