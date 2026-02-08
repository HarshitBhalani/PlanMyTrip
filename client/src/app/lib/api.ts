// client/src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL is not defined. Please set it in Vercel environment variables."
  );
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface ApiOptions {
  token?: string;
  headers?: Record<string, string>;
}

/* ============================
   MAIN API REQUEST HELPER
============================ */
export async function apiRequest(
  endpoint: string,
  method: HttpMethod = "GET",
  body?: any,
  token?: string
) {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  let data: any;
  const contentType = res.headers.get("content-type");

  if (contentType && contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = { success: false, message: "Invalid server response" };
  }

  if (!res.ok) {
    throw new Error(data?.message || "API request failed");
  }

  return data;
}
