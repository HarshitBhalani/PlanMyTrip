import dotenv from "dotenv";
dotenv.config();

/* 🔎 HARD PROOF LOG */
console.log("ENV CHECK → GROQ_API_KEY:", process.env.GROQ_API_KEY);

import app from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};


startServer();
