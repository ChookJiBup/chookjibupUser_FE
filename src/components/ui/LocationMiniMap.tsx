"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef } from "react";

/** 축제 위치 하나만 찍는 작은 지도. HOME02(MapPanel)와 별개로 가볍게 쓴다. */
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
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
    }).setView([latitude, longitude], 15);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);
    L.marker([latitude, longitude]).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-lg border border-zinc-200"
      style={{ height }}
    />
  );
}
