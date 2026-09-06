"use client";

// 카카오맵 JS SDK를 위한 최소한의 타입 선언. 공식 @types 패키지가 따로 없어서 직접 선언한다.
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (
          container: HTMLElement,
          options: { center: unknown; level: number },
        ) => KakaoMapInstance;
        CustomOverlay: new (options: {
          position: unknown;
          content: HTMLElement | string;
          yAnchor?: number;
          clickable?: boolean;
        }) => KakaoCustomOverlayInstance;
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

export interface KakaoMapInstance {
  setCenter: (latLng: unknown) => void;
  setLevel: (level: number) => void;
  relayout: () => void;
}

export interface KakaoCustomOverlayInstance {
  setMap: (map: KakaoMapInstance | null) => void;
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
