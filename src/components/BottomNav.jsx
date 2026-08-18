// src/components/BottomNav.jsx
// Bottom navigation bar — Shopee-style, mobile only (lg:hidden).
// Icons: @heroicons/react/24/outline (inactive) + /24/solid (active).

import React, { useState, useEffect } from "react";
import {
  HomeIcon,
  PaintBrushIcon,
  WrenchIcon,
  Squares2X2Icon,
  UserIcon,
  SwatchIcon,
  TruckIcon,
  CameraIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  PaintBrushIcon as PaintBrushSolid,
  WrenchIcon as WrenchSolid,
  Squares2X2Icon as Squares2X2Solid,
  UserIcon as UserSolid,
} from "@heroicons/react/24/solid";

/* ── Lainnya Bottom Sheet ──────────────────────────── */
function LainnyaSheet({ items, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={`absolute inset-0 bg-black/40 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
      />

      {/* Card */}
      <div className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transition-transform duration-200 ease-out ${visible ? "translate-y-0" : "translate-y-full"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Lainnya</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Tutup"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="px-2 py-2">
          {items.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <item.icon className="w-6 h-6 text-orange-500" />
              <span className="flex-1 text-sm font-semibold text-slate-700">{item.label}</span>
              <ChevronRightIcon className="w-5 h-5 text-slate-300" />
            </a>
          ))}
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-6" />
      </div>
    </div>
  );
}

/* ── Tab config ────────────────────────────────────── */
const tabs = [
  { label: "Beranda",  path: "/",         Icon: HomeIcon,        ActiveIcon: HomeSolid },
  { label: "Pilok",    path: "/pilok",    Icon: PaintBrushIcon,  ActiveIcon: PaintBrushSolid },
  { label: "Onderdil", path: "/onderdil", Icon: WrenchIcon,      ActiveIcon: WrenchSolid },
  { label: "Lainnya",  path: null,        Icon: Squares2X2Icon,  ActiveIcon: Squares2X2Solid, action: true },
  { label: "Akun",     path: "/akun",     Icon: UserIcon,        ActiveIcon: UserSolid },
];

const lainnyaItems = [
  { label: "Katalog Pilok",  path: "/katalog-warna", icon: SwatchIcon },
  { label: "Garasi Virtual", path: "/simulator",     icon: TruckIcon },
  { label: "Scan Warna",     path: "/scan-warna",    icon: CameraIcon },
];

const lainnyaPaths = lainnyaItems.map((i) => i.path);

/* ── BottomNav ─────────────────────────────────────── */
const BottomNav = () => {
  const [showLainnya, setShowLainnya] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const isActive = (path) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  return (
    <>
      {/* Bottom nav bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <nav className="flex items-center justify-around h-16 px-1" aria-label="Navigasi bawah">
          {tabs.map((tab) => {
            const active = tab.action
              ? lainnyaPaths.some((p) => currentPath.startsWith(p))
              : isActive(tab.path);
            const Icon = active ? tab.ActiveIcon : tab.Icon;

            const colorClass = active ? "text-orange-500" : "text-slate-800";
            const classes = `flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${colorClass}`;

            if (tab.action) {
              return (
                <button
                  key={tab.label}
                  onClick={() => setShowLainnya(true)}
                  className={`${classes} cursor-pointer`}
                  aria-label={tab.label}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
                </button>
              );
            }

            return (
              <a
                key={tab.label}
                href={tab.path}
                className={classes}
                aria-label={tab.label}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Lainnya bottom sheet */}
      {showLainnya && (
        <LainnyaSheet items={lainnyaItems} onClose={() => setShowLainnya(false)} />
      )}
    </>
  );
};

export default BottomNav;
