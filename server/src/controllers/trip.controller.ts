import { Request, Response } from "express";
import Trip from "../models/Trip.model";
import UserPreference from "../models/UserPreference.model";
import { generateTripWithAI } from "../services/ai.service";

/* =========================================================
   GENERATE TRIP (DESTINATION-ONLY, REAL-WORLD SAFE)
========================================================= */
export const generateTrip = async (req: any, res: Response) => {
  try {
    const { destination, days, budgetType, travelers } = req.body;

    /* ================= BASIC VALIDATION ================= */
    if (!destination || !days || !budgetType || !travelers) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    /* ================= DESTINATION VALIDATION ================= */
    const cleanedDestination = destination.trim();

    if (cleanedDestination.length < 2 || cleanedDestination.length > 40) {
      return res.status(400).json({
        success: false,
        message:
          "Please enter a valid travel destination (city or tourist place).",
      });
    }

    // Only letters and spaces allowed
    if (!/^[a-zA-Z\s]+$/.test(cleanedDestination)) {
      return res.status(400).json({
        success: false,
        message:
          "Destination must be a place name only (no numbers or symbols).",
      });
    }

    // Block question / tech keywords
    const blockedKeywords = [
      "what",
      "how",
      "why",
      "explain",
      "define",
      "javascript",
      "python",
      "java",
      "code",
      "programming",
      "tutorial",
    ];

    const lower = cleanedDestination.toLowerCase();

    if (
      blockedKeywords.some((word) => lower.includes(word)) ||
      lower.endsWith("?")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only travel destinations are allowed. Please enter a city or tourist place.",
      });
    }

    /* ================= USER PREFERENCES ================= */
    const preferences = await UserPreference.findOne({
      user: req.user._id,
    });

    const finalBudget = preferences?.budgetRange || budgetType;

    /* ================= COST CALCULATION ================= */
    const baseCostPerDay: Record<string, number> = {
      cheap: 1500,
      moderate: 3500,
      luxury: 8000,
    };

    const travelerMultiplier: Record<string, number> = {
      solo: 1,
      couple: 1.8,
      friends: 2.5,
      family: 3,
    };

    const perDayCost =
      (baseCostPerDay[finalBudget] || 3500) *
      (travelerMultiplier[travelers] || 1);

    const totalCost = Math.round(perDayCost * Number(days));

    /* ================= AI PROMPT (STRICT) ================= */
    const prompt = `
You are a PROFESSIONAL INDIAN TRAVEL PLANNER AI.

CRITICAL RULES:
- Input is ALWAYS a travel destination
- NEVER answer general questions
- NEVER invent airports, stations, or places
- If destination has NO airport:
  Say: "No airport in <destination>. Nearest airport is <name> (~distance km)"
- Use ONLY real-world travel knowledge
- Return ONLY valid JSON
- No markdown
- No explanations

Destination: ${cleanedDestination}
Days: ${days}
Travelers: ${travelers}

Return JSON EXACTLY in this format:

{
  "tripTitle": "",
  "overview": {
    "bestTimeToVisit": "",
    "weatherNote": ""
  },
  "transport": {
    "railwayStation": "",
    "busStation": "",
    "airport": ""
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
      "description": ""
    }
  ],
  "foodRecommendations": [],
  "travelTips": []
}
`;

    const aiText = await generateTripWithAI(prompt);

    if (!aiText) {
      return res.status(500).json({
        success: false,
        message: "AI returned empty response",
      });
    }

    let aiTrip;
    try {
      aiTrip = JSON.parse(aiText);
    } catch {
      return res.status(500).json({
        success: false,
        message: "AI returned invalid JSON",
        raw: aiText,
      });
    }

    /* ================= HOTEL LOGIC ================= */
    let hotelCategory = "";
    let priceRange = "";

    if (finalBudget === "cheap") {
      hotelCategory = "Budget Hotel / Homestay / Dharamshala";
      priceRange = "₹800 – ₹2,000";
    } else if (finalBudget === "moderate") {
      hotelCategory = "3–4 Star Hotel";
      priceRange = "₹3,000 – ₹5,500";
    } else {
      hotelCategory = "Luxury 4–5 Star Hotel";
      priceRange = "₹7,000 – ₹12,000";
    }

    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      cleanedDestination
    )}`;

    /* ================= FINAL RESPONSE ================= */
    return res.status(200).json({
      success: true,
      trip: {
        tripTitle: aiTrip.tripTitle,
        overview: aiTrip.overview,

        transport: aiTrip.transport,

        itinerary: aiTrip.itinerary,
        placesToVisit: aiTrip.placesToVisit,

        hotels: [
          {
            name: `${cleanedDestination} ${hotelCategory}`,
            category: hotelCategory,
            priceRangePerNight: priceRange,
            rating: finalBudget === "luxury" ? "4.5/5" : "4/5",
            bookingUrl,
          },
        ],

        foodRecommendations: aiTrip.foodRecommendations,
        travelTips: aiTrip.travelTips,

        estimatedBudget: {
          perDay: `₹${Math.round(perDayCost)}`,
          total: `₹${totalCost}`,
          note: `Approximate cost for ${travelers} on a ${finalBudget} budget`,
        },
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
   GET MY TRIPS
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
  } catch {
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
  } catch {
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
  } catch {
    return res.status(500).json({
      success: false,
      message: "Failed to delete trip",
    });
  }
};
