"use client";

import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";

/*
  Leaflet은 모듈을 읽는 순간 window/document에 접근해서, 클라이언트 컴포넌트라도
  서버 프리렌더 중에 정적으로 import하면 터진다. 그래서 타입만 정적으로 가져오고
  실제 모듈은 브라우저에서 loadLeaflet()으로 동적 import한다.
*/
export type LeafletModule = typeof Leaflet;

/*
  관리자 앱 부스 그리기 화면과 같은 "상호명 없는" 바탕 지도를 쓴다 — 두 앱이 같은 타일을
  써야 부스 위치가 도로·건물 대비 똑같이 보인다. 운영에서는 키가 붙은 URL로 통째로
  바꿀 수 있게 환경변수로 뺐다. NEXT_PUBLIC_*은 빌드 때 박히므로 바꾸면 다시 빌드해야 한다.
*/
const DEFAULT_TILE_URL =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png";
// CARTO 약관상 출처 표시는 반드시 화면에 보여야 한다.
const DEFAULT_TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILE_URL;
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION || DEFAULT_TILE_ATTRIBUTION;
/** 타일 서버가 실제로 내주는 최대 줌. 그 이상은 이 줌 타일을 확대해서 보여준다. */
const TILE_MAX_NATIVE_ZOOM = 20;
const TILE_MAX_ZOOM = 22;

let loadPromise: Promise<LeafletModule> | null = null;

/** Leaflet 모듈을 딱 한 번만 불러온다 (여러 컴포넌트가 동시에 마운트돼도 요청은 하나). */
export function loadLeaflet(): Promise<LeafletModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("지도는 브라우저에서만 불러올 수 있습니다."));
  }
  if (!loadPromise) {
    loadPromise = import("leaflet")
      // leaflet 패키지는 UMD 빌드라 번들러에 따라 default 아래로 들어오기도 한다.
      .then((mod) => (mod as unknown as { default?: LeafletModule }).default ?? mod)
      .catch(() => {
        // 청크를 한 번 못 받았다고 다음 진입까지 막히지 않게 캐시를 비운다.
        loadPromise = null;
        throw new Error("지도를 불러오지 못했습니다.");
      });
  }
  return loadPromise;
}

export interface BaseMapOptions {
  center: Leaflet.LatLngLiteral;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * 바탕 타일을 깐 지도를 만든다. 확대/축소 버튼은 카카오맵 시절처럼 기본으로 두지 않고,
 * 필요한 화면이 직접 그린다.
 */
export function createBaseMap(
  L: LeafletModule,
  container: HTMLElement,
  options: BaseMapOptions,
): Leaflet.Map {
  const map = L.map(container, {
    center: options.center,
    zoom: options.zoom,
    ...(options.minZoom !== undefined ? { minZoom: options.minZoom } : {}),
    ...(options.maxZoom !== undefined ? { maxZoom: options.maxZoom } : {}),
    zoomControl: false,
  });
  // leaflet.css가 컨테이너 글꼴을 Helvetica로 바꿔서, 핀·이름표가 앱 글꼴을 따르도록 되돌린다.
  container.style.fontFamily = "inherit";

  L.tileLayer(TILE_URL, {
    subdomains: "abcd",
    maxNativeZoom: TILE_MAX_NATIVE_ZOOM,
    maxZoom: TILE_MAX_ZOOM,
    attribution: TILE_ATTRIBUTION,
  }).addTo(map);

  return map;
}

/**
 * 그리는 순서를 고정한 pane을 만든다. Leaflet 마커는 같은 pane 안에서 위도 순으로 겹치므로,
 * "이름표는 항상 핀 위" 같은 순서는 pane z-index로 정한다.
 * (기본 pane: 타일 200 · 도형 400 · 마커 600)
 */
export function ensurePane(map: Leaflet.Map, name: string, zIndex: number): string {
  const pane = map.getPane(name) ?? map.createPane(name);
  pane.style.zIndex = String(zIndex);
  return name;
}

export interface HtmlMarkerOptions {
  position: Leaflet.LatLngLiteral;
  content: HTMLElement;
  /** 좌표에 붙일 내용 기준점(0~1). 카카오 CustomOverlay의 xAnchor/yAnchor와 같은 뜻. */
  xAnchor?: number;
  yAnchor?: number;
  pane?: string;
  /** true일 때만 탭/클릭을 받는다. false면 아래 지도·핀으로 그대로 통과한다. */
  interactive?: boolean;
}

/**
 * 위경도에 HTML을 붙이는 오버레이. `L.marker` + `L.divIcon`으로 만든다.
 *
 * 내용 크기를 미리 알 수 없어서 아이콘 자체는 0×0으로 두고, 안쪽 래퍼를 자기 크기 비율만큼
 * 옮겨 기준점을 맞춘다. 래퍼를 flow-root로 두는 건 이름표의 margin-bottom이 래퍼 밖으로
 * 새지 않게 해 "좌표 위로 살짝 띄우기"를 유지하기 위해서다.
 */
export function createHtmlMarker(L: LeafletModule, options: HtmlMarkerOptions): Leaflet.Marker {
  const { position, content, xAnchor = 0.5, yAnchor = 0.5, pane, interactive = false } = options;

  const anchor = document.createElement("div");
  anchor.style.cssText = `display:flow-root;width:max-content;transform:translate(${-xAnchor * 100}%,${-yAnchor * 100}%);`;
  anchor.appendChild(content);

  return L.marker(position, {
    icon: L.divIcon({ html: anchor, className: "", iconSize: [0, 0], iconAnchor: [0, 0] }),
    interactive,
    // 핀 안의 <button>이 이미 포커스를 받으므로 마커 자체는 탭 순서에 넣지 않는다.
    keyboard: false,
    ...(pane ? { pane } : {}),
  });
}
