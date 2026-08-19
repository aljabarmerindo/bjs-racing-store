// src/components/StatsCounter.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { FiPackage, FiStar, FiUsers } from "react-icons/fi";
import { supabase } from "@/lib/supabaseBrowserClient";

/**
 * Animated counter that counts up from 0 to endValue when visible.
 *
 * @param {number} endValue - Target number to animate to
 * @param {string} [suffix=""] - Suffix after number (e.g. "+", "%")
 * @param {string} label - Description text below counter
 * @param {"package"|"star"|"users"} [icon] - Icon type
 * @param {number} [duration=2000] - Animation duration in ms
 */
interface StatsCounterProps {
  endValue: number;
  suffix?: string;
  label: string;
  icon?: string;
  duration?: number;
  dataType?: "produk" | "terjual" | "static";
}

const StatsCounter = ({
  endValue: initialEndValue,
  suffix = "",
  label,
  icon,
  duration = 2000,
  dataType = "static",
}: StatsCounterProps) => {
  const [endValue, setEndValue] = useState(initialEndValue);
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef(null);
  const rafRef = useRef<number | null>(null);

  // Client-side re-fetch: always get fresh stats data
  useEffect(() => {
    if (dataType === "static") return;

    const fetchFreshStats = async () => {
      try {
        if (dataType === "produk") {
          const { count } = await supabase
            .from("products")
            .select("*", { count: "exact", head: true })
            .eq("status", "Aktif");
          if (count !== null) setEndValue(count);
        } else if (dataType === "terjual") {
          const { data } = await supabase
            .from("products")
            .select("total_terjual");
          if (data) {
            const total = data.reduce(
              (sum, p) => sum + (p.total_terjual || 0),
              0
            );
            setEndValue(total);
          }
        }
      } catch (err) {
        // silently fail, keep prerendered data
      }
    };

    fetchFreshStats();
  }, [dataType]);

  const formatNumber = (num: number) => {
    const isFloat = !Number.isInteger(endValue);
    const fixed = isFloat ? num.toFixed(1) : Math.floor(num);
    return fixed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const animate = useCallback(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      setCount(endValue);
      setHasAnimated(true);
      return;
    }

    const startTime = performance.now();
    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(eased * endValue);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setCount(endValue);
        setHasAnimated(true);
      }
    };
    rafRef.current = requestAnimationFrame(step);
  }, [endValue, duration]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          animate();
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasAnimated, animate]);

  const IconComponent =
    icon === "package"
      ? FiPackage
      : icon === "star"
        ? FiStar
        : icon === "users"
          ? FiUsers
          : null;

  return (
    <div
      ref={ref}
      className="text-center mobile:text-left flex flex-col items-center mobile:items-start gap-2"
    >
      {IconComponent && (
        <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center mb-1">
          <IconComponent className="w-5 h-5 text-white" />
        </div>
      )}
      <span className="text-2xl mobile:text-3xl font-bold text-white tabular-nums tracking-tight">
        {formatNumber(count)}
        {suffix}
      </span>
      <span className="text-xs mobile:text-sm text-white/80 font-medium">
        {label}
      </span>
    </div>
  );
};

export default StatsCounter;
