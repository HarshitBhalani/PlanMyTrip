"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "../../lib/api";
import { saveAuth } from "../../lib/auth";
import { consumePostAuthRedirect } from "../../lib/pending-trip";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
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

      const res = await apiRequest("/api/auth/login", "POST", {
        email,
        password,
      });

      saveAuth(res.token, res.user);
      const redirectPath = consumePostAuthRedirect() || "/create-trip";

      toast.success("Login successful 🎉", {
        description: "Redirecting to create trip...",
      });

      router.push(redirectPath);
    } catch (err: any) {
      toast.error("Login failed", {
        description: err.message || "Invalid credentials",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-6">Login</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full border p-2 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full border p-2 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/auth/signup" className="font-medium text-black underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
