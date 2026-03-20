"use client";

import { useEffect, useState } from "react";
import { Download, Share2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { apiRequest } from "../lib/api";
import { getUser } from "../lib/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const ordinalLabel = (index: number) => {
  const labels = ["1ST", "2ND", "3RD", "4TH", "5TH"];
  return labels[index] ?? `${index + 1}TH`;
};

const formatSavedAt = (value?: string) => {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const sanitizeFilenamePart = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "trip";

export default function SavedTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [downloadingTripId, setDownloadingTripId] = useState<string | null>(null);
  const [sharingTripId, setSharingTripId] = useState<string | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const userName = getUser()?.fullName?.trim() || "user";

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const res = await apiRequest(
        "/api/trip/my-trips",
        "GET",
        null,
        token || undefined
      );

      if (res.success) setTrips(res.trips);
    } catch (err: any) {
      toast.error("Failed to fetch trips");
    } finally {
      setLoading(false);
    }
  };

  const deleteTrip = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trip?")) {
      return;
    }

    try {
      await apiRequest(
        `/api/trip/${id}`,
        "DELETE",
        null,
        token || undefined
      );

      toast.success("Trip deleted");
      
      if (selectedTrip?._id === id) {
        setSelectedTrip(null);
      }
      
      fetchTrips();
    } catch {
      toast.error("Delete failed");
    }
  };

  const updateTrip = async () => {
    if (!selectedTrip) return;

    setUpdating(true);

    try {
      const res = await apiRequest(
        `/api/trip/${selectedTrip._id}`,
        "PUT",
        { tripData: selectedTrip.tripData },
        token || undefined
      );

      if (res.success) {
        setSelectedTrip(res.trip);
        setTrips((currentTrips) =>
          currentTrips.map((trip) => (trip._id === res.trip._id ? res.trip : trip))
        );
        toast.success("Trip updated successfully!");
        setIsEditing(false);
      }
    } catch (err: any) {
      toast.error("Failed to update trip", {
        description: err?.message || "Please try again",
      });
    } finally {
      setUpdating(false);
    }
  };

  const closeModal = () => {
    setSelectedTrip(null);
    setIsEditing(false);
  };

  /* =====================================================
     EDIT FUNCTIONS
  ===================================================== */
  const addDay = () => {
    if (!selectedTrip || !selectedTrip.tripData.itinerary) return;

    const newDayNumber = selectedTrip.tripData.itinerary.length + 1;
    const newDay = {
      day: newDayNumber,
      morning: "Add morning activities",
      afternoon: "Add afternoon activities",
      evening: "Add evening activities",
      localTravelTip: "Add local travel tip",
    };

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        itinerary: [...selectedTrip.tripData.itinerary, newDay],
      },
    });

    toast.success(`Day ${newDayNumber} added`);
  };

  const removeDay = (dayNumber: number) => {
    if (!selectedTrip || !selectedTrip.tripData.itinerary) return;

    if (selectedTrip.tripData.itinerary.length <= 1) {
      toast.error("Cannot remove the last day");
      return;
    }

    const updatedItinerary = selectedTrip.tripData.itinerary
      .filter((day: any) => day.day !== dayNumber)
      .map((day: any, index: number) => ({
        ...day,
        day: index + 1,
      }));

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        itinerary: updatedItinerary,
      },
    });

    toast.success(`Day ${dayNumber} removed`);
  };

  const updateDayField = (dayNumber: number, field: string, value: string) => {
    if (!selectedTrip || !selectedTrip.tripData.itinerary) return;

    const updatedItinerary = selectedTrip.tripData.itinerary.map((day: any) =>
      day.day === dayNumber ? { ...day, [field]: value } : day
    );

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        itinerary: updatedItinerary,
      },
    });
  };

  const updateTripTitle = (value: string) => {
    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        tripTitle: value,
      },
    });
  };

  const updateTransport = (field: string, value: string) => {
    if (!selectedTrip) return;

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        transport: {
          ...selectedTrip.tripData.transport,
          [field]: value,
        },
      },
    });
  };

  const updateBudget = (field: string, value: string) => {
    if (!selectedTrip) return;

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        estimatedBudget: {
          ...selectedTrip.tripData.estimatedBudget,
          [field]: value,
        },
      },
    });
  };

  const shareTrip = async (trip: any) => {
    try {
      setSharingTripId(trip._id);

      let shareSlug = trip.shareSlug;

      if (!shareSlug) {
        const response = await apiRequest(
          `/api/trip/${trip._id}/share`,
          "POST",
          {},
          token || undefined
        );

        if (!response.success || !response.shareSlug) {
          throw new Error(response.message || "Failed to create share link");
        }

        shareSlug = response.shareSlug;
        setTrips((currentTrips) =>
          currentTrips.map((currentTrip) =>
            currentTrip._id === trip._id
              ? { ...currentTrip, shareSlug, isPublicShared: true }
              : currentTrip
          )
        );

        if (selectedTrip?._id === trip._id) {
          setSelectedTrip((current: any) =>
            current ? { ...current, shareSlug, isPublicShared: true } : current
          );
        }
      }

      const shareUrl = `${window.location.origin}/shared-trip/${shareSlug}`;
      await navigator.clipboard.writeText(shareUrl);

      toast.success("Share link copied", {
        description: shareUrl,
      });
    } catch (error: any) {
      toast.error("Failed to create share link", {
        description: error?.message || "Please try again",
      });
    } finally {
      setSharingTripId(null);
    }
  };

  const downloadTripPdf = async (trip: any) => {
    try {
      setDownloadingTripId(trip._id);

      const pdf = new jsPDF("p", "mm", "a4");
      const routeLabel = [trip.destination, trip.secondDestination, trip.thirdDestination]
        .filter(Boolean)
        .join(" -> ");
      const fileName = `${sanitizeFilenamePart(userName)}_${sanitizeFilenamePart(
        [trip.destination, trip.secondDestination, trip.thirdDestination]
          .filter(Boolean)
          .join("_")
      )}_itinerary.pdf`;
      const tripData = trip.tripData || {};
      let cursorY = 16;

      pdf.setFontSize(20);
      pdf.text(tripData.tripTitle || routeLabel || "Trip Itinerary", 14, cursorY);
      cursorY += 8;

      pdf.setFontSize(10);
      pdf.text(
        `Generated by PlanMyTrip on ${new Date().toLocaleDateString("en-IN")}`,
        14,
        cursorY
      );
      cursorY += 5;
      pdf.text(`Downloaded by: ${userName}`, 14, cursorY);
      cursorY += 5;
      pdf.text(`Traveler: ${trip.travelerDetails?.label || trip.travelers || "-"}`, 14, cursorY);
      cursorY += 5;
      pdf.text(`Route: ${routeLabel || "-"}`, 14, cursorY);
      cursorY += 5;
      pdf.text(`Days: ${trip.days || "-"}`, 14, cursorY);
      cursorY += 5;
      pdf.text(`Budget: ${trip.budgetType || "-"}`, 14, cursorY);
      cursorY += 8;

      if (tripData.overview) {
        pdf.setFontSize(13);
        pdf.text("Trip Overview", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 9 },
          head: [["Field", "Value"]],
          body: [
            ["Route", tripData.overview.routeSummary || routeLabel || "-"],
            ["Best Time", tripData.overview.bestTimeToVisit || "-"],
            ["Weather Note", tripData.overview.weatherNote || "-"],
          ],
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      if (tripData.destinations?.length) {
        pdf.setFontSize(13);
        pdf.text("Destination Flow", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          head: [["Destination", "Stay", "Summary", "Highlights"]],
          body: tripData.destinations.map((stop: any) => [
            stop.name || "-",
            stop.stayDays || "-",
            stop.summary || "-",
            stop.highlights?.join(", ") || "-",
          ]),
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      const travelSegments = tripData.travelSegments || (tripData.travelSegment ? [tripData.travelSegment] : []);
      if (travelSegments.length) {
        pdf.setFontSize(13);
        pdf.text("Travel Legs", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          head: [["From", "To", "Distance", "Time", "Notes"]],
          body: travelSegments.map((segment: any) => [
            segment?.from || "-",
            segment?.to || "-",
            segment?.distanceText || "-",
            segment?.durationText || "-",
            [
              segment?.summary,
              segment?.recommendedBus ? `Bus/Road: ${segment.recommendedBus}` : "",
              segment?.recommendedRailway ? `Railway: ${segment.recommendedRailway}` : "",
              segment?.recommendedAirport ? `Airport: ${segment.recommendedAirport}` : "",
            ]
              .filter(Boolean)
              .join("\n") || "-",
          ]),
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      if (tripData.itinerary?.length) {
        pdf.setFontSize(13);
        pdf.text("Day Wise Itinerary", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 8.5, cellPadding: 2, overflow: "linebreak" },
          head: [["Day", "Phase", "Morning", "Afternoon", "Evening", "Tip"]],
          body: tripData.itinerary.map((day: any) => [
            `Day ${day.day}`,
            day.phaseTitle || day.destination || day.phaseType || "-",
            day.morning || "-",
            day.afternoon || "-",
            day.evening || "-",
            day.localTravelTip || "-",
          ]),
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      if (tripData.placesToVisit?.length) {
        pdf.setFontSize(13);
        pdf.text("Places To Visit", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          head: [["Destination", "Place", "Description"]],
          body: tripData.placesToVisit.map((place: any) => [
            place.destination || "-",
            place.name || "-",
            place.description || "-",
          ]),
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      if (tripData.foodRecommendations?.length) {
        pdf.setFontSize(13);
        pdf.text("Food Recommendations", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          head: [["Destination", "Food", "Description"]],
          body: tripData.foodRecommendations.map((food: any) =>
            typeof food === "string"
              ? ["-", food, "-"]
              : [food.destination || "-", food.name || "-", food.description || "-"]
          ),
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      if (tripData.hotels?.length) {
        pdf.setFontSize(13);
        pdf.text("Hotel Options", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          head: [["Hotel", "Category", "Price"]],
          body: tripData.hotels.map((hotel: any) => [
            hotel.name || "-",
            hotel.category || "-",
            hotel.priceRangePerNight || "-",
          ]),
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      if (tripData.estimatedBudget) {
        pdf.setFontSize(13);
        pdf.text("Estimated Budget", 14, cursorY);
        cursorY += 4;
        autoTable(pdf, {
          startY: cursorY,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2 },
          head: [["Per Day", "Total", "Note"]],
          body: [[
            tripData.estimatedBudget.perDay || "-",
            tripData.estimatedBudget.total || "-",
            tripData.estimatedBudget.note || "-",
          ]],
        });
        cursorY = (pdf as any).lastAutoTable.finalY + 8;
      }

      pdf.setFontSize(9);
      pdf.setTextColor(110, 110, 110);
      pdf.text(
        "Generated by PlanMyTrip - personalized AI trip itinerary",
        14,
        Math.min(cursorY, 285)
      );
      pdf.setTextColor(0, 0, 0);

      pdf.save(fileName);
      toast.success("Trip PDF downloaded");
    } catch (error: any) {
      toast.error("Failed to download PDF", {
        description: error?.message || "Please try again",
      });
    } finally {
      setDownloadingTripId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading your saved trips...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-2">My Saved Trips 🗺️</h1>
      <p className="text-gray-600 mb-8">
        All your saved travel plans in one place
      </p>

      {trips.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">✈️</div>
          <h2 className="text-2xl font-semibold mb-2">No saved trips yet</h2>
          <p className="text-gray-600 mb-6">
            Start planning your next adventure!
          </p>
          <button
            onClick={() => router.push("/create-trip")}
            className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Create New Trip
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <div
              key={trip._id}
              className="border rounded-lg p-6 hover:shadow-xl transition-shadow cursor-pointer bg-white"
              onClick={() => setSelectedTrip(trip)}
            >
              <div className="mb-4">
                <h3 className="font-bold text-2xl mb-3 text-gray-800">
                  {[trip.destination, trip.secondDestination, trip.thirdDestination]
                    .filter(Boolean)
                    .join(" -> ")}
                </h3>
                {formatSavedAt(trip.createdAt) && (
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.16em] text-gray-400">
                    Saved on {formatSavedAt(trip.createdAt)}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center text-gray-600">
                    <span className="text-xl mr-2">📅</span>
                    <span className="font-medium">{trip.days} Days</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="text-xl mr-2">💰</span>
                    <span className="font-medium capitalize">{trip.budgetType} Budget</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="text-xl mr-2">👥</span>
                    <span className="font-medium capitalize">
                      {trip.travelerDetails?.label || trip.travelers}
                    </span>
                  </div>
                  {(trip.adults !== undefined || trip.children !== undefined) && (
                    <div className="flex items-center text-gray-600">
                      <span className="font-medium">
                        Adults: {trip.adults ?? 0}, Children: {trip.children ?? 0}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 mt-5 pt-4 border-t">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTrip(trip);
                  }}
                  className="flex-1 px-4 py-2 bg-[#1F2937] text-white text-sm rounded-md hover:bg-gray-700 font-medium"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTrip(trip._id);
                  }}
                  className="px-4 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 font-medium"
                >
                  Delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadTripPdf(trip);
                  }}
                  disabled={downloadingTripId === trip._id}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition ${
                    downloadingTripId === trip._id
                      ? "border-gray-300 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-label="Download trip PDF"
                  title="Download trip PDF"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    shareTrip(trip);
                  }}
                  disabled={sharingTripId === trip._id}
                  className={`px-4 py-2 rounded-md border text-sm font-medium transition ${
                    sharingTripId === trip._id
                      ? "border-gray-300 text-gray-400 cursor-not-allowed"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                  aria-label="Share trip"
                  title="Share trip"
                >
                  <Share2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL POPUP */}
      {selectedTrip && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
        >
          <div 
            className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b z-10 p-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Trip Details</h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-5 py-2 rounded-md bg-[#1F2937] text-white hover:bg-gray-700 font-medium"
                  >
                    {isEditing ? "Cancel" : "Edit"}
                  </button>
                  {isEditing && (
                    <button
                      onClick={updateTrip}
                      disabled={updating}
                      className={`px-5 py-2 rounded-md text-white font-medium ${
                        updating
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-[#1F2937] hover:bg-gray-700"
                      }`}
                    >
                      {updating ? "Updating..." : "Update"}
                    </button>
                  )}
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* TRIP TITLE */}
              {isEditing ? (
                <input
                  type="text"
                  value={selectedTrip.tripData.tripTitle}
                  onChange={(e) => updateTripTitle(e.target.value)}
                  className="text-3xl font-bold w-full border-b-2 border-gray-300 focus:border-black outline-none pb-2"
                />
              ) : (
                <h3 className="text-3xl font-bold text-gray-800">
                  {selectedTrip.tripData.tripTitle}
                </h3>
              )}

              {selectedTrip.tripData?.overview && (
                <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-lg mb-3">Trip Overview</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    {selectedTrip.tripData.overview.routeSummary && (
                      <p><strong>Route:</strong> {selectedTrip.tripData.overview.routeSummary}</p>
                    )}
                    {selectedTrip.tripData.overview.bestTimeToVisit && (
                      <p><strong>Best Time:</strong> {selectedTrip.tripData.overview.bestTimeToVisit}</p>
                    )}
                    {selectedTrip.tripData.overview.weatherNote && (
                      <p><strong>Weather Note:</strong> {selectedTrip.tripData.overview.weatherNote}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-gray-50 p-5 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">Trip Summary</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>Route:</strong> {[selectedTrip.destination, selectedTrip.secondDestination, selectedTrip.thirdDestination].filter(Boolean).join(" -> ")}</p>
                    <p><strong>Days:</strong> {selectedTrip.days}</p>
                    <p><strong>Budget Type:</strong> <span className="capitalize">{selectedTrip.budgetType}</span></p>
                    <p><strong>Travelers:</strong> {selectedTrip.travelerDetails?.label || selectedTrip.travelers}</p>
                    <p><strong>Adults:</strong> {selectedTrip.adults ?? selectedTrip.travelerDetails?.adults ?? 0}</p>
                    <p><strong>Children:</strong> {selectedTrip.children ?? selectedTrip.travelerDetails?.children ?? 0}</p>
                  </div>
                </div>

                {selectedTrip.tripData?.estimatedBudget && (
                  <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-lg mb-3">Saved Budget Snapshot</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><strong>Per Day:</strong> {selectedTrip.tripData.estimatedBudget.perDay}</p>
                      <p><strong>Total:</strong> {selectedTrip.tripData.estimatedBudget.total}</p>
                      {selectedTrip.tripData.estimatedBudget.note && (
                        <p className="text-xs text-green-700">{selectedTrip.tripData.estimatedBudget.note}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {selectedTrip.tripData?.destinations?.length > 0 && (
                <div>
                  <h4 className="text-xl font-semibold mb-4 text-gray-900">Destination Flow</h4>
                  <div
                    className={`grid gap-4 ${
                      selectedTrip.tripData.destinations.length === 3
                        ? "md:grid-cols-2 xl:grid-cols-3"
                        : "md:grid-cols-2"
                    }`}
                  >
                    {selectedTrip.tripData.destinations.map((stop: any, index: number) => (
                      <div key={`${stop.name}-${index}`} className="rounded-xl border border-gray-200 bg-gray-50 p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                          {ordinalLabel(index)} Destination
                        </p>
                        <h4 className="mt-2 text-xl font-semibold text-gray-900">{stop.name}</h4>
                        {stop.stayDays && (
                          <p className="mt-1 text-sm text-gray-500">{stop.stayDays}</p>
                        )}
                        {stop.summary && (
                          <p className="mt-3 text-sm text-gray-600 leading-relaxed">{stop.summary}</p>
                        )}
                        {stop.highlights?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {stop.highlights.map((highlight: string) => (
                              <span
                                key={`${stop.name}-${highlight}`}
                                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600"
                              >
                                {highlight}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(selectedTrip.tripData?.travelSegments ||
                (selectedTrip.tripData?.travelSegment ? [selectedTrip.tripData.travelSegment] : [])
              )?.length > 0 && (
                <div className="space-y-4">
                  {(selectedTrip.tripData.travelSegments ||
                    (selectedTrip.tripData.travelSegment ? [selectedTrip.tripData.travelSegment] : [])
                  ).map((segment: any, index: number) => (
                    <div key={`${segment?.from}-${segment?.to}-${index}`} className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">
                        Travel Leg {index + 1}
                      </p>
                      <h4 className="mt-2 text-xl font-semibold text-gray-900">
                        {segment?.from} to {segment?.to}
                      </h4>
                      <div className="mt-3 grid gap-2 text-sm text-amber-900 md:grid-cols-2">
                        <p><strong>Distance:</strong> {segment?.distanceText}</p>
                        <p><strong>Estimated travel time:</strong> {segment?.durationText}</p>
                      </div>
                      {segment?.summary && (
                        <p className="mt-3 text-sm text-amber-900">{segment.summary}</p>
                      )}
                      {(segment?.recommendedBus || segment?.recommendedRailway || segment?.recommendedAirport) && (
                        <div className="mt-4 space-y-2 text-sm text-amber-900">
                          {segment?.recommendedBus && (
                            <p><strong>Bus/Road:</strong> {segment.recommendedBus}</p>
                          )}
                          {segment?.recommendedRailway && (
                            <p><strong>Railway:</strong> {segment.recommendedRailway}</p>
                          )}
                          {segment?.recommendedAirport && (
                            <p><strong>Airport:</strong> {segment.recommendedAirport}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TRANSPORT */}
              {selectedTrip.tripData.transport && (
                <div className="bg-gray-50 p-5 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">How to Reach</h4>
                  <div className="space-y-2">
                    <p>
                      <strong>Railway:</strong>{" "}
                      {selectedTrip.tripData.transport.railwayStation}
                    </p>
                    <p>
                      <strong>Bus:</strong>{" "}
                      {selectedTrip.tripData.transport.busStation}
                    </p>
                    <p>
                      <strong>Airport:</strong>{" "}
                      {selectedTrip.tripData.transport.airport}
                    </p>
                  </div>
                </div>
              )}

              {/* ITINERARY */}
              {selectedTrip.tripData.itinerary && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold">Itinerary</h4>
                    {isEditing && (
                      <button
                        onClick={addDay}
                        className="px-4 py-2 bg-[#1F2937] text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                      >
                        + Add Day
                      </button>
                    )}
                  </div>

                  {selectedTrip.tripData.itinerary.map((day: any, index: number) => {
                    const isTravel = day.phaseType === "travel";
                    const previousDay = selectedTrip.tripData.itinerary[index - 1];
                    const showPhaseHeader =
                      index === 0 ||
                      previousDay?.phaseTitle !== day.phaseTitle ||
                      previousDay?.phaseType !== day.phaseType ||
                      previousDay?.destination !== day.destination;

                    return (
                    <div key={day.day} className="mb-4">
                      {!isEditing && isTravel && (
                        <div className="flex items-center gap-3 mb-2 px-1">
                          <div className="flex-1 h-px bg-amber-200" />
                          <span className="text-xs font-semibold uppercase tracking-widest text-amber-500 whitespace-nowrap">
                            Travel Day
                          </span>
                          <div className="flex-1 h-px bg-amber-200" />
                        </div>
                      )}
                      {showPhaseHeader && (
                        <div
                          className={`mb-3 rounded-lg px-4 py-3 ${
                            day.phaseType === "travel"
                              ? "border border-amber-200 bg-amber-50"
                              : "border border-slate-200 bg-slate-50"
                          }`}
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                            {day.phaseType === "travel" ? "Travel Phase" : "Destination Phase"}
                          </p>
                          <h5 className="mt-1 text-lg font-semibold text-gray-900">
                            {day.phaseTitle || day.destination || `Day ${day.day}`}
                          </h5>
                          {day.destination && (
                            <p className="mt-1 text-sm text-gray-600">{day.destination}</p>
                          )}
                        </div>
                      )}

                    <div
                      className={`border rounded-lg p-5 ${
                        !isEditing && isTravel
                          ? "bg-amber-50 border-amber-200"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <h5 className={`font-semibold text-lg ${!isEditing && isTravel ? "text-amber-900" : "text-gray-900"}`}>
                            Day {day.day}
                          </h5>
                          {!isEditing && isTravel && day.phaseTitle && (
                            <span className="text-xs font-medium text-amber-600 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                              {day.phaseTitle}
                            </span>
                          )}
                        </div>
                        {isEditing && (
                          <button
                            onClick={() => removeDay(day.day)}
                            className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                          >
                            Remove Day
                          </button>
                        )}
                      </div>

                      {isEditing ? (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Morning:
                            </label>
                            <textarea
                              value={day.morning}
                              onChange={(e) =>
                                updateDayField(day.day, "morning", e.target.value)
                              }
                              className="w-full border rounded px-3 py-2 mt-1"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Afternoon:
                            </label>
                            <textarea
                              value={day.afternoon}
                              onChange={(e) =>
                                updateDayField(day.day, "afternoon", e.target.value)
                              }
                              className="w-full border rounded px-3 py-2 mt-1"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Evening:
                            </label>
                            <textarea
                              value={day.evening}
                              onChange={(e) =>
                                updateDayField(day.day, "evening", e.target.value)
                              }
                              className="w-full border rounded px-3 py-2 mt-1"
                              rows={2}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-600">
                              Local Travel Tip:
                            </label>
                            <input
                              type="text"
                              value={day.localTravelTip}
                              onChange={(e) =>
                                updateDayField(
                                  day.day,
                                  "localTravelTip",
                                  e.target.value
                                )
                              }
                              className="w-full border rounded px-3 py-2 mt-1"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className={`space-y-2 ${isTravel ? "text-amber-900" : "text-gray-700"}`}>
                          <p>
                            <strong>Morning:</strong> {day.morning}
                          </p>
                          <p>
                            <strong>Afternoon:</strong> {day.afternoon}
                          </p>
                          <p>
                            <strong>Evening:</strong> {day.evening}
                          </p>
                          <p className={`text-sm mt-3 bg-white p-2 rounded ${isTravel ? "text-amber-700" : "text-gray-500"}`}>
                            💡 <strong>Tip:</strong> {day.localTravelTip}
                          </p>
                        </div>
                      )}
                    </div>
                    </div>
                  );
                  })}
                </div>
              )}

              {selectedTrip.tripData?.placesToVisit?.length > 0 && (
                <div>
                  <h4 className="text-xl font-semibold mb-4">Places To Visit</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedTrip.tripData.placesToVisit.map((place: any, index: number) => (
                      <div key={`${place.name}-${index}`} className="border rounded-lg p-4 bg-gray-50">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          {place.destination || "Highlight"}
                        </p>
                        <p className="mt-2 font-semibold text-gray-900">{place.name}</p>
                        {place.description && (
                          <p className="mt-2 text-sm text-gray-600">{place.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTrip.tripData?.foodRecommendations?.length > 0 && (
                <div>
                  <h4 className="text-xl font-semibold mb-4">Food Recommendations</h4>
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedTrip.tripData.foodRecommendations.map((food: any, index: number) => (
                      <div key={`${typeof food === "string" ? food : food.name}-${index}`} className="border rounded-lg p-4 bg-gray-50">
                        {typeof food === "string" ? (
                          <p className="text-sm text-gray-700">{food}</p>
                        ) : (
                          <>
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                              {food.destination || "Local Food"}
                            </p>
                            <p className="mt-2 font-semibold text-gray-900">{food.name}</p>
                            {food.description && (
                              <p className="mt-2 text-sm text-gray-600">{food.description}</p>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTrip.tripData?.travelTips?.length > 0 && (
                <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-lg mb-3">Travel Tips</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    {selectedTrip.tripData.travelTips.map((tip: string, index: number) => (
                      <p key={`${tip}-${index}`}>• {tip}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* HOTELS */}
              {selectedTrip.tripData.hotels && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold">Hotel Options</h4>
                  </div>

                  {selectedTrip.tripData.hotels.map((hotel: any, i: number) => (
                    <div key={i} className="border p-5 rounded-lg mb-3 bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-lg">{hotel.name}</p>
                          <p className="text-gray-600">{hotel.priceRangePerNight}</p>
                        </div>
                        <a
                          href={hotel.bookingUrl}
                          target="_blank"
                          className="bg-black text-white px-5 py-2 rounded-md hover:bg-gray-800 font-medium"
                        >
                          Book Now
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* BUDGET */}
              {selectedTrip.tripData.estimatedBudget && (
                <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-lg mb-3">Estimated Budget</h4>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600 font-medium">Per Day:</label>
                        <input
                          type="text"
                          value={
                            selectedTrip.tripData.estimatedBudget?.perDay || ""
                          }
                          onChange={(e) => updateBudget("perDay", e.target.value)}
                          className="w-full border rounded px-3 py-2 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 font-medium">Total:</label>
                        <input
                          type="text"
                          value={
                            selectedTrip.tripData.estimatedBudget?.total || ""
                          }
                          onChange={(e) => updateBudget("total", e.target.value)}
                          className="w-full border rounded px-3 py-2 mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-lg">
                        <strong>Per Day:</strong>{" "}
                        {selectedTrip.tripData.estimatedBudget.perDay}
                      </p>
                      <p className="text-lg">
                        <strong>Total:</strong>{" "}
                        {selectedTrip.tripData.estimatedBudget.total}
                      </p>
                      {selectedTrip.tripData.estimatedBudget.note && (
                        <p className="text-sm text-green-700">
                          {selectedTrip.tripData.estimatedBudget.note}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
