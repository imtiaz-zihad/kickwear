const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Connecting to DB...");


    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from environment variables");
    }

    await mongoose.connect(process.env.MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.error("❌ DB Connection Error:", err.message);
    process.exit(1);
  }
};

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️ MongoDB disconnected");
});

module.exports = connectDB;