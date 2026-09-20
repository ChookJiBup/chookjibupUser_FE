/**
 * 축제 지도 마커 안에 넣을 아이콘.
 *
 * <p>카카오맵 오버레이는 DOM을 직접 만들어 넣는 방식이라 React 아이콘 컴포넌트를 쓸 수
 * 없다. 그래서 부스지도(`pinIcons.ts`)에서 이미 쓰던 방식 그대로, 같은 아이콘의 path만
 * 옮겨 두고 DOM으로 만들어 준다. 색은 지정하지 않고 부모의 `color`(Tailwind `text-*`)를
 * 따르게 해서, 마커 색을 혼잡도 토큰 클래스 하나로 통일해 줄 수 있게 한다.</p>
 */

/** Radix `SunIcon`(15×15 viewBox) 원본 path. 시안의 태양 마커와 같은 모양이다. */
const SUN_PATH =
  "M7.5 0C7.77614 0 8 0.223858 8 0.5V2.5C8 2.77614 7.77614 3 7.5 3C7.22386 3 7 2.77614 7 2.5V0.5C7 0.223858 7.22386 0 7.5 0ZM2.1967 2.1967C2.39196 2.00144 2.70854 2.00144 2.90381 2.1967L4.31802 3.61091C4.51328 3.80617 4.51328 4.12276 4.31802 4.31802C4.12276 4.51328 3.80617 4.51328 3.61091 4.31802L2.1967 2.90381C2.00144 2.70854 2.00144 2.39196 2.1967 2.1967ZM0.5 7C0.223858 7 0 7.22386 0 7.5C0 7.77614 0.223858 8 0.5 8H2.5C2.77614 8 3 7.77614 3 7.5C3 7.22386 2.77614 7 2.5 7H0.5ZM2.1967 12.8033C2.00144 12.608 2.00144 12.2915 2.1967 12.0962L3.61091 10.682C3.80617 10.4867 4.12276 10.4867 4.31802 10.682C4.51328 10.8772 4.51328 11.1938 4.31802 11.3891L2.90381 12.8033C2.70854 12.9986 2.39196 12.9986 2.1967 12.8033ZM12.5 7C12.2239 7 12 7.22386 12 7.5C12 7.77614 12.2239 8 12.5 8H14.5C14.7761 8 15 7.77614 15 7.5C15 7.22386 14.7761 7 14.5 7H12.5ZM10.682 4.31802C10.4867 4.12276 10.4867 3.80617 10.682 3.61091L12.0962 2.1967C12.2915 2.00144 12.608 2.00144 12.8033 2.1967C12.9986 2.39196 12.9986 2.70854 12.8033 2.90381L11.3891 4.31802C11.1938 4.51328 10.8772 4.51328 10.682 4.31802ZM8 12.5C8 12.2239 7.77614 12 7.5 12C7.22386 12 7 12.2239 7 12.5V14.5C7 14.7761 7.22386 15 7.5 15C7.77614 15 8 14.7761 8 14.5V12.5ZM10.682 10.682C10.8772 10.4867 11.1938 10.4867 11.3891 10.682L12.8033 12.0962C12.9986 12.2915 12.9986 12.608 12.8033 12.8033C12.608 12.9986 12.2915 12.9986 12.0962 12.8033L10.682 11.3891C10.4867 11.1938 10.4867 10.8772 10.682 10.682ZM5.5 7.5C5.5 6.39543 6.39543 5.5 7.5 5.5C8.60457 5.5 9.5 6.39543 9.5 7.5C9.5 8.60457 8.60457 9.5 7.5 9.5C6.39543 9.5 5.5 8.60457 5.5 7.5ZM7.5 4.5C5.84315 4.5 4.5 5.84315 4.5 7.5C4.5 9.15685 5.84315 10.5 7.5 10.5C9.15685 10.5 10.5 9.15685 10.5 7.5C10.5 5.84315 9.15685 4.5 7.5 4.5Z";

/**
 * 달력 아이콘(18×18 viewBox) path. 상세 화면의 `CalendarDaysIcon`과 같은 모양이라
 * 같은 값을 쓴다 — 저기는 채움(fill)이 아니라 선(stroke)으로 그려진 아이콘이다.
 */
const CALENDAR_STROKE_PATHS = [
  "M14.25 3H3.75C2.92157 3 2.25 3.67157 2.25 4.5V15C2.25 15.8284 2.92157 16.5 3.75 16.5H14.25C15.0784 16.5 15.75 15.8284 15.75 15V4.5C15.75 3.67157 15.0784 3 14.25 3Z",
  "M12 1.5V4.5M6 1.5V4.5M2.25 7.5H15.75",
  "M6 10.5H6.0075M9 10.5H9.0075M12 10.5H12.0075M6 13.5H6.0075M9 13.5H9.0075M12 13.5H12.0075",
];

const SVG_NS = "http://www.w3.org/2000/svg";

function createSvg(viewBox: string, sizePx: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", String(sizePx));
  svg.setAttribute("height", String(sizePx));
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

/** 진행중 축제 마커의 태양 아이콘. */
export function createSunIcon(sizePx: number): SVGSVGElement {
  const svg = createSvg("0 0 15 15", sizePx);
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", SUN_PATH);
  path.setAttribute("fill", "currentColor");
  path.setAttribute("fill-rule", "evenodd");
  path.setAttribute("clip-rule", "evenodd");
  svg.appendChild(path);
  return svg;
}

/** 진행중이 아닌 축제(혼잡도가 없는 축제) 마커의 달력 아이콘. */
export function createCalendarIcon(sizePx: number): SVGSVGElement {
  const svg = createSvg("0 0 18 18", sizePx);
  CALENDAR_STROKE_PATHS.forEach((d) => {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
  });
  return svg;
}
