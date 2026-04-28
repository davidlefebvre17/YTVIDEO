import React from 'react';
import { EDITORIAL_ICON_PATHS, type EditorialIconName } from './editorial-icons';

export type { EditorialIconName };
export { EDITORIAL_ICON_NAMES } from './editorial-icons';

export interface EditorialIconProps {
  name: EditorialIconName;
  size?: number;
  stroke?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  /** Fraction drawn (0 to 1) — for stroke-dashoffset draw-in animation in Remotion. */
  drawProgress?: number;
}

export const EditorialIcon: React.FC<EditorialIconProps> = ({
  name,
  size = 96,
  stroke = '#1a1a1a',
  strokeWidth = 2,
  className,
  style,
  drawProgress,
}) => {
  const inner = EDITORIAL_ICON_PATHS[name];
  const drawStyle =
    drawProgress !== undefined
      ? {
          strokeDasharray: 1000,
          strokeDashoffset: 1000 * (1 - Math.max(0, Math.min(1, drawProgress))),
        }
      : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      width={size}
      height={size}
      className={className}
      style={style}
    >
      <g
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={drawStyle}
        dangerouslySetInnerHTML={{ __html: inner }}
      />
    </svg>
  );
};
