"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
// import { getUser, logout } from "../lib/auth";
import {logout} from "../lib/auth";
import { getUser } from "../lib/auth";


export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // ✅ load user
  useEffect(() => {
    setUser(getUser());

    const handler = () => setUser(getUser());
    window.addEventListener("auth-change", handler);

    return () => window.removeEventListener("auth-change", handler);
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav className="border-b bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="font-bold">
          PlanMyTrip
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/create-trip">Create Trip</Link>
          <Link href="/saved-trips">Saved Trips</Link>

          {!user ? (
            <Link href="/auth/login">Login</Link>
          ) : (
            <div ref={ref} className="relative">
              <button onClick={() => setOpen(!open)}>
                {user.fullName}
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-32 border bg-white rounded shadow">
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
