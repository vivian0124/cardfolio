"use client";

import { useState } from "react";

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 24;

export default function TrendChart({
  points,
  format,
}: {
  points: { month: string; value: number }[];
  format: (v: number) => string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) return null;

  const innerW = WIDTH - PAD_X * 2;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxVal = Math.max(...points.map((p) => p.value), 1);

  const x = (i: number) => PAD_X + (i / (points.length - 1)) * innerW;
  const y = (v: number) => PAD_TOP + innerH - (v / maxVal) * innerH;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(p.value)}`)
    .join(" ");
  const areaPath = `${linePath} L ${x(points.length - 1)} ${PAD_TOP + innerH} L ${x(0)} ${PAD_TOP + innerH} Z`;

  // 只標第一、中、最後三個月份，避免擠成一團
  const labelIdx = new Set(
    [0, Math.floor((points.length - 1) / 2), points.length - 1]
  );

  const active = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          const i = Math.round(ratio * (points.length - 1));
          setHover(Math.max(0, Math.min(points.length - 1, i)));
        }}
      >
        <path d={areaPath} fill="var(--accent)" opacity={0.12} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle
            key={p.month}
            cx={x(i)}
            cy={y(p.value)}
            r={hover === i ? 4 : i === points.length - 1 ? 3 : 0}
            fill="var(--accent)"
          />
        ))}
        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD_TOP}
            y2={PAD_TOP + innerH}
            stroke="var(--border-strong)"
            strokeWidth={1}
          />
        )}
        {[...labelIdx].map((i) => (
          <text
            key={i}
            x={x(i)}
            y={HEIGHT - 6}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill="var(--muted)"
          >
            {points[i].month}
          </text>
        ))}
      </svg>
      {active && (
        <div
          className="popover-panel pointer-events-none absolute -translate-x-1/2 -translate-y-full px-2 py-1 text-xs"
          style={{
            left: `${(x(hover!) / WIDTH) * 100}%`,
            top: `${(y(active.value) / HEIGHT) * 100}%`,
          }}
        >
          <div className="text-muted">{active.month}</div>
          <div className="mono-num font-semibold text-accent">
            {format(active.value)}
          </div>
        </div>
      )}
    </div>
  );
}
