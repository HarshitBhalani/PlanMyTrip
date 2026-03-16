"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Map, PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../lib/api";
import {
  clearPendingTripDraft,
  getPendingTripDraft,
  savePendingTripDraft,
  savePostAuthRedirect,
} from "../lib/pending-trip";
import {
  isDuplicateDestination,
  normalizeDestination,
  validateDestination,
} from "@/utils/destination";

type TravelPreview = {
  from: string;
  to: string;
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
  summary?: string;
  recommendedBus?: string;
  recommendedRailway?: string;
  recommendedAirport?: string;
};

type TripDay = {
  day: number;
  phaseType?: "destination" | "travel";
  phaseTitle?: string;
  destination?: string;
  morning: string;
  afternoon: string;
  evening: string;
  localTravelTip: string;
};

type TripResult = {
  tripTitle: string;
  overview?: {
    bestTimeToVisit?: string;
    weatherNote?: string;
    routeSummary?: string;
  };
  transport?: {
    railwayStation?: string;
    busStation?: string;
    airport?: string;
  };
  destinations?: Array<{
    name: string;
    stayDays?: string;
    summary?: string;
    highlights?: string[];
  }>;
  travelSegments?: TravelPreview[];
  travelSegment?: TravelPreview | null;
  itinerary?: TripDay[];
  hotels?: Array<{
    name: string;
    category: string;
    priceRangePerNight: string;
    bookingUrl: string;
  }>;
  estimatedBudget?: {
    perDay?: string;
    total?: string;
    note?: string;
  };
  travelerDetails?: {
    adults: number;
    children: number;
    totalMembers: number;
    label: string;
  };
};

const FAMILY_ADULT_LIMITS = {
  min: 2,
  max: 7,
} as const;

const FAMILY_CHILD_LIMITS = {
  min: 0,
  max: 5,
} as const;

const FRIENDS_ADULT_LIMITS = {
  min: 8,
  max: 15,
} as const;

const normalizeTravelerErrorMessage = (message?: string) => {
  if (!message) {
    return message;
  }

  if (message.includes("Adults must be an integer between 4 and 7")) {
    return `Adults must be between ${FAMILY_ADULT_LIMITS.min} and ${FAMILY_ADULT_LIMITS.max}`;
  }

  return message;
};

const getTravelerConfig = (
  travelers: string,
  adults: number,
  children: number
) => {
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

  const safeAdults =
    travelers === "family"
      ? Math.max(FAMILY_ADULT_LIMITS.min, adults)
      : Math.max(0, adults);
  const safeChildren =
    travelers === "family"
      ? Math.min(FAMILY_CHILD_LIMITS.max, Math.max(FAMILY_CHILD_LIMITS.min, children))
      : Math.max(0, children);
  const totalMembers = safeAdults + safeChildren;
  const baseLabel = travelers === "family" ? "Family" : "Friends";

  return {
    adults: safeAdults,
    children: safeChildren,
    totalMembers,
    label: `${baseLabel}, ${totalMembers} member${totalMembers === 1 ? "" : "s"}`,
  };
};

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm text-gray-600">{label}:</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>
  );
}

function FieldArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-gray-600">{label}:</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
        rows={2}
      />
    </div>
  );
}

