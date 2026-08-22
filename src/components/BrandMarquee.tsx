// src/components/BrandMarquee.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseBrowserClient";
import OptimizedImage from "./OptimizedImage.jsx";

const FALLBACK_BRANDS = [
  { id: "yoshimura", name: "Yoshimura", logo_url: null },
  { id: "ap-racing", name: "AP Racing", logo_url: null },
  { id: "brembo", name: "Brembo", logo_url: null },
  { id: "federal-part", name: "Federal Part", logo_url: null },
  { id: "ktc", name: "KTC", logo_url: null },
  { id: "kawahara", name: "Kawahara", logo_url: null },
  { id: "mtrt", name: "MTRT", logo_url: null },
  { id: "rcb", name: "RCB", logo_url: null },
  { id: "ohlins", name: "Ohlins", logo_url: null },
  { id: "showa", name: "Showa", logo_url: null },
];

const DURATION = 50;

const BrandLogo = ({ brand }: { brand: Brand }) => (
  <div className="flex-none px-4 mobile:px-6 flex flex-col items-center justify-center select-none gap-1.5">
    {brand.logo_url ? (
      <OptimizedImage
        src={brand.logo_url}
        alt={brand.name}
        width={150}
        loading="lazy"
        decoding="async"
        className="h-8 mobile:h-10 tablet:h-12 object-contain"
      />
    ) : null}
    <span className="text-xs mobile:text-sm tablet:text-base font-bold text-slate-400 hover:text-orange-500 transition-colors duration-200 whitespace-nowrap tracking-tight">
      {brand.name}
    </span>
  </div>
);

interface Brand {
  id: string;
  name: string;
  logo_url?: string | null;
}

const BrandMarquee = ({ brands: initialBrands = [] }: { brands?: Brand[] }) => {
  const [brands, setBrands] = useState<Brand[]>(
    initialBrands.length > 0 ? initialBrands : FALLBACK_BRANDS
  );
  const [isPaused, setIsPaused] = useState(false);
  const prefersReduced = useRef(false);

  // Client-side re-fetch: always get fresh brand data
  useEffect(() => {
    const fetchFreshBrands = async () => {
      try {
        const { data } = await supabase
          .from("brands")
          .select("id, name, logo_url")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (data && data.length > 0) {
          setBrands(data);
        }
      } catch (err) {
        // silently fail, keep prerendered data
      }
    };

    fetchFreshBrands();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReduced.current = mq.matches;
    const handler = (e: MediaQueryListEvent) => { prefersReduced.current = e.matches; };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!prefersReduced.current) setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => { setIsPaused(false); }, []);

  const items = [...brands, ...brands, ...brands];

  return (
    <section
      className="bg-white border-y border-slate-100 py-4 mobile:py-6 overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      role="region"
      aria-label="Brand partner logos"
    >
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-12 mobile:w-20 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 mobile:w-20 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
        <div
          className="flex items-center w-max"
          style={{
            animation: prefersReduced.current
              ? "none"
              : `marquee ${DURATION}s linear infinite`,
            animationPlayState: isPaused ? "paused" : "running",
            willChange: "transform",
          }}
        >
          {items.map((brand, idx) => (
            <BrandLogo key={`${brand.id}-${idx}`} brand={brand} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee { animation: none !important; }
        }
      `}</style>
    </section>
  );
};

export default BrandMarquee;
