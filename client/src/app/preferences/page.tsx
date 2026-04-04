"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

type TripPreferences = {
  budgetRange: "cheap" | "moderate" | "luxury";
  hotelType: "budget" | "premium" | "luxury";
  travelPace: "relaxed" | "balanced" | "packed";
  foodPreference: "veg" | "non-veg" | "both";
  transportPreference: "public" | "private" | "mixed";
};

const DEFAULT_TRIP_PREFERENCES: TripPreferences = {
  budgetRange: "moderate",
  hotelType: "budget",
  travelPace: "balanced",
  foodPreference: "veg",
  transportPreference: "mixed",
};

const normalizePreferences = (value?: Partial<TripPreferences> | null): TripPreferences => ({
  budgetRange:
    value?.budgetRange === "cheap" || value?.budgetRange === "moderate" || value?.budgetRange === "luxury"
      ? value.budgetRange
      : DEFAULT_TRIP_PREFERENCES.budgetRange,
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
    value?.transportPreference === "public" || value?.transportPreference === "private" || value?.transportPreference === "mixed"
      ? value.transportPreference
      : DEFAULT_TRIP_PREFERENCES.transportPreference,
});

function PreferenceSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState<TripPreferences>(DEFAULT_TRIP_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setLoading(false);
      return;
    }

    let isActive = true;

    const loadPreferences = async () => {
      try {
        const response = await apiRequest("/api/user/preferences", "GET", undefined, token);
        if (isActive) {
          setPrefs(normalizePreferences(response?.preferences));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadPreferences();

    return () => {
      isActive = false;
    };
  }, []);

  const savePrefs = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      alert("Please login first");
      return;
    }

    setSaving(true);
    try {
      await apiRequest("/api/user/preferences", "PUT", prefs, token);
      alert("Preferences saved");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Preferences</h1>
      <p className="mt-2 text-sm text-gray-500">
        Save your default travel style for future AI trip generation.
      </p>

      <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading preferences...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <PreferenceSelect
              label="Budget preference"
              value={prefs.budgetRange}
              onChange={(budgetRange) => setPrefs((current) => ({ ...current, budgetRange }))}
              options={[
                { value: "cheap", label: "Cheap" },
                { value: "moderate", label: "Moderate" },
                { value: "luxury", label: "Luxury" },
              ]}
            />
            <PreferenceSelect
              label="Hotel type"
              value={prefs.hotelType}
              onChange={(hotelType) => setPrefs((current) => ({ ...current, hotelType }))}
              options={[
                { value: "budget", label: "Budget" },
                { value: "premium", label: "Premium" },
                { value: "luxury", label: "Luxury" },
              ]}
            />
            <PreferenceSelect
              label="Travel pace"
              value={prefs.travelPace}
              onChange={(travelPace) => setPrefs((current) => ({ ...current, travelPace }))}
              options={[
                { value: "relaxed", label: "Relaxed" },
                { value: "balanced", label: "Balanced" },
                { value: "packed", label: "Packed" },
              ]}
            />
            <PreferenceSelect
              label="Food preference"
              value={prefs.foodPreference}
              onChange={(foodPreference) => setPrefs((current) => ({ ...current, foodPreference }))}
              options={[
                { value: "veg", label: "Veg" },
                { value: "non-veg", label: "Non-veg" },
                { value: "both", label: "Both" },
              ]}
            />
            <PreferenceSelect
              label="Transport preference"
              value={prefs.transportPreference}
              onChange={(transportPreference) => setPrefs((current) => ({ ...current, transportPreference }))}
              options={[
                { value: "public", label: "Public" },
                { value: "private", label: "Private" },
                { value: "mixed", label: "Mixed" },
              ]}
            />
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={savePrefs}
            disabled={loading || saving}
            className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
              loading || saving ? "cursor-not-allowed bg-gray-300" : "bg-gray-900 hover:bg-gray-700"
            }`}
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
