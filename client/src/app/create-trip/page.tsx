"use client";

import { useState } from "react";
import { apiRequest } from "../lib/api";
import { useRouter } from "next/navigation";

export default function CreateTripPage() {
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [days, setDays] = useState<number | "">("");
  const [budgetType, setBudgetType] = useState("moderate");
  const [travelers, setTravelers] = useState("friends");

  const [loading, setLoading] = useState(false);
  const [tripResult, setTripResult] = useState<any>(null);
  const [error, setError] = useState("");

  const generateTrip = async () => {
    setError("");

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please login or register to generate your trip.");
      return;
    }

    if (!destination || !days) {
      setError("Please fill destination and number of days.");
      return;
    }

    setLoading(true);
    setTripResult(null);

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
    } catch (err: any) {
      if (
        err.message?.toLowerCase().includes("token") ||
        err.message?.toLowerCase().includes("authorized")
      ) {
        setError("Please login or register to generate your trip.");
      } else {
        setError("Unable to generate trip. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* HEADER */}
      <h1 className="text-3xl font-bold mb-2">
        Tell us your travel preferences 🏕️🌴
      </h1>
      <p className="text-gray-600 mb-8">
        Just provide some basic information, and our trip planner will generate
        a customized itinerary based on your preferences.
      </p>

      {/* ================= FORM ================= */}
      <div className="space-y-8">
        {/* DESTINATION */}
        <div>
          <label className="font-semibold block mb-2">
            What is destination of choice?
          </label>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Ex: Goa"
            className="w-full border rounded-md px-4 py-2"
          />
        </div>

        {/* DAYS */}
        <div>
          <label className="font-semibold block mb-2">
            How many days are you planning your trip?
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
            What is Your Budget?
          </label>
          <div className="grid md:grid-cols-3 gap-4">
            <OptionCard title="Cheap" desc="Low cost travel" icon="💵"
              selected={budgetType === "cheap"} onClick={() => setBudgetType("cheap")} />
            <OptionCard title="Moderate" desc="Balanced experience" icon="💰"
              selected={budgetType === "moderate"} onClick={() => setBudgetType("moderate")} />
            <OptionCard title="Luxury" desc="Premium travel" icon="💎"
              selected={budgetType === "luxury"} onClick={() => setBudgetType("luxury")} />
          </div>
        </div>

        {/* TRAVELERS */}
        <div>
          <label className="font-semibold block mb-4">
            Who do you plan on traveling with?
          </label>
          <div className="grid md:grid-cols-4 gap-4">
            <OptionCard title="Just Me" desc="Solo traveler" icon="🧍"
              selected={travelers === "solo"} onClick={() => setTravelers("solo")} />
            <OptionCard title="Couple" desc="Two travelers" icon="🥂"
              selected={travelers === "couple"} onClick={() => setTravelers("couple")} />
            <OptionCard title="Family" desc="Family trip" icon="🏡"
              selected={travelers === "family"} onClick={() => setTravelers("family")} />
            <OptionCard title="Friends" desc="Group travel" icon="⛵"
              selected={travelers === "friends"} onClick={() => setTravelers("friends")} />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="border rounded-md p-4 bg-red-50">
            <p className="text-red-700 font-medium mb-2">{error}</p>
            <div className="flex gap-3">
              <a href="/auth/login" className="px-4 py-2 bg-black text-white rounded">Login</a>
              <a href="/auth/signup" className="px-4 py-2 border rounded">Register</a>
            </div>
          </div>
        )}

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
          <h2 className="text-3xl font-bold">{tripResult.tripTitle}</h2>

          {/* TRANSPORT */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">How to Reach</h3>
            <p><strong>Railway:</strong> {tripResult.transport?.railwayStation}</p>
            <p><strong>Bus:</strong> {tripResult.transport?.busStation}</p>
            <p><strong>Airport:</strong> {tripResult.transport?.airport}</p>
          </div>

          {/* ITINERARY */}
          {tripResult.itinerary?.map((day: any) => (
            <div key={day.day} className="border rounded-lg p-5">
              <h3 className="font-semibold text-lg mb-2">Day {day.day}</h3>
              <p><strong>Morning:</strong> {day.morning}</p>
              <p><strong>Afternoon:</strong> {day.afternoon}</p>
              <p><strong>Evening:</strong> {day.evening}</p>
              <p className="text-sm text-gray-500 mt-2">Tip: {day.localTravelTip}</p>
            </div>
          ))}

          {/* HOTELS */}
          <div>
            <h3 className="text-xl font-semibold mb-3">Hotel Options</h3>
            {tripResult.hotels?.map((hotel: any, i: number) => (
              <div key={i} className="border p-4 rounded-lg flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold">{hotel.name}</p>
                  <p>{hotel.priceRangePerNight}</p>
                  <p>⭐ {hotel.rating}</p>
                </div>
                <a
                  href={hotel.bookingUrl}
                  target="_blank"
                  className="bg-black text-white px-4 py-2 rounded"
                >
                  Book
                </a>
              </div>
            ))}
          </div>

          {/* BUDGET */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold">Estimated Budget</h3>
            <p><strong>Per Day:</strong> {tripResult.estimatedBudget?.perDay}</p>
            <p><strong>Total:</strong> {tripResult.estimatedBudget?.total}</p>
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
      }`}
    >
      <div className="text-2xl">{icon}</div>
      <h3 className="font-semibold mt-2">{title}</h3>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}
