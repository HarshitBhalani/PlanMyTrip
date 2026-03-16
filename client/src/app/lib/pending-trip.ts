"use client";

export type PendingTripDraft = {
  destination: string;
  showSecondDestination: boolean;
  secondDestination: string;
  showThirdDestination: boolean;
  thirdDestination: string;
  days: number | "";
  budgetType: string;
  travelers: string;
  adults: number;
  children: number;
};

const PENDING_TRIP_DRAFT_KEY = "pendingTripDraft";
const POST_AUTH_REDIRECT_KEY = "postAuthRedirect";

const isBrowser = () => typeof window !== "undefined";

export const savePendingTripDraft = (draft: PendingTripDraft) => {
  if (!isBrowser()) return;
  localStorage.setItem(PENDING_TRIP_DRAFT_KEY, JSON.stringify(draft));
};

export const getPendingTripDraft = (): PendingTripDraft | null => {
  if (!isBrowser()) return null;

  const rawDraft = localStorage.getItem(PENDING_TRIP_DRAFT_KEY);
  if (!rawDraft) return null;

  try {
    return JSON.parse(rawDraft) as PendingTripDraft;
  } catch {
    localStorage.removeItem(PENDING_TRIP_DRAFT_KEY);
    return null;
  }
};

export const clearPendingTripDraft = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(PENDING_TRIP_DRAFT_KEY);
};

export const savePostAuthRedirect = (path: string) => {
  if (!isBrowser()) return;
  localStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
};

export const consumePostAuthRedirect = () => {
  if (!isBrowser()) return null;

  const path = localStorage.getItem(POST_AUTH_REDIRECT_KEY);
  if (!path) return null;

  localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  return path;
};

export const savePendingTripDestination = (destination: string) => {
  const existingDraft = getPendingTripDraft();

  savePendingTripDraft({
    destination,
    showSecondDestination: existingDraft?.showSecondDestination ?? false,
    secondDestination: existingDraft?.secondDestination ?? "",
    showThirdDestination: existingDraft?.showThirdDestination ?? false,
    thirdDestination: existingDraft?.thirdDestination ?? "",
    days: existingDraft?.days ?? "",
    budgetType: existingDraft?.budgetType ?? "moderate",
    travelers: existingDraft?.travelers ?? "couple",
    adults: existingDraft?.adults ?? 2,
    children: existingDraft?.children ?? 0,
  });
};
