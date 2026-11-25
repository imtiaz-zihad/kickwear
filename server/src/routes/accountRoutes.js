// src/routes/accountRoutes.js
const router = require("express").Router();
const { list, create, update, remove } = require("../controllers/accountController");
const { requireAdmin } = require("../middleware/adminAuth");

// admin only (partner hisab)
router.get("/", requireAdmin, list);
router.post("/", requireAdmin, create);
router.patch("/:id", requireAdmin, update);
router.delete("/:id", requireAdmin, remove);

module.exports = router;