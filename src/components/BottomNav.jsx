// src/components/BottomNav.jsx
// Bottom navigation bar — Shopee-style, mobile only (lg:hidden).

import React, { useState, useEffect } from "react";

/* ── SVG Icons ─────────────────────────────────────── */
function HomeIcon({ active }) {
  return (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}

function PaintIcon({ active }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 3H5a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" />
      <path d="M12 9v4" />
      <path d="M12 17v.01" />
    </svg>
  );
}

function WrenchIcon({ active }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function GridIcon({ active }) {
  return (
    <svg className="w-6 h-6" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function UserIcon({ active }) {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

/* ── Lainnya Sheet Icons ────────────────────────────── */
function PaletteIcon() {
  return (
    <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.1 0 2-.9 2-2 0-.51-.2-.98-.54-1.34-.32-.35-.49-.82-.49-1.32 0-1.1.9-2 2-2h2.36c3.07 0 5.64-2.57 5.64-5.64C23 6.13 18.07 2 12 2z" />
      <circle cx="7.5" cy="11.5" r="1.5" fill="currentColor" />
      <circle cx="11" cy="7.5" r="1.5" fill="currentColor" />
      <circle cx="16.5" cy="11.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17v2m14-2v2" />
      <circle cx="7.5" cy="14.5" r="1.5" />
      <circle cx="16.5" cy="14.5" r="1.5" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg className="w-6 h-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

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
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-800">Lainnya</h3>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
            aria-label="Tutup"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Items */}
        <div className="px-2 py-2">
          {items.map((item) => (
            <a
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <item.icon />
              <span className="flex-1 text-sm font-semibold text-slate-700">{item.label}</span>
              <ChevronRight />
            </a>
          ))}
        </div>

        {/* Safe area padding for iOS */}
        <div className="h-6" />
      </div>
    </div>
  );
}

/* ── BottomNav ─────────────────────────────────────── */
const lainnyaItems = [
  { label: "Katalog Pilok",  path: "/katalog-warna", icon: PaletteIcon },
  { label: "Garasi Virtual", path: "/simulator",     icon: CarIcon },
  { label: "Scan Warna",     path: "/scan-warna",    icon: CameraIcon },
];

const BottomNav = () => {
  const [showLainnya, setShowLainnya] = useState(false);
  const [currentPath, setCurrentPath] = useState("/");

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const isActive = (path) =>
    path === "/" ? currentPath === "/" : currentPath.startsWith(path);

  const isLainnyaActive = lainnyaItems.some((item) => currentPath.startsWith(item.path));

  const tabs = [
    { label: "Beranda",  path: "/",         icon: HomeIcon,  action: null },
    { label: "Pilok",    path: "/pilok",    icon: PaintIcon, action: null },
    { label: "Onderdil", path: "/onderdil", icon: WrenchIcon, action: null },
    { label: "Lainnya",  path: null,        icon: GridIcon,  action: () => setShowLainnya(true), active: isLainnyaActive },
    { label: "Akun",     path: "/akun",     icon: UserIcon,  action: null },
  ];

  return (
    <>
      {/* Bottom nav bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <nav className="flex items-center justify-around h-16 px-1" aria-label="Navigasi bawah">
          {tabs.map((tab) => {
            const active = tab.active ?? (tab.path ? isActive(tab.path) : false);
            const Icon = tab.icon;

            if (tab.action) {
              return (
                <button
                  key={tab.label}
                  onClick={tab.action}
                  className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors cursor-pointer ${active ? "text-orange-500" : "text-slate-400"}`}
                  aria-label={tab.label}
                >
                  <Icon active={active} />
                  <span className="text-[10px] font-semibold leading-tight">{tab.label}</span>
                </button>
              );
            }

            return (
              <a
                key={tab.label}
                href={tab.path}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${active ? "text-orange-500" : "text-slate-400"}`}
                aria-label={tab.label}
              >
                <Icon active={active} />
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
