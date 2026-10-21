"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Common/Navbar";
import Footer from "@/components/Common/Footer";
import MetaPixel from "./MetaPixel";
import Clarity from "./Clarity";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/login");

  return (
    <>
      {!isAdmin && <MetaPixel />}
      {!isAdmin && <Clarity />}
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && <Footer />}
    </>
  );
}
