"use client";

import { apiRequest } from "../lib/api";
import { useState } from "react";

export default function PreferencesPage() {
  const [prefs, setPrefs] = useState({
    budgetRange: "medium",
    foodPreference: "both",
  });

  const savePrefs = async () => {
    const token = localStorage.getItem("token");
    await apiRequest(
      "/api/preferences",
      "POST",
      prefs,
      token || undefined
    );
    alert("Preferences saved");
  };

  return (
    <div className="max-w-md">
      <h2 className="text-xl font-bold mb-4">
        Preferences
      </h2>

      <button
        onClick={savePrefs}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Save
      </button>
    </div>
  );
}
