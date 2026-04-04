import { Request, Response } from "express";
import crypto from "crypto";
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
import {
  CountryTravelContext,
  getCountryTravelContext,
} from "../utils/country-context";
import { getFallbackDestinationHighlights } from "../utils/destination-highlights";

type TravelerDetails = {
  adults: number;
  children: number;
  totalMembers: number;
  label: string;
};

type TripPreferences = {
  budgetRange: "cheap" | "moderate" | "luxury";
  hotelType: "budget" | "premium" | "luxury";
  travelPace: "relaxed" | "balanced" | "packed";
  foodPreference: "veg" | "non-veg" | "both";
  transportPreference: "public" | "private" | "mixed";
};

const FAMILY_ADULT_LIMITS = { min: 2, max: 7 } as const;
const FAMILY_CHILD_LIMITS = { min: 0, max: 5 } as const;
const FRIENDS_ADULT_LIMITS = { min: 8, max: 15 } as const;
const DEFAULT_TRIP_PREFERENCES: TripPreferences = {
  budgetRange: "moderate",
  hotelType: "budget",
  travelPace: "balanced",
  foodPreference: "veg",
  transportPreference: "mixed",
};

const normalizeBudgetPreference = (value?: string): TripPreferences["budgetRange"] => {
  if (value === "cheap" || value === "moderate" || value === "luxury") {
    return value;
  }

  if (value === "medium") {
    return "moderate";
  }

  if (value === "high" || value === "premium") {
    return "luxury";
  }

  if (value === "low") {
    return "cheap";
  }

  return DEFAULT_TRIP_PREFERENCES.budgetRange;
};

const normalizePreferencePayload = (value: any): TripPreferences => ({
  budgetRange: normalizeBudgetPreference(value?.budgetRange),
  hotelType:
    value?.hotelType === "budget" || value?.hotelType === "premium" || value?.hotelType === "luxury"
      ? value.hotelType
      : DEFAULT_TRIP_PREFERENCES.hotelType,
  travelPace:
    value?.travelPace === "relaxed" || value?.travelPace === "balanced" || value?.travelPace === "packed"
      ? value.travelPace
      : DEFAULT_TRIP_PREFERENCES.travelPace,
  foodPreference:
    value?.foodPreference === "veg" || value?.foodPreference === "non-veg" || value?.foodPreference === "both"
      ? value.foodPreference
      : DEFAULT_TRIP_PREFERENCES.foodPreference,
  transportPreference:
    value?.transportPreference === "public" ||
    value?.transportPreference === "private" ||
    value?.transportPreference === "mixed"
      ? value.transportPreference
      : DEFAULT_TRIP_PREFERENCES.transportPreference,
});

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

