const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export async function apiRequest(
  url: string,
  method: string = "GET",
  body?: any,
  token?: string
) {
  const response = await fetch(`${API_BASE}${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get("content-type");

  // 🚨 Guard: backend must return JSON
  if (!contentType || !contentType.includes("application/json")) {
    const text = await response.text();
    throw new Error("Server returned non-JSON response");
  }

  return response.json();
}
