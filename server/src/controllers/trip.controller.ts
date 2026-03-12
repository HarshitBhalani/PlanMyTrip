import { Request, Response } from "express";
import Trip from "../models/Trip.model";
import UserPreference from "../models/UserPreference.model";
import { generateTripWithAI } from "../services/ai.service";
import {
  areSameDestination,
  normalizeDestination,
  validateDestinationName,
} from "../utils/destination";
import {
  estimateTravelBetweenDestinations,
  TravelEstimate,
} from "../utils/distance";

const sanitizeTripData = (tripData: any) => {
  if (!tripData || typeof tripData !== "object") {
    return tripData;
  }

  if (!Array.isArray(tripData.hotels)) {
    return tripData;
  }

  const hotels = tripData.hotels.map((hotel: any) => {
    if (!hotel || typeof hotel !== "object") {
      return hotel;
    }

    const { rating, ...hotelWithoutRating } = hotel;
    return hotelWithoutRating;
  });

  return {
    ...tripData,
    hotels,
  };
};

const normalizeHighlights = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const normalizeItinerary = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item: any, index) => ({
    day: Number(item?.day) || index + 1,
    phaseType: item?.phaseType === "travel" ? "travel" : "destination",
    phaseTitle:
      typeof item?.phaseTitle === "string" && item.phaseTitle.trim()
        ? item.phaseTitle.trim()
        : `Day ${index + 1}`,
    destination:
      typeof item?.destination === "string" && item.destination.trim()
        ? item.destination.trim()
        : "",
    morning: typeof item?.morning === "string" ? item.morning.trim() : "",
    afternoon: typeof item?.afternoon === "string" ? item.afternoon.trim() : "",
    evening: typeof item?.evening === "string" ? item.evening.trim() : "",
    localTravelTip:
      typeof item?.localTravelTip === "string" ? item.localTravelTip.trim() : "",
  }));
};

const normalizeRecommendationList = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      return {
        destination:
          typeof item.destination === "string" ? item.destination.trim() : "",
        name: typeof item.name === "string" ? item.name.trim() : "",
        description:
          typeof item.description === "string" ? item.description.trim() : "",
      };
    })
    .filter(Boolean);
};

const normalizePlacesToVisit = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item: any) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      return {
        destination:
          typeof item.destination === "string" ? item.destination.trim() : "",
        name: typeof item.name === "string" ? item.name.trim() : "",
        description:
          typeof item.description === "string" ? item.description.trim() : "",
      };
    })
    .filter(Boolean);
};

const normalizeTravelTips = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const normalizeItineraryLength = (
  itinerary: ReturnType<typeof normalizeItinerary>,
  requestedDays: number,
  fallbackDestination: string
) => {
  const normalized = itinerary.slice(0, requestedDays).map((day, index) => ({
    ...day,
    day: index + 1,
  }));

  while (normalized.length < requestedDays) {
    const nextDayNumber = normalized.length + 1;
    const previousDay = normalized[normalized.length - 1];

    normalized.push({
      day: nextDayNumber,
      phaseType: previousDay?.phaseType || "destination",
      phaseTitle:
        previousDay?.phaseTitle ||
        `${fallbackDestination} Stay`,
      destination: previousDay?.destination || fallbackDestination,
      morning: "Continue local sightseeing and relaxed family-friendly activities.",
      afternoon: "Explore nearby highlights and enjoy a balanced outing.",
      evening: "Keep the evening light with local food and rest.",
      localTravelTip: "Keep enough buffer time and follow the local pace.",
    });
  }

  return normalized;
};

const normalizeDestinations = (
  value: unknown,
  fallbackDestinations: string[]
) => {
  if (!Array.isArray(value) || !value.length) {
    return fallbackDestinations.map((destination) => ({
      name: destination,
      stayDays: "",
      summary: "",
      highlights: [],
    }));
  }

  return value
    .map((item: any, index) => {
      const fallbackName = fallbackDestinations[index] || "";

      return {
        name:
          typeof item?.name === "string" && item.name.trim()
            ? item.name.trim()
            : fallbackName,
        stayDays:
          typeof item?.stayDays === "string" ? item.stayDays.trim() : "",
        summary:
          typeof item?.summary === "string" ? item.summary.trim() : "",
        highlights: normalizeHighlights(item?.highlights),
      };
    })
    .filter((item) => item.name);
};