function OptionCard({ title, desc, icon, selected, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`border-2 rounded-xl p-4 cursor-pointer transition-all duration-150 ${
        selected
          ? "border-gray-900 bg-gray-900 text-white"
          : "border-gray-200 hover:border-gray-400 bg-white"
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <h3 className={`font-semibold mt-2 text-sm ${selected ? "text-white" : "text-gray-900"}`}>
        {title}
      </h3>
      <p className={`text-xs mt-0.5 ${selected ? "text-gray-300" : "text-gray-500"}`}>{desc}</p>
    </div>
  );
}

const ordinalLabel = (index: number) => {
  const labels = ["1ST", "2ND", "3RD", "4TH", "5TH"];
  return labels[index] ?? `${index + 1}TH`;
};

export default function CreateTripPage() {
  const router = useRouter();
  const [destination, setDestination] = useState("");
  const [showSecondDestination, setShowSecondDestination] = useState(false);
  const [secondDestination, setSecondDestination] = useState("");
  const [showThirdDestination, setShowThirdDestination] = useState(false);
  const [thirdDestination, setThirdDestination] = useState("");
  const [days, setDays] = useState<number | "">("");
  const [budgetType, setBudgetType] = useState("moderate");
  const [travelers, setTravelers] = useState("couple");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [destinationErrors, setDestinationErrors] = useState<{
    destination?: string;
    secondDestination?: string;
    thirdDestination?: string;
  }>({});
  const [travelPreviews, setTravelPreviews] = useState<TravelPreview[]>([]);
  const [daysError, setDaysError] = useState("");
  const [travelerError, setTravelerError] = useState("");
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

  const resetTripForm = () => {
    setDestination("");
    setShowSecondDestination(false);
    setSecondDestination("");
    setShowThirdDestination(false);
    setThirdDestination("");
    setDays("");
    setBudgetType("moderate");
    setTravelers("couple");
    setAdults(2);
    setChildren(0);
    setTravelPreviews([]);
    setDaysError("");
    setTravelerError("");
    setDestinationErrors({});
    clearPendingTripDraft();
  };

  useEffect(() => {
    if (!loading) {
      setGenerationElapsedSeconds(0);
      return;
    }

    const timer = window.setInterval(() => {
      setGenerationElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [loading]);

  const generationStatusMessage =
    generationElapsedSeconds >= 35
      ? "This is taking longer than usual. The backend or AI service may still be processing your trip."
      : generationElapsedSeconds >= 15
        ? "Building a detailed itinerary across all selected destinations."
        : "Preparing route flow, stay plan, and destination recommendations.";
  const requiresMemberBreakdown = travelers === "family" || travelers === "friends";
  const travelerConfig = getTravelerConfig(travelers, adults, children);

  useEffect(() => {
    const pendingDraft = getPendingTripDraft();

    if (pendingDraft) {
      setDestination(pendingDraft.destination || "");
      setShowSecondDestination(pendingDraft.showSecondDestination);
      setSecondDestination(pendingDraft.secondDestination || "");
      setShowThirdDestination(pendingDraft.showThirdDestination);
      setThirdDestination(pendingDraft.thirdDestination || "");
      setDays(pendingDraft.days);
      setBudgetType(pendingDraft.budgetType || "moderate");
      setTravelers(pendingDraft.travelers || "couple");
      setAdults(typeof pendingDraft.adults === "number" ? pendingDraft.adults : 2);
      setChildren(typeof pendingDraft.children === "number" ? pendingDraft.children : 0);
    }

    const preSelectedDestination = localStorage.getItem("preSelectedDestination");
    if (preSelectedDestination && !(pendingDraft?.destination || "").trim()) {
      const preSelectedMeta = localStorage.getItem("preSelectedDestinationMeta");
      setDestination(preSelectedDestination);

      if (preSelectedMeta) {
        try {
          const parsedMeta = JSON.parse(preSelectedMeta) as {
            mode?: "state" | "country";
            country?: string;
            state?: string;
          };
          const description =
            parsedMeta.mode === "state" && parsedMeta.state && parsedMeta.country
              ? `${parsedMeta.state}, ${parsedMeta.country} selected from map`
              : parsedMeta.country
                ? `${parsedMeta.country} selected from map`
                : undefined;

          toast.success(`Destination set to ${preSelectedDestination}!`, { description });
        } catch {
          toast.success(`Destination set to ${preSelectedDestination}!`);
        }
      } else {
        toast.success(`Destination set to ${preSelectedDestination}!`);
      }
    }

    localStorage.removeItem("preSelectedDestination");
    localStorage.removeItem("preSelectedDestinationMeta");
    setHasLoadedDraft(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    savePendingTripDraft({
      destination,
      showSecondDestination,
      secondDestination,
      showThirdDestination,
      thirdDestination,
      days,
      budgetType,
      travelers,
      adults,
      children,
    });
  }, [
    hasLoadedDraft,
    destination,
    showSecondDestination,
    secondDestination,
    showThirdDestination,
    thirdDestination,
    days,
    budgetType,
    travelers,
    adults,
    children,
  ]);

  useEffect(() => {
    const values = [
      normalizeDestination(destination),
      showSecondDestination ? normalizeDestination(secondDestination) : "",
      showThirdDestination ? normalizeDestination(thirdDestination) : "",
    ].filter(Boolean);

    if (values.length < 2) {
      setTravelPreviews([]);
      return;
    }

    const validations = values.map((value) => validateDestination(value));
    if (validations.some((result) => !result.isValid)) {
      setTravelPreviews([]);
      return;
    }

    if (new Set(values.map((value) => value.toLowerCase())).size !== values.length) {
      setTravelPreviews([]);
      return;
    }

    let isActive = true;

    const loadTravelPreviews = async () => {
      try {
        const previews = await Promise.all(
          values.slice(0, -1).map(async (fromDestination, index) => {
            const response = await apiRequest("/api/trip/distance-preview", "POST", {
              destination: fromDestination,
              secondDestination: values[index + 1],
            });

            return response.success ? response.travel : null;
          })
        );

        if (isActive) {
          setTravelPreviews(previews.filter(Boolean));
        }
      } catch {
        if (isActive) {
          setTravelPreviews([]);
        }
      }
    };

    loadTravelPreviews();

    return () => {
      isActive = false;
    };
  }, [destination, secondDestination, thirdDestination, showSecondDestination, showThirdDestination]);

  const validateDestinations = () => {
    const nextErrors: {
      destination?: string;
      secondDestination?: string;
      thirdDestination?: string;
    } = {};
    const validations = [
      validateDestination(destination),
      showSecondDestination
        ? validateDestination(secondDestination, { emptyMessage: "Please enter a destination" })
        : null,
      showThirdDestination
        ? validateDestination(thirdDestination, { emptyMessage: "Please enter a destination" })
        : null,
    ];

    const cleanedDestinations: string[] = [];
    const fields = ["destination", "secondDestination", "thirdDestination"] as const;

    validations.forEach((validation, index) => {
      if (!validation) return;

      if (!validation.isValid) {
        nextErrors[fields[index]] = validation.message;
        return;
      }

      if (
        cleanedDestinations.some((addedDestination) =>
          isDuplicateDestination(addedDestination, validation.cleanedValue!)
        )
      ) {
        nextErrors[fields[index]] = "Destination already added";
        return;
      }

      cleanedDestinations.push(validation.cleanedValue!);
    });

    setDestinationErrors(nextErrors);

    return {
      isValid: Object.keys(nextErrors).length === 0,
      cleanedDestinations,
      firstError: nextErrors.destination,
      secondError: nextErrors.secondDestination,
      thirdError: nextErrors.thirdDestination,
    };
  };

  const resetSecondDestination = () => {
    setShowSecondDestination(false);
    setSecondDestination("");
    setShowThirdDestination(false);
    setThirdDestination("");
    setTravelPreviews([]);
    setDestinationErrors((current) => ({ destination: current.destination }));
  };

  const resetThirdDestination = () => {
    setShowThirdDestination(false);
    setThirdDestination("");
    setTravelPreviews((current) => current.slice(0, 1));
    setDestinationErrors((current) => ({
      destination: current.destination,
      secondDestination: current.secondDestination,
    }));
  };

  const generateTrip = async () => {
    if (loading) {
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      savePendingTripDraft({
        destination,
        showSecondDestination,
        secondDestination,
        showThirdDestination,
        thirdDestination,
        days,
        budgetType,
        travelers,
        adults,
        children,
      });
      savePostAuthRedirect("/create-trip");
      toast.error("Authentication required", {
        description: "Please login or register to generate your trip",
        action: { label: "Login", onClick: () => router.push("/auth/login") },
      });
      return;
    }
    if (!destination || !days) {
      toast.error("Missing details", { description: "Please enter destination and number of days" });
      return;
    }
    if (!Number.isInteger(Number(days)) || Number(days) < 1 || Number(days) > 15) {
      setDaysError("Trip duration must be between 1 and 15 days");
      toast.error("Invalid trip duration", { description: "Trip duration must be between 1 and 15 days" });
      return;
    }
    if (requiresMemberBreakdown) {
      const minAdults =
        travelers === "family" ? FAMILY_ADULT_LIMITS.min : FRIENDS_ADULT_LIMITS.min;
      const maxAdults =
        travelers === "family" ? FAMILY_ADULT_LIMITS.max : FRIENDS_ADULT_LIMITS.max;

      if (!Number.isInteger(adults) || adults < minAdults || adults > maxAdults) {
        const message = `Adults must be between ${minAdults} and ${maxAdults}`;
        setTravelerError(message);
        toast.error("Invalid travelers", { description: message });
        return;
      }

      if (!Number.isInteger(children) || children < 0 || (travelers === "family" && children > 5)) {
        const message =
          travelers === "family"
            ? `Children must be between ${FAMILY_CHILD_LIMITS.min} and ${FAMILY_CHILD_LIMITS.max}`
            : "Children must be 0 or more";
        setTravelerError(message);
        toast.error("Invalid travelers", { description: message });
        return;
      }
    }
    const validation = validateDestinations();
    if (!validation.isValid) {
      toast.error("Invalid trip details", {
        description:
          validation.thirdError ||
          validation.secondError ||
          validation.firstError ||
          "Please correct the destination fields",
      });
      return;
    }
    setLoading(true);
    setGenerationElapsedSeconds(0);
    setTripResult(null);
    setIsSaved(false);
    setHasUnsavedChanges(false);
    try {
      const response = await apiRequest(
        "/api/trip/generate",
        "POST",
        {
          destination: validation.cleanedDestinations[0],
          secondDestination: validation.cleanedDestinations[1] || undefined,
          thirdDestination: validation.cleanedDestinations[2] || undefined,
          days,
          budgetType,
          travelers,
          adults: requiresMemberBreakdown ? adults : undefined,
          children: requiresMemberBreakdown ? children : undefined,
        },
        token
      );
      if (!response.success) throw new Error(response.message || "Trip generation failed");
      setTripResult(response.trip);
      resetTripForm();
      toast.success("Trip generated successfully");
    } catch (err: any) {
      const description = normalizeTravelerErrorMessage(
        err?.message ||
          "The trip is taking longer than expected. Please wait a moment and try again."
      );
      toast.error("Failed to generate trip", {
        description,
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTrip = async () => {
    const token = localStorage.getItem("token");
    if (!token) { toast.error("Authentication required"); return; }
    if (!tripResult) { toast.error("No trip to save"); return; }
    if (isSaved && !hasUnsavedChanges) {
      toast.info("Trip already saved", { description: "Make changes to save again" });
      return;
    }
    setSaving(true);
    try {
      const response = await apiRequest(
        "/api/trip/save",
        "POST",
        {
          tripData: tripResult,
          destination: normalizeDestination(destination),
          secondDestination:
            showSecondDestination && secondDestination.trim()
              ? normalizeDestination(secondDestination)
              : undefined,
          thirdDestination:
            showThirdDestination && thirdDestination.trim()
              ? normalizeDestination(thirdDestination)
              : undefined,
          days,
          budgetType,
          travelers,
          travelerDetails: travelerConfig,
          adults: requiresMemberBreakdown ? adults : undefined,
          children: requiresMemberBreakdown ? children : undefined,
        },
        token
      );
      if (!response.success) throw new Error(response.message || "Failed to save trip");
      setIsSaved(true);
      setHasUnsavedChanges(false);
      toast.success("Trip saved successfully!", {
        description: "You can view it in your saved trips",
        action: { label: "View Saved Trips", onClick: () => router.push("/saved-trips") },
      });
    } catch (err: any) {
      toast.error("Failed to save trip", { description: err.message || "Please try again" });
    } finally {
      setSaving(false);
    }
  };

  const markAsEdited = () => { if (isSaved) setHasUnsavedChanges(true); };

  const addDay = () => {
    if (!tripResult?.itinerary) return;
    const newDayNumber = tripResult.itinerary.length + 1;
    const newDay: TripDay = {
      day: newDayNumber,
      phaseType: "destination",
      phaseTitle: `Day ${newDayNumber}`,
      destination: tripResult.destinations?.[tripResult.destinations.length - 1]?.name || "",
      morning: "Add morning activities",
      afternoon: "Add afternoon activities",
      evening: "Add evening activities",
      localTravelTip: "Add local travel tip",
    };
    setTripResult({ ...tripResult, itinerary: [...tripResult.itinerary, newDay] });
    markAsEdited();
    toast.success(`Day ${newDayNumber} added`);
  };

  const removeDay = (dayNumber: number) => {
    if (!tripResult?.itinerary) return;
    if (tripResult.itinerary.length <= 1) { toast.error("Cannot remove the last day"); return; }
    const updatedItinerary = tripResult.itinerary
      .filter((day) => day.day !== dayNumber)
      .map((day, index) => ({ ...day, day: index + 1 }));
    setTripResult({ ...tripResult, itinerary: updatedItinerary });
    markAsEdited();
    toast.success(`Day ${dayNumber} removed`);
  };

  const updateDayField = (
    dayNumber: number,
    field: keyof Pick<TripDay, "morning" | "afternoon" | "evening" | "localTravelTip">,
    value: string
  ) => {
    if (!tripResult?.itinerary) return;
    const updatedItinerary = tripResult.itinerary.map((day) =>
      day.day === dayNumber ? { ...day, [field]: value } : day
    );
    setTripResult({ ...tripResult, itinerary: updatedItinerary });
    markAsEdited();
  };

  const updateTripTitle = (value: string) => {
    if (!tripResult) return;
    setTripResult({ ...tripResult, tripTitle: value });
    markAsEdited();
  };

  const updateTransport = (field: keyof NonNullable<TripResult["transport"]>, value: string) => {
    if (!tripResult) return;
    setTripResult({ ...tripResult, transport: { ...tripResult.transport, [field]: value } });
    markAsEdited();
  };

  const updateBudget = (field: keyof NonNullable<TripResult["estimatedBudget"]>, value: string) => {
    if (!tripResult) return;
    setTripResult({ ...tripResult, estimatedBudget: { ...tripResult.estimatedBudget, [field]: value } });
    markAsEdited();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Page Header */}
      <h1 className="text-3xl font-bold mb-1 text-gray-900">Tell us your travel preferences 🏕️🌴</h1>
      <p className="text-gray-500 mb-10">
        Just provide some basic information, and our trip planner will generate a customized itinerary.
      </p>

      <div className="space-y-8">
        {/* Destinations */}
        <div className="space-y-4">
          <div>
            <label className="font-semibold block mb-2 text-gray-900">Destination</label>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1">
                <input
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setDestinationErrors((current) => ({ ...current, destination: undefined }));
                  }}
                  placeholder="Ex: Goa, Dwarka, Manali"
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition ${
                    destinationErrors.destination ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                />
                {destinationErrors.destination && (
                  <p className="mt-1.5 text-sm text-red-500">{destinationErrors.destination}</p>
                )}
              </div>
              <Link
                href="/map"
                className="inline-flex h-[50px] items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-500 hover:bg-gray-50"
              >
                <Map className="h-4 w-4" />
                Choose on map
              </Link>
              {!showSecondDestination && (
                <button
                  type="button"
                  onClick={() => setShowSecondDestination(true)}
                  className="inline-flex h-[50px] items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-500 hover:bg-white"
                >
                  <PlusCircle className="h-4 w-4" />
                  Add destination
                </button>
              )}
            </div>
          </div>

          {showSecondDestination && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all duration-300">
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="w-full">
                  <label className="font-semibold block mb-2 text-gray-900 text-sm">
                    Second destination
                  </label>
                  <input
                    value={secondDestination}
                    onChange={(e) => {
                      setSecondDestination(e.target.value);
                      setDestinationErrors((current) => ({ ...current, secondDestination: undefined }));
                    }}
                    placeholder="Ex: Trimbakeshwar"
                    className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition ${
                      destinationErrors.secondDestination ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {destinationErrors.secondDestination && (
                    <p className="mt-1.5 text-sm text-red-500">{destinationErrors.secondDestination}</p>
                  )}
                </div>
                <div className="mt-8 flex items-center gap-2">
                  {!showThirdDestination && normalizeDestination(secondDestination) && (
                    <button
                      type="button"
                      onClick={() => setShowThirdDestination(true)}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 text-sm font-semibold text-gray-700 transition hover:border-gray-500"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Add more destination
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={resetSecondDestination}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:text-red-500 hover:border-red-300"
                    aria-label="Remove second destination"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {showThirdDestination && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition-all duration-300">
              <div className="flex items-start justify-between gap-4 p-4">
                <div className="w-full">
                  <label className="font-semibold block mb-2 text-gray-900 text-sm">
                    Third destination
                  </label>
                  <input
                    value={thirdDestination}
                    onChange={(e) => {
                      setThirdDestination(e.target.value);
                      setDestinationErrors((current) => ({ ...current, thirdDestination: undefined }));
                    }}
                    placeholder="Ex: Shirdi"
                    className={`w-full border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition ${
                      destinationErrors.thirdDestination ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                  />
                  {destinationErrors.thirdDestination && (
                    <p className="mt-1.5 text-sm text-red-500">{destinationErrors.thirdDestination}</p>
                  )}
                  <p className="mt-2 text-xs text-gray-400">Maximum 3 destinations allowed</p>
                </div>
                <button
                  type="button"
                  onClick={resetThirdDestination}
                  className="mt-8 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:text-red-500 hover:border-red-300"
                  aria-label="Remove third destination"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {travelPreviews.length > 0 && (
            <div className="space-y-3">
              {travelPreviews.map((travelPreview, index) => (
                <div
                  key={`${travelPreview.from}-${travelPreview.to}-${index}`}
                  className="rounded-xl border border-amber-200 bg-amber-50 p-4"
                >
                  <p className="text-sm font-semibold text-amber-900">
                    Travel from {travelPreview.from} {"->"} {travelPreview.to}
                  </p>
                  <div className="mt-2 grid gap-1 text-sm text-amber-900 md:grid-cols-2">
                    <p><strong>Distance:</strong> {travelPreview.distanceText}</p>
                    <p><strong>Travel time:</strong> {travelPreview.durationText}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Number of Days */}
        <div>
          <label className="font-semibold block mb-2 text-gray-900">Number of days</label>
          <input
            type="number"
            value={days}
            min={1}
            max={15}
            onChange={(e) => {
              const value = e.target.value;
              setDays(value === "" ? "" : Number(value));
              setDaysError("");
            }}
            placeholder="Ex: 3"
            className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition ${
              daysError ? "border-red-400 bg-red-50" : "border-gray-200"
            }`}
          />
          {daysError && <p className="mt-1.5 text-sm text-red-500">{daysError}</p>}
        </div>

        {/* Budget */}
        <div>
          <label className="font-semibold block mb-3 text-gray-900">Budget</label>
          <div className="grid md:grid-cols-3 gap-3">
            <OptionCard title="Cheap" desc="Low cost travel" icon="💵" selected={budgetType === "cheap"} onClick={() => setBudgetType("cheap")} />
            <OptionCard title="Moderate" desc="Balanced experience" icon="💰" selected={budgetType === "moderate"} onClick={() => setBudgetType("moderate")} />
            <OptionCard title="Luxury" desc="Premium travel" icon="💎" selected={budgetType === "luxury"} onClick={() => setBudgetType("luxury")} />
          </div>
        </div>

        {/* Traveling With */}
        <div>
          <label className="font-semibold block mb-3 text-gray-900">Traveling with</label>
          <div className="grid md:grid-cols-4 gap-3">
            <OptionCard
              title="Just Me"
              desc="Solo"
              icon="🧍"
              selected={travelers === "solo"}
              onClick={() => {
                setTravelers("solo");
                setTravelerError("");
              }}
            />
            <OptionCard
              title="Couple"
              desc="Two travelers"
              icon="🥂"
              selected={travelers === "couple"}
              onClick={() => {
                setTravelers("couple");
                setTravelerError("");
              }}
            />
            <OptionCard
              title="Family"
              desc="Family trip"
              icon="🏡"
              selected={travelers === "family"}
              onClick={() => {
                setTravelers("family");
                setAdults((current) =>
                  current >= FAMILY_ADULT_LIMITS.min && current <= FAMILY_ADULT_LIMITS.max
                    ? current
                    : FAMILY_ADULT_LIMITS.min
                );
                setChildren((current) =>
                  current <= FAMILY_CHILD_LIMITS.max ? current : FAMILY_CHILD_LIMITS.max
                );
                setTravelerError("");
              }}
            />
            <OptionCard
              title="Friends"
              desc="Group travel"
              icon="⛵"
              selected={travelers === "friends"}
              onClick={() => {
                setTravelers("friends");
                setAdults((current) =>
                  current >= FRIENDS_ADULT_LIMITS.min && current <= FRIENDS_ADULT_LIMITS.max
                    ? current
                    : FRIENDS_ADULT_LIMITS.min
                );
                setTravelerError("");
              }}
            />
          </div>
          {requiresMemberBreakdown && (
            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Adults</label>
                  <input
                    type="number"
                    min={travelers === "family" ? FAMILY_ADULT_LIMITS.min : FRIENDS_ADULT_LIMITS.min}
                    max={travelers === "family" ? FAMILY_ADULT_LIMITS.max : FRIENDS_ADULT_LIMITS.max}
                    value={adults}
                    onChange={(e) => {
                      setAdults(Number(e.target.value));
                      setTravelerError("");
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Children</label>
                  <input
                    type="number"
                    min={FAMILY_CHILD_LIMITS.min}
                    max={travelers === "family" ? FAMILY_CHILD_LIMITS.max : undefined}
                    value={children}
                    onChange={(e) => {
                      setChildren(Number(e.target.value));
                      setTravelerError("");
                    }}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  />
                </div>
              </div>
              {travelerError && <p className="mt-2 text-sm text-red-500">{travelerError}</p>}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="pt-2 space-y-3">
          {loading && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-gray-700" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Generating your trip
                  </p>
                  <p className="text-xs text-gray-500">
                    {generationElapsedSeconds}s elapsed
                  </p>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-600">{generationStatusMessage}</p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={generateTrip}
              disabled={loading}
              className={`px-7 py-3 rounded-xl text-sm font-semibold text-white transition-all ${
                loading ? "bg-gray-300 cursor-not-allowed" : "bg-gray-900 hover:bg-gray-700"
              }`}
            >
              {loading ? "Generating your trip..." : "Generate Trip"}
            </button>
          </div>
        </div>
      </div>

      {/* Trip Result */}
      {tripResult && (
        <div className="mt-12 border-t pt-10 space-y-8">

          {/* Edit / Save Buttons */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white transition-all"
            >
              {isEditing ? "Done Editing" : "Edit"}
            </button>
            <button
              onClick={saveTrip}
              disabled={saving || (isSaved && !hasUnsavedChanges)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${
                saving || (isSaved && !hasUnsavedChanges)
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-900 hover:bg-gray-700"
              }`}
            >
              {saving ? "Saving..." : isSaved && !hasUnsavedChanges ? "Saved ✓" : "Save"}
            </button>
          </div>

          {/* Trip Title */}
          {isEditing ? (
            <input
              type="text"
              value={tripResult.tripTitle}
              onChange={(e) => updateTripTitle(e.target.value)}
              className="text-3xl font-bold w-full border-b-2 border-gray-200 focus:border-gray-900 outline-none pb-1 bg-transparent"
            />
          ) : (
            <h2 className="text-3xl font-bold text-gray-900">{tripResult.tripTitle}</h2>
          )}

          {/* Destination Flow */}
          {tripResult.destinations && tripResult.destinations.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Destination Flow</h3>
              <div
                className={`grid gap-4 ${
                  tripResult.destinations.length === 3
                    ? "md:grid-cols-2 xl:grid-cols-3"
                    : "md:grid-cols-2"
                }`}
              >
                {tripResult.destinations.map((stop, index) => (
                  <div key={stop.name} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                      {ordinalLabel(index)} Destination
                    </p>
                    <h4 className="mt-2 text-xl font-semibold text-gray-900">{stop.name}</h4>
                    {stop.stayDays && (
                      <p className="mt-1 text-sm text-gray-500">{stop.stayDays}</p>
                    )}
                    {stop.summary && (
                      <p className="mt-3 text-sm text-gray-600 leading-relaxed">{stop.summary}</p>
                    )}
                    {stop.highlights && stop.highlights.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {stop.highlights.map((highlight) => (
                          <span
                            key={`${stop.name}-${highlight}`}
                            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                          >
                            {highlight}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travel Segment */}
          {(tripResult.travelSegments || (tripResult.travelSegment ? [tripResult.travelSegment] : [])).length > 0 && (
            <div className="space-y-4">
              {(tripResult.travelSegments || (tripResult.travelSegment ? [tripResult.travelSegment] : [])).map((segment, index) => (
                <div key={`${segment?.from}-${segment?.to}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                    Travel Leg {index + 1}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900">
                    {segment?.from} to {segment?.to}
                  </h3>
                  <div className="mt-3 grid gap-2 text-sm text-amber-900 md:grid-cols-2">
                    <p><strong>Distance:</strong> {segment?.distanceText}</p>
                    <p><strong>Estimated travel time:</strong> {segment?.durationText}</p>
                  </div>
                  {segment?.summary && (
                    <p className="mt-3 text-sm text-amber-900">{segment.summary}</p>
                  )}
                  {(segment?.recommendedBus ||
                    segment?.recommendedRailway ||
                    segment?.recommendedAirport) && (
                    <div className="mt-4 space-y-2 text-sm text-amber-900">
                      {segment?.recommendedBus && (
                        <p><strong>Bus/Road:</strong> {segment.recommendedBus}</p>
                      )}
                      {segment?.recommendedRailway && (
                        <p><strong>Railway:</strong> {segment.recommendedRailway}</p>
                      )}
                      {segment?.recommendedAirport && (
                        <p><strong>Airport:</strong> {segment.recommendedAirport}</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* How to Reach */}
          {tripResult.transport && (
            <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl">
              <h3 className="font-semibold mb-3 text-gray-900">How to Reach</h3>
              {isEditing ? (
                <div className="space-y-2">
                  <FieldInput label="Railway" value={tripResult.transport.railwayStation || ""} onChange={(value) => updateTransport("railwayStation", value)} />
                  <FieldInput label="Bus" value={tripResult.transport.busStation || ""} onChange={(value) => updateTransport("busStation", value)} />
                  <FieldInput label="Airport" value={tripResult.transport.airport || ""} onChange={(value) => updateTransport("airport", value)} />
                </div>
              ) : (
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Railway:</strong> {tripResult.transport.railwayStation}</p>
                  <p><strong>Bus:</strong> {tripResult.transport.busStation}</p>
                  <p><strong>Airport:</strong> {tripResult.transport.airport}</p>
                </div>
              )}
            </div>
          )}

          {/* Itinerary */}
          {tripResult.itinerary && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Itinerary</h3>
                {isEditing && (
                  <button
                    onClick={addDay}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-700 transition"
                  >
                    + Add Day
                  </button>
                )}
              </div>

              {tripResult.itinerary.map((day) => {
                const isTravel = day.phaseType === "travel";
                return (
                  <div key={day.day} className="mb-3">
                    {/* Travel day — highlighted with amber banner */}
                    {isTravel && (
                      <div className="flex items-center gap-3 mb-2 px-1">
                        <div className="flex-1 h-px bg-amber-200" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 whitespace-nowrap">
                          🚌 Travel Day
                        </span>
                        <div className="flex-1 h-px bg-amber-200" />
                      </div>
                    )}

                    <div
                      className={`rounded-xl p-5 border ${
                        isTravel
                          ? "bg-amber-50 border-amber-200"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-semibold ${isTravel ? "text-amber-900" : "text-gray-900"}`}>
                            Day {day.day}
                          </h3>
                          {isTravel && day.phaseTitle && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                              {day.phaseTitle}
                            </span>
                          )}
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => removeDay(day.day)}
                            className="px-3 py-1 bg-red-50 text-red-500 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 transition"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <FieldArea label="Morning" value={day.morning} onChange={(value) => updateDayField(day.day, "morning", value)} />
                          <FieldArea label="Afternoon" value={day.afternoon} onChange={(value) => updateDayField(day.day, "afternoon", value)} />
                          <FieldArea label="Evening" value={day.evening} onChange={(value) => updateDayField(day.day, "evening", value)} />
                          <FieldInput label="Local Travel Tip" value={day.localTravelTip} onChange={(value) => updateDayField(day.day, "localTravelTip", value)} />
                        </div>
                      ) : (
                        <div className={`space-y-1.5 text-sm ${isTravel ? "text-amber-900" : "text-gray-700"}`}>
                          <p><strong>Morning:</strong> {day.morning}</p>
                          <p><strong>Afternoon:</strong> {day.afternoon}</p>
                          <p><strong>Evening:</strong> {day.evening}</p>
                          <p className={`text-xs mt-2 ${isTravel ? "text-amber-600" : "text-gray-400"}`}>
                            💡 {day.localTravelTip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Hotels */}
          {tripResult.hotels && (
            <div>
              <h3 className="text-xl font-semibold mb-4 text-gray-900">Hotel Options</h3>
              {tripResult.hotels.map((hotel, i) => (
                <div key={i} className="border border-gray-200 p-4 rounded-xl mb-3 bg-white">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{hotel.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">{hotel.priceRangePerNight}</p>
                    </div>
                    <a
                      href={hotel.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-gray-700 transition"
                    >
                      Book
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Budget */}
          {tripResult.estimatedBudget && (
            <div className="bg-green-50 border border-green-200 p-5 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-3">Estimated Budget</h3>
              {isEditing ? (
                <div className="space-y-2">
                  <FieldInput label="Per Day" value={tripResult.estimatedBudget.perDay || ""} onChange={(value) => updateBudget("perDay", value)} />
                  <FieldInput label="Total" value={tripResult.estimatedBudget.total || ""} onChange={(value) => updateBudget("total", value)} />
                </div>
              ) : (
                <div className="space-y-1 text-sm text-gray-700">
                  {tripResult.travelerDetails?.label && (
                    <p><strong>Travel group:</strong> {tripResult.travelerDetails.label}</p>
                  )}
                  <p><strong>Per Day:</strong> {tripResult.estimatedBudget.perDay}</p>
                  <p><strong>Total:</strong> {tripResult.estimatedBudget.total}</p>
                  {tripResult.estimatedBudget.note && (
                    <p className="mt-2 text-xs text-green-700">{tripResult.estimatedBudget.note}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
