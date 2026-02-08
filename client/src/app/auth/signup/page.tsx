"use client";

import { useState } from "react";
import { apiRequest } from "../../lib/api";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { saveAuth } from "../../lib/auth";

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  
const signup = async () => {
  setError("");

  try {
    const res = await apiRequest("/api/auth/signup", "POST", {
      fullName,
      email,
      password,
    });

    if (!res.success) throw new Error(res.message);

    saveAuth(res.token, res.user);

    toast.success("Account created successfully 🎉");
    router.push("/");
  } catch (err: any) {
    setError(err.message);
  }
};

  return (
    <div className="max-w-sm mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-4">Create Account</h1>

      <input
        placeholder="Full Name"
        className="border p-2 w-full mb-2"
        onChange={(e) => setFullName(e.target.value)}
      />

      <input
        placeholder="Email"
        className="border p-2 w-full mb-2"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        className="border p-2 w-full mb-2"
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <button
        onClick={signup}
        className="bg-black text-white w-full py-2 rounded mt-4"
      >
        Sign Up
      </button>

      <p className="text-sm text-gray-600 mt-4 text-center">
        Already have an account?{" "}
        <a href="/auth/login" className="underline">
          Login
        </a>
      </p>
    </div>
  );
}
