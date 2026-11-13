// src/data/reviews.ts

export type Review = {
  id: string;
  src: string; // Cloudinary public ID ("reviews/rahim") or a full image URL
  alt?: string; // describe the screenshot (good for SEO / screen readers)
  tag?: string; // filter chip, e.g. "Jersey", "Kids", "Retro", "Delivery"
  name?: string; // customer name (only if they agreed)
  product?: string; // what they bought
  width?: number;
  height?: number;
};

export const REVIEWS: Review[] = [
      {
    id: "r5",
    src: "https://res.cloudinary.com/ps6g4nx2/image/upload/v1794613562/772853199_18080260949355848_5719970860162733689_n.jpg",
    product: "Real Home",
    name: "Mithila",
    width: 1080,
    height: 1920,
  },
  {
    id: "r4",
    src: "https://res.cloudinary.com/ps6g4nx2/image/upload/v1794613563/814926287_18089747015355848_7627062937078052486_n.jpg",
    product: "Real  away",
    name: "Jubayer",
    width: 900,
    height: 1600,
  },
  {
    id: "r3",
    src: "https://res.cloudinary.com/ps6g4nx2/image/upload/v1794613563/806280471_18088328960355848_6013274625062285334_n.jpg",
    product: "Barca away",
    name: "Sumi",
    width: 1080,
    height: 1920,
  },
  {
    id: "r3",
    src: "https://res.cloudinary.com/ps6g4nx2/image/upload/v1794613563/806280471_18088328960355848_6013274625062285334_n.jpg",
    product: "Barca away",
    name: "Sumi",
    width: 1080,
    height: 1920,
  },
  {
    id: "r3",
    src: "https://res.cloudinary.com/ps6g4nx2/image/upload/v1794613563/806280471_18088328960355848_6013274625062285334_n.jpg",
    product: "Barca away",
    name: "Sumi",
    width: 1080,
    height: 1920,
  },
  {
    id: "r2",
    src: "https://res.cloudinary.com/ps6g4nx2/image/upload/v1794613562/772481764_18079148048355848_7453313834950083871_n.jpg",
    name: "Ashabul",
    product: "Real Madrid away",
    width: 900,
    height: 1600,
  },
  {
    id: "r1",
    src: "https://res.cloudinary.com/ps6g4nx2/image/upload/v1794613562/778256075_18082042757355848_1590978772165625356_n.jpg",
    name: "Amina",
    product: "Argentina Home 2026",
    width: 1080,
    height: 2200,
  },
];
