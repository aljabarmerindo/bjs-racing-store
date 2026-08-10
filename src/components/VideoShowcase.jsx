// src/components/VideoShowcase.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import YouTubeEmbed from "./YouTubeEmbed";

const VIDEOS = [
  {
    id: "4H3ZedPiIvc",
    title: "Review Underbone System Racing",
    product: "Underbone Racing",
  },
  {
    id: "gXK47ZXUudw",
    title: "Demo Spray Paint Metallic BJS Racing",
    product: "Pilok Metallic Series",
  },
  {
    id: "PDdSFtYcLsE",
    title: "Cara Pasang Aksesoris Motor",
    product: "Aksesoris Collection",
  },
  {
    id: "p84JYNhq3Dc",
    title: "Perbandingan Warna Pilok Gold vs Chrome",
    product: "Pilok Premium",
  },
  {
    id: "8d6-nH6ManQ",
    title: "Unboxing Onderdil Federal Part",
    product: "Federal Part Series",
  },
];

const VideoShowcase = () => {
  const containerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollPrev(el.scrollLeft > 5);
    setCanScrollNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 5);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll]);

  const getSlideWidth = useCallback(() => {
    const el = containerRef.current;
    if (!el) return 0;
    const firstSlide = el.querySelector("[data-slide]");
    if (!firstSlide) return 0;
    return firstSlide.offsetWidth + 16;
  }, []);

  const scrollTo = useCallback(
    (index) => {
      const el = containerRef.current;
      if (!el) return;
      const slideWidth = getSlideWidth();
      const prefersReduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      el.scrollTo({
        left: index * slideWidth,
        behavior: prefersReduced ? "auto" : "smooth",
      });
      setActiveIndex(index);
      setActiveVideoId(null);
    },
    [getSlideWidth],
  );

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => {
      const next = Math.max(0, prev - 1);
      scrollTo(next);
      return next;
    });
  }, [scrollTo]);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => {
      const next = Math.min(VIDEOS.length - 1, prev + 1);
      scrollTo(next);
      return next;
    });
  }, [scrollTo]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext],
  );

  const updateActiveFromScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const slideWidth = getSlideWidth();
    if (slideWidth === 0) return;
    const idx = Math.round(el.scrollLeft / slideWidth);
    setActiveIndex(Math.min(VIDEOS.length - 1, Math.max(0, idx)));
    setActiveVideoId(null);
  }, [getSlideWidth]);

  return (
    <section className="bg-white py-12 mobile:py-16 tablet:py-20">
      <div className="container mx-auto px-3 mobile:px-4 tablet:px-6">
        <h2 className="text-xl mobile:text-2xl tablet:text-3xl font-bold text-center text-slate-800 mb-8 mobile:mb-12">
          Video Produk Unggulan
        </h2>

        <div
          className="relative"
          role="region"
          aria-label="Video carousel"
          onKeyDown={handleKeyDown}
        >
          {/* Arrow Left */}
          <button
            onClick={goPrev}
            disabled={!canScrollPrev}
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-10 h-10 mobile:w-12 mobile:h-12 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              canScrollPrev
                ? "hover:bg-orange-50 hover:border-orange-300 text-slate-700"
                : "opacity-40 cursor-not-allowed text-slate-400"
            }`}
            aria-label="Video sebelumnya"
          >
            <FiChevronLeft className="w-5 h-5 mobile:w-6 mobile:h-6" />
          </button>

          {/* Arrow Right */}
          <button
            onClick={goNext}
            disabled={!canScrollNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-10 h-10 mobile:w-12 mobile:h-12 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              canScrollNext
                ? "hover:bg-orange-50 hover:border-orange-300 text-slate-700"
                : "opacity-40 cursor-not-allowed text-slate-400"
            }`}
            aria-label="Video berikutnya"
          >
            <FiChevronRight className="w-5 h-5 mobile:w-6 mobile:h-6" />
          </button>

          {/* Carousel Container */}
          <div
            ref={containerRef}
            onScroll={updateActiveFromScroll}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide px-2 py-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {VIDEOS.map((video) => (
              <div
                key={video.id}
                data-slide
                className="flex-none w-full snap-center"
              >
                <YouTubeEmbed
                  videoId={video.id}
                  title={video.title}
                  product={video.product}
                  isActive={activeVideoId === video.id}
                  onPlay={() => setActiveVideoId(video.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {VIDEOS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollTo(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                idx === activeIndex
                  ? "bg-orange-500 w-7"
                  : "bg-slate-300 hover:bg-slate-400"
              }`}
              aria-label={`Video ${idx + 1}`}
              aria-current={idx === activeIndex ? "true" : undefined}
            />
          ))}
         </div>
       </div>

       <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </section>
  );
};

export default VideoShowcase;
