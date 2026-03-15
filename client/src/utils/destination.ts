const BLOCKED_WORDS = [
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
];

export const normalizeDestination = (value: string) =>
  value.trim().replace(/\s+/g, " ");

export const sanitizeMapDestination = (value: string) =>
  normalizeDestination(
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z\s]/g, " ")
  );

export const isDuplicateDestination = (first: string, second: string) =>
  normalizeDestination(first).toLowerCase() ===
  normalizeDestination(second).toLowerCase();

export const validateDestination = (
  value: string,
  options?: {
    emptyMessage?: string;
  }
) => {
  const cleanedValue = normalizeDestination(value);

  if (!cleanedValue) {
    return {
      isValid: false,
      message: options?.emptyMessage || "Please enter a destination",
    };
  }

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

  const loweredValue = cleanedValue.toLowerCase();

  if (
    BLOCKED_WORDS.some((blockedWord) => loweredValue.includes(blockedWord)) ||
    loweredValue.endsWith("?")
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
