// src/components/MobileMenu.jsx

import React, { useEffect } from "react";
import { useAppStore } from "../lib/store.ts";
import id from "../../public/locales/id/common.json";

const navLinks = [
    { name: id.nav.home, path: "/" },
    { name: "Produk Pilok", path: "/pilok" },
    { name: "Katalog Pilok", path: "/katalog-warna" },
    { name: "Garasi Virtual", path: "/simulator" },
    { name: "Scan Warna", path: "/scan-warna" },
    { name: "Onderdil", path: "/onderdil" },
    { name: "Voucher", path: "/voucher" },
    { name: "Lacak Pesanan", path: "/lacak-pesanan" },
];

const MobileMenu = () => {
    const { isMobileMenuOpen, closeMobileMenu } = useAppStore();

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => {
            document.body.style.overflow = "auto";
        };
    }, [isMobileMenuOpen]);

    if (!isMobileMenuOpen) return null;

    return (
        <div className="fixed inset-0 bg-white z-50 flex flex-col lg:hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-4 py-4 border-b border-slate-200">
                <a href="/" className="flex items-center gap-2" onClick={closeMobileMenu}>
                    <img src="/icons/bjs-racing.png" alt="BJS Racing" className="w-8 h-8 object-contain" />
                    <span className="font-bold text-lg text-slate-900">
                        BJS RACING <span className="text-orange-500">STORE</span>
                    </span>
                </a>
                <button
                    onClick={closeMobileMenu}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Tutup menu"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 overflow-y-auto px-4 py-4">
                <ul className="space-y-1">
                    {navLinks.map((link) => (
                        <li key={link.path}>
                            <a
                                href={link.path}
                                onClick={closeMobileMenu}
                                className="block px-4 py-3 rounded-lg text-base font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                            >
                                {link.name}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>

            {/* Bottom Action Links */}
            <div className="border-t border-slate-200 px-4 py-4 space-y-1">
                <a
                    href="/akun/wishlist"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                    Wishlist
                </a>
                <a
                    href="/cart"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    Keranjang
                </a>
                <a
                    href="/akun"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-semibold text-slate-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    Akun Saya
                </a>
            </div>
        </div>
    );
};

export default MobileMenu;
