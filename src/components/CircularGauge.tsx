interface CircularGaugeProps {
  value: number;
  max: number;
  label: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}

export function CircularGauge({
  value,
  max,
  label,
  size = 170,
  strokeWidth = 14,
  color = "#f07a1f",
  trackColor = "#e7e2d5",
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const offset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${value} de ${max}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${center} ${center})`}
      />
      <text x="50%" y="46%" textAnchor="middle" fontSize={size * 0.24} fontWeight="700" fill="#1f7fb8" fontFamily="Helvetica, Arial, sans-serif">
        {value}
      </text>
      <text x="50%" y="63%" textAnchor="middle" fontSize={size * 0.09} fill="#6b7280" fontFamily="Helvetica, Arial, sans-serif">
        de {max}
      </text>
      <text x="50%" y="78%" textAnchor="middle" fontSize={size * 0.08} fill="#1f7fb8" fontWeight="600" fontFamily="Helvetica, Arial, sans-serif">
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
