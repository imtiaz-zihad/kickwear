// src/services/steadfast.js
// Customer delivery record from Steadfast (Packzy) fraud-check API.
// Used only to show a risk % on orders. No parcel booking here.
//
// Env variables on the server (Render):
//   STEADFAST_API_KEY      from portal.packzy.com -> API keys
//   STEADFAST_SECRET_KEY
//   STEADFAST_BASE_URL     optional, default https://portal.packzy.com/api/v1
// If the keys are missing, every check quietly returns null.
const axios = require("axios");
const { getCache, setCache } = require("../utils/cache");

const BASE_URL = process.env.STEADFAST_BASE_URL || "https://portal.packzy.com/api/v1";
const CACHE_SECONDS = 10 * 60; // same phone is not asked again for 10 minutes
const PAUSE_MS = 10 * 60 * 1000; // after 401/403/429 stop calling for 10 minutes

// Steadfast locks the keys for 60 minutes after 10 failed calls in 5 minutes,
// so on an auth/limit error we stop calling instead of retrying.
let pausedUntil = 0;

// Risk levels, based on the share of the customer's parcels that were cancelled
const HIGH_AT = 40; // % cancelled -> high
const MEDIUM_AT = 20; // % cancelled -> medium

const isConfigured = () =>
  Boolean(process.env.STEADFAST_API_KEY && process.env.STEADFAST_SECRET_KEY);

const num = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace("%", "").trim());
  return Number.isFinite(n) ? n : null;
};

// Raw API answer -> the small object we store on the order
function normalize(raw) {
  const d = raw && typeof raw.data === "object" && raw.data ? raw.data : raw || {};

  let delivery = num(d.delivery_ratio);
  let cancel = num(d.cancellation_ratio);

  // ratios may come as 0-1 or 0-100: anything above 1 means it is already a percent
  const alreadyPercent = [delivery, cancel].some((v) => v !== null && v > 1);
  const pct = (v) => (v === null ? null : Math.round(alreadyPercent ? v : v * 100));
  delivery = pct(delivery);
  cancel = pct(cancel);
  if (cancel === null && delivery !== null) cancel = 100 - delivery;

  const reports = num(d.total_reports) ?? 0;
  const band = d.volume_band;
  const volume =
    band && typeof band === "object" ? String(band.label ?? "") : String(band ?? "");

  let level = "new"; // no finished parcels yet = nothing to judge
  if (cancel !== null) {
    level = cancel >= HIGH_AT ? "high" : cancel >= MEDIUM_AT ? "medium" : "low";
  }
  // reported by other merchants -> never show "low"
  if (reports > 0 && (level === "low" || level === "new")) level = "medium";

  return {
    percent: cancel, // risk % = share of parcels NOT delivered (null = new customer)
    level,
    deliveryPercent: delivery,
    cancelPercent: cancel,
    reports,
    volume,
    checkedAt: new Date(),
  };
}

async function fetchRaw(phone) {
  const res = await axios.get(`${BASE_URL}/fraud_check/score/${phone}`, {
    headers: {
      "Api-Key": process.env.STEADFAST_API_KEY,
      "Secret-Key": process.env.STEADFAST_SECRET_KEY,
      "Content-Type": "application/json",
    },
    timeout: 6000,
  });
  return res.data;
}

// Returns the normalized risk, or null when it could not be checked
async function checkCustomer(phone, { force = false } = {}) {
  if (!isConfigured() || Date.now() < pausedUntil) return null;

  const key = `fraud:${phone}`;
  if (!force) {
    const cached = getCache(key);
    if (cached) return cached;
  }

  try {
    const risk = normalize(await fetchRaw(phone));
    setCache(key, risk, CACHE_SECONDS);
    return risk;
  } catch (err) {
    const status = err?.response?.status;
    if ([401, 403, 429].includes(status)) {
      pausedUntil = Date.now() + PAUSE_MS;
      console.error(`Steadfast check paused 10 min (HTTP ${status})`);
    } else {
      console.error("Steadfast check failed:", status || err.message);
    }
    return null;
  }
}

// For the admin debug route: shows the real answer next to our reading of it
async function inspectCustomer(phone) {
  if (!isConfigured()) {
    const e = new Error("STEADFAST_API_KEY / STEADFAST_SECRET_KEY are not set");
    e.status = 503;
    throw e;
  }
  const raw = await fetchRaw(phone);
  return { raw, risk: normalize(raw) };
}

module.exports = { checkCustomer, inspectCustomer, isConfigured, normalize };