const sanitizeSlugPart = (value: string) =>
  normalizeDestination(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "trip";

const buildShareSlug = (trip: {
  destination?: string;
  secondDestination?: string | null;
  thirdDestination?: string | null;
}) => {
  const routeSlug = [trip.destination, trip.secondDestination, trip.thirdDestination]
    .filter(Boolean)
    .map((item) => sanitizeSlugPart(item as string))
    .join("-");

  return `${crypto.randomBytes(4).toString("hex")}-${routeSlug || "trip"}`;
};

const getTravelerDetails = (
  travelers: string,
  adultsInput?: number,
  childrenInput?: number
): TravelerDetails => {
  if (travelers === "solo") {
    return {
      adults: 1,
      children: 0,
      totalMembers: 1,
      label: "Solo, 1 member",
    };
  }

  if (travelers === "couple") {
    return {
      adults: 2,
      children: 0,
      totalMembers: 2,
      label: "Couple, 2 members",
    };
  }

  const adults =
    travelers === "family"
      ? Math.max(FAMILY_ADULT_LIMITS.min, Math.floor(Number(adultsInput) || 0))
      : Math.max(1, Math.floor(Number(adultsInput) || 0));
  const children =
    travelers === "family"
      ? Math.min(FAMILY_CHILD_LIMITS.max, Math.max(FAMILY_CHILD_LIMITS.min, Math.floor(Number(childrenInput) || 0)))
      : Math.max(0, Math.floor(Number(childrenInput) || 0));
  const totalMembers = adults + children;
  const groupLabel = travelers === "family" ? "Family" : "Friends";

  return {
    adults,
    children,
    totalMembers,
    label: `${groupLabel}, ${totalMembers} member${totalMembers === 1 ? "" : "s"}`,
  };
};

const validateTravelerCounts = (
  travelers: string,
  adultsInput?: number,
  childrenInput?: number
) => {
  const adults = Math.floor(Number(adultsInput));
  const children = Math.floor(Number(childrenInput));

  if (travelers === "family") {
    if (
      !Number.isInteger(adults) ||
      adults < FAMILY_ADULT_LIMITS.min ||
      adults > FAMILY_ADULT_LIMITS.max
    ) {
      return `Adults must be between ${FAMILY_ADULT_LIMITS.min} and ${FAMILY_ADULT_LIMITS.max}`;
    }

    if (
      !Number.isInteger(children) ||
      children < FAMILY_CHILD_LIMITS.min ||
      children > FAMILY_CHILD_LIMITS.max
    ) {
      return `Children must be between ${FAMILY_CHILD_LIMITS.min} and ${FAMILY_CHILD_LIMITS.max}`;
    }
  }

  if (travelers === "friends") {
    if (
      !Number.isInteger(adults) ||
      adults < FRIENDS_ADULT_LIMITS.min ||
      adults > FRIENDS_ADULT_LIMITS.max
    ) {
      return `Adults must be between ${FRIENDS_ADULT_LIMITS.min} and ${FRIENDS_ADULT_LIMITS.max}`;
    }

    if (!Number.isInteger(children) || children < 0) {
      return "Children must be 0 or more";
    }
  }

  return null;
};

const getDestinationCostFactor = (destination: string) => {
  const normalized = normalizeDestination(destination).toLowerCase();

  if (
    /mumbai|delhi|bengaluru|bangalore|goa|jaipur|udaipur|manali|shimla|kashmir|leh|andaman|kerala|pondicherry|dubai/.test(
      normalized
    )
  ) {
    return 1.18;
  }

  if (
    /dwarka|somnath|nageshwar|trimbakeshwar|shirdi|bhimashankar|ujjain|varanasi|haridwar|rishikesh|tirupati|ayodhya|nashik/.test(
      normalized
    )
  ) {
    return 0.94;
  }

  return 1;
};

const getBudgetEstimate = (
  budgetType: string,
  preferences: TripPreferences,
  travelerDetails: TravelerDetails,
  totalDays: number,
  destinations: string[],
  dayPlan: number[],
  travelEstimates: Array<TravelEstimate | null>
) => {
  const perPersonBudget = {
    cheap: { adult: 1500, child: 900 },
    moderate: { adult: 3500, child: 2200 },
    luxury: { adult: 8000, child: 5000 },
  }[budgetType] || { adult: 3500, child: 2200 };
  const effectiveGuests = travelerDetails.adults + travelerDetails.children * 0.5;
  const estimatedRooms = Math.max(1, Math.ceil(effectiveGuests / 2));
  const hotelRoomRate = {
    budget: { cheap: 1200, moderate: 1800, luxury: 2600 },
    premium: { cheap: 3200, moderate: 4800, luxury: 6800 },
    luxury: { cheap: 7000, moderate: 9500, luxury: 13500 },
  }[preferences.hotelType][budgetType as "cheap" | "moderate" | "luxury"] || 1800;
  const travelPaceMultiplier = {
    relaxed: 1.12,
    balanced: 1,
    packed: 0.9,
  }[preferences.travelPace];
  const foodCostPerPersonPerDay = {
    veg: { cheap: 250, moderate: 450, luxury: 850 },
    "non-veg": { cheap: 350, moderate: 650, luxury: 1200 },
    both: { cheap: 320, moderate: 560, luxury: 1050 },
  }[preferences.foodPreference][budgetType as "cheap" | "moderate" | "luxury"] || 450;
  const localTransportPerPersonPerDay = {
    public: { cheap: 120, moderate: 180, luxury: 260 },
    mixed: { cheap: 280, moderate: 420, luxury: 650 },
    private: { cheap: 520, moderate: 800, luxury: 1200 },
  }[preferences.transportPreference][budgetType as "cheap" | "moderate" | "luxury"] || 180;
  const stayBaseCost =
    travelerDetails.adults * perPersonBudget.adult +
    travelerDetails.children * perPersonBudget.child;
  const foodBaseCost =
    foodCostPerPersonPerDay *
    (travelerDetails.adults + travelerDetails.children * 0.8);
  const localTransportBaseCost =
    localTransportPerPersonPerDay *
    (travelerDetails.adults + travelerDetails.children * 0.6);
  const pacedDailyCost =
    (stayBaseCost + estimatedRooms * hotelRoomRate + foodBaseCost + localTransportBaseCost) *
    travelPaceMultiplier;
  const destinationWeightedStayCost = destinations.reduce((total, destination, index) => {
    const allocatedDays = dayPlan[index] || 1;
    const destinationFactor = getDestinationCostFactor(destination);

    return total + pacedDailyCost * destinationFactor * allocatedDays;
  }, 0);
  const travelLegCost = travelEstimates.reduce((total, estimate) => {
    if (!estimate) {
      const unknownLegFloor = {
        public: 1200,
        mixed: 2200,
        private: 4200,
      }[preferences.transportPreference];

      return total + Math.max(unknownLegFloor, travelerDetails.totalMembers * 450);
    }

    const roadCostPerKm = {
      public: budgetType === "luxury" ? 10 : budgetType === "cheap" ? 5 : 7,
      mixed: budgetType === "luxury" ? 18 : budgetType === "cheap" ? 8 : 12,
      private: budgetType === "luxury" ? 28 : budgetType === "cheap" ? 14 : 20,
    }[preferences.transportPreference];
    const sharedTransferFloor = {
      public: budgetType === "luxury" ? 1800 : budgetType === "cheap" ? 700 : 1200,
      mixed: budgetType === "luxury" ? 4000 : budgetType === "cheap" ? 1200 : 2200,
      private: budgetType === "luxury" ? 7500 : budgetType === "cheap" ? 3000 : 5000,
    }[preferences.transportPreference];
    const distanceDrivenCost = estimate.distanceKm * roadCostPerKm;
    const groupTransferCost =
      preferences.transportPreference === "public"
        ? distanceDrivenCost + travelerDetails.totalMembers * 70
        : preferences.transportPreference === "private"
          ? distanceDrivenCost + travelerDetails.totalMembers * 220
          : travelerDetails.totalMembers >= 6
            ? distanceDrivenCost + travelerDetails.totalMembers * 180
            : distanceDrivenCost + travelerDetails.totalMembers * 110;

    return total + Math.max(sharedTransferFloor, Math.round(groupTransferCost));
  }, 0);
  const totalCost = Math.round(destinationWeightedStayCost + travelLegCost);
  const perDayCost = Math.round(totalCost / Math.max(totalDays, 1));

  return {
    perDayCost,
    totalCost,
    estimatedRooms,
    hotelRoomRate,
    foodCostPerPersonPerDay,
    localTransportPerPersonPerDay,
    travelPaceMultiplier,
    travelLegCost,
    destinationWeightedStayCost: Math.round(destinationWeightedStayCost),
  };
};

const extractJsonCandidate = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const withoutCodeFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = withoutCodeFence.indexOf("{");
  const lastBrace = withoutCodeFence.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return withoutCodeFence.slice(firstBrace, lastBrace + 1);
  }

  return withoutCodeFence;
};

const parseAiJson = (value: string) => {
  const directCandidate = extractJsonCandidate(value);

  if (!directCandidate) {
    return null;
  }

  try {
    return JSON.parse(directCandidate);
  } catch {
    const repairedCandidate = directCandidate
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/\u0000/g, "")
      .trim();

    try {
      return JSON.parse(repairedCandidate);
    } catch {
      return null;
    }
  }
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

const getFallbackFoodRecommendations = (destination: string) => {
  const normalized = normalizeDestination(destination).toLowerCase();

  if (/dwarka|nageshwar|somnath/.test(normalized)) {
    return [
      {
        destination,
        name: "Gujarati Thali",
        description: `Try a traditional Gujarati thali near ${destination} with dal, sabzi, rotli, farsan, and sweets.`,
      },
      {
        destination,
        name: "Farsan And Street Snacks",
        description: `Look for khaman, fafda, kachori, and light regional snacks around ${destination}.`,
      },
    ];
  }

  if (/trimbakeshwar|bhimashankar|nashik|drushmeshwar|grishneshwar/.test(normalized)) {
    return [
      {
        destination,
        name: "Maharashtrian Thali",
        description: `Try a local Maharashtrian thali near ${destination} with bhakri, pithla, varan-bhaat, and seasonal sabzi.`,
      },
      {
        destination,
        name: "Misal Pav And Local Breakfast",
        description: `Look for misal pav, poha, sabudana dishes, and simple temple-town breakfast spots around ${destination}.`,
      },
    ];
  }

  if (/shirdi|ujjain|varanasi|ayodhya|haridwar|rishikesh|tirupati/.test(normalized)) {
    return [
      {
        destination,
        name: "Regional Thali",
        description: `Try a clean regional thali near ${destination} for a simple and reliable meal during sightseeing.`,
      },
      {
        destination,
        name: "Temple Town Sweets And Snacks",
        description: `Look for trusted local sweet shops and vegetarian snack counters around ${destination}.`,
      },
    ];
  }

  return [
    {
      destination,
      name: "Regional Thali",
      description: `Try a regional thali or popular local veg meal near ${destination}.`,
    },
    {
      destination,
      name: "Popular Local Snacks",
      description: `Ask for the most popular local breakfast or evening snack options around ${destination}.`,
    },
  ];
};

