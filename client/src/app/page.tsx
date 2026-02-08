import Link from "next/link";

export default function HomePage() {
  return (
    <section className="flex flex-col items-center justify-center text-center min-h-[70vh] px-4">
      <h1 className="text-4xl md:text-5xl font-bold leading-tight max-w-3xl">
        Discover Your Next Adventure with AI
      </h1>

      <p className="mt-6 text-lg text-gray-600 max-w-2xl">
        Your personal trip planner and travel curator, creating custom
        itineraries tailored to your interests, travel style, and budget
        instantly.
      </p>

      <div className="mt-10 flex gap-4">
        <Link
          href="/create-trip"
          className="px-6 py-3 rounded-lg bg-black text-white font-medium hover:bg-gray-800 transition"
        >
          Plan a Trip
        </Link>

        <Link
          href="/auth/login"
          className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
        >
          Login
        </Link>
      </div>

      {/* Subtle trust / clarity section */}
      <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
        <div>
          <h3 className="font-semibold text-lg">AI-Generated Itineraries</h3>
          <p className="text-gray-600 mt-2 text-sm">
            Get detailed day-wise travel plans created by AI in seconds.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg">Personalized Preferences</h3>
          <p className="text-gray-600 mt-2 text-sm">
            Budget, pace, food, hotels - everything tailored to you.
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-lg">Save & Revisit Trips</h3>
          <p className="text-gray-600 mt-2 text-sm">
            Access all your planned trips anytime from your dashboard.
          </p>
        </div>
      </div>
    </section>
  );
}
