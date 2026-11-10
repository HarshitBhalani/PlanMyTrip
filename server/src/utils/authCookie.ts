import { CookieOptions, Request, Response } from "express";

export const AUTH_COOKIE_NAME = "pmt_token";
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const isProduction = () => process.env.NODE_ENV === "production";

/*
 * The client talks to this API through a same-origin Next.js rewrite proxy,
 * so the cookie is first-party and SameSite=Lax works. Override with
 * AUTH_COOKIE_SAMESITE=none only if the browser calls the API cross-site directly.
 */
const getSameSite = (): CookieOptions["sameSite"] => {
  const value = (process.env.AUTH_COOKIE_SAMESITE || "lax").toLowerCase();
  return value === "none" || value === "strict" ? value : "lax";
};

const baseCookieOptions = (): CookieOptions => {
  const sameSite = getSameSite();

  return {
    httpOnly: true,
    secure: isProduction() || sameSite === "none",
    sameSite,
    path: "/",
  };
};

export const setAuthCookie = (res: Response, token: string) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    maxAge: DEFAULT_MAX_AGE_MS,
  });
};

export const clearAuthCookie = (res: Response) => {
  res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions());
};

/* Minimal cookie parsing (avoids adding cookie-parser). */
const readCookie = (req: Request, name: string): string | null => {
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;

    if (part.slice(0, index).trim() === name) {
      try {
        return decodeURIComponent(part.slice(index + 1).trim()) || null;
      } catch {
        return null;
      }
    }
  }

  return null;
};

/* Token from the httpOnly cookie, falling back to a Bearer header (for API tools / scripts). */
export const getRequestToken = (req: Request): string | null => {
  const cookieToken = readCookie(req, AUTH_COOKIE_NAME);
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim() || null;
  }

  return null;
};