const normalizeRecommendationList = (value: unknown, destinations: string[] = []) => {
  const normalizedItems = Array.isArray(value)
    ? value
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
        .filter(Boolean)
    : [];

  const usefulObjectRecommendations = normalizedItems.filter((item) => {
    if (!item || typeof item === "string") {
      return false;
    }

    const name = item.name.trim().toLowerCase();
    const description = item.description.trim().toLowerCase();

    if (!name && !description) {
      return false;
    }

    if (
      name === "local cuisine" ||
      description === "enjoy the local cuisine and culture of the region" ||
      description.includes("local cuisine and culture of the region")
    ) {
      return false;
    }

    return true;
  }) as Array<{ destination: string; name: string; description: string }>;

  if (!destinations.length) {
    return usefulObjectRecommendations.length ? usefulObjectRecommendations : normalizedItems;
  }

  const normalizedDestinations = destinations.map((destination) => normalizeDestination(destination));
  const destinationScopedRecommendations = normalizedDestinations.flatMap((destination) => {
    const matched = usefulObjectRecommendations.filter((item) =>
      item.destination ? areSameDestination(item.destination, destination) : false
    );

    return matched.length ? matched.slice(0, 2) : getFallbackFoodRecommendations(destination);
  });

  return destinationScopedRecommendations;
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

const groupItemsByDestination = (
  items: Array<{ destination?: string; name?: string; description?: string } | null>,
  destinations: string[]
) => {
  return destinations.reduce<Record<string, string[]>>((accumulator, destination) => {
    accumulator[destination] = items
      .filter((item): item is { destination?: string; name?: string; description?: string } => {
        if (!item || typeof item.destination !== "string") {
          return false;
        }

        return item.destination.trim().toLowerCase() === destination.toLowerCase();
      })
      .map((item) => item.name || item.description || "")
      .filter(Boolean)
      .slice(0, 4);

    return accumulator;
  }, {});
};

const buildDestinationPlacePool = ({
  placesToVisit,
  destinationCards,
  destinations,
}: {
  placesToVisit: Array<{ destination?: string; name?: string; description?: string } | null>;
  destinationCards: unknown;
  destinations: string[];
}) => {
  const groupedPlaces = groupItemsByDestination(placesToVisit, destinations);
  const normalizedCards = Array.isArray(destinationCards) ? destinationCards : [];

  return destinations.reduce<Record<string, string[]>>((accumulator, destination) => {
    const matchingCard = normalizedCards.find(
      (item: any) =>
        typeof item?.name === "string" &&
        areSameDestination(item.name, destination)
    );
    const cardHighlights = normalizeHighlights(matchingCard?.highlights);
    const fallbackHighlights = getFallbackDestinationHighlights(destination);

    accumulator[destination] = dedupeStrings([
      ...(groupedPlaces[destination] || []),
      ...cardHighlights,
      ...fallbackHighlights,
    ]).slice(0, 6);

    return accumulator;
  }, {});
};

const normalizeTravelTips = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const buildDestinationDayPlan = (days: number, destinationCount: number) => {
  const safeDestinationCount = Math.max(destinationCount, 1);
  const baseDays = Math.floor(days / safeDestinationCount);
  const remainder = days % safeDestinationCount;

  return Array.from({ length: safeDestinationCount }, (_, index) =>
    baseDays + (index < remainder ? 1 : 0)
  );
};

const createFallbackDestinationDay = (
  destination: string,
  localDayNumber: number,
  groupedPlaces: Record<string, string[]>
) => {
  const places = groupedPlaces[destination] || getFallbackDestinationHighlights(destination);
  const primaryPlace =
    places[(localDayNumber - 1) % Math.max(places.length, 1)] || destination;
  const secondaryPlace =
    places[localDayNumber % Math.max(places.length, 1)] || primaryPlace;
  const eveningPlace =
    places[(localDayNumber + 1) % Math.max(places.length, 1)] || secondaryPlace;

  return {
    phaseType: "destination" as const,
    phaseTitle: `${destination} - Day ${localDayNumber}`,
    destination,
    morning: `Start the day at ${primaryPlace} and cover nearby signature sights in ${destination}.`,
    afternoon: `Continue through ${secondaryPlace} and other well-known spots around ${destination}.`,
    evening: `Spend a relaxed evening around ${eveningPlace} and enjoy local food in ${destination}.`,
    localTravelTip: `Cluster local travel around ${primaryPlace} and ${secondaryPlace} so you can cover named attractions in ${destination} comfortably.`,
  };
};

const reduceRepeatedDestinationDays = (
  itinerary: ReturnType<typeof normalizeItinerary>,
  groupedPlaces: Record<string, string[]>
) =>
  itinerary.map((day, index) => {
    if (day.phaseType !== "destination" || !day.destination) {
      return day;
    }

    const previousDay = itinerary[index - 1];
    const isRepeatedDay =
      previousDay?.phaseType === "destination" &&
      previousDay.destination === day.destination &&
      previousDay.morning.trim().toLowerCase() === day.morning.trim().toLowerCase() &&
      previousDay.afternoon.trim().toLowerCase() === day.afternoon.trim().toLowerCase() &&
      previousDay.evening.trim().toLowerCase() === day.evening.trim().toLowerCase();

    if (!isRepeatedDay) {
      return day;
    }

    const places = groupedPlaces[day.destination] || [];
    const primaryPlace = places[(index - 1) % Math.max(places.length, 1)] || `a different area of ${day.destination}`;
    const secondaryPlace = places[index % Math.max(places.length, 1)] || `another popular zone in ${day.destination}`;
    const eveningPlace =
      places[(index + 1) % Math.max(places.length, 1)] || `a lively local neighborhood in ${day.destination}`;

    return {
      ...day,
      phaseTitle: `${day.destination} - Day ${day.day}`,
      morning: `Start the day around ${primaryPlace} and focus on a different side of ${day.destination}.`,
      afternoon: `Continue with ${secondaryPlace} and nearby local highlights to keep the plan distinct from earlier days.`,
      evening: `Spend the evening around ${eveningPlace} and try a regional meal with a more relaxed pace.`,
      localTravelTip: `Cluster day ${day.day} activities in one part of ${day.destination} so the schedule feels varied without wasting transit time.`,
    };
  });

type TravelSegmentContext = {
  durationMinutes?: number;
  durationText?: string;
  distanceText?: string;
} | null;

type CountryInsight = {
  destination: string;
  capitalFocus: string;
  cityClusters: string[];
  landmarkClusters: string[];
  cuisineFocus: string[];
};

const mentionsDestination = (value: string, destination: string) => {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedDestination = normalizeDestination(destination).toLowerCase();

  return Boolean(normalizedDestination) && normalizedValue.includes(normalizedDestination);
};

const buildCountryInsightPrompt = (context: CountryTravelContext) => `
Return valid JSON only.
No markdown.
No explanation.

You are preparing accurate country trip-planning inputs for ${context.countryName}.

Known facts:
- Country: ${context.countryName}
- Capital: ${context.capital.join(", ") || "Unknown"}
- Region: ${context.region || "Unknown"}
- Subregion: ${context.subregion || "Unknown"}

Return JSON in this exact format:
{
  "destination": "${context.destination}",
  "capitalFocus": "",
  "cityClusters": [],
  "landmarkClusters": [],
  "cuisineFocus": []
}

Rules:
- cityClusters must contain 4 to 6 real and famous city or region clusters for tourism in ${context.countryName}
- landmarkClusters must contain 4 to 8 real and famous sightseeing areas, routes, districts, monuments, coastlines, parks, or cultural zones
- cuisineFocus must contain 3 to 6 real local food or meal ideas
- Prefer the capital city as one important cluster but do not make everything about the capital
- Avoid generic phrases like "local attractions" or "popular places"
`;

const dedupeStrings = (values: string[]) =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

const normalizeCountryInsight = (
  value: unknown,
  context: CountryTravelContext
): CountryInsight => {
  const objectValue = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    destination: context.destination,
    capitalFocus:
      typeof objectValue.capitalFocus === "string" && objectValue.capitalFocus.trim()
        ? objectValue.capitalFocus.trim()
        : context.capital[0] || context.countryName,
    cityClusters: dedupeStrings(
      Array.isArray(objectValue.cityClusters)
        ? objectValue.cityClusters.map((item) => (typeof item === "string" ? item : ""))
        : context.capital
    ),
    landmarkClusters: dedupeStrings(
      Array.isArray(objectValue.landmarkClusters)
        ? objectValue.landmarkClusters.map((item) => (typeof item === "string" ? item : ""))
        : []
    ),
    cuisineFocus: dedupeStrings(
      Array.isArray(objectValue.cuisineFocus)
        ? objectValue.cuisineFocus.map((item) => (typeof item === "string" ? item : ""))
        : []
    ),
  };
};

