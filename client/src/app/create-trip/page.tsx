"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "../lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function CreateTripPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [days, setDays] = useState<number | "">("");
  const [budgetType, setBudgetType] = useState("moderate");
  const [travelers, setTravelers] = useState("friends");

  const [loading, setLoading] = useState(false);
  const [tripResult, setTripResult] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load pre-selected destination from localStorage
  useEffect(() => {
    const preSelectedDestination = localStorage.getItem("preSelectedDestination");
    if (preSelectedDestination) {
      setDestination(preSelectedDestination);
      // Clear it after loading
      localStorage.removeItem("preSelectedDestination");
      // Show a toast
      toast.success(`Destination set to ${preSelectedDestination}! 🎉`);
    }
  }, []);

  /* =====================================================
     DESTINATION VALIDATION
  ===================================================== */
  const isValidDestination = (value: string) => {
    const text = value.trim().toLowerCase();

    if (text.length < 2 || text.length > 40) return false;
    if (!/^[a-zA-Z\s]+$/.test(text)) return false;

    const blockedWords = [
      "what",
      "how",
      "why",
      "explain",
      "define",
      "javascript",
      "react",
      "reactjs",
      "python",
      "java",
      "node",
      "code",
      "programming",
    ];

    if (blockedWords.some((w) => text.includes(w))) return false;
    if (text.endsWith("?")) return false;

    return true;
  };

  /* =====================================================
     GENERATE TRIP
  ===================================================== */
  const generateTrip = async () => {
    const token = localStorage.getItem("token");

    // 🔐 AUTH CHECK
    if (!token) {
      toast.error("Authentication required", {
        description: "Please login or register to generate your trip",
        action: {
          label: "Login",
          onClick: () => router.push("/auth/login"),
        },
      });
      return;
    }

    // BASIC CHECK
    if (!destination || !days) {
      toast.error("Missing details", {
        description: "Please enter destination and number of days",
      });
      return;
    }

    // DESTINATION VALIDATION
    if (!isValidDestination(destination)) {
      toast.error("Invalid destination", {
        description:
          "Please enter a valid city or tourist place name only",
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
        { destination, days, budgetType, travelers },
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Trip generation failed");
      }

      setTripResult(response.trip);

      toast.success("Trip generated successfully 🎉");
    } catch (err: any) {
      toast.error("Failed to generate trip", {
        description: "Please try again after some time",
      });
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     SAVE TRIP
  ===================================================== */
  const saveTrip = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Authentication required");
      return;
    }

    if (!tripResult) {
      toast.error("No trip to save");
      return;
    }

    // Check if already saved and no changes
    if (isSaved && !hasUnsavedChanges) {
      toast.info("Trip already saved", {
        description: "Make changes to save again",
      });
      return;
    }

    setSaving(true);

    try {
      const response = await apiRequest(
        "/api/trip/save",
        "POST",
        {
          tripData: tripResult,
          destination,
          days,
          budgetType,
          travelers,
        },
        token
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to save trip");
      }

      setIsSaved(true);
      setHasUnsavedChanges(false);

      toast.success("Trip saved successfully! 🎉", {
        description: "You can view it in your saved trips",
        action: {
          label: "View Saved Trips",
          onClick: () => router.push("/saved-trips"),
        },
      });
    } catch (err: any) {
      toast.error("Failed to save trip", {
        description: err.message || "Please try again",
      });
    } finally {
      setSaving(false);
    }
  };

  /* =====================================================
     EDIT FUNCTIONS
  ===================================================== */
  const markAsEdited = () => {
    if (isSaved) {
      setHasUnsavedChanges(true);
    }
  };

  const addDay = () => {
    if (!tripResult || !tripResult.itinerary) return;

    const newDayNumber = tripResult.itinerary.length + 1;
    const newDay = {
      day: newDayNumber,
      morning: "Add morning activities",
      afternoon: "Add afternoon activities",
      evening: "Add evening activities",
      localTravelTip: "Add local travel tip",
    };

    setTripResult({
      ...tripResult,
      itinerary: [...tripResult.itinerary, newDay],
    });

    markAsEdited();
    toast.success(`Day ${newDayNumber} added`);
  };

  const removeDay = (dayNumber: number) => {
    if (!tripResult || !tripResult.itinerary) return;

    if (tripResult.itinerary.length <= 1) {
      toast.error("Cannot remove the last day");
      return;
    }

    const updatedItinerary = tripResult.itinerary
      .filter((day: any) => day.day !== dayNumber)
      .map((day: any, index: number) => ({
        ...day,
        day: index + 1,
      }));

    setTripResult({
      ...tripResult,
      itinerary: updatedItinerary,
    });

    markAsEdited();
    toast.success(`Day ${dayNumber} removed`);
  };

  const updateDayField = (dayNumber: number, field: string, value: string) => {
    if (!tripResult || !tripResult.itinerary) return;

    const updatedItinerary = tripResult.itinerary.map((day: any) =>
      day.day === dayNumber ? { ...day, [field]: value } : day
    );

    setTripResult({
      ...tripResult,
      itinerary: updatedItinerary,
    });

    markAsEdited();
  };

  const updateTripTitle = (value: string) => {
    setTripResult({
      ...tripResult,
      tripTitle: value,
    });
    markAsEdited();
  };

  const updateTransport = (field: string, value: string) => {
    if (!tripResult) return;

    setTripResult({
      ...tripResult,
      transport: {
        ...tripResult.transport,
        [field]: value,
      },
    });

    markAsEdited();
  };

  const updateBudget = (field: string, value: string) => {
    if (!tripResult) return;

    setTripResult({
      ...tripResult,
      estimatedBudget: {
        ...tripResult.estimatedBudget,
        [field]: value,
      },
    });

    markAsEdited();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-2">
        Tell us your travel preferences 🏕️🌴
      </h1>
      <p className="text-gray-600 mb-8">
        Just provide some basic information, and our trip planner will generate
        a customized itinerary.
      </p>

      {/* ================= FORM ================= */}
      <div className="space-y-8">
        {/* DESTINATION */}
        <div>
          <label className="font-semibold block mb-2">
            Destination
          </label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ex: Goa, Dwarka, Manali"
            className="w-full border rounded-md px-4 py-2"
          />
        </div>

        {/* DAYS */}
        <div>
          <label className="font-semibold block mb-2">
            Number of days
          </label>
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            placeholder="Ex: 3"
            className="w-full border rounded-md px-4 py-2"
          />
        </div>

        {/* BUDGET */}
        <div>
          <label className="font-semibold block mb-4">
            Budget
          </label>
          <div className="grid md:grid-cols-3 gap-4">
            <OptionCard
              title="Cheap"
              desc="Low cost travel"
              icon="💵"
              selected={budgetType === "cheap"}
              onClick={() => setBudgetType("cheap")}
            />
            <OptionCard
              title="Moderate"
              desc="Balanced experience"
              icon="💰"
              selected={budgetType === "moderate"}
              onClick={() => setBudgetType("moderate")}
            />
            <OptionCard
              title="Luxury"
              desc="Premium travel"
              icon="💎"
              selected={budgetType === "luxury"}
              onClick={() => setBudgetType("luxury")}
            />
          </div>
        </div>

        {/* TRAVELERS */}
        <div>
          <label className="font-semibold block mb-4">
            Traveling with
          </label>
          <div className="grid md:grid-cols-4 gap-4">
            <OptionCard title="Just Me" desc="Solo" icon="🧍"
              selected={travelers === "solo"} onClick={() => setTravelers("solo")} />
            <OptionCard title="Couple" desc="Two travelers" icon="🥂"
              selected={travelers === "couple"} onClick={() => setTravelers("couple")} />
            <OptionCard title="Family" desc="Family trip" icon="🏡"
              selected={travelers === "family"} onClick={() => setTravelers("family")} />
            <OptionCard title="Friends" desc="Group travel" icon="⛵"
              selected={travelers === "friends"} onClick={() => setTravelers("friends")} />
          </div>
        </div>

        {/* BUTTON */}
        <div className="flex justify-end">
          <button
            onClick={generateTrip}
            disabled={loading}
            className={`px-6 py-3 rounded-md text-white ${
              loading ? "bg-gray-400" : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "Generating your trip..." : "Generate Trip"}
          </button>
        </div>
      </div>

      {/* ================= RESULT ================= */}
      {tripResult && (
        <div className="mt-12 border-t pt-10 space-y-8">
          {/* ACTION BUTTONS */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-6 py-3 rounded-md bg-[#1F2937] text-white hover:bg-gray-700"
            >
              {isEditing ? "Done Editing" : "Edit"}
            </button>
            <button
              onClick={saveTrip}
              disabled={saving || (isSaved && !hasUnsavedChanges)}
              className={`px-6 py-3 rounded-md text-white ${
                saving || (isSaved && !hasUnsavedChanges)
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#1F2937] hover:bg-gray-700"
              }`}
            >
              {saving ? "Saving..." : isSaved && !hasUnsavedChanges ? "Saved ✓" : "Save"}
            </button>
          </div>

          {/* TRIP TITLE */}
          {isEditing ? (
            <input
              type="text"
              value={tripResult.tripTitle}
              onChange={(e) => updateTripTitle(e.target.value)}
              className="text-3xl font-bold w-full border-b-2 border-gray-300 focus:border-black outline-none"
            />
          ) : (
            <h2 className="text-3xl font-bold">{tripResult.tripTitle}</h2>
          )}

          {/* TRANSPORT */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">How to Reach</h3>
            {isEditing ? (
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-600">Railway:</label>
                  <input
                    type="text"
                    value={tripResult.transport?.railwayStation || ""}
                    onChange={(e) => updateTransport("railwayStation", e.target.value)}
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Bus:</label>
                  <input
                    type="text"
                    value={tripResult.transport?.busStation || ""}
                    onChange={(e) => updateTransport("busStation", e.target.value)}
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Airport:</label>
                  <input
                    type="text"
                    value={tripResult.transport?.airport || ""}
                    onChange={(e) => updateTransport("airport", e.target.value)}
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
              </div>
            ) : (
              <>
                <p><strong>Railway:</strong> {tripResult.transport?.railwayStation}</p>
                <p><strong>Bus:</strong> {tripResult.transport?.busStation}</p>
                <p><strong>Airport:</strong> {tripResult.transport?.airport}</p>
              </>
            )}
          </div>

          {/* ITINERARY */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Itinerary</h3>
              {isEditing && (
                <button
                  onClick={addDay}
                  className="px-4 py-2 bg-[#1F2937] text-white rounded-md hover:bg-gray-700"
                >
                  + Add Day
                </button>
              )}
            </div>

            {tripResult.itinerary?.map((day: any) => (
              <div key={day.day} className="border rounded-lg p-5 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-lg">Day {day.day}</h3>
                  {isEditing && (
                    <button
                      onClick={() => removeDay(day.day)}
                      className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                    >
                      Remove Day
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Morning:</label>
                      <textarea
                        value={day.morning}
                        onChange={(e) => updateDayField(day.day, "morning", e.target.value)}
                        className="w-full border rounded px-3 py-2 mt-1"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Afternoon:</label>
                      <textarea
                        value={day.afternoon}
                        onChange={(e) => updateDayField(day.day, "afternoon", e.target.value)}
                        className="w-full border rounded px-3 py-2 mt-1"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Evening:</label>
                      <textarea
                        value={day.evening}
                        onChange={(e) => updateDayField(day.day, "evening", e.target.value)}
                        className="w-full border rounded px-3 py-2 mt-1"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Local Travel Tip:</label>
                      <input
                        type="text"
                        value={day.localTravelTip}
                        onChange={(e) => updateDayField(day.day, "localTravelTip", e.target.value)}
                        className="w-full border rounded px-3 py-2 mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <p><strong>Morning:</strong> {day.morning}</p>
                    <p><strong>Afternoon:</strong> {day.afternoon}</p>
                    <p><strong>Evening:</strong> {day.evening}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Tip: {day.localTravelTip}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* HOTELS */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-semibold">Hotel Options</h3>
            </div>

            {tripResult.hotels?.map((hotel: any, i: number) => (
              <div key={i} className="border p-4 rounded-lg mb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{hotel.name}</p>
                    <p>{hotel.priceRangePerNight}</p>
                  </div>
                  <a
                    href={hotel.bookingUrl}
                    target="_blank"
                    className="bg-black text-white px-4 py-2 rounded"
                  >
                    Book
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* BUDGET */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold">Estimated Budget</h3>
            {isEditing ? (
              <div className="space-y-2 mt-2">
                <div>
                  <label className="text-sm text-gray-600">Per Day:</label>
                  <input
                    type="text"
                    value={tripResult.estimatedBudget?.perDay || ""}
                    onChange={(e) => updateBudget("perDay", e.target.value)}
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Total:</label>
                  <input
                    type="text"
                    value={tripResult.estimatedBudget?.total || ""}
                    onChange={(e) => updateBudget("total", e.target.value)}
                    className="w-full border rounded px-2 py-1 mt-1"
                  />
                </div>
              </div>
            ) : (
              <>
                <p><strong>Per Day:</strong> {tripResult.estimatedBudget?.perDay}</p>
                <p><strong>Total:</strong> {tripResult.estimatedBudget?.total}</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- CARD ---------- */
function OptionCard({ title, desc, icon, selected, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-4 cursor-pointer transition ${
        selected ? "border-black bg-gray-50" : "hover:border-gray-400"
      }`}>
      <div className="text-2xl">{icon}</div>
      <h3 className="font-semibold mt-2">{title}</h3>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}
