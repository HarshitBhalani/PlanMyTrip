import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connectDB from "./config/db";

const PORT = process.env.PORT || 5000;
const RENDER_URL = "https://planmytrip-8hkz.onrender.com"; 

// ================= KEEP ALIVE FUNCTION =================
const keepAlive = () => {
  // run only in production (Render)
  if (process.env.NODE_ENV !== "production") {
    console.log("Keep-alive disabled (development mode)");
    return;
  }

  setInterval(async () => {
    try {
      const response = await fetch(`${RENDER_URL}/api/health`);
      console.log(
        `🟢 Keep-Alive Ping → ${new Date().toISOString()} | Status: ${response.status}`
      );
    } catch (error) {
      console.log(
        `🔴 Keep-Alive Failed → ${new Date().toISOString()}`
      );
    }
  }, 15 * 60 * 1000); // ✅ every 15 minutes
};

// ================= START SERVER =================
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // start keep alive
    keepAlive();
  });
};

startServer();
