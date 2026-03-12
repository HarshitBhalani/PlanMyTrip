import { NextFunction, Request, Response } from "express";

const ALLOWED_BUDGET_TYPES = new Set(["cheap", "moderate", "luxury"]);
const ALLOWED_TRAVELERS = new Set(["solo", "couple", "friends", "family"]);
const MAX_GENERATE_TRIP_BODY_BYTES = 10 * 1024;
const MAX_GENERATE_TRIP_BODY_CHARS = 2000;

export const validateGenerateTripRequest = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const contentLengthHeader = req.headers["content-length"];
  const contentLength = Number(contentLengthHeader);

  if (Number.isFinite(contentLength) && contentLength > MAX_GENERATE_TRIP_BODY_BYTES) {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large",
    });
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({
      success: false,
      message: "Invalid request payload",
    });
  }

  const rawBody = JSON.stringify(req.body);
  if (rawBody.length > MAX_GENERATE_TRIP_BODY_CHARS) {
    return res.status(413).json({
      success: false,
      message: "Request payload is too large",
    });
  }

  const { destination, days, budgetType, travelers } = req.body;

  if (
    typeof destination !== "string" ||
    !destination.trim() ||
    days === undefined ||
    days === null ||
    typeof budgetType !== "string" ||
    typeof travelers !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Missing required fields",
    });
  }

  const parsedDays = Number(days);

  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 30) {
    return res.status(400).json({
      success: false,
      message: "Days must be an integer between 1 and 30",
    });
  }

  if (!ALLOWED_BUDGET_TYPES.has(budgetType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid budget type",
    });
  }

  if (!ALLOWED_TRAVELERS.has(travelers)) {
    return res.status(400).json({
      success: false,
      message: "Invalid travelers value",
    });
  }

  if (destination.trim().length > 80) {
    return res.status(400).json({
      success: false,
      message: "Destination is too long",
    });
  }

  return next();
};
