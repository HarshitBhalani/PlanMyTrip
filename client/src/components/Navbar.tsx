"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getUser } from "../lib/auth";
import { logout } from "../lib/auth";
import { clearPendingTripDraft } from "@/app/lib/pending-trip";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const navLinks = [
    { href: "/create-trip", label: "Create Trip" },
    { href: "/saved-trips", label: "Saved Trips" },
  ];

  const handleFreshCreateTrip = () => {
    clearPendingTripDraft();
    localStorage.removeItem("preSelectedDestination");
    localStorage.removeItem("preSelectedDestinationMeta");
    setMobileMenuOpen(false);
    setOpen(false);

    if (pathname === "/create-trip") {
      window.location.href = "/create-trip";
      return;
    }

    router.push("/create-trip");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-amber-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="PlanMyTrip logo"
            width={52}
            height={52}
            className="h-[52px] w-[52px] object-contain md:h-14 md:w-14"
            priority
          />
          <div>
            <p className="text-lg font-semibold tracking-tight text-gray-950">
              PlanMyTrip
            </p>
            <p className="text-xs text-gray-500">
              AI itinerary planner
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center rounded-full border border-gray-200 bg-white/90 p-1 shadow-sm">
            {navLinks.map((link) => (
              link.href === "/create-trip" ? (
                <button
                  key={link.href}
                  type="button"
                  onClick={handleFreshCreateTrip}
                  className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-950"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-950"
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {!user ? (
            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="rounded-full px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Sign Up
              </Link>
            </div>
          ) : (
            <div ref={ref} className="relative">
              <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:border-gray-300"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-900">
                  {(user.fullName || "A").charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <p className="max-w-32 truncate text-sm font-medium text-gray-900">
                    {user.fullName || "Account"}
                  </p>
                  <p className="text-xs text-gray-500">Your account</p>
                </div>
              </button>

              {open && (
                <div className="absolute right-0 mt-3 w-44 rounded-2xl border border-gray-200 bg-white p-2 shadow-xl">
                  <button
                    onClick={() => {
                      setOpen(false);
                      logout();
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-700 shadow-sm md:hidden"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-amber-100 bg-white px-4 pb-4 md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 pt-4">
            {navLinks.map((link) => (
              link.href === "/create-trip" ? (
                <button
                  key={link.href}
                  type="button"
                  onClick={handleFreshCreateTrip}
                  className="rounded-2xl px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )
            ))}

            {!user ? (
              <>
                <Link
                  href="/auth/login"
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded-2xl bg-black px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            ) : (
              <>
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user.fullName || "Account"}
                  </p>
                  <p className="text-xs text-gray-500">Signed in</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
