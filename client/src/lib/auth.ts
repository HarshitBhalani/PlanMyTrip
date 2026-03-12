// client/src/lib/auth.ts

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
};

/* =====================
   SAVE AUTH DATA
===================== */
export const saveAuth = (token: string, user: AuthUser) => {
  if (typeof window === "undefined") return;

  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  window.dispatchEvent(new Event("auth-change"));
};

/* =====================
   GET LOGGED IN USER
===================== */
export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;

  const rawUser = localStorage.getItem("user");
  if (!rawUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(rawUser);

    if (
      !parsedUser ||
      typeof parsedUser !== "object" ||
      typeof parsedUser.fullName !== "string"
    ) {
      localStorage.removeItem("user");
      return null;
    }

    return parsedUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
};

/* =====================
   GET TOKEN
===================== */
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

/* =====================
   LOGOUT
===================== */
export const logout = () => {
  if (typeof window === "undefined") return;

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.dispatchEvent(new Event("auth-change"));
  window.location.href = "/";
};
