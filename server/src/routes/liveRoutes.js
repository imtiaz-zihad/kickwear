// src/routes/liveRoutes.js
const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { requireAdmin } = require("../middleware/adminAuth");
const PageStat = require("../models/PageStat");
const PageVisitor = require("../models/PageVisitor");
const PageEvent = require("../models/PageEvent");

// Public tracking calls: generous (many visitors can share one mobile IP),
// but stops someone from spamming fake views.
const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  message: { message: "Too many requests" },
});

/* ---------------- live visitors (in-memory) ---------------- */

const ACTIVE_MS = 45_000; // "online" = pinged in the last 45s
const MAX_SESSIONS = 5000; // memory guard
const sessions = new Map(); // id -> { path, lastSeen }

// drop stale sessions every minute
setInterval(() => {
  const cutoff = Date.now() - 5 * 60_000;
  for (const [id, s] of sessions) {
    if (s.lastSeen < cutoff) sessions.delete(id);
  }
}, 60_000).unref();

// Public: the website pings this every ~20s
router.post("/ping", publicLimiter, (req, res) => {
  const { id, path } = req.body || {};
  if (typeof id === "string" && id.length >= 8 && id.length <= 64) {
    if (sessions.size < MAX_SESSIONS || sessions.has(id)) {
      sessions.set(id, {
        path: typeof path === "string" ? path.slice(0, 100) : "/",
        lastSeen: Date.now(),
      });
    }
  }
  res.status(204).end();
});

// Admin only: live count
router.get("/", requireAdmin, (_req, res) => {
  const cutoff = Date.now() - ACTIVE_MS;
  const byPath = {};
  let online = 0;

  for (const s of sessions.values()) {
    if (s.lastSeen >= cutoff) {
      online++;
      byPath[s.path] = (byPath[s.path] || 0) + 1;
    }
  }

  const pages = Object.entries(byPath)
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  res.json({ online, pages });
});

/* ---------------- page views (MongoDB, lifetime) ---------------- */

// Only real storefront pages are counted (keeps the collection small/clean)
const ALLOWED_PATH =
  /^\/(?:product\/[a-f0-9]{24}|category(?:\/[\w-]{1,40})?|checkout|track-order)?$/i;

// today's date in Bangladesh time (UTC+6)
const todayBD = () =>
  new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);

// midnight (Bangladesh time) as a real Date
const startOfTodayBD = () => new Date(`${todayBD()}T00:00:00+06:00`);

// traffic source: letters/digits/._- only, max 30 chars
const cleanSrc = (s) =>
  typeof s === "string" && /^[a-z0-9._-]{1,30}$/i.test(s)
    ? s.toLowerCase()
    : null;

// run once, retry once (two first-hits at the same instant can collide on the unique index)
const withRetry = async (fn) => {
  try {
    await fn();
  } catch {
    await fn();
  }
};

const bumpViews = (path, date) =>
  PageStat.updateOne({ path, date }, { $inc: { views: 1 } }, { upsert: true });

const markVisitor = (path, vid, date) =>
  PageVisitor.updateOne(
    { path, vid },
    { $set: { lastDate: date }, $setOnInsert: { firstDate: date } },
    { upsert: true },
  );

// Public: the website calls this once per page view
router.post("/view", publicLimiter, async (req, res) => {
  const { path: raw, vid, src, landing } = req.body || {};

  if (typeof raw === "string" && raw.length <= 120) {
    const path = raw.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";

    if (ALLOWED_PATH.test(path)) {
      const date = todayBD();
      const validVid =
        typeof vid === "string" && vid.length >= 8 && vid.length <= 64;

      try {
        await withRetry(() => bumpViews(path, date));
      } catch (e) {
        console.error("Page view not saved:", e.message);
      }

      if (validVid) {
        try {
          await withRetry(() => markVisitor(path, vid, date));
        } catch (e) {
          console.error("Visitor not saved:", e.message);
        }
      }

      // time-stamped log: today's visits + traffic sources
      try {
        const ua = req.get("user-agent") || "";
        const isLanding = landing === true;
        await PageEvent.create({
          path,
          v: validVid ? vid.slice(-6) : null,
          device: /mobile|android|iphone|ipad/i.test(ua) ? "Mobile" : "Desktop",
          src: cleanSrc(src) ?? (isLanding ? "other" : null),
          landing: isLanding,
        });
      } catch (e) {
        console.error("Visit log not saved:", e.message);
      }
    }
  }

  res.status(204).end();
});

