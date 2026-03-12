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

  const {
    destination,
    secondDestination,
    thirdDestination,
    days,
    budgetType,
    travelers,
    adults,
    children,
  } =
    req.body;

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

  const parsedAdults = adults === undefined || adults === null || adults === "" ? 0 : Number(adults);
  const parsedChildren =
    children === undefined || children === null || children === "" ? 0 : Number(children);

  if ((travelers === "family" || travelers === "friends")) {
    const minAdults = travelers === "family" ? 4 : 8;
    const maxAdults = travelers === "family" ? 7 : 15;

    if (!Number.isInteger(parsedAdults) || parsedAdults < minAdults || parsedAdults > maxAdults) {
      return res.status(400).json({
        success: false,
        message: `Adults must be an integer between ${minAdults} and ${maxAdults}`,
      });
    }

    if (!Number.isInteger(parsedChildren) || parsedChildren < 0) {
      return res.status(400).json({
        success: false,
        message: "Children must be an integer greater than or equal to 0",
      });
    }
  }

  const optionalDestinations = [secondDestination, thirdDestination].filter(
    (value) => value !== undefined && value !== null && value !== ""
  );

  const validatedDestinations = [primaryDestinationValidation.cleanedValue!];

  for (const optionalDestination of optionalDestinations) {
    const validation = validateDestinationName(
      optionalDestination,
      "Please enter a destination"
    );

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    if (
      validatedDestinations.some((destinationName) =>
        areSameDestination(destinationName, validation.cleanedValue!)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Destination already added",
      });
    }

    validatedDestinations.push(validation.cleanedValue!);
  }

  if (thirdDestination && !secondDestination) {
    return res.status(400).json({
      success: false,
      message: "Add the second destination before adding a third one",
    });
  }

  return next();
};
