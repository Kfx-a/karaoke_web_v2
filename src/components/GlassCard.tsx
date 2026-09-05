import React from 'react';
import { Eye, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  title: string;
  thumbnail: string;
  duration: string;
  viewCount: number | null;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  title,
  thumbnail,
  duration,
  viewCount,
  className,
  onClick,
  priority = false,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  const formattedViews = viewCount === null
    ? '--'
    : new Intl.NumberFormat('es', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(viewCount);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Reproducir ${title}`}
      className={cn(
        'video-card-shell group cursor-pointer relative rounded-lg h-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div className="video-card flex flex-col w-full h-full">
        <div className="relative w-full aspect-video overflow-hidden rounded-md border-b border-zinc-200 bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 shrink-0">
          <img
            src={thumbnail}
            alt={title}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />

          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-150 bg-black/65 w-11 h-11 rounded-full flex items-center justify-center">
              <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 z-20">
            <span className="text-[10px] font-mono font-bold tracking-widest text-white bg-black/80 px-1.5 py-0.5 rounded">
              {duration}
            </span>
          </div>

          <div className="absolute inset-0 bg-black/10 z-10 pointer-events-none" />
        </div>

        <div className="flex justify-between items-start gap-3 p-3 flex-1">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-semibold text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
              {title}
            </h3>
          </div>

          <span
            className="inline-flex items-center gap-1.5 shrink-0 mt-0.5 text-[11px] font-mono font-semibold tracking-wide text-zinc-500 dark:text-zinc-400"
            aria-label={`${viewCount ?? 0} visitas`}
            title={`${viewCount ?? 0} visitas`}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>{formattedViews}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
