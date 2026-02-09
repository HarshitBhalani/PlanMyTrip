import { Request, Response } from "express";
import Trip from "../models/Trip.model";
import UserPreference from "../models/UserPreference.model";
import { generateTripWithAI } from "../services/ai.service";

/* =========================================================
   GENERATE TRIP (AI + LOGIC-DRIVEN DATA)
========================================================= */
export const generateTrip = async (req: any, res: Response) => {
  try {
    const { destination, days, budgetType, travelers } = req.body;

    if (!destination || !days || !budgetType || !travelers) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    /* =====================================================
       USER PREFERENCES (OPTIONAL)
    ===================================================== */
    const preferences = await UserPreference.findOne({
      user: req.user._id,
    });

    const finalBudget = preferences?.budgetRange || budgetType;

    /* =====================================================
       COST CALCULATION (NO AI GUESSING)
    ===================================================== */
    const baseCostPerDay: Record<string, number> = {
      cheap: 1200,
      moderate: 3000,
      luxury: 7000,
    };

    const travelerMultiplier: Record<string, number> = {
      solo: 1,
      couple: 1.8,
      friends: 2.5,
      family: 3,
    };

    const perDayCost =
      (baseCostPerDay[finalBudget] || 3000) *
      (travelerMultiplier[travelers] || 1);

    const totalCost = Math.round(perDayCost * Number(days));

    /* =====================================================
       TRANSPORT INFO (SHOWN FIRST IN UI)
    ===================================================== */
    const transport = {
      railwayStation: `${destination} Junction Railway Station`,
      busStation: `${destination} Central Bus Stand`,
      airport: `${destination} Airport (nearest available)`,
    };

    /* =====================================================
       HOTEL LOGIC (BASED ON BUDGET + TRAVELERS)
    ===================================================== */
    let hotelCategory = "";
    let priceRange = "";

    if (finalBudget === "cheap") {
      hotelCategory = "Budget Hotel / Homestay";
      priceRange = "₹800 – ₹2,000";
    } else if (finalBudget === "moderate") {
      hotelCategory = "3-Star / 4-Star Hotel";
      priceRange = "₹3,000 – ₹5,500";
    } else {
      hotelCategory = "Luxury 4-Star / 5-Star Hotel";
      priceRange = "₹7,000 – ₹12,000";
    }

    const bookingUrl = `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      destination
    )}`;

    /* =====================================================
       AI PROMPT (ONLY EXPERIENCE CONTENT)
    ===================================================== */
    const prompt = `
You are a professional travel planner.

STRICT RULES:
- Output ONLY valid JSON
- No markdown
- No explanation

Trip Details:
Destination: ${destination}
Days: ${days}
Travelers: ${travelers}

Return JSON in this exact structure:

{
  "tripTitle": "",
  "overview": {
    "bestTimeToVisit": "",
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

    /* =====================================================
       FINAL RESPONSE (UI-READY)
    ===================================================== */
    return res.status(200).json({
      success: true,
      trip: {
        tripTitle: aiTrip.tripTitle,
        overview: aiTrip.overview,

        transport,

        itinerary: aiTrip.itinerary,
        placesToVisit: aiTrip.placesToVisit,

        hotels: [
          {
            name: `${destination} ${hotelCategory}`,
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
          note: `Estimated cost for ${travelers} on a ${finalBudget} budget`,
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
  } catch (error) {
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
    return res.status(500).json({
      success: false,
      message: "Failed to delete trip",
    });
  }
};
