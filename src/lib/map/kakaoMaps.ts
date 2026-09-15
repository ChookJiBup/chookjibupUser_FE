"use client";

// 카카오맵 JS SDK를 위한 최소한의 타입 선언. 공식 @types 패키지가 따로 없어서 직접 선언한다.
// 여기 없는 API를 쓰려면 실제 SDK 문서를 확인하고 필요한 만큼만 추가한다.
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => KakaoLatLng;
        LatLngBounds: new () => KakaoLatLngBounds;
        Map: new (
          container: HTMLElement,
          options: { center: KakaoLatLng; level: number },
        ) => KakaoMapInstance;
        CustomOverlay: new (options: {
          position: KakaoLatLng;
          content: HTMLElement | string;
          xAnchor?: number;
          yAnchor?: number;
          zIndex?: number;
          clickable?: boolean;
        }) => KakaoCustomOverlayInstance;
        Polygon: new (options: {
          path: KakaoLatLng[];
          strokeWeight?: number;
          strokeColor?: string;
          strokeOpacity?: number;
          strokeStyle?: string;
          fillColor?: string;
          fillOpacity?: number;
        }) => KakaoCustomOverlayInstance;
        /** 지도 투영 좌표에 직접 그리는 오버레이의 베이스 클래스. */
        AbstractOverlay: KakaoAbstractOverlayConstructor;
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

/** 카카오맵 좌표 객체. 내부 구조는 쓰지 않고 SDK에 그대로 넘기기만 한다. */
export interface KakaoLatLng {
  getLat: () => number;
  getLng: () => number;
}

/** 지도 화면(픽셀) 좌표. */
export interface KakaoPoint {
  x: number;
  y: number;
}

export interface KakaoProjection {
  pointFromCoords: (latLng: KakaoLatLng) => KakaoPoint;
}

export interface KakaoLatLngBounds {
  extend: (latLng: KakaoLatLng) => void;
  isEmpty: () => boolean;
}

export interface KakaoMapInstance {
  setCenter: (latLng: KakaoLatLng) => void;
  /** 부드럽게 이동. 목록에서 고른 부스로 지도를 옮길 때 쓴다. */
  panTo: (latLng: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  getLevel: () => number;
  setMinLevel: (level: number) => void;
  setMaxLevel: (level: number) => void;
  relayout: () => void;
  /** 지도가 붙어 있는 DOM 엘리먼트. 크기 변화를 감시할 때 쓴다. */
  getNode: () => HTMLElement;
  setBounds: (
    bounds: KakaoLatLngBounds,
    paddingTop?: number,
    paddingRight?: number,
    paddingBottom?: number,
    paddingLeft?: number,
  ) => void;
}

export interface KakaoCustomOverlayInstance {
  setMap: (map: KakaoMapInstance | null) => void;
}

/** `AbstractOverlay`가 그림을 그릴 수 있게 내어주는 레이어들. */
export interface KakaoMapPanels {
  overlayLayer: HTMLElement;
}

// 상속받아 onAdd/onRemove/draw를 덮어써야 하므로 프로퍼티가 아니라 메서드로 선언한다.
export interface KakaoAbstractOverlay {
  setMap(map: KakaoMapInstance | null): void;
  getPanels(): KakaoMapPanels;
  getProjection(): KakaoProjection;
  onAdd(): void;
  onRemove(): void;
  draw(): void;
}

export interface KakaoAbstractOverlayConstructor {
  new (): KakaoAbstractOverlay;
  prototype: KakaoAbstractOverlay;
}

const SDK_URL = "https://dapi.kakao.com/v2/maps/sdk.js";

let loadPromise: Promise<void> | null = null;

/** 카카오맵 SDK를 딱 한 번만 로드한다 (여러 컴포넌트가 동시에 마운트돼도 중복 삽입 안 됨). */
export function loadKakaoMapsSdk(): Promise<void> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("카카오맵은 브라우저에서만 불러올 수 있습니다."));
      return;
    }
    if (window.kakao?.maps) {
      resolve();
      return;
    }

    const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
    if (!appKey) {
      reject(
        new Error(
          "NEXT_PUBLIC_KAKAO_MAP_KEY가 설정되지 않았습니다. .env.local에 카카오 개발자 콘솔의 JavaScript 키를 넣어주세요.",
        ),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = `${SDK_URL}?appkey=${appKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("카카오맵 SDK를 불러오지 못했습니다."));
    document.head.appendChild(script);
  });

  return loadPromise;
}
