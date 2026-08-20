// src/components/VideoShowcase.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
import YouTubeEmbed from "./YouTubeEmbed";
import { supabase } from "@/lib/supabaseBrowserClient.ts";

const VideoShowcase = () => {
  const containerRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeVideoId, setActiveVideoId] = useState(null);

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

  const updateActiveFromScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const slideWidth = getSlideWidth();
    if (slideWidth === 0) return;
    const idx = Math.round(el.scrollLeft / slideWidth);
    setActiveIndex(Math.min(videos.length - 1, Math.max(0, idx)));
    setActiveVideoId(null);
  }, [getSlideWidth, videos.length]);

  // Swipe / drag handlers
  const dragState = useRef({ startX: 0, startY: 0, isDragging: false });

  const handleDragStart = (clientX, clientY) => {
    dragState.current = { startX: clientX, startY: clientY, isDragging: true };
  };

  const handleDragMove = (_clientX, _clientY) => {
    if (!dragState.current.isDragging) return;
  };

  const handleDragEnd = (clientX, clientY) => {
    if (!dragState.current.isDragging) return;
    const deltaX = clientX - dragState.current.startX;
    const deltaY = clientY - dragState.current.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX > absY && absX > 50) {
      const slideWidth = getSlideWidth();
      if (slideWidth === 0) return;
      const el = containerRef.current;
      if (!el) return;
      const currentIndex = Math.round(el.scrollLeft / slideWidth);
      if (deltaX < 0) {
        const next = Math.min(videos.length - 1, currentIndex + 1);
        scrollTo(next);
      } else {
        const prev = Math.max(0, currentIndex - 1);
        scrollTo(prev);
      }
    }

    dragState.current.isDragging = false;
  };

  const onTouchStart = (e) => {
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchMove = (e) => {
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const onTouchEnd = (e) => {
    handleDragEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  };

  const onMouseDown = (e) => {
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const onMouseUp = (e) => {
    handleDragEnd(e.clientX, e.clientY);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateActiveFromScroll();
    el.addEventListener("scroll", updateActiveFromScroll, { passive: true });
    window.addEventListener("resize", updateActiveFromScroll);
    return () => {
      el.removeEventListener("scroll", updateActiveFromScroll);
      window.removeEventListener("resize", updateActiveFromScroll);
    };
  }, [updateActiveFromScroll]);

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
        >
          {/* Carousel Container */}
          <div
            ref={containerRef}
            onScroll={updateActiveFromScroll}
            className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide px-2 py-2 select-none"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitOverflowScrolling: "touch",
              cursor: "grab",
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
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
