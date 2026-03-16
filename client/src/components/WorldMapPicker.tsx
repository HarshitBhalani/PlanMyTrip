"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe2, Loader2, MapPinned, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { savePendingTripDestination } from "@/app/lib/pending-trip";
import { sanitizeMapDestination } from "@/utils/destination";

type SelectedPlace = {
  countryCode: string;
  country: string;
};

type JsVectorMapInstance = {
  destroy: () => void;
  reset: () => void;
};

type JsVectorMapConstructor = new (options: Record<string, unknown>) => JsVectorMapInstance;

declare global {
  interface Window {
    jsVectorMap?: {
      maps?: Record<
        string,
        {
          paths?: Record<string, { name?: string }>;
        }
      >;
    };
  }
}

const MAP_STYLE_ID = "jsvectormap-style";
const MAP_STYLE_HREF = "https://cdn.jsdelivr.net/npm/jsvectormap@1.7.0/dist/jsvectormap.min.css";

const loadMapStyles = () => {
  if (document.getElementById(MAP_STYLE_ID)) {
    return;
  }

  const link = document.createElement("link");
  link.id = MAP_STYLE_ID;
  link.rel = "stylesheet";
  link.href = MAP_STYLE_HREF;
  document.head.appendChild(link);
};

const loadVectorMap = async () => {
  loadMapStyles();

  const [{ default: JsVectorMap }] = await Promise.all([
    import("jsvectormap"),
    import("jsvectormap/dist/maps/world.js"),
  ]);

  return JsVectorMap as JsVectorMapConstructor;
};

const regionDisplayNames =
  typeof Intl !== "undefined"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

const getCountryNameFromCode = (countryCode: string) => {
  const normalizedCode = countryCode.toUpperCase();

  return (
    regionDisplayNames?.of(normalizedCode) ||
    window.jsVectorMap?.maps?.world?.paths?.[normalizedCode]?.name ||
    normalizedCode
  );
};

export default function WorldMapPicker() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<JsVectorMapInstance | null>(null);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [selection, setSelection] = useState<SelectedPlace | null>(null);

  useEffect(() => {
    let isMounted = true;

    const setupMap = async () => {
      try {
        const JsVectorMap = await loadVectorMap();
        if (!isMounted || !mapContainerRef.current) {
          return;
        }

        mapInstanceRef.current = new JsVectorMap({
          selector: mapContainerRef.current,
          map: "world",
          zoomButtons: true,
          zoomOnScroll: true,
          regionStyle: {
            initial: {
              fill: "#dbeafe",
              fillOpacity: 1,
              stroke: "#93c5fd",
              strokeWidth: 1,
              strokeOpacity: 1,
            },
            hover: {
              fill: "#60a5fa",
              cursor: "pointer",
            },
            selected: {
              fill: "#1d4ed8",
            },
          },
          backgroundColor: "transparent",
          onLoaded: () => {
            if (isMounted) {
              setIsMapLoading(false);
            }
          },
          onRegionClick: (
            _event: unknown,
            countryCode: string
          ) => {
            const countryName = getCountryNameFromCode(countryCode);

            setSelection({
              countryCode,
              country: countryName,
            });
          },
        });
      } catch (error) {
        console.error(error);
        toast.error("TailAdmin-style map could not be loaded");
        setIsMapLoading(false);
      }
    };

    setupMap();

    return () => {
      isMounted = false;
      mapInstanceRef.current?.destroy();
      mapInstanceRef.current = null;
    };
  }, []);

  const handleUseSelection = () => {
    if (!selection) {
      return;
    }

    const chosenDestination = sanitizeMapDestination(selection.country);
    if (!chosenDestination) {
      toast.error("This selection could not be converted into a destination");
      return;
    }

    localStorage.setItem("preSelectedDestination", chosenDestination);
    savePendingTripDestination(chosenDestination);
    localStorage.setItem(
      "preSelectedDestinationMeta",
      JSON.stringify({
        mode: "country",
        destination: chosenDestination,
        country: selection.country,
      })
    );

    toast.success(`${chosenDestination} added to trip form`);
    router.push("/create-trip");
  };

  const resetView = () => {
    mapInstanceRef.current?.reset();
    setSelection(null);
  };

  return (
    <div className="grid min-h-[calc(100vh-5rem)] gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
          TailAdmin Style Map
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-gray-900">
          Select a country on the world map
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-600">
          This version uses a TailAdmin-style vector world map. Click a country and send that
          country directly to the create trip page.
        </p>

        <div className="mt-6 space-y-4 rounded-3xl border border-gray-200 bg-white p-5">
          <p className="text-sm font-semibold text-gray-900">Selected location</p>
          {!selection && (
            <p className="text-sm leading-6 text-gray-500">
              No country selected yet. Click a country on the map to continue.
            </p>
          )}
          {selection && (
            <>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Country
                </p>
                <p className="mt-1 text-lg font-semibold text-gray-900">{selection.country}</p>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={handleUseSelection}
            disabled={!selection}
            className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Use selected destination
          </button>
          <button
            type="button"
            onClick={resetView}
            className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-gray-500 hover:bg-white"
          >
            Reset map view
          </button>
        </div>

        <div className="mt-6 space-y-3 rounded-3xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <Globe2 className="h-4 w-4" />
            <span>Drag, zoom, and click directly on a country region.</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <MapPinned className="h-4 w-4" />
            <span>Use the selected country directly as your destination.</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-700">
            <RotateCcw className="h-4 w-4" />
            <span>Reset the map anytime and choose another country.</span>
          </div>
        </div>
      </aside>

      <section className="relative min-h-[72vh] overflow-hidden rounded-[32px] border border-gray-200 bg-[linear-gradient(180deg,#f8fbff_0%,#eef5ff_100%)] shadow-sm">
        {isMapLoading && (
          <div className="pointer-events-none absolute inset-x-6 top-6 z-10 inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading TailAdmin-style world map...</span>
          </div>
        )}

        <div className="absolute inset-x-6 top-6 z-10 max-w-sm rounded-3xl border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-500">
            Prototype Note
          </p>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            This map is now country-first and much more stable than the previous custom setup. State
            selection is manual in this version.
          </p>
        </div>

        <div ref={mapContainerRef} className="h-full min-h-[72vh] w-full px-4 pb-4 pt-20" />
      </section>
    </div>
  );
}
