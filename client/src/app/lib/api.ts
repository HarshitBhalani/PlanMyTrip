// client/src/app/lib/api.ts

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

/*
 * All backend calls go through the same-origin Next.js rewrite proxy (see next.config.ts),
 * so the httpOnly auth cookie is sent automatically. No token is ever handled in JS.
 */
export async function apiRequest(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: any
) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const res = await fetch(endpoint, {
    method,
    headers,
    credentials: "same-origin",
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("Server returned invalid response");
  }

  if (res.status === 401 && typeof window !== "undefined" && !endpoint.startsWith("/api/auth/")) {
    // Session cookie missing/expired: drop the cached profile so the UI shows logged-out state.
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("auth-change"));
  }

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}
