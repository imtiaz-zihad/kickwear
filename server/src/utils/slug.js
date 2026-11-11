// "Real Madrid 2026/27 Home Jersey" + sleeve "full"
//   → "real-madrid-2026-27-home-jersey-full-sleeve"
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

// Sleeve goes into the slug unless the name already says it
function baseSlug(product) {
  let s = slugify(product.name);
  if (product.sleeve && !/(half|full)-sleeve/.test(s)) {
    s += `-${product.sleeve}-sleeve`;
  }
  return s || "product";
}

// Adds -2, -3 ... until the slug is free
async function uniqueSlug(Model, base, excludeId) {
  let slug = base;
  let n = 2;
  const taken = (s) =>
    Model.exists({ slug: s, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
  while (await taken(slug)) slug = `${base}-${n++}`;
  return slug;
}

module.exports = { slugify, baseSlug, uniqueSlug };