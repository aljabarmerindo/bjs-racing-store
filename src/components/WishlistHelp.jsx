// src/components/WishlistHelp.jsx
import React, { useEffect, useState } from "react";

const WishlistHelp = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = sessionStorage.getItem("wishlist_help_dismissed");
    if (dismissed) return;

    const timer = setTimeout(() => {
      setVisible(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setVisible(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("wishlist_help_dismissed", "true");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-xs bg-white rounded-xl shadow-2xl border border-slate-200 p-4 animate-[fade-in-up_0.3s_ease-out]">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06 1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-slate-900 text-sm">Wishlist</h4>
          <p className="text-xs text-slate-600 mt-1">
            Simpan produk favorit dengan klik icon <span className="text-red-500">❤️</span> untuk dibeli nanti.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
          aria-label="Tutup"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={dismiss}
          className="text-xs font-semibold text-orange-600 hover:text-orange-700 transition-colors"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
};

export default WishlistHelp;
