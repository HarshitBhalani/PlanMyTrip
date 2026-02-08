const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not defined");
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

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
  });

  // 🔥 SAFELY READ RESPONSE
  const text = await res.text();

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      "Server returned non-JSON response. Please try again."
    );
  }

  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }

  return data;
}
