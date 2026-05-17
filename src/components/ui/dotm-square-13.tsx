import React from 'react';

interface DotmSquare13Props {
  size?: number;
  dotSize?: number;
  speed?: number;
  bloom?: boolean;
  opacityBase?: number;
  opacityMid?: number;
  opacityPeak?: number;
  className?: string;
}

const gridSize = 6;
const center = (gridSize - 1) / 2;

export function DotmSquare13({
  size = 96,
  dotSize = 9,
  speed = 1.2,
  bloom = true,
  opacityBase = 0.12,
  opacityMid = 0.42,
  opacityPeak = 0.95,
  className,
}: DotmSquare13Props) {
  const gap = (size - dotSize * gridSize) / (gridSize - 1);

  return (
    <div
      className={`dotm-square-13 ${bloom ? 'dotm-square-13-bloom' : ''} ${className || ''}`}
      style={
        {
          '--dotm-size': `${size}px`,
          '--dotm-dot': `${dotSize}px`,
          '--dotm-gap': `${gap}px`,
          '--dotm-speed': `${speed}s`,
          '--dotm-base': opacityBase,
          '--dotm-mid': opacityMid,
          '--dotm-peak': opacityPeak,
        } as React.CSSProperties
      }
      aria-hidden="true"
    >
      {Array.from({ length: gridSize }).flatMap((_, rowIndex) =>
        Array.from({ length: gridSize }).map((_, colIndex) => {
          const angle = Math.atan2(rowIndex - center, colIndex - center);
          const normalized = (angle + Math.PI * 2) % (Math.PI * 2);
          const angleProgress = normalized / (Math.PI * 2);
          const distance = Math.hypot(rowIndex - center, colIndex - center);
          const weight = distance < 1 ? 2 : distance < 2.2 ? 1 : 0;

          return (
          <span
            key={`${rowIndex}-${colIndex}`}
            className="dotm-square-13-dot"
            style={
              {
                '--dotm-weight': weight,
                '--dotm-delay': `${angleProgress * speed}s`,
              } as React.CSSProperties
            }
          />
          );
        })
      )}
    </div>
  );
}
