interface LogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function LocalRootsLogo({
  className = "",
  size = 100,
  color = "#4A6741",
}: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Stem */}
      <path
        d="M50 42C50 42 50 65 50 78"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />

      {/* Left leaf */}
      <path
        d="M50 55C42 55 32 50 28 38C26 30 35 25 45 35C48 38 50 42 50 42"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right leaf */}
      <path
        d="M50 55C58 55 68 50 72 38C74 30 65 25 55 35C52 38 50 42 50 42"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Top leaf */}
      <path
        d="M50 42C46 32 45 20 50 12C55 20 54 32 50 42"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Roots */}
      <g stroke={color} strokeWidth="2" strokeLinecap="round">
        <path d="M50 78C45 82 40 88 38 92" />
        <path d="M50 78C55 82 60 88 62 92" />
        <path d="M50 78V95" />
        <path d="M48 83C42 84 35 84 32 85" />
        <path d="M52 83C58 84 65 84 68 85" />
      </g>
    </svg>
  );
}
