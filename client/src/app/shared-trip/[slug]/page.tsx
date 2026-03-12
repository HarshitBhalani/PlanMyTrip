const ordinalLabel = (index: number) => {
  const labels = ["1ST", "2ND", "3RD", "4TH", "5TH"];
  return labels[index] ?? `${index + 1}TH`;
};

const formatSavedAt = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDisplayText = (value: unknown, fallback = "-"): string => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    const flattened = value
      .map((item) => toDisplayText(item, ""))
      .filter(Boolean)
      .join(", ");

    return flattened || fallback;
  }

  if (typeof value === "object") {
    if ("name" in (value as Record<string, unknown>) && typeof (value as Record<string, unknown>).name === "string") {
      return String((value as Record<string, unknown>).name);
    }

    try {
      return JSON.stringify(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

const getApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!apiUrl) {
    throw new Error("API is not configured");
  }

  return apiUrl;
};

async function getSharedTrip(slug: string) {
  const response = await fetch(`${getApiUrl()}/api/trip/public/${slug}`, {
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.success) {
    return null;
  }

  return payload.trip;
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  let trip: any = null;
  let error = "";

  try {
    trip = await getSharedTrip(slug);
    if (!trip) {
      error = "Shared trip not found";
    }
  } catch {
    error = "Unable to load shared trip right now";
  }

  if (error || !trip) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900">Shared Trip</h1>
        <p className="mt-4 text-gray-600">{error || "Shared trip not found"}</p>
      </div>
    );
  }

  const tripData = trip.tripData || {};
  const routeLabel = [trip.destination, trip.secondDestination, trip.thirdDestination]
    .filter(Boolean)
    .join(" -> ");
  const travelSegments = tripData.travelSegments || (tripData.travelSegment ? [tripData.travelSegment] : []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
          Shared Via PlanMyTrip
        </p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">
          {tripData.tripTitle || routeLabel || "Trip Itinerary"}
        </h1>
        <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-2">
          <p><strong>Route:</strong> {routeLabel || "-"}</p>
          <p><strong>Saved On:</strong> {formatSavedAt(trip.createdAt) || "-"}</p>
          <p><strong>Days:</strong> {toDisplayText(trip.days)}</p>
          <p><strong>Travel Group:</strong> {toDisplayText(trip.travelerDetails?.label || trip.travelers)}</p>
        </div>
      </div>

      <div className="mt-8 space-y-8">
        {tripData.overview && (
          <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl">
            <h3 className="font-semibold text-gray-900 mb-3">Trip Overview</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {tripData.overview.routeSummary && <p><strong>Route:</strong> {toDisplayText(tripData.overview.routeSummary)}</p>}
              {tripData.overview.bestTimeToVisit && <p><strong>Best Time:</strong> {toDisplayText(tripData.overview.bestTimeToVisit)}</p>}
              {tripData.overview.weatherNote && <p><strong>Weather Note:</strong> {toDisplayText(tripData.overview.weatherNote)}</p>}
            </div>
          </div>
        )}

        {tripData.destinations?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-gray-900">Destination Flow</h3>
            <div className={`grid gap-4 ${tripData.destinations.length === 3 ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2"}`}>
              {tripData.destinations.map((stop: any, index: number) => (
                <div key={`${stop.name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {ordinalLabel(index)} Destination
                  </p>
                  <h4 className="mt-2 text-xl font-semibold text-gray-900">{toDisplayText(stop.name)}</h4>
                  {stop.stayDays && <p className="mt-1 text-sm text-gray-500">{toDisplayText(stop.stayDays)}</p>}
                  {stop.summary && <p className="mt-3 text-sm text-gray-600 leading-relaxed">{toDisplayText(stop.summary)}</p>}
                  {stop.highlights?.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {stop.highlights.map((highlight: unknown, index: number) => (
                        <span key={`${toDisplayText(stop.name)}-${index}`} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600">
                          {toDisplayText(highlight)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {travelSegments.length > 0 && (
          <div className="space-y-4">
            {travelSegments.map((segment: any, index: number) => (
              <div key={`${segment?.from}-${segment?.to}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                  Travel Leg {index + 1}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  {toDisplayText(segment?.from)} to {toDisplayText(segment?.to)}
                </h3>
                <div className="mt-3 grid gap-2 text-sm text-amber-900 md:grid-cols-2">
                  <p><strong>Distance:</strong> {toDisplayText(segment?.distanceText)}</p>
                  <p><strong>Estimated travel time:</strong> {toDisplayText(segment?.durationText)}</p>
                </div>
                {segment?.summary && <p className="mt-3 text-sm text-amber-900">{toDisplayText(segment.summary)}</p>}
              </div>
            ))}
          </div>
        )}

        {tripData.transport && (
          <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl">
            <h3 className="font-semibold mb-3 text-gray-900">How to Reach</h3>
            <div className="space-y-1 text-sm text-gray-700">
              <p><strong>Railway:</strong> {toDisplayText(tripData.transport.railwayStation)}</p>
              <p><strong>Bus:</strong> {toDisplayText(tripData.transport.busStation)}</p>
              <p><strong>Airport:</strong> {toDisplayText(tripData.transport.airport)}</p>
            </div>
          </div>
        )}

        {tripData.itinerary?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Itinerary</h3>
            {tripData.itinerary.map((day: any) => {
              const isTravel = day.phaseType === "travel";
              return (
                <div key={day.day} className="mb-3">
                  {isTravel && (
                    <div className="flex items-center gap-3 mb-2 px-1">
                      <div className="flex-1 h-px bg-amber-200" />
                      <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 whitespace-nowrap">
                        Travel Day
                      </span>
                      <div className="flex-1 h-px bg-amber-200" />
                    </div>
                  )}
                  <div className={`rounded-xl p-5 border ${isTravel ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className={`font-semibold ${isTravel ? "text-amber-900" : "text-gray-900"}`}>Day {toDisplayText(day.day)}</h3>
                      {isTravel && day.phaseTitle && (
                        <span className="text-xs font-medium text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                          {toDisplayText(day.phaseTitle)}
                        </span>
                      )}
                    </div>
                    <div className={`space-y-1.5 text-sm ${isTravel ? "text-amber-900" : "text-gray-700"}`}>
                      <p><strong>Morning:</strong> {toDisplayText(day.morning)}</p>
                      <p><strong>Afternoon:</strong> {toDisplayText(day.afternoon)}</p>
                      <p><strong>Evening:</strong> {toDisplayText(day.evening)}</p>
                      <p className={`text-xs mt-2 ${isTravel ? "text-amber-600" : "text-gray-400"}`}>
                        Tip: {toDisplayText(day.localTravelTip)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tripData.placesToVisit?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Places To Visit</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {tripData.placesToVisit.map((place: any, index: number) => (
                <div key={`${place.name}-${index}`} className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {place.destination || "Highlight"}
                  </p>
                  <p className="mt-2 font-semibold text-gray-900">{toDisplayText(place.name)}</p>
                  {place.description && <p className="mt-2 text-sm text-gray-600">{toDisplayText(place.description)}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tripData.foodRecommendations?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Food Recommendations</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {tripData.foodRecommendations.map((food: any, index: number) => (
                <div key={`${typeof food === "string" ? food : food.name}-${index}`} className="border rounded-lg p-4 bg-gray-50">
                  {typeof food === "string" ? (
                    <p className="text-sm text-gray-700">{toDisplayText(food)}</p>
                  ) : (
                    <>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                        {toDisplayText(food.destination || "Local Food")}
                      </p>
                      <p className="mt-2 font-semibold text-gray-900">{toDisplayText(food.name)}</p>
                      {food.description && <p className="mt-2 text-sm text-gray-600">{toDisplayText(food.description)}</p>}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tripData.travelTips?.length > 0 && (
          <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-lg mb-3">Travel Tips</h3>
            <div className="space-y-2 text-sm text-gray-700">
              {tripData.travelTips.map((tip: string, index: number) => (
                <p key={`${toDisplayText(tip)}-${index}`}>• {toDisplayText(tip)}</p>
              ))}
            </div>
          </div>
        )}

        {tripData.hotels?.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Hotel Options</h3>
            {tripData.hotels.map((hotel: any, index: number) => (
              <div key={`${hotel.name}-${index}`} className="border p-5 rounded-lg mb-3 bg-gray-50">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-lg">{toDisplayText(hotel.name)}</p>
                    <p className="text-gray-600">{toDisplayText(hotel.priceRangePerNight)}</p>
                  </div>
                  {hotel.bookingUrl && (
                    <a
                      href={hotel.bookingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-black text-white px-5 py-2 rounded-md hover:bg-gray-800 font-medium"
                    >
                      Book
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tripData.estimatedBudget && (
          <div className="bg-green-50 p-5 rounded-lg border border-green-200">
            <h3 className="font-semibold text-lg mb-3">Estimated Budget</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Per Day:</strong> {toDisplayText(tripData.estimatedBudget.perDay)}</p>
              <p><strong>Total:</strong> {toDisplayText(tripData.estimatedBudget.total)}</p>
              {tripData.estimatedBudget.note && (
                <p className="text-sm text-green-700">{toDisplayText(tripData.estimatedBudget.note)}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
