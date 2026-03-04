import React from 'react';
import { motion } from 'motion/react';

export const LiquidBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-white dark:bg-[#0a0a0a] transition-colors duration-300">
      {/* Liquid-like moving blobs */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 100, 0],
          scale: [1, 1.2, 0.8, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-purple-600/10 dark:bg-purple-600/20 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, -100, 50, 0],
          y: [0, 100, -50, 0],
          scale: [1, 0.8, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] rounded-full"
      />
      <motion.div
        animate={{
          x: [0, 50, -100, 0],
          y: [0, -100, 50, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1/3 h-1/3 bg-emerald-600/5 dark:bg-emerald-600/10 blur-[100px] rounded-full"
      />
      
      {/* Subtle grid pattern removed as requested */}
    </div>
  );
};
