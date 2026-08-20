// src/components/feed/FeedCard.jsx
import React from "react";

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(?:shorts\/))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[7] && match[7].length === 11 ? match[7] : null;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').slice(0, 200);
};

function getDriveDirectUrl(url) {
  if (!url || !url.includes('drive.google.com')) return url;
  const idMatch = url.match(/[-\w]{25,}/);
  if (idMatch) return `https://drive.google.com/uc?export=view&id=${idMatch[0]}`;
  return url;
}

const FeedCard = ({ post }) => {
  const ytId = getYouTubeId(post.youtube_url);
  const rawMediaUrl = post.media_url;
  const mediaUrl = getDriveDirectUrl(rawMediaUrl);
  const hasMedia = !!mediaUrl;

  return (
    <article className="group block bg-white rounded-xl border border-slate-200 overflow-hidden hover:-translate-y-1 hover:shadow-lg hover:border-orange-200 transition-all duration-200">
      <a href={`/blog/${post.slug || post.id}`} className="flex flex-col h-full">
        <div className="relative aspect-video bg-slate-900">
          {ytId ? (
            <img
              src={`https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`}
              alt={post.title || 'Video'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : hasMedia ? (
            <img
              src={mediaUrl}
              alt={post.title || 'Feed image'}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-orange-50 flex items-center justify-center">
              <span className="text-4xl">📝</span>
            </div>
          )}
          {ytId && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-orange-600 ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
          {hasMedia && ytId && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
              GAMBAR
            </div>
          )}
        </div>

        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
              {post.category || post.post_type}
            </span>
            {post.is_featured && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-md">
                Unggulan
              </span>
            )}
          </div>

          <h3 className="font-bold text-slate-900 mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors">
            {post.title}
          </h3>

          <p className="text-sm text-slate-500 line-clamp-2 mb-3 flex-1">
            {stripHtml(post.content)}
          </p>

          <div className="flex items-center justify-between text-xs text-slate-400 mt-auto">
            <span>{formatDate(post.published_at)}</span>
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {post.feed_comments?.[0]?.count || 0}
            </span>
          </div>
        </div>
      </a>
    </article>
  );
};

export default FeedCard;
export { getYouTubeId, formatDate, stripHtml };
