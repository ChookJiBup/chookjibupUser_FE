"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMapsSdk } from "@/lib/map/kakaoMaps";

export function LocationMiniMap({
  latitude,
  longitude,
  height = 240,
}: {
  latitude: number;
  longitude: number;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMapsSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const center = new window.kakao.maps.LatLng(latitude, longitude);
        const map = new window.kakao.maps.Map(containerRef.current, { center, level: 4 });

        const marker = document.createElement("div");
        marker.style.cssText =
          "width:16px;height:16px;border-radius:9999px;background:#fd7e14;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);";
        const overlay = new window.kakao.maps.CustomOverlay({
          position: center,
          content: marker,
          yAnchor: 0.5,
        });
        overlay.setMap(map);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (error) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50"
        style={{ height }}
      >
        <p className="body-caption px-4 text-center text-zinc-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg border border-zinc-200"
      style={{ height }}
    />
  );
}
