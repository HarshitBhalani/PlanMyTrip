import { Request, Response } from "express";
import UserPreference from "../models/UserPreference.model";

/* GET PREFERENCES */
export const getPreferences = async (req: any, res: Response) => {
  const pref = await UserPreference.findOne({ user: req.user._id });

  return res.status(200).json({
    success: true,
    preferences: pref,
  });
};

/* UPDATE / CREATE PREFERENCES */
export const updatePreferences = async (req: any, res: Response) => {
  const data = req.body;

  const pref = await UserPreference.findOneAndUpdate(
    { user: req.user._id },
    { ...data, user: req.user._id },
    { new: true, upsert: true }
  );

  return res.status(200).json({
    success: true,
    message: "Preferences updated",
    preferences: pref,
  });
};
