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

    secondDestination: {
      type: String,
    },

    thirdDestination: {
      type: String,
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

    adults: {
      type: Number,
    },

    children: {
      type: Number,
    },

    travelerDetails: {
      adults: {
        type: Number,
      },
      children: {
        type: Number,
      },
      totalMembers: {
        type: Number,
      },
      label: {
        type: String,
      },
    },

    isPublicShared: {
      type: Boolean,
      default: false,
    },

    shareSlug: {
      type: String,
      unique: true,
      sparse: true,
    },

    sharedAt: {
      type: Date,
    },

    tripData: {
      type: Schema.Types.Mixed, // stores full AI JSON
      required: true,
    },
  },
  { timestamps: true }
);

export default model("Trip", TripSchema);
