import React, { useMemo } from "react";
import { optimizeImageUrl } from "@/lib/optimizeImageUrl.ts";

const OptimizedImage = ({
  src,
  alt,
  width = 600,
  loading = "lazy",
  decoding = "async",
  ...props
}) => {
  const optimizedSrc = useMemo(() => optimizeImageUrl(src, width), [src, width]);

  if (!src) {
    return <div className={props.className?.replace("object-contain", "").replace("object-cover", "").trim() || "w-full h-full bg-slate-100"} />;
  }

  return (
    <img
      src={optimizedSrc}
      alt={alt}
      loading={loading}
      decoding={decoding}
      {...props}
    />
  );
};

export default OptimizedImage;
