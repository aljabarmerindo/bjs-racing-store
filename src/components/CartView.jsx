// File: src/components/CartView.jsx
// Cart view — responsive marketplace-style layout with item selection.
import React from "react";
import { useAppStore } from "../lib/store.ts";

const formatRupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n || 0);

/* ── Badge helpers ──────────────────────────────────── */
function badges(item) {
  const list = [];
  const hasDiscount =
    item.harga_coret && item.harga_coret > item.harga_jual;
  if (hasDiscount) {
    const pct = Math.round(
      ((item.harga_coret - item.harga_jual) / item.harga_coret) * 100,
    );
    list.push({ label: `DISKON ${pct}%`, cls: "bg-red-500 text-white" });
  }
  if ((item.total_terjual || 0) > 50) {
    list.push({ label: "TERLARIS", cls: "bg-orange-500 text-white" });
  }
  if (
    item.stok_min &&
    item.stok > 0 &&
    item.stok <= item.stok_min
  ) {
    list.push({ label: "STOK TERAKHIR", cls: "bg-yellow-400 text-yellow-900" });
  }
  return list;
}

/* ── Inline badge strip ─────────────────────────────── */
function BadgeStrip({ item }) {
  const b = badges(item);
  if (!b.length) return null;
  return (
    <span className="inline-flex flex-wrap gap-1 mt-0.5">
      {b.map((b, i) => (
        <span
          key={i}
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${b.cls}`}
        >
          {b.label}
        </span>
      ))}
    </span>
  );
}

/* ── Quantity control ───────────────────────────────── */
function QtyControl({ item, updateQuantity }) {
  const qty = item.quantity || 0;
  const maxed = qty >= item.stok;
  return (
    <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden text-sm">
      <button
        onClick={() => updateQuantity(item.product_id, qty - 1)}
        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
      <span className="w-10 text-center font-semibold text-slate-800 tabular-nums select-none">
        {qty}
      </span>
      <button
        onClick={() => updateQuantity(item.product_id, qty + 1)}
        disabled={maxed}
        className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  );
}

/* ── Chevron icon for product link ──────────────────── */
function ChevronIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

/* ── Checkbox component ─────────────────────────────── */
function ItemCheckbox({ checked, onChange }) {
  return (
    <label className="flex-shrink-0 self-center cursor-pointer">
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all
        ${checked
          ? "bg-orange-500 border-orange-500 shadow-sm"
          : "bg-white border-slate-300 hover:border-orange-400"
        }`}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
    </label>
  );
}

/* ══════════════════════════════════════════════════════
   CartView
   ══════════════════════════════════════════════════════ */
const CartView = ({ checkoutEnabled = true }) => {
  const {
    items,
    removeFromCart,
    updateQuantity,
    selectedProductIds,
    toggleItemSelection,
    toggleAllSelection,
  } = useAppStore();

  const allSelected = items.length > 0 && items.length === selectedProductIds.length;
  const selectedItems = items.filter((i) => selectedProductIds.includes(i.product_id));
  const totalSelectedQty = selectedItems.reduce((s, i) => s + (i.quantity || 0), 0);
  const subtotal = selectedItems.reduce(
    (s, i) => s + (i.quantity || 0) * (i.harga_jual || 0),
    0,
  );

  /* ── Empty state ────────────────────────────────── */
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Keranjang Belanja Anda Kosong</h2>
        <p className="text-slate-500 max-w-md mx-auto mb-8">
          Segera isi keranjang dengan produk Pilok pilihan Anda. Gratis ongkir untuk wilayah Jepara dan sekitarnya.
        </p>
        <a href="/pilok" className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Mulai Belanja
        </a>
      </div>
    );
  }

  /* ── Summary content (reused in sidebar + bottom bar) ── */
  const summaryContent = (
    <>
      <div className="flex justify-between text-sm text-slate-600">
        <span>Subtotal ({totalSelectedQty} item)</span>
        <span className="font-bold text-slate-900">{formatRupiah(subtotal)}</span>
      </div>
      <p className="text-[11px] text-slate-400 mt-1">
        Pajak &amp; ongkir dihitung saat checkout.
      </p>
      {checkoutEnabled ? (
        <a
          href="/checkout"
          className={`mt-3 block text-center w-full font-bold py-3 rounded-lg transition-colors text-sm ${
            selectedItems.length === 0
              ? "bg-slate-300 text-slate-500 pointer-events-none"
              : "bg-green-600 hover:bg-green-700 text-white"
          }`}
        >
          Lanjut ke Checkout
        </a>
      ) : (
        <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
          <p className="text-xs font-bold text-slate-800 mb-1">Checkout Tidak Tersedia</p>
          <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
            Silakan hubungi kami via WhatsApp untuk pemesanan manual.
          </p>
          <a href="https://wa.me/62881011669213?text=Halo%20BJS%20Racing%2C%20saya%20ingin%20memesan..." target="_blank" rel="noopener noreferrer" className="block text-center w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded-lg transition-colors text-xs">
            Hubungi WhatsApp
          </a>
        </div>
      )}
    </>
  );

  /* ── Select all bar ─────────────────────────────── */
  const selectAllBar = (
    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
      <ItemCheckbox checked={allSelected} onChange={toggleAllSelection} />
      <span className="text-sm text-slate-600 select-none">
        Pilih Semua ({items.length} produk)
      </span>
    </div>
  );

  /* ── Cart item — MOBILE card ────────────────────── */
  function MobileCard({ item }) {
    const qty = item.quantity || 0;
    const hasDiscount = item.harga_coret && item.harga_coret > item.harga_jual;
    const isChecked = selectedProductIds.includes(item.product_id);
    return (
      <div className={`bg-white rounded-xl p-3 shadow-sm border transition-colors ${isChecked ? "border-2 border-orange-400/50" : "border-2 border-transparent"}`}>
        {/* Row 0: select all bar (only first item) */}
        {/* Row 1: checkbox + image + info + delete */}
        <div className="flex gap-2.5">
          <ItemCheckbox checked={isChecked} onChange={() => toggleItemSelection(item.product_id)} />

          {/* Image + swatch — clickable */}
          <a href={`/products/${item.product_id}`} className="relative w-[100px] h-[100px] flex-shrink-0 bg-slate-50 rounded-lg">
            <img src={item.image_url} alt={item.nama} className="w-full h-full object-contain rounded-lg" />
            {item.color_swatch_url && (
              <img src={item.color_swatch_url} alt="" className="absolute bottom-2 left-2 w-[60px] h-[60px] object-cover rounded-full border border-slate-200 shadow-sm" />
            )}
          </a>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <a href={`/products/${item.product_id}`} className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2 hover:text-orange-500 transition-colors inline-flex items-center gap-1">
              <span className="line-clamp-2">{item.nama}</span>
              <ChevronIcon />
            </a>
            {item.sku && (
              <p className="text-[11px] text-slate-800 font-medium mt-0.5">{item.sku}</p>
            )}
            <p className="text-[11px] text-slate-800 mt-0.5">
              {item.merek}{item.ukuran ? ` · ${item.ukuran}` : ""}
            </p>
            <BadgeStrip item={item} />
          </div>
        </div>

        {/* Row 2: price + qty */}
        <div className="flex items-end justify-between mt-2.5 pt-2.5 border-t border-slate-100">
          <div>
            {hasDiscount && (
              <p className="text-[11px] text-slate-400 line-through">{formatRupiah(item.harga_coret)}</p>
            )}
            <p className="text-sm font-bold text-orange-500">{formatRupiah(item.harga_jual)}</p>
          </div>
          <div className="flex items-center gap-3">
            <QtyControl item={item} updateQuantity={updateQuantity} />
            <p className="text-sm font-bold text-slate-800 tabular-nums whitespace-nowrap">
              {formatRupiah(qty * item.harga_jual)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Cart item — TABLET row ──────────────────────── */
  function TabletRow({ item }) {
    const qty = item.quantity || 0;
    const hasDiscount = item.harga_coret && item.harga_coret > item.harga_jual;
    const isChecked = selectedProductIds.includes(item.product_id);
    return (
      <div className={`flex items-center gap-3 py-3 border-b border-slate-100 last:border-b-0 transition-colors ${isChecked ? "bg-orange-50/40 border-2 border-orange-400/50" : "border-2 border-transparent"}`}>
        <ItemCheckbox checked={isChecked} onChange={() => toggleItemSelection(item.product_id)} />

        {/* Image + swatch — clickable */}
        <a href={`/products/${item.product_id}`} className="relative w-[110px] h-[110px] lg:w-[120px] lg:h-[120px] flex-shrink-0 bg-slate-50 rounded-lg">
          <img src={item.image_url} alt={item.nama} className="w-full h-full object-contain rounded-lg" />
          {item.color_swatch_url && (
            <img src={item.color_swatch_url} alt="" className="absolute bottom-2 left-2 w-[60px] h-[60px] object-cover rounded-full border border-slate-200 shadow-sm" />
          )}
        </a>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <a href={`/products/${item.product_id}`} className="text-sm font-semibold text-slate-800 line-clamp-1 hover:text-orange-500 transition-colors inline-flex items-center gap-1">
            <span className="line-clamp-1">{item.nama}</span>
            <ChevronIcon />
          </a>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {item.sku && <span className="text-[11px] text-slate-800 font-medium">{item.sku}</span>}
            {item.merek && <span className="text-[11px] text-slate-800">· {item.merek}</span>}
            {item.ukuran && <span className="text-[11px] text-slate-800">· {item.ukuran}</span>}
          </div>
          <BadgeStrip item={item} />
        </div>

        {/* Price */}
        <div className="text-right flex-shrink-0 hidden sm:block">
          {hasDiscount && <p className="text-[11px] text-slate-400 line-through">{formatRupiah(item.harga_coret)}</p>}
          <p className="text-sm font-semibold text-orange-500">{formatRupiah(item.harga_jual)}</p>
        </div>

        {/* Qty */}
        <div className="flex-shrink-0">
          <QtyControl item={item} updateQuantity={updateQuantity} />
        </div>

        {/* Total */}
        <div className="text-right flex-shrink-0 w-24">
          <p className="text-sm font-bold text-slate-800 tabular-nums">{formatRupiah(qty * item.harga_jual)}</p>
        </div>
      </div>
    );
  }

  /* ──────────────────────────────────────────────────── */
  return (
    <div className="relative">
      {/* ===== DESKTOP: two-column layout ===== */}
      <div className="hidden lg:flex gap-6 items-start">
        {/* Left: item list */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-100">
          {selectAllBar}
          <div className="divide-y divide-slate-100">
            {items.map((item) => (
              <TabletRow key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Right: sticky summary sidebar */}
        <div className="w-80 flex-shrink-0">
          <div className="sticky top-24 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h3 className="text-base font-bold text-slate-800 mb-3">Ringkasan</h3>
            {summaryContent}
          </div>
        </div>
      </div>

      {/* ===== MOBILE + TABLET: single column ===== */}
      <div className="lg:hidden">
        {/* Select all bar */}
        <div className="bg-white rounded-t-xl shadow-sm border border-slate-100 border-b-0">
          {selectAllBar}
        </div>

        {/* Item list */}
        <div className="space-y-2.5 sm:space-y-0 sm:bg-white sm:rounded-b-xl sm:shadow-sm sm:border sm:border-t-0 sm:border-slate-100">
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {/* Mobile card: < sm */}
              <div className="sm:hidden">
                <MobileCard item={item} />
              </div>
              {/* Tablet row: sm – lg */}
              <div className="hidden sm:block px-4">
                <TabletRow item={item} />
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Inline summary for sm+ (non-mobile) */}
        <div className="hidden sm:block lg:hidden mt-6 bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h3 className="text-base font-bold text-slate-800 mb-3">Ringkasan</h3>
          {summaryContent}
        </div>
      </div>

      {/* ===== MOBILE sticky bottom bar ===== */}
      {items.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-slate-500">Subtotal ({totalSelectedQty} item)</p>
              <p className="text-base font-bold text-slate-900 tabular-nums">{formatRupiah(subtotal)}</p>
            </div>
            {checkoutEnabled ? (
              <a
                href="/checkout"
                className={`flex-shrink-0 font-bold py-3 px-5 rounded-lg transition-colors text-sm ${
                  selectedItems.length === 0
                    ? "bg-slate-300 text-slate-500 pointer-events-none"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                Checkout
              </a>
            ) : (
              <a href="https://wa.me/62881011669213" target="_blank" rel="noopener noreferrer" className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-5 rounded-lg transition-colors text-sm">
                WhatsApp
              </a>
            )}
          </div>
        </div>
      )}

      {/* Spacer so content isn't hidden behind sticky bottom bar on mobile */}
      {items.length > 0 && <div className="sm:hidden h-20" />}
    </div>
  );
};

export default CartView;
