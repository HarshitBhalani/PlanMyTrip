import { Schema, model, Types } from "mongoose";

const TripSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    destination: {
      type: String,
      required: true,
    },

    days: {
      type: Number,
      required: true,
    },

    budgetType: {
      type: String,
      required: true,
    },

    travelers: {
      type: String,
      required: true,
    },

    tripData: {
      type: Schema.Types.Mixed, // stores full AI JSON
      required: true,
    },
  },
  { timestamps: true }
);

export default model("Trip", TripSchema);