const isGenericCountryDay = (day: ReturnType<typeof normalizeItinerary>[number], destination: string) => {
  const destinationName = normalizeDestination(destination).toLowerCase();
  const combinedText = [
    day.phaseTitle,
    day.morning,
    day.afternoon,
    day.evening,
    day.localTravelTip,
  ]
    .join(" ")
    .toLowerCase();

  return (
    combinedText.includes(`main highlights of ${destinationName}`) ||
    combinedText.includes(`continue sightseeing around ${destinationName}`) ||
    combinedText.includes(`different area of ${destinationName}`) ||
    combinedText.includes(`another popular zone in ${destinationName}`) ||
    combinedText.includes(`lively local neighborhood in ${destinationName}`)
  );
};

const buildCountrySpecificDay = ({
  day,
  insight,
  destination,
  dayIndex,
}: {
  day: ReturnType<typeof normalizeItinerary>[number];
  insight: CountryInsight;
  destination: string;
  dayIndex: number;
}) => {
  const cityClusters = insight.cityClusters.length
    ? insight.cityClusters
    : [insight.capitalFocus || destination];
  const landmarkClusters = insight.landmarkClusters.length
    ? insight.landmarkClusters
    : [`major landmarks in ${insight.capitalFocus || destination}`];
  const cuisineFocus = insight.cuisineFocus.length
    ? insight.cuisineFocus
    : ["regional specialties"];
  const cityFocus = cityClusters[dayIndex % cityClusters.length];
  const secondaryFocus = cityClusters[(dayIndex + 1) % cityClusters.length] || cityFocus;
  const landmarkFocus = landmarkClusters[dayIndex % landmarkClusters.length];
  const secondaryLandmark =
    landmarkClusters[(dayIndex + 1) % landmarkClusters.length] || landmarkFocus;
  const foodFocus = cuisineFocus[dayIndex % cuisineFocus.length];

  return {
    ...day,
    phaseTitle: `${destination} - Day ${day.day}`,
    morning: `Focus on ${cityFocus}, starting with ${landmarkFocus} and nearby signature sights.`,
    afternoon: `Continue through ${secondaryFocus} with time for ${secondaryLandmark} and a more local neighborhood experience.`,
    evening: `Keep the evening around ${cityFocus} or ${secondaryFocus} and try ${foodFocus} for a destination-specific finish.`,
    localTravelTip: `Group day ${day.day} around ${cityFocus} and ${secondaryFocus} so you cover famous places in ${destination} without wasting transit time.`,
  };
};

const improveCountryItinerary = ({
  itinerary,
  countryInsights,
  destinations,
}: {
  itinerary: ReturnType<typeof normalizeItinerary>;
  countryInsights: Record<string, CountryInsight>;
  destinations: string[];
}) =>
  itinerary.map((day, index) => {
    if (day.phaseType !== "destination" || !day.destination) {
      return day;
    }

    const destination = destinations.find((item) => areSameDestination(item, day.destination));
    if (!destination) {
      return day;
    }

    const insight = countryInsights[destination];
    if (!insight) {
      return day;
    }

    const previousDay = itinerary[index - 1];
    const isRepeatedDay =
      previousDay?.phaseType === "destination" &&
      previousDay.destination === day.destination &&
      previousDay.morning.trim().toLowerCase() === day.morning.trim().toLowerCase() &&
      previousDay.afternoon.trim().toLowerCase() === day.afternoon.trim().toLowerCase() &&
      previousDay.evening.trim().toLowerCase() === day.evening.trim().toLowerCase();

    if (!isRepeatedDay && !isGenericCountryDay(day, destination)) {
      return day;
    }

    const sameDestinationIndex = itinerary
      .slice(0, index + 1)
      .filter(
        (item) => item.phaseType === "destination" && areSameDestination(item.destination || "", destination)
      ).length - 1;

    return buildCountrySpecificDay({
      day,
      insight,
      destination,
      dayIndex: Math.max(sameDestinationIndex, 0),
    });
  });

const buildDestinationKeywordMap = (
  destinations: string[],
  groupedPlaces: Record<string, string[]>
) => {
  return destinations.reduce<Record<string, string[]>>((accumulator, destination) => {
    const normalizedDestination = normalizeDestination(destination).toLowerCase();
    const placeKeywords = (groupedPlaces[destination] || [])
      .map((place) => place.trim().toLowerCase())
      .filter((place) => place.length >= 3);

    accumulator[destination] = Array.from(
      new Set([normalizedDestination, ...placeKeywords].filter(Boolean))
    );

    return accumulator;
  }, {});
};

const sanitizeTextForDestinations = ({
  text,
  allowedDestinations,
  allDestinations,
  destinationKeywordMap,
  fallbackText,
}: {
  text: string;
  allowedDestinations: string[];
  allDestinations: string[];
  destinationKeywordMap: Record<string, string[]>;
  fallbackText: string;
}) => {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return fallbackText;
  }

  const hasBlockedDestinationMention = allDestinations.some(
    (destination) =>
      !allowedDestinations.some((allowedDestination) =>
        areSameDestination(allowedDestination, destination)
      ) &&
      (mentionsDestination(trimmedText, destination) ||
        (destinationKeywordMap[destination] || []).some((keyword) =>
          trimmedText.toLowerCase().includes(keyword)
        ))
  );

  if (hasBlockedDestinationMention) {
    return fallbackText;
  }

  return trimmedText;
};

