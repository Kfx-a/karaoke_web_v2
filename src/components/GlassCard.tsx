import React from 'react';
import { motion } from 'motion/react';
import { Tilt } from 'react-tilt';
import { Play, Heart, Share2, MoreHorizontal } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  title: string;
  artist: string;
  thumbnail: string;
  duration: string;
  className?: string;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({ title, artist, thumbnail, duration, className, onClick }) => {
  return (
    <div 
      className={cn("group flex flex-col gap-3 cursor-pointer", className)}
      onClick={onClick}
    >
      <Tilt
        options={{
          max: 15,
          scale: 1.02,
          speed: 400,
          glare: true,
          "max-glare": 0.2,
        }}
        className={cn(
          "relative w-full aspect-video rounded-xl overflow-hidden",
          "bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 shadow-xl transition-all duration-300",
          "hover:bg-black/10 dark:hover:bg-white/10 hover:border-black/20 dark:hover:border-white/20"
        )}
      >
        {/* Liquid-like gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {/* Liquid Shine Effect */}
        <motion.div
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent -skew-x-12 pointer-events-none"
        />
        
        {/* Thumbnail */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover opacity-90 dark:opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-3 right-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-white bg-black/60 px-2 py-1 rounded-md backdrop-blur-md border border-white/10">
            {duration}
          </span>
        </div>

        {/* Play Icon Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
            <Play className="w-6 h-6 text-white fill-current translate-x-0.5" />
          </div>
        </div>
      </Tilt>

      {/* Info below the player */}
      <div className="px-2 py-1">
        <h3 className="text-base font-semibold text-black/80 dark:text-white/90 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors leading-snug">
          {title}
        </h3>
        <p className="text-[12px] text-black/40 dark:text-white/40 mt-2 font-mono uppercase tracking-wider">
          {artist}
        </p>
      </div>
    </div>
  );
};
