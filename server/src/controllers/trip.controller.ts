import { Request, Response } from "express";
import Trip from "../models/Trip.model";
import UserPreference from "../models/UserPreference.model";
import { generateTripWithAI } from "../services/ai.service";

/* =========================================================
   GENERATE TRIP (AI + USER PREFERENCES)
========================================================= */
export const generateTrip = async (req: any, res: Response) => {
  try {
    const { destination, days, budgetType, travelers } = req.body || {};

    if (!destination || !days || !budgetType || !travelers) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    /* 🔹 FETCH USER PREFERENCES (PHASE 5) */
    const preferences = await UserPreference.findOne({
      user: req.user._id,
    });

    const finalBudget = preferences?.budgetRange || budgetType;
    const hotelType = preferences?.hotelType || "budget";
    const travelPace = preferences?.travelPace || "balanced";
    const foodPreference = preferences?.foodPreference || "both";
    const transportPreference =
      preferences?.transportPreference || "mixed";

    /* 🔹 SMART AI PROMPT */
    const prompt = `
You are a professional travel planner AI.

STRICT RULES:
- Return ONLY valid JSON
- No markdown
- No explanation
- No extra text

Trip details:
Destination: ${destination}
Number of days: ${days}
Travelers: ${travelers}

User Preferences:
Budget level: ${finalBudget}
Hotel type: ${hotelType}
Travel pace: ${travelPace}
Food preference: ${foodPreference}
Transport preference: ${transportPreference}

Return JSON in this EXACT format:

{
  "tripTitle": "",
  "overview": {
    "bestTimeToVisit": "",
    "estimatedBudget": "",
    "weatherNote": ""
  },
  "itinerary": [
    {
      "day": 1,
      "morning": "",
      "afternoon": "",
      "evening": "",
      "localTravelTip": ""
    }
  ],
  "placesToVisit": [
    {
      "name": "",
      "description": "",
      "recommendedTime": ""
    }
  ],
  "hotels": [
    {
      "name": "",
      "area": "",
      "priceRangePerNight": "",
      "rating": "",
      "bookingUrl": ""
    }
  ],
  "foodRecommendations": [""],
  "travelTips": [""]
}
`;

    const aiText = await generateTripWithAI(prompt);

    if (!aiText) {
      return res.status(500).json({
        success: false,
        message: "AI returned empty response",
      });
    }

    let tripData;
    try {
      tripData = JSON.parse(aiText);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "AI returned invalid JSON",
        raw: aiText,
      });
    }

    return res.status(200).json({
      success: true,
      trip: tripData,
      preferencesUsed: {
        budget: finalBudget,
        hotelType,
        travelPace,
        foodPreference,
        transportPreference,
      },
    });
  } catch (error) {
    console.error("TRIP GENERATION ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Trip generation failed",
    });
  }
};

/* =========================================================
   SAVE TRIP
========================================================= */
export const saveTrip = async (req: any, res: Response) => {
  try {
    const { destination, days, budgetType, travelers, tripData } = req.body;

    if (!destination || !days || !budgetType || !travelers || !tripData) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const trip = await Trip.create({
      user: req.user._id,
      destination,
      days,
      budgetType,
      travelers,
      tripData,
    });

    return res.status(201).json({
      success: true,
      message: "Trip saved successfully",
      trip,
    });
  } catch (error) {
    console.error("SAVE TRIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save trip",
    });
  }
};

/* =========================================================
   GET MY TRIPS (DASHBOARD)
========================================================= */
export const getMyTrips = async (req: any, res: Response) => {
  try {
    const trips = await Trip.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      trips,
    });
  } catch (error) {
    console.error("GET MY TRIPS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trips",
    });
  }
};

/* =========================================================
   GET SINGLE TRIP
========================================================= */
export const getTripById = async (req: any, res: Response) => {
  try {
    const trip = await Trip.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      trip,
    });
  } catch (error) {
    console.error("GET TRIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch trip",
    });
  }
};

/* =========================================================
   DELETE TRIP
========================================================= */
export const deleteTrip = async (req: any, res: Response) => {
  try {
    const deleted = await Trip.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trip deleted successfully",
    });
  } catch (error) {
    console.error("DELETE TRIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete trip",
    });
  }
};
