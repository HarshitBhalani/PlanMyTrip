"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";

export default function MyTripsPage() {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    const loadTrips = async () => {
      const token = localStorage.getItem("token");
      const data = await apiRequest(
        "/api/trip",
        "GET",
        undefined,
        token || undefined
      );
      setTrips(data.trips || []);
    };
    loadTrips();
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">
        My Trips
      </h2>

      {trips.map((trip: any) => (
        <div key={trip._id} className="border p-4 mb-3">
          <h3 className="font-semibold">{trip.tripTitle}</h3>
        </div>
      ))}
    </div>
  );
}
