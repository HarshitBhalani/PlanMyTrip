"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { saveAuth } from "../../lib/auth";
import { consumePostAuthRedirect } from "../../lib/pending-trip";
import { toast } from "sonner";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    if (!fullName.trim()) {
      return "Full name is required";
    }

    if (!email.trim()) {
      return "Email is required";
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      return "Please enter a valid email address";
    }

    if (!password) {
      return "Password is required";
    }

    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errorMessage = validateForm();
    if (errorMessage) {
      toast.error("Validation error", {
        description: errorMessage,
      });
      return;
    }

    try {
      setLoading(true);

      // 🔐 SIGNUP API
      const res = await apiRequest("/api/auth/signup", "POST", {
        fullName,
        email,
        password,
      });

      // ✅ Save token + user
      saveAuth(res.token, res.user);
      const redirectPath = consumePostAuthRedirect() || "/create-trip";

      toast.success("Account created 🎉", {
        description: "Welcome! Redirecting to create trip...",
      });

      router.push(redirectPath);
    } catch (err: any) {
      toast.error("Signup failed", {
        description: err.message || "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">
        Create your account
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Full Name"
          className="w-full border rounded px-3 py-2"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email address"
          className="w-full border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border rounded px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-black underline">
          Login
        </Link>
      </p>
    </div>
  );
}
