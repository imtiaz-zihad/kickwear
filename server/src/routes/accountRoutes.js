// src/routes/accountRoutes.js
const router = require("express").Router();
const { list, create, update, remove, courierBalance } = require("../controllers/accountController");
const { requireAdmin } = require("../middleware/adminAuth");

// admin only (partner hisab)
router.get("/", requireAdmin, list);
router.get("/courier-balance", requireAdmin, courierBalance);
router.post("/", requireAdmin, create);
router.patch("/:id", requireAdmin, update);
router.delete("/:id", requireAdmin, remove);

module.exports = router;