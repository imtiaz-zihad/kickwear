// src/routes/productRoutes.js
const router = require("express").Router();

const {
  getProducts,
  getSingleProduct,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { requireAdmin } = require("../middleware/adminAuth");

router.get("/", getProducts); // public (storefront)
router.get("/:id", getSingleProduct); // public (storefront)
router.post("/", requireAdmin, addProduct);
router.patch("/:id", requireAdmin, updateProduct);
router.delete("/:id", requireAdmin, deleteProduct);

module.exports = router;