import { Request, Response } from "express";
import User from "../models/User.model";
import { hashPassword, comparePassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import { clearAuthCookie, setAuthCookie } from "../utils/authCookie";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 72; // bcrypt only uses the first 72 bytes
const FULL_NAME_MAX_LENGTH = 100;

const normalizeEmail = (value: unknown) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

/* =====================
   SIGNUP (CREATE USER)
===================== */
export const signup = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password } = req.body || {};

    if (
      typeof fullName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !fullName.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const cleanName = fullName.trim();
    const cleanEmail = normalizeEmail(email);

    if (cleanName.length > FULL_NAME_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Full name must be at most ${FULL_NAME_MAX_LENGTH} characters`,
      });
    }

    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
      });
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      fullName: cleanName,
      email: cleanEmail,
      passwordHash,
    });

    const token = await generateToken({ userId: user._id.toString() });
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error: any) {
    // Race condition: unique index violation
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    console.error("SIGNUP ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Signup failed",
    });
  }
};

/* =====================
   LOGIN (AUTH ONLY)
===================== */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== "string" || typeof password !== "string" || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password required",
      });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = await generateToken({ userId: user._id.toString() });
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

/* =====================
   LOGOUT (clear cookie)
===================== */
export const logout = (_req: Request, res: Response) => {
  clearAuthCookie(res);
  return res.status(200).json({ success: true, message: "Logged out" });
};

/* =====================
   CURRENT USER
===================== */
export const me = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!._id).select("fullName email");

    if (!user) {
      clearAuthCookie(res);
      return res.status(401).json({ success: false, message: "Not authorized" });
    }

    return res.status(200).json({
      success: true,
      user: { id: user._id, fullName: user.fullName, email: user.email },
    });
  } catch (error) {
    console.error("ME ERROR:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch user" });
  }
};
