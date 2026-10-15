const express = require("express");
require("dotenv").config();
const cors = require("cors");
const compression = require("compression"); // ✅ gzip responses
const rateLimit = require("express-rate-limit"); // ✅ prevent abuse

const connectDB = require("./config/db");
const app = express();

// ✅ DB connect
connectDB();

// ✅ Gzip compression — makes responses significantly smaller & faster
app.use(compression());

// ✅ CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://www.sbcollectionbd.com",
      "https://sbcollectionbd.com",
      "https://e-frontend-lemon.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json({ limit: "10kb" })); // ✅ Limit request body size

// ✅ General rate limiter (100 requests per 15 min per IP)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many requests, please try again later." },
});




app.use("/api/", generalLimiter);


// ✅ Health check
app.get("/", (req, res) => {
  res.send("🚀 API is running successfully!");
});

// ✅ Routes
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

// ✅ 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;