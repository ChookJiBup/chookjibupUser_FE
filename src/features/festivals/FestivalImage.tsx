"use client";

import Image from "next/image";
import { ImageIcon } from "@radix-ui/react-icons";
import { useState } from "react";

export function FestivalImage({
  imageUrl,
  className = "",
  style,
}: {
  imageUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const source = imageUrl?.trim();
  const validSource = source && /^https?:\/\//i.test(source) && failedUrl !== source;
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
          onError={() => setFailedUrl(source)}
        />
      ) : (
        <span role="img" aria-label="축제 이미지 준비 중">
          <ImageIcon aria-hidden className="size-6 text-zinc-300" />
        </span>
      )}
    </div>
  );
}
