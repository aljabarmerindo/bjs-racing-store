// src/components/BottomNav.jsx
// Bottom navigation bar — Shopee-style, mobile only (lg:hidden).

import React, { useState, useEffect } from "react";
import {
  HomeIcon,
  WrenchIcon,
  Squares2X2Icon,
  UserIcon,
  NewspaperIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  WrenchIcon as WrenchSolid,
  Squares2X2Icon as Squares2X2Solid,
  UserIcon as UserSolid,
  NewspaperIcon as NewspaperSolid,
} from "@heroicons/react/24/solid";

function SprayPaintIcon({ active }) {
  return (
    <img
      src={active ? "/icons/spray-paint-solid.png" : "/icons/spray-paint-outline-black.png"}
      alt="Pilok"
      className="w-6 h-6"
    />
  );
}

/* ── Tab config ────────────────────────────────────── */
const tabs = [
  { label: "Beranda",  path: "/",          Icon: HomeIcon,      ActiveIcon: HomeSolid },
  { label: "Pilok",    path: "/pilok",     Icon: SprayPaintIcon, ActiveIcon: SprayPaintIcon },
  { label: "Onderdil", path: "/onderdil",  Icon: WrenchIcon,    ActiveIcon: WrenchSolid },
  { label: "Feed",     path: "/blog",      Icon: NewspaperIcon, ActiveIcon: NewspaperSolid },
  { label: "Akun",     path: "/akun",      Icon: UserIcon,      ActiveIcon: UserSolid },
];

/* ── BottomNav ─────────────────────────────────────── */
const BottomNav = () => {
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const isActive = (path) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <nav className="flex items-center justify-around h-16 px-1" aria-label="Navigasi bawah">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const IconComponent = active ? tab.ActiveIcon : tab.Icon;

          const colorClass = active ? "text-orange-500" : "text-slate-800";
          const classes = `flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${colorClass}`;

          return (
            <a
              key={tab.label}
              href={tab.path}
              className={classes}
              aria-label={tab.label}
            >
              <IconComponent active={active} className="w-6 h-6" />
              <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
};

export default BottomNav;
