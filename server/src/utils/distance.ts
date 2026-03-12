type Coordinates = {
  lat: number;
  lon: number;
};

export type TravelEstimate = {
  from: string;
  to: string;
  distanceKm: number;
  distanceText: string;
  durationMinutes: number;
  durationText: string;
};

const coordinatesCache = new Map<string, Coordinates | null>();
const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const haversineDistanceKm = (from: Coordinates, to: Coordinates) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lon - from.lon);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatDuration = (durationMinutes: number) => {
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  if (!hours) {
    return `${minutes} min`;
  }

  if (!minutes) {
    return `${hours} hr`;
  }

  return `${hours} hr ${minutes} min`;
};

const geocodeDestination = async (destination: string) => {
  const cacheKey = destination.toLowerCase();

  if (coordinatesCache.has(cacheKey)) {
    return coordinatesCache.get(cacheKey) || null;
  }

  try {
    const response = await fetch(
      `${NOMINATIM_URL}?format=jsonv2&limit=1&q=${encodeURIComponent(destination)}`,
      {
        headers: {
          "Accept-Language": "en",
          "User-Agent": "PlanMyTrip/1.0",
        },
      }
    );

    if (!response.ok) {
      coordinatesCache.set(cacheKey, null);
      return null;
    }

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const match = results[0];

    if (!match) {
      coordinatesCache.set(cacheKey, null);
      return null;
    }

    const coordinates = {
      lat: Number(match.lat),
      lon: Number(match.lon),
    };

    if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lon)) {
      coordinatesCache.set(cacheKey, null);
      return null;
    }

    coordinatesCache.set(cacheKey, coordinates);
    return coordinates;
  } catch {
    coordinatesCache.set(cacheKey, null);
    return null;
  }
};

export const estimateTravelBetweenDestinations = async (
  from: string,
  to: string
): Promise<TravelEstimate | null> => {
  const [fromCoordinates, toCoordinates] = await Promise.all([
    geocodeDestination(from),
    geocodeDestination(to),
  ]);

  if (!fromCoordinates || !toCoordinates) {
    return null;
  }

  const straightLineDistance = haversineDistanceKm(fromCoordinates, toCoordinates);
  const roadDistanceKm = Math.max(Math.round(straightLineDistance * 1.2), 1);
  const durationMinutes = Math.max(
    30,
    Math.round(((roadDistanceKm / 45) * 60) / 5) * 5
  );

  return {
    from,
    to,
    distanceKm: roadDistanceKm,
    distanceText: `${roadDistanceKm} km`,
    durationMinutes,
    durationText: formatDuration(durationMinutes),
  };
};