const normalizeTravelSegment = (
  travelSegment: any,
  fallbackTravelEstimate: TravelEstimate | null
) => {
  if (!travelSegment || typeof travelSegment !== "object") {
    return fallbackTravelEstimate;
  }

  const distanceKm =
    Number.isFinite(Number(travelSegment.distanceKm)) &&
    Number(travelSegment.distanceKm) > 0
      ? Math.round(Number(travelSegment.distanceKm))
      : fallbackTravelEstimate?.distanceKm || 0;
  const durationMinutes =
    Number.isFinite(Number(travelSegment.durationMinutes)) &&
    Number(travelSegment.durationMinutes) > 0
      ? Math.round(Number(travelSegment.durationMinutes))
      : fallbackTravelEstimate?.durationMinutes || 0;

  return {
    from:
      typeof travelSegment.from === "string" && travelSegment.from.trim()
        ? travelSegment.from.trim()
        : fallbackTravelEstimate?.from || "",
    to:
      typeof travelSegment.to === "string" && travelSegment.to.trim()
        ? travelSegment.to.trim()
        : fallbackTravelEstimate?.to || "",
    distanceKm,
    distanceText:
      typeof travelSegment.distanceText === "string" && travelSegment.distanceText.trim()
        ? travelSegment.distanceText.trim()
        : fallbackTravelEstimate?.distanceText || (distanceKm ? `${distanceKm} km` : ""),
    durationMinutes,
    durationText:
      typeof travelSegment.durationText === "string" && travelSegment.durationText.trim()
        ? travelSegment.durationText.trim()
        : fallbackTravelEstimate?.durationText || "",
    summary:
      typeof travelSegment.summary === "string" ? travelSegment.summary.trim() : "",
    recommendedBus:
      typeof travelSegment.recommendedBus === "string"
        ? travelSegment.recommendedBus.trim()
        : "",
    recommendedRailway:
      typeof travelSegment.recommendedRailway === "string"
        ? travelSegment.recommendedRailway.trim()
        : "",
    recommendedAirport:
      typeof travelSegment.recommendedAirport === "string"
        ? travelSegment.recommendedAirport.trim()
        : "",
  };
};

const buildBalancedDayPlan = (days: number) => {
  if (days <= 2) {
    return {
      firstDestinationDays: 1,
      secondDestinationDays: Math.max(days - 1, 1),
    };
  }

  const firstDestinationDays = Math.max(2, Math.floor(days / 2));
  return {
    firstDestinationDays,
    secondDestinationDays: Math.max(days - firstDestinationDays, 1),
  };
};

const buildTravelRecommendations = (
  destination: string,
  secondDestination: string,
  travelEstimate: TravelEstimate | null
) => {
  const distanceText = travelEstimate?.distanceText || "distance varies by route";

  return {
    recommendedBus: `Road transfer or intercity bus from ${destination} to ${secondDestination} for approximately ${distanceText}.`,
    recommendedRailway: `Check the nearest major railway stations for ${destination} and ${secondDestination}; rail may require a short road transfer at one or both ends.`,
    recommendedAirport: `Air travel is only worth considering if nearby regional airports save time; compare total airport transfer time before choosing flights.`,
  };
};

