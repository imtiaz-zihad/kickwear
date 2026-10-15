import CategorySection from "@/components/Home/CategorySection";
import ClubJersey from "@/components/Home/ClubJersey";
import CountryJersey from "@/components/Home/CountryJersey";
import FeaturedProducts from "@/components/Home/FeaturedProducts";
import Features from "@/components/Home/Features";
import HeroImage from "@/components/Home/HeroImage";
import Jacket from "@/components/Home/Jacket";
import RetroJersey from "@/components/Home/RettroJersey";

export default async function Home() {
  return (
    <div className="min-h-screen px-5">
      <HeroImage />
      <FeaturedProducts />
      <CategorySection />
      <ClubJersey/>
      <CountryJersey/>
      <RetroJersey />
      <Jacket />
    </div>
  );
}
