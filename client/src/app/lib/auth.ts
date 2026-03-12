// client/src/lib/auth.ts

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
};

/* ============================
   SAVE AUTH (LOGIN / SIGNUP)
============================ */
export const saveAuth = (token: string, user: AuthUser) => {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));

  // notify UI (Navbar etc.)
  window.dispatchEvent(new Event("auth-change"));
};

/* ============================
   GET CURRENT USER
============================ */
export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("user");
  if (!raw) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(raw);

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

/* ============================
   GET TOKEN
============================ */
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
};

/* ============================
   LOGOUT
============================ */
export const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");

  window.dispatchEvent(new Event("auth-change"));
  window.location.href = "/";
};