const buildTravelDayEntry = ({
  fromDestination,
  toDestination,
  allDestinations,
  destinationKeywordMap,
  segment,
  currentDay,
  nextDay,
}: {
  fromDestination: string;
  toDestination: string;
  allDestinations: string[];
  destinationKeywordMap: Record<string, string[]>;
  segment: TravelSegmentContext;
  currentDay?: ReturnType<typeof normalizeItinerary>[number];
  nextDay?: ReturnType<typeof normalizeItinerary>[number];
}) => {
  const durationMinutes = segment?.durationMinutes || 0;
  const distanceText = segment?.distanceText || "distance varies by route";
  const durationText = segment?.durationText || "travel time varies by route";

  if (durationMinutes > 0 && durationMinutes <= 90) {
    return {
      phaseType: "travel" as const,
      phaseTitle: `Travel to ${toDestination}`,
      destination: toDestination,
      morning: sanitizeTextForDestinations({
        text:
          currentDay?.morning ||
          `Finish checkout and leave ${fromDestination} after a light morning visit.`,
        allowedDestinations: [fromDestination],
        allDestinations,
        destinationKeywordMap,
        fallbackText: `Finish checkout and cover a few last highlights around ${fromDestination} before departure.`,
      }),
      afternoon: sanitizeTextForDestinations({
        text:
          nextDay?.afternoon ||
          `Reach ${toDestination} after roughly ${durationText} and start local sightseeing the same afternoon.`,
        allowedDestinations: [toDestination],
        allDestinations,
        destinationKeywordMap,
        fallbackText: `Reach ${toDestination} after roughly ${durationText} and begin nearby sightseeing after check-in.`,
      }),
      evening: sanitizeTextForDestinations({
        text:
          nextDay?.evening ||
          `Keep the evening active in ${toDestination} with a short market, temple, or local food visit.`,
        allowedDestinations: [toDestination],
        allDestinations,
        destinationKeywordMap,
        fallbackText: `Spend the evening in ${toDestination} with a short local visit and relaxed dinner.`,
      }),
      localTravelTip: `This is a short transfer of about ${distanceText}. Keep bags light and continue sightseeing after arrival.`,
    };
  }

  if (durationMinutes >= 360) {
    return {
      phaseType: "travel" as const,
      phaseTitle: `Travel to ${toDestination}`,
      destination: toDestination,
      morning: `Check out from ${fromDestination} and begin the long transfer to ${toDestination}.`,
      afternoon: `Most of the day stays reserved for travel covering about ${distanceText} in roughly ${durationText}.`,
      evening: `Arrive in ${toDestination}, check in, and keep the evening light for recovery.`,
      localTravelTip: `This is a long travel leg. Treat it as a transfer day and avoid heavy sightseeing plans.`,
    };
  }

  return {
    phaseType: "travel" as const,
    phaseTitle: `Travel to ${toDestination}`,
    destination: toDestination,
    morning: sanitizeTextForDestinations({
      text:
        currentDay?.morning ||
        `Wrap up key visits in ${fromDestination} before departure.`,
      allowedDestinations: [fromDestination],
      allDestinations,
      destinationKeywordMap,
      fallbackText: `Wrap up key visits in ${fromDestination} before departure.`,
    }),
    afternoon: `Travel from ${fromDestination} to ${toDestination} for about ${durationText} covering approximately ${distanceText}.`,
    evening: sanitizeTextForDestinations({
      text:
        nextDay?.evening ||
        `Reach ${toDestination}, check in, and do a light nearby visit if time allows.`,
      allowedDestinations: [toDestination],
      allDestinations,
      destinationKeywordMap,
      fallbackText: `Reach ${toDestination}, check in, and keep the evening limited to a nearby local visit if time allows.`,
    }),
    localTravelTip: `Plan a balanced transfer day with only light sightseeing around arrival in ${toDestination}.`,
  };
};

const buildStructuredItinerary = ({
  itinerary,
  destinations,
  travelSegments,
  dayPlan,
  groupedPlaces,
}: {
  itinerary: ReturnType<typeof normalizeItinerary>;
  destinations: string[];
  travelSegments: TravelSegmentContext[];
  dayPlan: number[];
  groupedPlaces: Record<string, string[]>;
}) => {
  const destinationKeywordMap = buildDestinationKeywordMap(destinations, groupedPlaces);
  const destinationDays = destinations.reduce<Record<string, ReturnType<typeof normalizeItinerary>>>(
    (accumulator, destination) => {
      accumulator[destination] = itinerary.filter(
        (item) =>
          item.phaseType === "destination" &&
          item.destination.trim().toLowerCase() === destination.toLowerCase()
      );
      return accumulator;
    },
    {}
  );

  const result: ReturnType<typeof normalizeItinerary> = [];
  let absoluteDay = 1;

  destinations.forEach((destination, destinationIndex) => {
    const allocatedDays = dayPlan[destinationIndex] || 1;
    const hasNextDestination = destinationIndex < destinations.length - 1;
    const nextDestination = hasNextDestination ? destinations[destinationIndex + 1] : "";
    const destinationPool = destinationDays[destination] || [];
    const nextPool = nextDestination ? destinationDays[nextDestination] || [] : [];

    for (let localDay = 0; localDay < allocatedDays; localDay += 1) {
      const isTransitionDay = hasNextDestination && localDay === allocatedDays - 1;

      if (isTransitionDay) {
        const transitionEntry = buildTravelDayEntry({
          fromDestination: destination,
          toDestination: nextDestination,
          allDestinations: destinations,
          destinationKeywordMap,
          segment: travelSegments[destinationIndex] || null,
          currentDay:
            destinationPool[Math.min(localDay, destinationPool.length - 1)] ||
            undefined,
          nextDay: nextPool[0] || undefined,
        });

        result.push({
          day: absoluteDay,
          ...transitionEntry,
        });
      } else {
        const sourceDay =
          destinationPool[Math.min(localDay, destinationPool.length - 1)] ||
          createFallbackDestinationDay(destination, localDay + 1, groupedPlaces);

        result.push({
          day: absoluteDay,
          phaseType: "destination",
          phaseTitle:
            sourceDay.phaseTitle || `${destination} - Day ${localDay + 1}`,
          destination,
          morning: sanitizeTextForDestinations({
            text: sourceDay.morning,
            allowedDestinations: [destination],
            allDestinations: destinations,
            destinationKeywordMap,
            fallbackText: `Start the day exploring key attractions in ${destination}.`,
          }),
          afternoon: sanitizeTextForDestinations({
            text: sourceDay.afternoon,
            allowedDestinations: [destination],
            allDestinations: destinations,
            destinationKeywordMap,
            fallbackText: `Spend the afternoon visiting nearby highlights around ${destination}.`,
          }),
          evening: sanitizeTextForDestinations({
            text: sourceDay.evening,
            allowedDestinations: [destination],
            allDestinations: destinations,
            destinationKeywordMap,
            fallbackText: `Enjoy a relaxed evening in ${destination} with local food and rest.`,
          }),
          localTravelTip: sanitizeTextForDestinations({
            text: sourceDay.localTravelTip,
            allowedDestinations: [destination],
            allDestinations: destinations,
            destinationKeywordMap,
            fallbackText: `Keep local travel flexible and leave enough buffer time in ${destination}.`,
          }),
        });
      }

      absoluteDay += 1;
    }
  });

  return result;
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

    normalized.push({
      day: nextDayNumber,
      phaseType: "destination",
      phaseTitle: `${fallbackDestination} - Day ${nextDayNumber}`,
      destination: fallbackDestination,
      morning: `Continue with ${getFallbackDestinationHighlights(fallbackDestination)[0] || fallbackDestination} and nearby named attractions.`,
      afternoon: `Explore ${getFallbackDestinationHighlights(fallbackDestination)[1] || `popular spots in ${fallbackDestination}`} at a comfortable pace.`,
      evening: `Spend a light evening around ${getFallbackDestinationHighlights(fallbackDestination)[2] || fallbackDestination} with local food and rest.`,
      localTravelTip: `Keep enough buffer time so you can cover key attractions in ${fallbackDestination} without rushing.`,
    });
  }

  return normalized;
};

