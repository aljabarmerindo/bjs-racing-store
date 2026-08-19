// File: src/components/WishlistIcon.jsx
import React, { useEffect, useState } from "react";
import { FiHeart } from "react-icons/fi";

const WishlistIcon = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const res = await fetch("/api/wishlist");
        if (res.ok) {
          const data = await res.json();
          setCount(Array.isArray(data) ? data.length : 0);
        }
      } catch {
        // ignore
      }
    };
    fetchWishlist();
  }, []);

  return (
    <a
      href="/akun/wishlist"
      className="relative text-slate-800 hover:text-orange-500 transition-colors"
    >
      <FiHeart size={24} />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {count}
        </span>
      )}
    </a>
  );
};

export default WishlistIcon;