const buildHotelOptions = (
  destinations: string[],
  hotelCategory: string,
  priceRange: string
) =>
  destinations.map((destination) => ({
    name: `${destination} ${hotelCategory}`,
    category: hotelCategory,
    priceRangePerNight: priceRange,
    bookingUrl: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
      destination
    )}`,
  }));

const buildPrompt = ({
  destination,
  secondDestination,
  days,
  travelers,
  travelEstimate,
}: {
  destination: string;
  secondDestination?: string;
  days: number;
  travelers: string;
  travelEstimate: TravelEstimate | null;
}) => {
  const balancedDayPlan = secondDestination
    ? buildBalancedDayPlan(days)
    : null;

  return `
You are a PROFESSIONAL INDIAN TRAVEL PLANNER AI.

CRITICAL RULES:
- Input is ALWAYS travel destinations
- NEVER answer general questions
- NEVER invent places, transit points, temples, or attractions
- Use ONLY real-world travel knowledge
- Return ONLY valid JSON
- No markdown
- No explanations
- The itinerary day count must be EXACTLY ${days}
- If there are two destinations, create ONE combined ${days}-day itinerary
- If there are two destinations, distribute the ${days} days intelligently across both destinations
- If there are two destinations, include a clear travel phase between the two destination phases
- For two destinations, keep the split balanced and practical for families and moderate budgets
- For two destinations, plan roughly ${balancedDayPlan?.firstDestinationDays || ""} days in ${destination}, then one travel transition, then ${balancedDayPlan?.secondDestinationDays || ""} days in ${secondDestination || ""}
- The second destination must receive the same recommendation quality as the first destination
- Every itinerary item must include: day, phaseType, phaseTitle, destination, morning, afternoon, evening, localTravelTip
- phaseType must be either "destination" or "travel"
- The travel phase must mention approximate distance and practical travel mode guidance
- Do not create extra days beyond the total count

Trip Input:
- Destination 1: ${destination}
- Destination 2: ${secondDestination || "None"}
- Total Days: ${days}
- Travelers: ${travelers}
- Travel Distance: ${travelEstimate?.distanceText || "Unavailable"}
- Travel Duration: ${travelEstimate?.durationText || "Unavailable"}

Return JSON EXACTLY in this format:
{
  "tripTitle": "",
  "overview": {
    "bestTimeToVisit": "",
    "weatherNote": "",
    "routeSummary": ""
  },
  "transport": {
    "railwayStation": "",
    "busStation": "",
    "airport": ""
  },
  "destinations": [
    {
      "name": "",
      "stayDays": "",
      "summary": "",
      "highlights": []
    }
  ],
  "travelSegment": {
    "from": "",
    "to": "",
    "distanceKm": 0,
    "distanceText": "",
    "durationMinutes": 0,
    "durationText": "",
    "summary": "",
    "recommendedBus": "",
    "recommendedRailway": "",
    "recommendedAirport": ""
  },
  "itinerary": [
    {
      "day": 1,
      "phaseType": "destination",
      "phaseTitle": "",
      "destination": "",
      "morning": "",
      "afternoon": "",
      "evening": "",
      "localTravelTip": ""
    }
  ],
  "placesToVisit": [
    {
      "destination": "",
      "name": "",
      "description": ""
    }
  ],
  "foodRecommendations": [
    {
      "destination": "",
      "name": "",
      "description": ""
    }
  ],
  "travelTips": []
}
`;
};

export const previewTripDistance = async (req: Request, res: Response) => {
  try {
    const { destination, secondDestination } = req.body;

    const firstDestinationValidation = validateDestinationName(destination);
    if (!firstDestinationValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: firstDestinationValidation.message,
      });
    }

    const secondDestinationValidation = validateDestinationName(secondDestination);
    if (!secondDestinationValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: secondDestinationValidation.message,
      });
    }

    if (
      areSameDestination(
        firstDestinationValidation.cleanedValue!,
        secondDestinationValidation.cleanedValue!
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Second destination cannot be the same as the first destination",
      });
    }

    const travelEstimate = await estimateTravelBetweenDestinations(
      firstDestinationValidation.cleanedValue!,
      secondDestinationValidation.cleanedValue!
    );

    if (!travelEstimate) {
      return res.status(200).json({
        success: false,
        message: "Unable to calculate travel distance right now",
      });
    }

    return res.status(200).json({
      success: true,
      travel: travelEstimate,
    });
  } catch (error) {
    console.error("TRAVEL DISTANCE PREVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to calculate travel distance right now",
    });
  }
};

/* =========================================================
   GENERATE TRIP
========================================================= */
export const generateTrip = async (req: any, res: Response) => {
  try {
    const { destination, secondDestination, days, budgetType, travelers } = req.body;
    const cleanedDestination = normalizeDestination(destination);
    const cleanedSecondDestination =
      typeof secondDestination === "string" && secondDestination.trim()
        ? normalizeDestination(secondDestination)
        : "";
    const hasSecondDestination = Boolean(cleanedSecondDestination);

    if (
      hasSecondDestination &&
      areSameDestination(cleanedDestination, cleanedSecondDestination)
    ) {
      return res.status(400).json({
        success: false,
        message: "Second destination cannot be the same as the first destination",
      });
    }

    const preferences = await UserPreference.findOne({
      user: req.user._id,
    });

    const finalBudget = preferences?.budgetRange || budgetType;

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

    const requestedDays = Number(days);
    const totalCost = Math.round(perDayCost * requestedDays);
    const travelEstimate = hasSecondDestination
      ? await estimateTravelBetweenDestinations(
          cleanedDestination,
          cleanedSecondDestination
        )
      : null;

    const prompt = buildPrompt({
      destination: cleanedDestination,
      secondDestination: cleanedSecondDestination || undefined,
      days: requestedDays,
      travelers,
      travelEstimate,
    });

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

    let hotelCategory = "";
    let priceRange = "";

    if (finalBudget === "cheap") {
      hotelCategory = "Budget Hotel / Homestay / Dharamshala";
      priceRange = "Rs 800 - Rs 2,000";
    } else if (finalBudget === "moderate") {
      hotelCategory = "3-4 Star Hotel";
      priceRange = "Rs 3,000 - Rs 5,500";
    } else {
      hotelCategory = "Luxury 4-5 Star Hotel";
      priceRange = "Rs 7,000 - Rs 12,000";
    }

    const allDestinations = hasSecondDestination
      ? [cleanedDestination, cleanedSecondDestination]
      : [cleanedDestination];
    const travelRecommendations = hasSecondDestination
      ? buildTravelRecommendations(
          cleanedDestination,
          cleanedSecondDestination,
          travelEstimate
        )
      : null;

    return res.status(200).json({
      success: true,
      trip: {
        tripTitle:
          typeof aiTrip.tripTitle === "string" && aiTrip.tripTitle.trim()
            ? aiTrip.tripTitle.trim()
            : hasSecondDestination
            ? `${cleanedDestination} to ${cleanedSecondDestination} Trip`
            : `${cleanedDestination} Trip`,
        overview: {
          bestTimeToVisit:
            typeof aiTrip?.overview?.bestTimeToVisit === "string"
              ? aiTrip.overview.bestTimeToVisit.trim()
              : "",
          weatherNote:
            typeof aiTrip?.overview?.weatherNote === "string"
              ? aiTrip.overview.weatherNote.trim()
              : "",
          routeSummary:
            typeof aiTrip?.overview?.routeSummary === "string"
              ? aiTrip.overview.routeSummary.trim()
              : "",
        },
        transport: {
          railwayStation:
            typeof aiTrip?.transport?.railwayStation === "string"
              ? aiTrip.transport.railwayStation.trim()
              : "",
          busStation:
            typeof aiTrip?.transport?.busStation === "string"
              ? aiTrip.transport.busStation.trim()
              : "",
          airport:
            typeof aiTrip?.transport?.airport === "string"
              ? aiTrip.transport.airport.trim()
              : "",
        },
        destinations: normalizeDestinations(aiTrip.destinations, allDestinations),
        travelSegment: hasSecondDestination
          ? {
              ...travelRecommendations,
              ...normalizeTravelSegment(aiTrip.travelSegment, travelEstimate),
            }
          : null,
        itinerary: normalizeItineraryLength(
          normalizeItinerary(aiTrip.itinerary),
          requestedDays,
          cleanedSecondDestination || cleanedDestination
        ),
        placesToVisit: normalizePlacesToVisit(aiTrip.placesToVisit),
        hotels: buildHotelOptions(allDestinations, hotelCategory, priceRange),
        foodRecommendations: normalizeRecommendationList(aiTrip.foodRecommendations),
        travelTips: normalizeTravelTips(aiTrip.travelTips),
        estimatedBudget: {
          perDay: `Rs ${Math.round(perDayCost)}`,
          total: `Rs ${totalCost}`,
          note: hasSecondDestination
            ? `Approximate cost for ${travelers} on a ${finalBudget} budget across ${cleanedDestination} and ${cleanedSecondDestination}`
            : `Approximate cost for ${travelers} on a ${finalBudget} budget`,
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
    const { destination, secondDestination, days, budgetType, travelers, tripData } =
      req.body;

    if (!destination || !days || !budgetType || !travelers || !tripData) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const sanitizedTripData = sanitizeTripData(tripData);

    const trip = await Trip.create({
      user: req.user._id,
      destination,
      secondDestination,
      days,
      budgetType,
      travelers,
      tripData: sanitizedTripData,
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

    const sanitizedTrips = trips.map((trip) => {
      const tripObj = trip.toObject();
      return {
        ...tripObj,
        tripData: sanitizeTripData(tripObj.tripData),
      };
    });

    return res.status(200).json({
      success: true,
      trips: sanitizedTrips,
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

    const tripObj = trip.toObject();

    return res.status(200).json({
      success: true,
      trip: {
        ...tripObj,
        tripData: sanitizeTripData(tripObj.tripData),
      },
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
