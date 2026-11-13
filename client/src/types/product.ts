export const SIZES = ["S", "M", "L", "XL", "2XL", "3XL", "4XL"] as const;
export type Size = (typeof SIZES)[number];

export type Sleeve = "half" | "full";

// "preorder" = not in stock yet, but customers can order it
export type Availability = "in-stock" | "preorder";

export interface AddOnConfig {
  enabled?: boolean;
  price?: number; // per jersey, defaults to 200 if missing
}

export interface ProductAddOns {
  uclPatch?: AddOnConfig;
  customPrint?: AddOnConfig; // name + number printing
}

export interface Product {
  _id: string;
  name: string; // "Barcelona Home 26/27"
  category: string; // "club-jersey"
  subcategory?: string; // team: "barcelona"
  sleeve?: Sleeve;
  season?: string; // "26/27"
  sizes?: Size[];
  addOns?: ProductAddOns;
  images: string[];
  originalPrice: number; // regular price
  discountedPrice: number; // selling price
  discountPercentage?: number;
  stock?: number;
  description?: string;
  isFeatured?: boolean;
  slug?: string; // clean URL: "real-madrid-26-27-home-full-sleeve"
  availability?: Availability;
  preorderNote?: string; // "Delivery 20-25 Nov"
  createdAt?: string;
  updatedAt?: string;
}

// For adding a product (no _id / computed fields yet)
export type NewProduct = Omit<
  Product,
  "_id" | "discountPercentage" | "createdAt" | "updatedAt"
>;