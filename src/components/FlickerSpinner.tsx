import type { CSSProperties } from 'react';

const animations = [
  ['f000001100000000', 'f000000110000000', 'f000000111000000', 'f000000011100000', 'f000000000110000', 'f000000000111000', 'f000000000011100'],
  ['f000001110000000', 'f000001111000000', 'f000000011100000', 'f000000001110000', 'f000000001111000', 'f000000000011100', 'f000000000011110'],
  ['f000011110000000', 'f000000011000000', 'f000000001100000', 'f011111111110000', 'f000000000011000', 'f000000000011100', 'f000000000001110'],
  ['f000001110000000', 'f000001111000000', 'f000000011100000', 'f000000001110000', 'f000000001111000', 'f000000000011100', 'f000000000011110'],
  ['f000001100000000', 'f000000110000000', 'f000000111000000', 'f000000011100000', 'f000000000110000', 'f000000000111000', 'f000000000011100'],
];

export default function FlickerSpinner({ size = 28 }: { size?: number }) {
  const points = Array.from({ length: 7 }, (_, row) => Array.from({ length: 7 }, (_, column) => ({
    x: 3 + column * 6,
    y: 3 + row * 6,
  }))).flat();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Loading"
      style={{ '--on': '#FF59F9', '--off': '#404040', '--dur': '2.250s' } as CSSProperties}
    >
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f000001100000000 { 0%,33.32%,46.67%,100% { opacity:0 } 33.33%,46.66% { opacity:1 } }
        @keyframes f000000110000000 { 0%,39.99%,53.33%,100% { opacity:0 } 40%,53.32% { opacity:1 } }
        @keyframes f000000111000000 { 0%,39.99%,60%,100% { opacity:0 } 40%,59.99% { opacity:1 } }
        @keyframes f000000011100000 { 0%,46.66%,66.67%,100% { opacity:0 } 46.67%,66.66% { opacity:1 } }
        @keyframes f000000000110000 { 0%,59.99%,73.33%,100% { opacity:0 } 60%,73.32% { opacity:1 } }
        @keyframes f000000000111000 { 0%,59.99%,80%,100% { opacity:0 } 60%,79.99% { opacity:1 } }
        @keyframes f000000000011100 { 0%,66.66%,86.67%,100% { opacity:0 } 66.67%,86.66% { opacity:1 } }
        @keyframes f000001110000000 { 0%,33.32%,53.33%,100% { opacity:0 } 33.33%,53.32% { opacity:1 } }
        @keyframes f000001111000000 { 0%,33.32%,60%,100% { opacity:0 } 33.33%,59.99% { opacity:1 } }
        @keyframes f000000001110000 { 0%,53.32%,73.33%,100% { opacity:0 } 53.33%,73.32% { opacity:1 } }
        @keyframes f000000001111000 { 0%,53.32%,80%,100% { opacity:0 } 53.33%,79.99% { opacity:1 } }
        @keyframes f000000000011110 { 0%,66.66%,93.33%,100% { opacity:0 } 66.67%,93.32% { opacity:1 } }
        @keyframes f000011110000000 { 0%,26.66%,53.33%,100% { opacity:0 } 26.67%,53.32% { opacity:1 } }
        @keyframes f000000011000000 { 0%,46.66%,60%,100% { opacity:0 } 46.67%,59.99% { opacity:1 } }
        @keyframes f000000001100000 { 0%,53.32%,66.67%,100% { opacity:0 } 53.33%,66.66% { opacity:1 } }
        @keyframes f011111111110000 { 0%,6.66%,73.33%,100% { opacity:0 } 6.67%,73.32% { opacity:1 } }
        @keyframes f000000000011000 { 0%,66.66%,80%,100% { opacity:0 } 66.67%,79.99% { opacity:1 } }
        @keyframes f000000000001110 { 0%,73.32%,93.33%,100% { opacity:0 } 73.33%,93.32% { opacity:1 } }
      `}</style>
      {points.map(point => <circle key={`base-${point.x}-${point.y}`} cx={point.x} cy={point.y} r="2" />)}
      {animations.flatMap((row, rowIndex) => row.map((animation, columnIndex) => (
        <circle
          key={`${rowIndex}-${columnIndex}`}
          className="on"
          cx={3 + columnIndex * 6}
          cy={9 + rowIndex * 6}
          r="2"
          opacity={0}
          style={{ animation: `${animation} var(--dur) linear infinite` }}
        />
      )))}
    </svg>
  );
}
