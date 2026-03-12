const BLOCKED_KEYWORDS = [
  "what",
  "how",
  "why",
  "explain",
  "define",
  "javascript",
  "react",
  "reactjs",
  "python",
  "java",
  "node",
  "code",
  "programming",
  "tutorial",
];

export const normalizeDestination = (value: string) => value.trim().replace(/\s+/g, " ");

export const areSameDestination = (first: string, second: string) =>
  normalizeDestination(first).toLowerCase() === normalizeDestination(second).toLowerCase();

export const validateDestinationName = (
  value: unknown,
  emptyMessage = "Please enter a destination"
) => {
  if (typeof value !== "string") {
    return {
      isValid: false,
      message: emptyMessage,
    };
  }

  const cleanedValue = normalizeDestination(value);

  if (!cleanedValue) {
    return {
      isValid: false,
      message: emptyMessage,
    };
  }

  const lowerValue = cleanedValue.toLowerCase();

  if (cleanedValue.length < 2 || cleanedValue.length > 40) {
    return {
      isValid: false,
      message: "Invalid destination name",
    };
  }

  if (!/^[a-zA-Z\s]+$/.test(cleanedValue)) {
    return {
      isValid: false,
      message: "Invalid destination name",
    };
  }

  if (
    BLOCKED_KEYWORDS.some((keyword) => lowerValue.includes(keyword)) ||
    lowerValue.endsWith("?")
  ) {
    return {
      isValid: false,
      message: "Invalid destination name",
    };
  }

  return {
    isValid: true,
    cleanedValue,
  };
};
