import { NextFunction, Request, Response } from "express";
import {
  areSameDestination,
  validateDestinationName,
} from "../utils/destination";

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

  const { destination, secondDestination, days, budgetType, travelers } = req.body;

  if (
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

  const primaryDestinationValidation = validateDestinationName(destination);

  if (!primaryDestinationValidation.isValid) {
    return res.status(400).json({
      success: false,
      message: primaryDestinationValidation.message,
    });
  }

  const parsedDays = Number(days);

  if (!Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 15) {
    return res.status(400).json({
      success: false,
      message: "Days must be an integer between 1 and 15",
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

  if (secondDestination !== undefined && secondDestination !== null && secondDestination !== "") {
    const secondDestinationValidation = validateDestinationName(
      secondDestination,
      "Please enter a destination"
    );

    if (!secondDestinationValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: secondDestinationValidation.message,
      });
    }

    if (
      areSameDestination(
        primaryDestinationValidation.cleanedValue!,
        secondDestinationValidation.cleanedValue!
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Second destination cannot be the same as the first destination",
      });
    }
  }

  return next();
};
