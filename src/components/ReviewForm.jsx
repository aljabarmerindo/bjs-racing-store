// src/components/ReviewForm.jsx
import React, { useState, useEffect } from "react";

const ReviewForm = ({ productId, orderId, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [eligibleOrderId, setEligibleOrderId] = useState(orderId || null);
  const [isEligible, setIsEligible] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  useEffect(() => {
    if (orderId) {
      setEligibleOrderId(orderId);
      setIsEligible(true);
      setCheckingEligibility(false);
      return;
    }

    const checkEligibility = async () => {
      try {
        const response = await fetch(`/api/reviews/eligibility?product_id=${productId}`);
        const data = await response.json();
        if (response.ok && data.eligible) {
          setIsEligible(true);
          setEligibleOrderId(data.order_id);
        } else {
          setIsEligible(false);
        }
      } catch (err) {
        console.error("Gagal memeriksa kelayakan ulasan:", err);
        setIsEligible(false);
      } finally {
        setCheckingEligibility(false);
      }
    };

    if (productId) {
      checkEligibility();
    }
  }, [productId, orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      setError("Berilah minimal 1 bintang.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          ...(eligibleOrderId ? { order_id: eligibleOrderId } : {}),
          rating,
          comment: comment.trim() || null,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal mengirim ulasan.");
      }

      setRating(0);
      setComment("");
      if (onReviewSubmitted) onReviewSubmitted(result.review);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingEligibility) {
    return <p className="text-sm text-slate-500">Memeriksa kelayakan ulasan...</p>;
  }

  if (!isEligible) {
    return (
      <div className="bg-slate-50 p-4 rounded-lg border">
        <h3 className="font-bold text-lg mb-2">Tulis Ulasan</h3>
        <p className="text-sm text-slate-600">
          Anda perlu membeli dan menerima produk ini sebelum dapat memberikan ulasan.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-50 p-4 rounded-lg border">
      <h3 className="font-bold text-lg mb-3">Tulis Ulasan</h3>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      <div className="flex items-center gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="text-2xl"
          >
            <span
              className={
                star <= (hoverRating || rating)
                  ? "text-orange-500"
                  : "text-slate-300"
              }
            >
              ★
            </span>
          </button>
        ))}
        <span className="text-sm text-slate-500 ml-2">
          {rating ? `${rating} / 5` : "Pilih rating"}
        </span>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tulis ulasan Anda tentang produk ini..."
        rows={3}
        className="w-full border rounded-md p-2 text-sm mb-3"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-md disabled:bg-gray-400"
      >
        {isSubmitting ? "Mengirim..." : "Kirim Ulasan"}
      </button>
    </form>
  );
};

export default ReviewForm;
