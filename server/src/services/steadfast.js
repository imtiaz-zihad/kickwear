// src/services/steadfast.js
// Steadfast (Packzy) API: customer delivery record (fraud check) and parcel booking / status.
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

// ───────────────────────── Parcel booking ─────────────────────────
// create_order books a parcel, status_by_cid reads where it is now.
// Duplicate invoices are refused by Steadfast, so a retry cannot double-book.

const authHeaders = () => ({
  "Api-Key": process.env.STEADFAST_API_KEY,
  "Secret-Key": process.env.STEADFAST_SECRET_KEY,
  "Content-Type": "application/json",
});

// Turns an axios error into an Error with a readable message and an HTTP status
function courierError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  if ([401, 403, 429].includes(status)) {
    pausedUntil = Date.now() + PAUSE_MS;
    console.error(`Steadfast paused 10 min (HTTP ${status})`);
  }

  let message = "Could not reach Steadfast. Try again in a few minutes.";
  if (status === 401) message = "Steadfast rejected the API keys (check them on Render).";
  else if (status === 403) message = "Steadfast says this account is not allowed right now.";
  else if (status === 429) message = "Steadfast: too many requests. Try again later.";
  else if (status === 422 || status === 400) {
    const fields =
      data?.errors && typeof data.errors === "object"
        ? Object.values(data.errors).flat().join(", ")
        : "";
    message = `Steadfast refused the parcel: ${fields || data?.message || "invalid data"}`;
  } else if (data?.message) message = `Steadfast: ${data.message}`;

  const e = new Error(message);
  e.status = status && status >= 400 && status < 500 ? 400 : 502;
  return e;
}

function assertReady() {
  if (!isConfigured()) {
    const e = new Error("Steadfast keys are not set on the server");
    e.status = 503;
    throw e;
  }
  if (Date.now() < pausedUntil) {
    const e = new Error("Steadfast is paused for a few minutes after an error. Try again later.");
    e.status = 503;
    throw e;
  }
}

// parcel = { invoice, name, phone, address, cod, note }
async function bookParcel(parcel) {
  assertReady();
  try {
    const res = await axios.post(
      `${BASE_URL}/create_order`,
      {
        invoice: parcel.invoice,
        recipient_name: parcel.name,
        recipient_phone: parcel.phone,
        recipient_address: parcel.address,
        cod_amount: parcel.cod,
        note: parcel.note,
      },
      { headers: authHeaders(), timeout: 15000 },
    );

    const c = res.data?.consignment;
    if (!c || !c.consignment_id) {
      const e = new Error("Steadfast answered without a consignment id. Check the portal before retrying.");
      e.status = 502;
      throw e;
    }

    return {
      consignmentId: String(c.consignment_id),
      trackingCode: String(c.tracking_code ?? ""),
      status: String(c.status ?? "in_review"),
    };
  } catch (err) {
    if (err.status && !err.response) throw err; // already one of ours
    throw courierError(err);
  }
}

// Where one parcel is now. The field name differs between API versions, so look at a few.
async function parcelStatus(consignmentId) {
  assertReady();
  try {
    const res = await axios.get(`${BASE_URL}/status_by_cid/${encodeURIComponent(consignmentId)}`, {
      headers: authHeaders(),
      timeout: 10000,
    });
    const d = res.data || {};
    const candidates = [d.delivery_status, d.data?.delivery_status, d.status, d.data?.status];
    return candidates.find((v) => typeof v === "string" && v) || "unknown";
  } catch (err) {
    throw courierError(err);
  }
}
// Money Steadfast is holding for us (current_balance, in taka)
async function getBalance() {
  assertReady();
  try {
    const res = await axios.get(`${BASE_URL}/get_balance`, {
      headers: authHeaders(),
      timeout: 10000,
    });
    const n = Number(res.data?.current_balance);
    if (!Number.isFinite(n)) {
      const e = new Error("Steadfast answered without a balance.");
      e.status = 502;
      throw e;
    }
    return n;
  } catch (err) {
    if (err.status && !err.response) throw err;
    throw courierError(err);
  }
}

module.exports = {
  getBalance,
  checkCustomer,
  inspectCustomer,
  isConfigured,
  normalize,
  bookParcel,
  parcelStatus,
};
module.exports = {
  checkCustomer,
  inspectCustomer,
  isConfigured,
  normalize,
  bookParcel,
  parcelStatus,
};