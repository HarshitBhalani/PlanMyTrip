"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function TripDetail({ params }: any) {
  const [trip, setTrip] = useState<any>(null);

  useEffect(() => {
    apiRequest(`/api/trip/${params.id}`, "GET").then(
      (res) => setTrip(res.trip)
    );
  }, []);

  if (!trip) return <div>Loading...</div>;

  return <pre>{JSON.stringify(trip, null, 2)}</pre>;
}
