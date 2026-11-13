const SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"];
const DEFAULT_SIZES = ["S", "M", "L", "XL", "2XL"];


const SIZE_SURCHARGE = { "3XL": 100, "4XL": 200 };

const sizeExtra = (size) => SIZE_SURCHARGE[size] || 0;

module.exports = { SIZES, DEFAULT_SIZES, SIZE_SURCHARGE, sizeExtra };
