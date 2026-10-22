const express = require("express");
require("dotenv").config();
const cors = require("cors");
const compression = require("compression"); // ✅ gzip responses
const rateLimit = require("express-rate-limit"); // ✅ prevent abuse

const connectDB = require("./config/db");
const app = express();

// ✅ Render's proxy sits in front of the app (needed for rate limiter to see real IPs)
app.set("trust proxy", 1);

// ✅ DB connect
connectDB();

// ✅ Gzip compression — makes responses significantly smaller & faster
app.use(compression());

// ✅ CORS
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://kickwear.shop",
      "https://www.kickwear.shop",
      "https://kickwear-seven.vercel.app"
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

// ✅ Health checks (must be BEFORE the 404 handler)
app.get("/", (req, res) => {
  res.send("🚀 API is running successfully!");
});

app.get("/health", (req, res) => res.status(200).json({ ok: true }));

// ✅ Routes
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));
app.use("/api/abandoned", require("./routes/abandonedRoutes"));

// ✅ 404 handler (always after all routes)
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Global error handler (always last)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;