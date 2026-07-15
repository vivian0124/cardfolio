/**
 * CardFolio logo：C 型掃描環＋中間一張笑臉卡。
 * spinning=true 時 C 環旋轉（跳頁 loading 用），笑臉卡保持不動。
 */
export default function Logo({
  size = 40,
  spinning = false,
}: {
  size?: number;
  spinning?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden
      className="shrink-0"
    >
      <circle
        cx="36"
        cy="36"
        r="35"
        fill="#0c130f"
        stroke="rgba(74,222,128,0.35)"
        strokeWidth="1.5"
      />
      {/* 暗軌（缺口下也看得到軌道，portfolio 進度感） */}
      <circle cx="36" cy="36" r="25" fill="none" stroke="#1d5c38" strokeWidth="5" />
      {/* C 環：缺口朝右 */}
      <g className={spinning ? "logo-spin" : undefined}>
        <circle
          cx="36"
          cy="36"
          r="25"
          fill="none"
          stroke="#4ade80"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="118 39"
          transform="rotate(25 36 36)"
        />
      </g>
      {/* 中間的笑臉卡 */}
      <rect
        x="27"
        y="24"
        width="18"
        height="24"
        rx="3"
        fill="#0c130f"
        stroke="#4ade80"
        strokeWidth="2.5"
      />
      <circle cx="32.6" cy="33" r="1.7" fill="#4ade80" />
      <circle cx="39.4" cy="33" r="1.7" fill="#4ade80" />
      <path
        d="M31.5 38.5 Q36 42.8 40.5 38.5"
        fill="none"
        stroke="#4ade80"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
