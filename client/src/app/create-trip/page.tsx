"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, X } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "../lib/api";
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
  const [days, setDays] = useState<number | "">("");
  const [budgetType, setBudgetType] = useState("moderate");
  const [travelers, setTravelers] = useState("friends");
  const [loading, setLoading] = useState(false);
  const [tripResult, setTripResult] = useState<TripResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [destinationErrors, setDestinationErrors] = useState<{
    destination?: string;
    secondDestination?: string;
  }>({});
  const [daysError, setDaysError] = useState("");

  useEffect(() => {
    const preSelectedDestination = localStorage.getItem("preSelectedDestination");
    if (!preSelectedDestination) return;
    setDestination(preSelectedDestination);
    localStorage.removeItem("preSelectedDestination");
    toast.success(`Destination set to ${preSelectedDestination}!`);
  }, []);

  const validateDestinations = () => {
    const nextErrors: { destination?: string; secondDestination?: string } = {};
    const firstValidation = validateDestination(destination);
    let cleanedDestination = "";
    let cleanedSecondDestination = "";

    if (!firstValidation.isValid) {
      nextErrors.destination = firstValidation.message;
    } else {
      cleanedDestination = firstValidation.cleanedValue!;
    }

    if (showSecondDestination) {
      const secondValidation = validateDestination(secondDestination, {
        emptyMessage: "Please enter a destination",
      });
      if (!secondValidation.isValid) {
        nextErrors.secondDestination = secondValidation.message;
      } else {
        cleanedSecondDestination = secondValidation.cleanedValue!;
      }
      if (
        cleanedDestination &&
        cleanedSecondDestination &&
        isDuplicateDestination(cleanedDestination, cleanedSecondDestination)
      ) {
        nextErrors.secondDestination =
          "Second destination cannot be the same as the first destination";
      }
    }

    setDestinationErrors(nextErrors);
    return {
      isValid: Object.keys(nextErrors).length === 0,
      cleanedDestination,
      cleanedSecondDestination,
      firstError: nextErrors.destination,
      secondError: nextErrors.secondDestination,
    };
  };

  const resetSecondDestination = () => {
    setShowSecondDestination(false);
    setSecondDestination("");
    setDestinationErrors((current) => ({ destination: current.destination }));
  };

  const generateTrip = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
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
    const validation = validateDestinations();
    if (!validation.isValid) {
      toast.error("Invalid trip details", {
        description: validation.secondError || validation.firstError || "Please correct the destination fields",
      });
      return;
    }
    setLoading(true);
    setTripResult(null);
    setIsSaved(false);
    setHasUnsavedChanges(false);
    try {
      const response = await apiRequest(
        "/api/trip/generate",
        "POST",
        {
          destination: validation.cleanedDestination,
          secondDestination: validation.cleanedSecondDestination || undefined,
          days,
          budgetType,
          travelers,
        },
        token
      );
      if (!response.success) throw new Error(response.message || "Trip generation failed");
      setTripResult(response.trip);
      toast.success("Trip generated successfully");
    } catch {
      toast.error("Failed to generate trip", { description: "Please try again after some time" });
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
          days,
          budgetType,
          travelers,
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
        {/* Destination */}
        <div>
          <label className="font-semibold block mb-2 text-gray-900">Destination</label>
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

        {/* Second Destination */}
        {!showSecondDestination ? (
          <button
            type="button"
            onClick={() => setShowSecondDestination(true)}
            className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-left transition hover:border-gray-500 hover:bg-white"
          >
            <div className="flex items-center gap-3">
              <PlusCircle className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-semibold text-gray-900 text-sm">Add destination</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Create a multi-destination route with a combined itinerary
                </p>
              </div>
            </div>
          </button>
        ) : (
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
              <button
                type="button"
                onClick={resetSecondDestination}
                className="mt-8 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition hover:text-red-500 hover:border-red-300"
                aria-label="Remove second destination"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

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
            <OptionCard title="Just Me" desc="Solo" icon="🧍" selected={travelers === "solo"} onClick={() => setTravelers("solo")} />
            <OptionCard title="Couple" desc="Two travelers" icon="🥂" selected={travelers === "couple"} onClick={() => setTravelers("couple")} />
            <OptionCard title="Family" desc="Family trip" icon="🏡" selected={travelers === "family"} onClick={() => setTravelers("family")} />
            <OptionCard title="Friends" desc="Group travel" icon="⛵" selected={travelers === "friends"} onClick={() => setTravelers("friends")} />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-end pt-2">
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
              <div className="grid gap-4 md:grid-cols-2">
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
          {tripResult.travelSegment && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                Travel Leg
              </p>
              <h3 className="mt-2 text-xl font-semibold text-gray-900">
                {tripResult.travelSegment.from} to {tripResult.travelSegment.to}
              </h3>
              <div className="mt-3 grid gap-2 text-sm text-amber-900 md:grid-cols-2">
                <p><strong>Distance:</strong> {tripResult.travelSegment.distanceText}</p>
                <p><strong>Estimated travel time:</strong> {tripResult.travelSegment.durationText}</p>
              </div>
              {tripResult.travelSegment.summary && (
                <p className="mt-3 text-sm text-amber-900">{tripResult.travelSegment.summary}</p>
              )}
              {(tripResult.travelSegment.recommendedBus ||
                tripResult.travelSegment.recommendedRailway ||
                tripResult.travelSegment.recommendedAirport) && (
                <div className="mt-4 space-y-2 text-sm text-amber-900">
                  {tripResult.travelSegment.recommendedBus && (
                    <p><strong>Bus/Road:</strong> {tripResult.travelSegment.recommendedBus}</p>
                  )}
                  {tripResult.travelSegment.recommendedRailway && (
                    <p><strong>Railway:</strong> {tripResult.travelSegment.recommendedRailway}</p>
                  )}
                  {tripResult.travelSegment.recommendedAirport && (
                    <p><strong>Airport:</strong> {tripResult.travelSegment.recommendedAirport}</p>
                  )}
                </div>
              )}
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