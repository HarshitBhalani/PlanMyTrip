import { Request, Response } from "express";
import UserPreference from "../models/UserPreference.model";
import { normalizePreferencePayload } from "./trip.controller";

/* GET PREFERENCES */
export const getPreferences = async (req: Request, res: Response) => {
  try {
    const pref = await UserPreference.findOne({ user: req.user!._id });

    return res.status(200).json({
      success: true,
      preferences: pref,
    });
  } catch (error) {
    console.error("GET PREFERENCES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch preferences",
    });
  }
};

/* UPDATE / CREATE PREFERENCES */
export const updatePreferences = async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid preferences payload",
      });
    }

    // Whitelist: only known preference fields with allowed values are stored.
    const preferences = normalizePreferencePayload(req.body);

    const pref = await UserPreference.findOneAndUpdate(
      { user: req.user!._id },
      { $set: { ...preferences, user: req.user!._id } },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Preferences updated",
      preferences: pref,
    });
  } catch (error) {
    console.error("UPDATE PREFERENCES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update preferences",
    });
  }
};
