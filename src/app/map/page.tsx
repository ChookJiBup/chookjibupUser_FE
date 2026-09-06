"use client";

import dynamic from "next/dynamic";

// MapPanel은 Leaflet을 쓰는데, Leaflet이 모듈 로드 시점에 window를 참조해서
// 서버 렌더링(SSR) 중에 그대로 import하면 죽는다. ssr:false로 브라우저에서만 불러온다.
const MapPanel = dynamic(() => import("@/features/map/MapPanel").then((mod) => mod.MapPanel), {
  ssr: false,
});

export default function MapPage() {
  return <MapPanel />;
}
