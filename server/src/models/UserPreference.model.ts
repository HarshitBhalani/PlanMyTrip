import { Schema, model, Types } from "mongoose";

const UserPreferenceSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    budgetRange: {
      type: String, // cheap | moderate | luxury
      default: "moderate",
    },

    hotelType: {
      type: String, // budget | premium | luxury
      default: "budget",
    },

    travelPace: {
      type: String, // relaxed | balanced | packed
      default: "balanced",
    },

    foodPreference: {
      type: String, // veg | non-veg | both
      default: "veg",
    },

    transportPreference: {
      type: String, // public | private | mixed
      default: "mixed",
    },
  },
  { timestamps: true }
);

export default model("UserPreference", UserPreferenceSchema);
