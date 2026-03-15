import { normalizeDestination } from "./destination";

export type CountryTravelContext = {
  destination: string;
  countryName: string;
  capital: string[];
  region: string;
  subregion: string;
  population?: number;
  isCountry: boolean;
};

type RestCountryResponse = {
  name?: {
    common?: string;
    official?: string;
  };
  capital?: string[];
  region?: string;
  subregion?: string;
  population?: number;
  altSpellings?: string[];
};

const contextCache = new Map<string, CountryTravelContext | null>();

const matchesCountryName = (destination: string, country: RestCountryResponse) => {
  const normalizedDestination = normalizeDestination(destination).toLowerCase();
  const candidateNames = [
    country.name?.common,
    country.name?.official,
    ...(country.altSpellings || []),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeDestination(value).toLowerCase());

  return candidateNames.includes(normalizedDestination);
};

export const getCountryTravelContext = async (
  destination: string
): Promise<CountryTravelContext | null> => {
  const normalizedDestination = normalizeDestination(destination);

  if (!normalizedDestination) {
    return null;
  }

  if (contextCache.has(normalizedDestination)) {
    return contextCache.get(normalizedDestination) || null;
  }

  try {
    const response = await fetch(
      `https://restcountries.com/v3.1/name/${encodeURIComponent(normalizedDestination)}?fullText=true&fields=name,capital,region,subregion,population,altSpellings`,
      {
        headers: {
          "User-Agent": "planmytrip/1.0 (country context lookup)",
        },
      }
    );

    if (!response.ok) {
      contextCache.set(normalizedDestination, null);
      return null;
    }

    const countries = (await response.json()) as RestCountryResponse[];
    const matchedCountry = countries.find((country) =>
      matchesCountryName(normalizedDestination, country)
    );

    if (!matchedCountry?.name?.common) {
      contextCache.set(normalizedDestination, null);
      return null;
    }

    const context: CountryTravelContext = {
      destination: normalizedDestination,
      countryName: matchedCountry.name.common,
      capital: matchedCountry.capital || [],
      region: matchedCountry.region || "",
      subregion: matchedCountry.subregion || "",
      population: matchedCountry.population,
      isCountry: true,
    };

    contextCache.set(normalizedDestination, context);
    return context;
  } catch {
    contextCache.set(normalizedDestination, null);
    return null;
  }
};
