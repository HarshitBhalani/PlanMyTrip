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

    // ✅ 1. Block if user not logged in
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
        {
          destination,
          days,
          budgetType,
          travelers,
        },
        token,
      );

      if (!response.success) {
        throw new Error(response.message || "Trip generation failed");
      }

      setTripResult(response.trip);
    } catch (err: any) {
      // ✅ 2. Friendly message mapping
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

      {/* FORM */}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <OptionCard
              title="Cheap"
              desc="Stay conscious of costs"
              icon="💵"
              selected={budgetType === "cheap"}
              onClick={() => setBudgetType("cheap")}
            />
            <OptionCard
              title="Moderate"
              desc="Keep cost on the average side"
              icon="💰"
              selected={budgetType === "moderate"}
              onClick={() => setBudgetType("moderate")}
            />
            <OptionCard
              title="Luxury"
              desc="Don't worry about cost"
              icon="💎"
              selected={budgetType === "luxury"}
              onClick={() => setBudgetType("luxury")}
            />
          </div>
        </div>

        {/* TRAVELERS */}
        <div>
          <label className="font-semibold block mb-4">
            Who do you plan on traveling with on your next adventure?
          </label>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <OptionCard
              title="Just Me"
              desc="A solo traveler in exploration"
              icon="🧍"
              selected={travelers === "solo"}
              onClick={() => setTravelers("solo")}
            />
            <OptionCard
              title="Couple"
              desc="Two travelers in tandem"
              icon="🥂"
              selected={travelers === "couple"}
              onClick={() => setTravelers("couple")}
            />
            <OptionCard
              title="Family"
              desc="A group of fun loving adventurers"
              icon="🏡"
              selected={travelers === "family"}
              onClick={() => setTravelers("family")}
            />
            <OptionCard
              title="Friends"
              desc="A bunch of thrill-seekers"
              icon="⛵"
              selected={travelers === "friends"}
              onClick={() => setTravelers("friends")}
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <p className="text-red-600 font-medium mt-4">
            {error && (
              <div className="mt-4 border rounded-md p-4 bg-red-50">
                <p className="text-red-700 font-medium mb-2">{error}</p>
                <div className="flex gap-3">
                  <a
                    href="/auth/login"
                    className="px-4 py-2 bg-black text-white rounded"
                  >
                    Login
                  </a>
                  <a href="/auth/signup" className="px-4 py-2 border rounded">
                    Register
                  </a>
                </div>
              </div>
            )}
          </p>
        )}

        {/* BUTTON */}
        <div className="flex justify-end">
          <button
            onClick={generateTrip}
            disabled={loading}
            className={`px-6 py-3 rounded-md text-white ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-black hover:bg-gray-800"
            }`}
          >
            {loading ? "Generating your trip..." : "Generate Trip"}
          </button>
        </div>
      </div>

      {/* RESULT */}
      {tripResult && (
        <div className="mt-12 border-t pt-10">
          <h2 className="text-2xl font-bold mb-4">{tripResult.tripTitle}</h2>

          <p className="text-gray-700 mb-6">
            {tripResult.overview?.weatherNote}
          </p>

          <div className="space-y-6">
            {tripResult.itinerary?.map((day: any) => (
              <div key={day.day} className="border rounded-lg p-5">
                <h3 className="font-semibold text-lg mb-2">Day {day.day}</h3>
                <ul className="space-y-1 text-gray-700">
                  <li>
                    <strong>Morning:</strong> {day.morning}
                  </li>
                  <li>
                    <strong>Afternoon:</strong> {day.afternoon}
                  </li>
                  <li>
                    <strong>Evening:</strong> {day.evening}
                  </li>
                  <li className="text-sm text-gray-500">
                    Tip: {day.localTravelTip}
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- REUSABLE CARD ---------- */

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
