"use client";

import { useState } from "react";

/**
 * 卡圖縮圖：透過 wsrv.nl 圖片代理即時縮小＋轉 webp（官方原圖動輒 250-350KB，
 * 縮圖後約 20-30KB）。代理失敗時自動退回原圖。
 */
export default function CardThumb({
  src,
  alt,
  width,
  className,
  title,
}: {
  src: string;
  alt: string;
  width: number; // 請求的縮圖寬度（實際像素，建議為顯示寬度的 2 倍支援高解析螢幕）
  className?: string;
  title?: string;
}) {
  const [failed, setFailed] = useState(false);

  const proxied = `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=${width}&output=webp`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed ? src : proxied}
      alt={alt}
      title={title}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
