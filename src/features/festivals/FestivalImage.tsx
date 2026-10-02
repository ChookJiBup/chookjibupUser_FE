"use client";

import Image from "next/image";
import { ImageIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { getFestivalFallbackImage } from "./festivalFallbackImage";

function isUsableUrl(url: string | null | undefined): url is string {
  return !!url && (/^https?:\/\//i.test(url) || url.startsWith("/"));
}

export function FestivalImage({
  imageUrl,
  fallbackKey,
  className = "",
  style,
}: {
  imageUrl?: string | null;
  /** 이미지가 없거나 깨졌을 때 대체 이미지를 고르는 값 — 보통 축제 id. */
  fallbackKey?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const original = imageUrl?.trim();
  const fallback = getFestivalFallbackImage(fallbackKey);
  const source = [original, fallback].find(
    (url): url is string => isUsableUrl(url) && !failedUrls.includes(url),
  );
  const validSource = !!source;
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-100 ${className}`}
      style={style}
    >
      {validSource ? (
        <Image
          src={source}
          alt=""
          fill
          unoptimized
          className="object-cover"
          onError={() => setFailedUrls((prev) => [...prev, source])}
        />
      ) : (
        <span role="img" aria-label="축제 이미지 준비 중">
          <ImageIcon aria-hidden className="size-6 text-zinc-300" />
        </span>
      )}
    </div>
  );
}
