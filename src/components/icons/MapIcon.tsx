import type { SVGProps } from "react";

/**
 * 접힌 종이지도 아이콘.
 *
 * <p>Radix 아이콘 세트에 지도 글리프가 없어 디자인 파일에서 내보낸 원본 path를 그대로
 * 옮겼다. 색은 하드코딩하지 않고 currentColor로 두어 쓰는 쪽 토큰을 따르게 한다.</p>
 */
export function MapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M2.5 5L7.5 2.5L12.5 5L17.5 2.5V15L12.5 17.5L7.5 15L2.5 17.5V5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 2.5V15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.5 5V17.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