// Admin only: views + unique visitors per page (lifetime + today)
router.get("/stats", requireAdmin, async (_req, res) => {
  try {
    const today = todayBD();

    const [viewRows, uniqueRows, siteRows] = await Promise.all([
      PageStat.aggregate([
        {
          $group: {
            _id: "$path",
            total: { $sum: "$views" },
            today: {
              $sum: { $cond: [{ $eq: ["$date", today] }, "$views", 0] },
            },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 100 },
      ]),
      PageVisitor.aggregate([
        {
          $group: {
            _id: "$path",
            unique: { $sum: 1 },
            uniqueToday: {
              $sum: { $cond: [{ $eq: ["$lastDate", today] }, 1, 0] },
            },
          },
        },
      ]),
      // site-wide unique visitors (a person counted once across all pages)
      PageVisitor.aggregate([
        {
          $group: {
            _id: "$vid",
            today: { $max: { $cond: [{ $eq: ["$lastDate", today] }, 1, 0] } },
          },
        },
        {
          $group: {
            _id: null,
            unique: { $sum: 1 },
            uniqueToday: { $sum: "$today" },
          },
        },
      ]),
    ]);

    const uniqueByPath = Object.fromEntries(uniqueRows.map((r) => [r._id, r]));

    const pages = viewRows.map((r) => ({
      path: r._id,
      total: r.total,
      today: r.today,
      unique: uniqueByPath[r._id]?.unique ?? 0,
      uniqueToday: uniqueByPath[r._id]?.uniqueToday ?? 0,
    }));

    const site = siteRows[0] || { unique: 0, uniqueToday: 0 };

    res.json({
      totalViews: pages.reduce((s, p) => s + p.total, 0),
      todayViews: pages.reduce((s, p) => s + p.today, 0),
      uniqueVisitors: site.unique,
      uniqueToday: site.uniqueToday,
      pages,
    });
  } catch (err) {
    console.error("Page stats error:", err);
    res.status(500).json({ message: "Failed to load page stats" });
  }
});

// Admin only: today's visits with time (newest first)
router.get("/today", requireAdmin, async (_req, res) => {
  try {
    const events = await PageEvent.find({ at: { $gte: startOfTodayBD() } })
      .sort({ at: -1 })
      .limit(200)
      .lean();

    res.json({
      visits: events.map((e) => ({
        path: e.path,
        at: e.at,
        visitor: e.v,
        device: e.device,
        src: e.src,
      })),
    });
  } catch (err) {
    console.error("Today visits error:", err);
    res.status(500).json({ message: "Failed to load today's visits" });
  }
});

// Admin only: where visits come from (today + last 14 days)
router.get("/sources", requireAdmin, async (_req, res) => {
  try {
    const start = startOfTodayBD();

    const rows = await PageEvent.aggregate([
      { $match: { landing: true } },
      {
        $group: {
          _id: "$src",
          total: { $sum: 1 },
          today: { $sum: { $cond: [{ $gte: ["$at", start] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 20 },
    ]);

    res.json({
      sources: rows.map((r) => ({
        source: r._id || "other",
        total: r.total,
        today: r.today,
      })),
    });
  } catch (err) {
    console.error("Sources error:", err);
    res.status(500).json({ message: "Failed to load sources" });
  }
});

module.exports = router;