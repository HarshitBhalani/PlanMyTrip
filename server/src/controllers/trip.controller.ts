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

type TravelerDetails = {
  adults: number;
  children: number;
  totalMembers: number;
  label: string;
};

const FAMILY_ADULT_LIMITS = { min: 2, max: 7 } as const;
const FAMILY_CHILD_LIMITS = { min: 0, max: 5 } as const;
const FRIENDS_ADULT_LIMITS = { min: 8, max: 15 } as const;

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

  const transportOverheadPerDay =
    travelerDetails.totalMembers >= 6 ? 400 : travelerDetails.totalMembers >= 4 ? 250 : 0;
  const effectiveGuests = travelerDetails.adults + travelerDetails.children * 0.5;
  const estimatedRooms = Math.max(1, Math.ceil(effectiveGuests / 2));
  const basePerDayCost =
    travelerDetails.adults * perPersonBudget.adult +
    travelerDetails.children * perPersonBudget.child +
    estimatedRooms * transportOverheadPerDay;
  const destinationWeightedStayCost = destinations.reduce((total, destination, index) => {
    const allocatedDays = dayPlan[index] || 1;
    const destinationFactor = getDestinationCostFactor(destination);

    return total + basePerDayCost * destinationFactor * allocatedDays;
  }, 0);
  const travelLegCost = travelEstimates.reduce((total, estimate) => {
    if (!estimate) {
      return total + Math.max(1200, travelerDetails.totalMembers * 450);
    }

    const roadCostPerKm =
      budgetType === "luxury" ? 18 : budgetType === "cheap" ? 8 : 12;
    const sharedTransferFloor =
      budgetType === "luxury" ? 4000 : budgetType === "cheap" ? 1200 : 2200;
    const distanceDrivenCost = estimate.distanceKm * roadCostPerKm;
    const groupTransferCost =
      travelerDetails.totalMembers >= 6
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

const createFallbackDestinationDay = (destination: string, localDayNumber: number) => ({
  phaseType: "destination" as const,
  phaseTitle: `${destination} - Day ${localDayNumber}`,
  destination,
  morning: `Start the day with the main highlights of ${destination} at a comfortable pace.`,
  afternoon: `Continue sightseeing around ${destination} with family-friendly local attractions.`,
  evening: `Enjoy local food, a relaxed walk, and rest for the next day.`,
  localTravelTip: `Keep local transport flexible and leave buffer time around major attractions in ${destination}.`,
});

type TravelSegmentContext = {
  durationMinutes?: number;
  durationText?: string;
  distanceText?: string;
} | null;

const mentionsDestination = (value: string, destination: string) => {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedDestination = normalizeDestination(destination).toLowerCase();

  return Boolean(normalizedDestination) && normalizedValue.includes(normalizedDestination);
};

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
          createFallbackDestinationDay(destination, localDay + 1);

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
      stayDays:
        typeof item?.stayDays === "string" && item.stayDays.trim()
          ? item.stayDays.trim()
          : `${dayPlan[index] || 1} day${dayPlan[index] === 1 ? "" : "s"}`,
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

const buildPrompt = ({
  destinations,
  days,
  travelers,
  travelerDetails,
  travelEstimates,
}: {
  destinations: string[];
  days: number;
  travelers: string;
  travelerDetails: TravelerDetails;
  travelEstimates: Array<TravelEstimate | null>;
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

Trip Input:
- Destination Count: ${destinations.length}
- Destinations:
${destinationList}
- Total Days: ${days}
- Travelers: ${travelers}
- Party Details: ${travelerDetails.label} (${travelerDetails.adults} adults, ${travelerDetails.children} children)
- Travel Legs:
${travelLegList}

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

    const preferences = await UserPreference.findOne({
      user: req.user._id,
    });

    const finalBudget = preferences?.budgetRange || budgetType;
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
      travelerDetails,
      requestedDays,
      destinations,
      dayPlan,
      travelEstimates
    );
    const perDayCost = budgetEstimate.perDayCost;
    const totalCost = budgetEstimate.totalCost;

    const prompt = buildPrompt({
      destinations,
      days: requestedDays,
      travelers,
      travelerDetails,
      travelEstimates,
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
    const groupedPlaces = groupItemsByDestination(normalizedPlacesToVisit, destinations);
    const normalizedItinerary = buildStructuredItinerary({
      itinerary: normalizeItinerary(aiTrip.itinerary),
      destinations,
      travelSegments: normalizedTravelSegments,
      dayPlan,
      groupedPlaces,
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
              ? `Approximate cost for ${travelerDetails.label} on a ${finalBudget} budget across ${destinations.join(", ")}. This estimate includes member count, destination-wise stay cost, around ${budgetEstimate.estimatedRooms} room${budgetEstimate.estimatedRooms === 1 ? "" : "s"} per night, and about Rs ${budgetEstimate.travelLegCost} for inter-city transfers.`
              : `Approximate cost for ${travelerDetails.label} on a ${finalBudget} budget in ${destinations[0]}. This estimate includes member count, destination stay cost, and around ${budgetEstimate.estimatedRooms} room${budgetEstimate.estimatedRooms === 1 ? "" : "s"} per night.`,
        },
        travelerDetails,
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
