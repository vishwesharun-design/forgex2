import React from 'react';

interface ForgeXLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
}

/**
 * ForgeX Geometric Monogram Logo
 * Clean vector rendering with transparent background.
 * Exact mathematical reproduction of the brand glyph.
 */
export const ForgeXLogo: React.FC<ForgeXLogoProps> = ({
  className = 'w-6 h-6',
  size,
  color = 'currentColor',
}) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 200 300"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-label="ForgeX Logo"
    >
      {/* Top trapezoid glyph */}
      <polygon points="0,0 200,0 200,100 100,100" />
      {/* Bottom geometric glyph */}
      <polygon points="0,100 100,100 200,200 100,200 100,300 0,200" />
    </svg>
  );
};
