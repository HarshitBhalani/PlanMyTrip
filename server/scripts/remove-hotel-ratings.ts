import dotenv from "dotenv";
import mongoose from "mongoose";
import Trip from "../src/models/Trip.model";

dotenv.config();

async function run() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set");
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB");

  const result = await Trip.updateMany(
    { "tripData.hotels.rating": { $exists: true } },
    { $unset: { "tripData.hotels.$[].rating": "" } }
  );

  console.log(`Matched trips: ${result.matchedCount}`);
  console.log(`Updated trips: ${result.modifiedCount}`);

  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}

run().catch(async (error) => {
  console.error("Migration failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore disconnect errors during failure path
  }
  process.exit(1);
});
