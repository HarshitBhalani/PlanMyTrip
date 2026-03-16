"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  destination: string;
  onClose: () => void;
}

export default function TripPreferenceModal({
  destination,
  onClose,
}: Props) {
  const router = useRouter();

  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState("medium");
  const [travelers, setTravelers] = useState("couple");

  const proceed = () => {
    router.push(
      `/create-trip?destination=${destination}&days=${days}&budget=${budget}&travelers=${travelers}`
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          Plan your {destination} trip
        </h2>

        {/* DAYS */}
        <label className="block mb-2 font-medium">
          How many days?
        </label>
        <input
          type="number"
          min={1}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border w-full p-2 mb-4"
        />

        {/* BUDGET */}
        <label className="block mb-2 font-medium">
          Budget
        </label>
        <select
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          className="border w-full p-2 mb-4"
        >
          <option value="cheap">Cheap</option>
          <option value="medium">Moderate</option>
          <option value="luxury">Luxury</option>
        </select>

        {/* TRAVELERS */}
        <label className="block mb-2 font-medium">
          Who are you traveling with?
        </label>
        <select
          value={travelers}
          onChange={(e) => setTravelers(e.target.value)}
          className="border w-full p-2 mb-6"
        >
          <option value="solo">🧍 Just Me (Solo)</option>
          <option value="couple">🥂 Couple</option>
          <option value="family">🏡 Family</option>
          <option value="friends">⛵ Friends</option>
        </select>

        {/* ACTIONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded"
          >
            Cancel
          </button>
          <button
            onClick={proceed}
            className="px-4 py-2 bg-black text-white rounded"
          >
            Generate AI Trip
          </button>
        </div>
      </div>
    </div>
  );
}
