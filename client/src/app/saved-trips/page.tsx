"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function SavedTripsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

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
        toast.success("Trip updated successfully!");
        setIsEditing(false);
        fetchTrips();
      }
    } catch (err: any) {
      toast.error("Failed to update trip");
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

  const addHotel = () => {
    if (!selectedTrip) return;

    const newHotel = {
      name: "New Hotel",
      priceRangePerNight: "₹0 - ₹0",
      rating: "0.0",
      bookingUrl: "https://www.booking.com",
    };

    const updatedHotels = [...(selectedTrip.tripData.hotels || []), newHotel];

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        hotels: updatedHotels,
      },
    });

    toast.success("Hotel added");
  };

  const removeHotel = (index: number) => {
    if (!selectedTrip || !selectedTrip.tripData.hotels) return;

    if (selectedTrip.tripData.hotels.length <= 1) {
      toast.error("Cannot remove the last hotel");
      return;
    }

    const updatedHotels = selectedTrip.tripData.hotels.filter(
      (_: any, i: number) => i !== index
    );

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        hotels: updatedHotels,
      },
    });

    toast.success("Hotel removed");
  };

  const updateHotel = (index: number, field: string, value: string) => {
    if (!selectedTrip || !selectedTrip.tripData.hotels) return;

    const updatedHotels = selectedTrip.tripData.hotels.map(
      (hotel: any, i: number) =>
        i === index ? { ...hotel, [field]: value } : hotel
    );

    setSelectedTrip({
      ...selectedTrip,
      tripData: {
        ...selectedTrip.tripData,
        hotels: updatedHotels,
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
                  {trip.destination}
                </h3>
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
                    <span className="font-medium capitalize">{trip.travelers}</span>
                  </div>
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

              {/* TRANSPORT */}
              {selectedTrip.tripData.transport && (
                <div className="bg-gray-50 p-5 rounded-lg">
                  <h4 className="font-semibold text-lg mb-3">How to Reach</h4>
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600 font-medium">Railway:</label>
                        <input
                          type="text"
                          value={selectedTrip.tripData.transport?.railwayStation || ""}
                          onChange={(e) =>
                            updateTransport("railwayStation", e.target.value)
                          }
                          className="w-full border rounded px-3 py-2 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 font-medium">Bus:</label>
                        <input
                          type="text"
                          value={selectedTrip.tripData.transport?.busStation || ""}
                          onChange={(e) =>
                            updateTransport("busStation", e.target.value)
                          }
                          className="w-full border rounded px-3 py-2 mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-600 font-medium">Airport:</label>
                        <input
                          type="text"
                          value={selectedTrip.tripData.transport?.airport || ""}
                          onChange={(e) => updateTransport("airport", e.target.value)}
                          className="w-full border rounded px-3 py-2 mt-1"
                        />
                      </div>
                    </div>
                  ) : (
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
                  )}
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

                  {selectedTrip.tripData.itinerary.map((day: any) => (
                    <div key={day.day} className="border rounded-lg p-5 mb-4 bg-gray-50">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-semibold text-lg">Day {day.day}</h5>
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
                        <div className="space-y-2">
                          <p>
                            <strong>Morning:</strong> {day.morning}
                          </p>
                          <p>
                            <strong>Afternoon:</strong> {day.afternoon}
                          </p>
                          <p>
                            <strong>Evening:</strong> {day.evening}
                          </p>
                          <p className="text-sm text-gray-500 mt-3 bg-white p-2 rounded">
                            💡 <strong>Tip:</strong> {day.localTravelTip}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* HOTELS */}
              {selectedTrip.tripData.hotels && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-xl font-semibold">Hotel Options</h4>
                    {isEditing && (
                      <button
                        onClick={addHotel}
                        className="px-4 py-2 bg-[#1F2937] text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                      >
                        + Add Hotel
                      </button>
                    )}
                  </div>

                  {selectedTrip.tripData.hotels.map((hotel: any, i: number) => (
                    <div key={i} className="border p-5 rounded-lg mb-3 bg-gray-50">
                      {isEditing ? (
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-3">
                              <div>
                                <label className="text-sm text-gray-600 font-medium">
                                  Hotel Name:
                                </label>
                                <input
                                  type="text"
                                  value={hotel.name}
                                  onChange={(e) =>
                                    updateHotel(i, "name", e.target.value)
                                  }
                                  className="w-full border rounded px-3 py-2 mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-600 font-medium">
                                  Price Range:
                                </label>
                                <input
                                  type="text"
                                  value={hotel.priceRangePerNight}
                                  onChange={(e) =>
                                    updateHotel(
                                      i,
                                      "priceRangePerNight",
                                      e.target.value
                                    )
                                  }
                                  className="w-full border rounded px-3 py-2 mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-600 font-medium">
                                  Rating:
                                </label>
                                <input
                                  type="text"
                                  value={hotel.rating}
                                  onChange={(e) =>
                                    updateHotel(i, "rating", e.target.value)
                                  }
                                  className="w-full border rounded px-3 py-2 mt-1"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-600 font-medium">
                                  Booking URL:
                                </label>
                                <input
                                  type="text"
                                  value={hotel.bookingUrl}
                                  onChange={(e) =>
                                    updateHotel(i, "bookingUrl", e.target.value)
                                  }
                                  className="w-full border rounded px-3 py-2 mt-1"
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => removeHotel(i)}
                              className="ml-4 px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-lg">{hotel.name}</p>
                            <p className="text-gray-600">{hotel.priceRangePerNight}</p>
                            <p className="text-yellow-600">⭐ {hotel.rating}</p>
                          </div>
                          <a
                            href={hotel.bookingUrl}
                            target="_blank"
                            className="bg-black text-white px-5 py-2 rounded-md hover:bg-gray-800 font-medium"
                          >
                            Book Now
                          </a>
                        </div>
                      )}
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