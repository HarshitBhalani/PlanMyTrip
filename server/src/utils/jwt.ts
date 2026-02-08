import { SignJWT, jwtVerify, JWTPayload } from "jose";

const secret = process.env.JWT_SECRET;

if (!secret) {
  throw new Error("JWT_SECRET is not defined");
}

const JWT_SECRET = new TextEncoder().encode(secret);

export interface TokenPayload extends JWTPayload {
  userId: string;
}

/* CREATE TOKEN */
export async function generateToken(payload: TokenPayload): Promise<string> {
  return await new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN || "7d")
    .sign(JWT_SECRET);
}

/* VERIFY TOKEN (SAFE) */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as TokenPayload;
  } catch {
    return null; // 🚨 NEVER throw
  }
}
