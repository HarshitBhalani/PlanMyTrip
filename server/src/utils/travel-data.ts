// server/src/utils/travel-data.ts

export type BudgetType = "cheap" | "moderate" | "luxury";
export type TravelerType = "solo" | "couple" | "family" | "friends";

export function getDailyCost(
  budget: BudgetType,
  travelers: TravelerType
) {
  const baseCost = {
    cheap: 1200,
    moderate: 2500,
    luxury: 6000,
  }[budget];

  const multiplier = {
    solo: 1,
    couple: 1.8,
    friends: 2.5,
    family: 3,
  }[travelers];

  return Math.round(baseCost * multiplier);
}

export function getHotelCategory(budget: BudgetType) {
  if (budget === "cheap") return "budget hotels / hostels";
  if (budget === "moderate") return "3-star hotels";
  return "4 & 5-star luxury hotels";
}

export function getBookingLink(destination: string, budget: BudgetType) {
  const budgetMap = {
    cheap: "budget",
    moderate: "3stars",
    luxury: "5stars",
  };

  return `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(
    destination
  )}&group_adults=2&nflt=class%3D${budgetMap[budget]}`;
}

export function getTransportInfo(destination: string) {
  // Generic but realistic
  return {
    railwayStation: `${destination} Junction Railway Station`,
    busStation: `${destination} Central Bus Stand`,
    airport: `${destination} Airport (if available)`,
  };
}
