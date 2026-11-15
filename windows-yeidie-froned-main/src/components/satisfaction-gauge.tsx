type SatisfactionGaugeProps = {
  value: number;
};

const bands = [
  { start: 0, end: 25, color: "#F87171", label: "Not Good" },
  { start: 25, end: 50, color: "#FBBF24", label: "Good" },
  { start: 50, end: 75, color: "#3B82F6", label: "Better" },
  { start: 75, end: 100, color: "#34BFA3", label: "Perfect" },
];

function pointOnDial(value: number, radius: number) {
  const angle = Math.PI * (1 - value / 100);
  return {
    x: 140 + radius * Math.cos(angle),
    y: 126 - radius * Math.sin(angle),
  };
}

export function SatisfactionGauge({ value }: SatisfactionGaugeProps) {
  const percentage = Number.isFinite(value)
    ? Math.min(100, Math.max(0, value))
    : 0;
  const rating = (bands.find((band) => percentage < band.end) ?? bands[3]).label;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
      <svg
        viewBox="0 0 280 184"
        className="max-h-40 w-full max-w-90 scale-x-110"
        role="meter"
        aria-label="Satisfaction rate"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-valuetext={`${percentage}% — ${rating.toLowerCase()} satisfaction`}
      >
        {bands.map(({ start, end, color }) => {
          const from = pointOnDial(start + 1, 100);
          const to = pointOnDial(end - 1, 100);

          return (
            <path
              key={start}
              d={`M ${from.x} ${from.y} A 100 100 0 0 1 ${to.x} ${to.y}`}
              fill="none"
              stroke={color}
              strokeWidth="15"
              strokeLinecap="round"
            />
          );
        })}
        {Array.from({ length: 21 }, (_, index) => {
          const major = index % 5 === 0;
          const from = pointOnDial(index * 5, major ? 76 : 81);
          const to = pointOnDial(index * 5, 87);

          return (
            <line
              key={index}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={major ? "#64748B" : "#B7BFD4"}
              strokeWidth={major ? 2 : 1}
              strokeLinecap="round"
            />
          );
        })}
        {[0, 50, 100].map((mark) => {
          const position = pointOnDial(mark, 62);
          return (
            <text
              key={mark}
              x={position.x}
              y={position.y + 4}
              textAnchor="middle"
              fill="#64748B"
              fontSize="10"
              fontWeight="600"
            >
              {mark}
            </text>
          );
        })}
        <g transform="translate(140 126)">
          <g
            style={{ transform: `rotate(${percentage * 1.8}deg)` }}
            className="transition-transform duration-700 ease-out motion-reduce:transition-none"
          >
            <path d="M -72 0 L 0 -5 L 12 0 L 0 5 Z" fill="#1900FF" />
          </g>
          <circle r="9" fill="#1900FF" />
          <circle r="3.5" fill="white" />
        </g>
        <text
          x="140"
          y="170"
          textAnchor="middle"
          fill="#0A0332"
          fontSize="30"
          fontWeight="800"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
      <p className="text-xs font-semibold text-[#0A0332]">satisfaction</p>
      <div
        className="mt-2 flex justify-center items-center w-full gap-10 px-2"
        aria-label="Satisfaction legend"
      >
        <div className="flex w-15 flex-col items-center  gap-1">
          <span className="text-[10px] font-medium text-[#0A0332]">Good</span>
          <div
            className="h-6 w-full rounded-sm"
            style={{ backgroundColor: "#fbbf23" }}
            aria-hidden="true"
          />
        </div>
        <div className="flex w-15 flex-col items-center  gap-1">
          <span className="text-[10px] font-medium text-[#0A0332]">Better</span>
          <div
            className="h-6 w-full rounded-sm"
            style={{ backgroundColor: "#3c81f6" }}
            aria-hidden="true"
          />
        </div>
        <div className="flex w-15 flex-col items-center  gap-1">
          <span className="text-[10px] font-medium text-[#0A0332]">
            Perfect
          </span>
          <div
            className="h-6 w-full rounded-sm"
            style={{ backgroundColor: "#33bfa3" }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}