const normalizeDestinations = (
  value: unknown,
  fallbackDestinations: string[],
  dayPlan: number[],
  groupedPlaces: Record<string, string[]>
) => {
  const normalizedInput = Array.isArray(value) ? value : [];

  return fallbackDestinations.map((fallbackName, index) => {
    const matchingItem = normalizedInput.find(
      (item: any) =>
        typeof item?.name === "string" &&
        item.name.trim().toLowerCase() === fallbackName.toLowerCase()
    );
    const indexedItem = normalizedInput[index];
    const item = matchingItem || indexedItem || {};
    const highlights = normalizeHighlights(item?.highlights);
    const fallbackHighlights = groupedPlaces[fallbackName] || [];

    return {
      name: fallbackName,
      stayDays: `${dayPlan[index] || 1} day${dayPlan[index] === 1 ? "" : "s"}`,
      summary:
        typeof item?.summary === "string" && item.summary.trim()
          ? item.summary.trim()
          : `Spend ${dayPlan[index] || 1} day${dayPlan[index] === 1 ? "" : "s"} exploring ${fallbackName}.`,
      highlights: (highlights.length ? highlights : fallbackHighlights).slice(0, 4),
    };
  });
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

const normalizeTravelSegments = (
  value: unknown,
  fallbackTravelEstimates: Array<TravelEstimate | null>
) => {
  const inputSegments = Array.isArray(value) ? value : [];

  return fallbackTravelEstimates
    .map((estimate, index) =>
      normalizeTravelSegment(inputSegments[index] || estimate, estimate)
    )
    .filter(Boolean);
};

const buildTravelRecommendations = (
  fromDestination: string,
  toDestination: string,
  travelEstimate: TravelEstimate | null
) => {
  const distanceText = travelEstimate?.distanceText || "distance varies by route";

  return {
    recommendedBus: `Road transfer or intercity bus from ${fromDestination} to ${toDestination} for approximately ${distanceText}.`,
    recommendedRailway: `Check the nearest major railway stations for ${fromDestination} and ${toDestination}; rail may require a short road transfer at one or both ends.`,
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

const getHotelPreferenceDetails = (
  hotelType: TripPreferences["hotelType"],
  travelers: string
) => {
  if (hotelType === "luxury") {
    return {
      hotelCategory: "Luxury 4-5 Star Hotel",
      priceRange: "Rs 8,000 - Rs 15,000",
    };
  }

  if (hotelType === "premium") {
    return {
      hotelCategory: "Premium 3 Star Hotel",
      priceRange: "Rs 3,000 - Rs 6,500",
    };
  }

  if (travelers === "solo") {
    return {
      hotelCategory: "Budget Hotel / Hostel Dormitory / Guest House",
      priceRange: "Rs 500 - Rs 2,200",
    };
  }

  return {
    hotelCategory: "Budget Hotel / Guest House",
    priceRange: "Rs 800 - Rs 2,200",
  };
};

const buildPrompt = ({
  destinations,
  days,
  travelers,
  travelerDetails,
  travelEstimates,
  countryContexts,
  countryInsights,
  preferences,
}: {
  destinations: string[];
  days: number;
  travelers: string;
  travelerDetails: TravelerDetails;
  travelEstimates: Array<TravelEstimate | null>;
  countryContexts: CountryTravelContext[];
  countryInsights: Record<string, CountryInsight>;
  preferences: TripPreferences;
}) => {
  const dayPlan = buildDestinationDayPlan(days, destinations.length);
  const destinationList = destinations
    .map((destination, index) => `- Destination ${index + 1}: ${destination} (${dayPlan[index]} day allocation)`)
    .join("\n");
  const travelLegList =
    travelEstimates.length > 0
      ? travelEstimates
          .map(
            (estimate, index) =>
              `- Travel ${index + 1}: ${destinations[index]} -> ${destinations[index + 1]} | Distance: ${
                estimate?.distanceText || "Unavailable"
              } | Duration: ${estimate?.durationText || "Unavailable"}`
          )
	          .join("\n")
	      : "- Travel legs: None";
  const countryContextList =
    countryContexts.length > 0
      ? countryContexts
          .map((context) => {
            const capitalText = context.capital.length
              ? context.capital.join(", ")
              : "Unknown";

            return `- ${context.destination}: country=${context.countryName}; capital=${capitalText}; region=${context.region || "Unknown"}; subregion=${context.subregion || "Unknown"}; population=${context.population || "Unknown"}`;
          })
          .join("\n")
      : "- No destination was confirmed as a full country.";
  const countryInsightList =
    Object.values(countryInsights).length > 0
      ? Object.values(countryInsights)
          .map(
            (insight) =>
              `- ${insight.destination}: capitalFocus=${insight.capitalFocus}; cityClusters=${insight.cityClusters.join(" | ")}; landmarkClusters=${insight.landmarkClusters.join(" | ")}; cuisineFocus=${insight.cuisineFocus.join(" | ")}`
          )
          .join("\n")
      : "- No additional country insights available.";

  return `
You are a PROFESSIONAL GLOBAL TRAVEL PLANNER AI.

CRITICAL RULES:
- Input is ALWAYS travel destinations
- NEVER answer general questions
- NEVER invent places, transit points, temples, or attractions
- Use ONLY real-world travel knowledge
- Return ONLY valid JSON
- No markdown
- No explanations
- The total itinerary length MUST be exactly ${days} days
- The destination stay allocation MUST exactly match this day split: ${dayPlan.join(", ")}
- The itinerary day count must be EXACTLY ${days}
- If there are multiple destinations, create ONE combined ${days}-day itinerary
- Distribute the ${days} days across all destinations while keeping the split balanced and practical for families and moderate budgets
- Use these destination day targets as guidance: ${dayPlan.join(", ")}
- Include a clear travel phase between each destination phase
- Destination 2 and Destination 3 must receive the same recommendation quality as Destination 1
- Return one destinations entry for EVERY requested destination in the SAME order
- Give each destination a meaningful summary and at least 3 useful highlights
- Include at least 2-3 placesToVisit items for EVERY destination
- Include at least 1-2 foodRecommendations items for EVERY destination when possible
- Do not use generic food labels like "Local cuisine"
- Food recommendations must be actual dishes, snacks, sweets, thalis, or meaningful local meal suggestions for each destination
- Every itinerary item must include: day, phaseType, phaseTitle, destination, morning, afternoon, evening, localTravelTip
- phaseType must be either "destination" or "travel"
- The travel phase must mention approximate distance and practical travel mode guidance
- If a travel leg is short, keep the same day useful with sightseeing after arrival
- If a travel leg is 6 hours or longer, treat it as mostly a full transfer day
- Never mention attractions, temple visits, aarti, meals, or sightseeing for a later destination before the itinerary has reached that destination
- On each day, activities must belong only to the current destination or the immediate arrival destination for that travel leg
- Do not create extra days beyond the total count
- Do not skip any destination
- Do not give all days to the first destination
- When a destination is a COUNTRY, build the itinerary around its real capital city, major tourism cities, and famous regions
- If the destination is a country, mention its capital city in the itinerary or highlights
- For country itineraries, spread days across distinct cities/areas/attraction clusters; do not repeat the same day plan across multiple days
- Consecutive days must feel meaningfully different in city focus, neighborhood focus, or attraction mix
- Avoid repetitive loops like using the same palace, same square, same beach, or same dinner idea on multiple days unless the trip explicitly stays in one small place
- Portugal must feel like Portugal, Japan must feel like Japan, Greenland must feel like Greenland, etc.

Trip Input:
- Destination Count: ${destinations.length}
- Destinations:
${destinationList}
- Total Days: ${days}
- Travelers: ${travelers}
- Party Details: ${travelerDetails.label} (${travelerDetails.adults} adults, ${travelerDetails.children} children)
- User Preferences:
  - Budget Preference: ${preferences.budgetRange}
  - Hotel Preference: ${preferences.hotelType}
  - Travel Pace: ${preferences.travelPace}
  - Food Preference: ${preferences.foodPreference}
  - Transport Preference: ${preferences.transportPreference}
- Travel Legs:
${travelLegList}
- Confirmed Country Context:
${countryContextList}
- Destination Planning Insights:
${countryInsightList}

Preference Guidance:
- Match the itinerary style to the travel pace: relaxed means fewer activities and more breathing room, packed means higher activity density, balanced stays moderate.
- Respect the food preference in foodRecommendations and meal mentions.
- Respect the transport preference while suggesting practical transfers and local movement.
- Align hotel tone and recommended stay style with the hotel preference.
- Never recommend Dharamshala or religious lodging in hotel suggestions.
- Hostel dormitory is allowed only when Travelers is solo and only for budget-style stays.
- Keep the overall trip style aligned with the selected budget preference.

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
  "travelSegments": [
    {
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
    }
  ],
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
    const {
      destination,
      secondDestination,
      thirdDestination,
      days,
      budgetType,
      travelers,
      adults,
      children,
      preferences: incomingPreferences,
    } = req.body;
    const destinations = [
      normalizeDestination(destination),
      typeof secondDestination === "string" && secondDestination.trim()
        ? normalizeDestination(secondDestination)
        : "",
      typeof thirdDestination === "string" && thirdDestination.trim()
        ? normalizeDestination(thirdDestination)
        : "",
    ].filter(Boolean);

    if (new Set(destinations.map((item) => item.toLowerCase())).size !== destinations.length) {
      return res.status(400).json({
        success: false,
        message: "Destination already added",
      });
    }

    const hasMultipleDestinations = destinations.length > 1;

    const savedPreferences = await UserPreference.findOne({
      user: req.user._id,
    });
    const effectivePreferences = normalizePreferencePayload({
      ...DEFAULT_TRIP_PREFERENCES,
      ...(savedPreferences?.toObject?.() || savedPreferences || {}),
      ...(incomingPreferences && typeof incomingPreferences === "object"
        ? incomingPreferences
        : {}),
    });

    if (incomingPreferences && typeof incomingPreferences === "object") {
      await UserPreference.findOneAndUpdate(
        { user: req.user._id },
        { ...effectivePreferences, user: req.user._id },
        { new: true, upsert: true }
      );
    }

    const finalBudget = normalizeBudgetPreference(budgetType);
    const tripPreferencesForGeneration: TripPreferences = {
      ...effectivePreferences,
      budgetRange: finalBudget,
    };
    const travelerValidationMessage = validateTravelerCounts(
      travelers,
      Number(adults),
      Number(children)
    );

    if (travelerValidationMessage) {
      return res.status(400).json({
        success: false,
        message: travelerValidationMessage,
      });
    }

    const travelerDetails = getTravelerDetails(travelers, Number(adults), Number(children));

    const requestedDays = Number(days);
    const dayPlan = buildDestinationDayPlan(requestedDays, destinations.length);
    const travelEstimates = hasMultipleDestinations
      ? await Promise.all(
          destinations.slice(0, -1).map((currentDestination, index) =>
            estimateTravelBetweenDestinations(
              currentDestination,
              destinations[index + 1]
            )
          )
        )
      : [];
    const budgetEstimate = getBudgetEstimate(
      finalBudget,
      tripPreferencesForGeneration,
      travelerDetails,
      requestedDays,
      destinations,
      dayPlan,
      travelEstimates
    );
    const perDayCost = budgetEstimate.perDayCost;
    const totalCost = budgetEstimate.totalCost;
    const countryContexts = (
      await Promise.all(destinations.map((item) => getCountryTravelContext(item)))
    ).filter((item): item is CountryTravelContext => Boolean(item?.isCountry));
    const countryInsights = (
      await Promise.all(
        countryContexts.map(async (context) => {
          const insightText = await generateTripWithAI(buildCountryInsightPrompt(context));
          const parsedInsight = insightText ? parseAiJson(insightText) : null;

          return [context.destination, normalizeCountryInsight(parsedInsight, context)] as const;
        })
      )
    ).reduce<Record<string, CountryInsight>>((accumulator, [destination, insight]) => {
      accumulator[destination] = insight;
      return accumulator;
    }, {});

    const prompt = buildPrompt({
      destinations,
      days: requestedDays,
      travelers,
      travelerDetails,
      travelEstimates,
      countryContexts,
      countryInsights,
      preferences: tripPreferencesForGeneration,
    });

    const aiText = await generateTripWithAI(prompt);

    if (!aiText) {
      return res.status(500).json({
        success: false,
        message: "AI returned empty response",
      });
    }

    let aiTrip = parseAiJson(aiText);

    if (!aiTrip) {
      const repairPrompt = `
Convert the following content into valid JSON only.
Do not add markdown.
Do not add explanation text.
Return only one valid JSON object.

${extractJsonCandidate(aiText)}
`;

      const repairedAiText = await generateTripWithAI(repairPrompt);
      aiTrip = repairedAiText ? parseAiJson(repairedAiText) : null;
    }

    if (!aiTrip) {
      return res.status(500).json({
        success: false,
        message: "Trip generation is taking longer than expected. Please try again.",
      });
    }

    const { hotelCategory, priceRange } = getHotelPreferenceDetails(
      effectivePreferences.hotelType,
      travelers
    );

    const travelRecommendations = travelEstimates.map((travelEstimate, index) =>
      buildTravelRecommendations(
        destinations[index],
        destinations[index + 1],
        travelEstimate
      )
    );
    const normalizedTravelSegments = normalizeTravelSegments(
      aiTrip.travelSegments,
      travelEstimates
    ).map((segment, index) => {
      const fallbackEstimate = travelEstimates[index];
      const fallbackFrom = destinations[index] || "";
      const fallbackTo = destinations[index + 1] || "";
      const baseSegment = segment || fallbackEstimate;

      return {
        from: baseSegment?.from || fallbackFrom,
        to: baseSegment?.to || fallbackTo,
        distanceKm: baseSegment?.distanceKm || 0,
        distanceText: baseSegment?.distanceText || "",
        durationMinutes: baseSegment?.durationMinutes || 0,
        durationText: baseSegment?.durationText || "",
        summary:
          typeof (baseSegment as { summary?: string } | null)?.summary === "string"
            ? ((baseSegment as { summary?: string }).summary || "").trim()
            : "",
        recommendedBus: travelRecommendations[index]?.recommendedBus || "",
        recommendedRailway: travelRecommendations[index]?.recommendedRailway || "",
        recommendedAirport: travelRecommendations[index]?.recommendedAirport || "",
      };
    });
    const normalizedPlacesToVisit = normalizePlacesToVisit(aiTrip.placesToVisit);
    const groupedPlaces = buildDestinationPlacePool({
      placesToVisit: normalizedPlacesToVisit,
      destinationCards: aiTrip.destinations,
      destinations,
    });
    const normalizedItinerary = improveCountryItinerary({
      itinerary: reduceRepeatedDestinationDays(buildStructuredItinerary({
      itinerary: normalizeItinerary(aiTrip.itinerary),
      destinations,
      travelSegments: normalizedTravelSegments,
      dayPlan,
      groupedPlaces,
    }), groupedPlaces),
      countryInsights,
      destinations,
    });

    return res.status(200).json({
      success: true,
      trip: {
        tripTitle:
          typeof aiTrip.tripTitle === "string" && aiTrip.tripTitle.trim()
            ? aiTrip.tripTitle.trim()
            : `${destinations.join(" to ")} Trip`,
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
              : destinations.join(" -> "),
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
        destinations: normalizeDestinations(
          aiTrip.destinations,
          destinations,
          dayPlan,
          groupedPlaces
        ),
        travelSegments: normalizedTravelSegments,
        travelSegment: normalizedTravelSegments[0] || null,
        itinerary: normalizeItineraryLength(
          normalizedItinerary,
          requestedDays,
          destinations[destinations.length - 1]
        ),
        placesToVisit: normalizedPlacesToVisit,
        hotels: buildHotelOptions(destinations, hotelCategory, priceRange),
        foodRecommendations: normalizeRecommendationList(aiTrip.foodRecommendations, destinations),
        travelTips: normalizeTravelTips(aiTrip.travelTips),
        estimatedBudget: {
          perDay: `Rs ${Math.round(perDayCost)}`,
          total: `Rs ${totalCost}`,
          note:
            destinations.length > 1
              ? `Approximate cost for ${travelerDetails.label} on a ${finalBudget} budget across ${destinations.join(", ")}. This estimate factors in ${effectivePreferences.hotelType} stays, a ${effectivePreferences.travelPace} pace, ${effectivePreferences.transportPreference} transport, ${effectivePreferences.foodPreference} meals, around ${budgetEstimate.estimatedRooms} room${budgetEstimate.estimatedRooms === 1 ? "" : "s"} per night, and about Rs ${budgetEstimate.travelLegCost} for inter-city transfers.`
              : `Approximate cost for ${travelerDetails.label} on a ${finalBudget} budget in ${destinations[0]}. This estimate factors in ${effectivePreferences.hotelType} stays, a ${effectivePreferences.travelPace} pace, ${effectivePreferences.transportPreference} transport, ${effectivePreferences.foodPreference} meals, and around ${budgetEstimate.estimatedRooms} room${budgetEstimate.estimatedRooms === 1 ? "" : "s"} per night.`,
        },
        travelerDetails,
        appliedPreferences: tripPreferencesForGeneration,
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
    const {
      destination,
      secondDestination,
      thirdDestination,
      days,
      budgetType,
      travelers,
      adults,
      children,
      travelerDetails,
      tripData,
    } =
      req.body;

    if (!destination || !days || !budgetType || !travelers || !tripData) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const travelerValidationMessage = validateTravelerCounts(
      travelers,
      Number(adults),
      Number(children)
    );

    if (travelerValidationMessage) {
      return res.status(400).json({
        success: false,
        message: travelerValidationMessage,
      });
    }

    const sanitizedTripData = sanitizeTripData(tripData);

    const trip = await Trip.create({
      user: req.user._id,
      destination,
      secondDestination,
      thirdDestination,
      days,
      budgetType,
      travelers,
      adults,
      children,
      travelerDetails,
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
   SHARE TRIP
========================================================= */
export const shareTrip = async (req: any, res: Response) => {
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

    if (!trip.shareSlug) {
      trip.shareSlug = buildShareSlug(trip);
    }

    trip.isPublicShared = true;
    trip.sharedAt = new Date();
    await trip.save();

    return res.status(200).json({
      success: true,
      shareSlug: trip.shareSlug,
    });
  } catch (error) {
    console.error("SHARE TRIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create share link",
    });
  }
};

/* =========================================================
   GET PUBLIC TRIP
========================================================= */
export const getPublicTripBySlug = async (req: Request, res: Response) => {
  try {
    const trip = await Trip.findOne({
      shareSlug: req.params.slug,
      isPublicShared: true,
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Shared trip not found",
      });
    }

    const tripObj = trip.toObject();

    return res.status(200).json({
      success: true,
      trip: {
        destination: tripObj.destination,
        secondDestination: tripObj.secondDestination,
        thirdDestination: tripObj.thirdDestination,
        days: tripObj.days,
        budgetType: tripObj.budgetType,
        travelers: tripObj.travelers,
        adults: tripObj.adults,
        children: tripObj.children,
        travelerDetails: tripObj.travelerDetails,
        createdAt: tripObj.createdAt,
        tripData: sanitizeTripData(tripObj.tripData),
      },
    });
  } catch (error) {
    console.error("GET PUBLIC TRIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch shared trip",
    });
  }
};

/* =========================================================
   UPDATE TRIP
========================================================= */
export const updateTrip = async (req: any, res: Response) => {
  try {
    const { tripData } = req.body;

    if (!tripData || typeof tripData !== "object" || Array.isArray(tripData)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trip data",
      });
    }

    const sanitizedTripData = sanitizeTripData(tripData);

    const trip = await Trip.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      {
        $set: {
          tripData: sanitizedTripData,
        },
      },
      {
        new: true,
      }
    );

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trip updated successfully",
      trip: {
        ...trip.toObject(),
        tripData: sanitizeTripData(trip.tripData),
      },
    });
  } catch (error) {
    console.error("UPDATE TRIP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update trip",
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
