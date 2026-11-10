import { NextFunction, Request, Response } from "express";
import { isValidObjectId } from "mongoose";

/* Reject malformed :id params with 400 instead of letting Mongoose throw a CastError (500). */
export const validateObjectIdParam =
  (param = "id") =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!isValidObjectId(req.params[param])) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip id",
      });
    }

    return next();
  };
