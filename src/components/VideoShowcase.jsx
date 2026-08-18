// src/components/VideoShowcase.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import YouTubeEmbed from "./YouTubeEmbed";
import { supabase } from "@/lib/supabaseBrowserClient.ts";

const VideoShowcase = () => {
  const containerRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Gagal memuat video:", error);
      } else {
        setVideos(data || []);
      }
      setLoading(false);
    };

    fetchVideos();
  }, []);

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
      const next = Math.min(videos.length - 1, prev + 1);
      scrollTo(next);
      return next;
    });
  }, [scrollTo, videos.length]);

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
    setActiveIndex(Math.min(videos.length - 1, Math.max(0, idx)));
    setActiveVideoId(null);
  }, [getSlideWidth, videos.length]);

  if (loading) {
    return (
      <section className="bg-white py-8 mobile:py-10 tablet:py-16">
        <div className="container mx-auto px-2.5 mobile:px-3 tablet:px-5">
          <h2 className="text-lg mobile:text-xl tablet:text-3xl font-bold text-center text-slate-800 mb-5 mobile:mb-8">
            Video Produk Unggulan
          </h2>
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (videos.length === 0) {
    return (
      <section className="bg-white py-8 mobile:py-10 tablet:py-16">
        <div className="container mx-auto px-2.5 mobile:px-3 tablet:px-5">
          <h2 className="text-lg mobile:text-xl tablet:text-3xl font-bold text-center text-slate-800 mb-5 mobile:mb-8">
            Video Produk Unggulan
          </h2>
          <p className="text-center text-slate-500">Belum ada video yang ditampilkan.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white py-8 mobile:py-10 tablet:py-16">
      <div className="container mx-auto px-2.5 mobile:px-3 tablet:px-5">
        <h2 className="text-lg mobile:text-xl tablet:text-3xl font-bold text-center text-slate-800 mb-5 mobile:mb-8">
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
            className={`absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 mobile:w-10 mobile:h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              canScrollPrev
                ? "hover:bg-orange-50 hover:border-orange-300 text-slate-700"
                : "opacity-40 cursor-not-allowed text-slate-400"
            }`}
            aria-label="Video sebelumnya"
          >
            <FiChevronLeft className="w-4 h-4 mobile:w-5 mobile:h-5" />
          </button>

          {/* Arrow Right */}
          <button
            onClick={goNext}
            disabled={!canScrollNext}
            className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 mobile:w-10 mobile:h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              canScrollNext
                ? "hover:bg-orange-50 hover:border-orange-300 text-slate-700"
                : "opacity-40 cursor-not-allowed text-slate-400"
            }`}
            aria-label="Video berikutnya"
          >
            <FiChevronRight className="w-4 h-4 mobile:w-5 mobile:h-5" />
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
            {videos.map((video) => (
              <div
                key={video.id}
                data-slide
                className="flex-none w-full snap-center"
              >
                <YouTubeEmbed
                  videoId={video.youtube_video_id}
                  title={video.title}
                  product={video.product_name}
                  isActive={activeVideoId === video.id}
                  onPlay={() => setActiveVideoId(video.id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {videos.map((_, idx) => (
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
