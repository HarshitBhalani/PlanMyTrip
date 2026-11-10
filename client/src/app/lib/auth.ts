// client/src/app/lib/auth.ts
// Auth state: the JWT lives in an httpOnly cookie set by the server and is never
// readable from JS. localStorage only caches the non-secret profile for the UI.

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
};

const clearLegacyToken = () => {
  // Remove tokens stored by older versions of the app.
  localStorage.removeItem("token");
};

/* ============================
   SAVE AUTH (LOGIN / SIGNUP)
============================ */
export const saveAuth = (user: AuthUser) => {
  if (typeof window === "undefined") return;

  clearLegacyToken();
  localStorage.setItem("user", JSON.stringify(user));

  // notify UI (Navbar etc.)
  window.dispatchEvent(new Event("auth-change"));
};

/* ============================
   GET CURRENT USER
============================ */
export const getUser = (): AuthUser | null => {
  if (typeof window === "undefined") return null;

  clearLegacyToken();
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
   IS LOGGED IN (UI hint only; the server cookie is the real check)
============================ */
export const isLoggedIn = (): boolean => getUser() !== null;

/* ============================
   LOGOUT
============================ */
export const logout = async () => {
  if (typeof window === "undefined") return;

  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    // ignore network errors; local state is cleared anyway
  }

  clearLegacyToken();
  localStorage.removeItem("user");

  window.dispatchEvent(new Event("auth-change"));
  window.location.href = "/";
};
