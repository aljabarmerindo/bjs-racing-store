// src/components/feed/FeedGrid.jsx
import React from "react";
import FeedCard from "./FeedCard.jsx";

const FeedGrid = ({ posts }) => {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400">
        Belum ada postingan.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.map((post) => (
        <FeedCard key={post.id} post={post} />
      ))}
    </div>
  );
};

export default FeedGrid;
