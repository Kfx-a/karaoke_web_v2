import React from 'react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      {/* Liquid blobs — CSS animations (no JS, GPU-only via transform) */}
      <div className="blob blob-purple" />
      <div className="blob blob-blue" />
      <div className="blob blob-emerald" />
    </div>
  );
};
