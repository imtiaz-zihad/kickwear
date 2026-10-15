// src/routes/productRoutes.js
const router = require("express").Router();

const {
  getProducts,
  getSingleProduct,
  addProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");

router.get("/", getProducts);
router.get("/:id", getSingleProduct);
router.post("/", addProduct);
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);

module.exports = router;