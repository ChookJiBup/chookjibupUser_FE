"use client";

import { useEffect, useRef, useState } from "react";
import { createBaseMap, createHtmlMarker, loadLeaflet } from "@/lib/map/leafletMap";

/** 카카오 레벨 4에 해당하는 확대 수준(Leaflet zoom ≈ 20 - 카카오 level). */
const MINI_MAP_ZOOM = 16;

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
    // 좌표가 바뀌면 같은 컨테이너에 새 지도를 만들어야 해서, 이전 지도는 반드시 치운다.
    let removeMap: (() => void) | null = null;

    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current) return;
        const center = { lat: latitude, lng: longitude };
        const map = createBaseMap(L, containerRef.current, { center, zoom: MINI_MAP_ZOOM });
        removeMap = () => map.remove();

        const marker = document.createElement("div");
        marker.style.cssText =
          "width:16px;height:16px;border-radius:9999px;background:#fd7e14;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3);";
        createHtmlMarker(L, { position: center, content: marker, yAnchor: 0.5 }).addTo(map);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      removeMap?.();
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
      // isolate: Leaflet pane의 z-index가 페이지의 다른 요소(헤더 등) 위로 올라오지 않게 가둔다.
      className="isolate w-full overflow-hidden rounded-lg border border-zinc-200"
      style={{ height }}
    />
  );
}
