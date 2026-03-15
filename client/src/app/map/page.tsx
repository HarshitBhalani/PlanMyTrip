import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import WorldMapPicker from "@/components/WorldMapPicker";

export default function MapPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8fbff_0%,#eef5ff_35%,#f8fafc_100%)] px-4 py-8 md:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/create-trip"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-gray-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Create Trip
        </Link>

        <WorldMapPicker />
      </div>
    </div>
  );
}
