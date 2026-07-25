// src/components/UpdateNotifier.jsx
import React, { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

function UpdateNotifier() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered() {},
    onRegisterError() {},
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  useEffect(() => {
    // Jika ada pembaruan, jangan tutup otomatis notifikasinya
    if (needRefresh) {
      const interval = setInterval(() => {
        // Ini untuk menjaga agar notifikasi tetap muncul
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [needRefresh]);

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg bg-slate-800 text-white">
      <div className="flex items-center gap-4">
        <div className="flex-grow">
          <p className="font-bold">Pembaruan Tersedia!</p>
          <p className="text-sm text-slate-300">
            Versi baru dari toko telah dirilis.
          </p>
        </div>
        <div className="flex flex-col gap-2 flex-shrink-0">
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-md text-sm"
          >
            Muat Ulang
          </button>
          <button
            onClick={close}
            className="px-4 py-1 text-slate-400 hover:text-white text-xs"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateNotifier;
