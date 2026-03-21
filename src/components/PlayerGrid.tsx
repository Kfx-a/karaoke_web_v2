import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { Loader2, X } from 'lucide-react';
import { fetchOdyseeVideos, type OdyseeVideo } from '../services/odyseeService';

export const PlayerGrid: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [videos, setVideos] = useState<OdyseeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<OdyseeVideo | null>(null);
  const historyPushedRef = useRef(false);

  // Stable close function that pops history instead of setting state directly
  const closeModal = useCallback(() => {
    if (historyPushedRef.current) {
      historyPushedRef.current = false;
      history.back(); // triggers popstate → which sets selectedVideo(null)
    } else {
      setSelectedVideo(null);
    }
  }, []);

  useEffect(() => {
    if (selectedVideo) {
      document.body.style.overflow = 'hidden';

      // Push a history entry so Android back button can close the modal
      history.pushState({ modalOpen: true }, '');
      historyPushedRef.current = true;

      const onPopState = () => {
        historyPushedRef.current = false;
        setSelectedVideo(null);
      };

      window.addEventListener('popstate', onPopState);

      return () => {
        window.removeEventListener('popstate', onPopState);
        document.body.style.overflow = 'unset';

        // If modal closes without back button (e.g. clicking X), clean up the history entry
        if (historyPushedRef.current) {
          historyPushedRef.current = false;
          history.back();
        }
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedVideo]);

  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      const data = await fetchOdyseeVideos('@Alis_FX:f');
      setVideos(data);
      setLoading(false);
    };

    loadVideos();
  }, []);

  const filteredVideos = videos.filter(v =>
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[2400px] mx-auto px-6 py-24">
      <div inert={selectedVideo ? true : undefined} className={selectedVideo ? "pointer-events-none select-none" : ""}>
      {/* Search Section Removed */}

      {/* Grid Section */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
          <p className="text-black/20 dark:text-white/20 font-mono text-xs uppercase tracking-widest">Fetching from Odysee...</p>
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
        >
          {filteredVideos.length > 0 ? (
            filteredVideos.map((video) => (
              <motion.div
                key={video.id}
                variants={{
                  hidden: { opacity: 0, y: 20, scale: 0.95 },
                  visible: { opacity: 1, y: 0, scale: 1 },
                }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              >
                <GlassCard
                  title={video.title}
                  /*artist="_FX"*/
                  thumbnail={video.thumbnail}
                  duration={video.duration}
                  onClick={() => setSelectedVideo(video)}
                />
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <p className="text-black/20 dark:text-white/20 font-mono text-xs uppercase tracking-widest">No videos found in this channel.</p>
            </div>
          )}
        </motion.div>
      )}
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            {/* Backdrop — static blur via CSS, only opacity animated */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => closeModal()}
              className="absolute inset-0 bg-white/20 dark:bg-black/60 backdrop-blur-md"
            />

            {/* Modal Content — backdropFilter static, only transform+opacity animated */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 50 }}
              transition={{
                type: "spring",
                damping: 28,
                stiffness: 180,
                opacity: { duration: 0.3 },
              }}
              className="relative w-full max-w-[95vw] md:max-w-[60vw] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-xl p-4 md:p-6 shadow-[0_50px_120px_rgba(0,0,0,0.5)] border border-white/30 dark:border-white/10 flex flex-col items-center overflow-hidden"
            >
              <div className="w-full flex flex-col gap-6 items-center">
                {/* Video Container - Centered with flex and no background to avoid artifacts */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-transparent">
                  <iframe
                    src={selectedVideo.embed_url}
                    className="absolute top-0 left-0 w-full h-full border-none m-0 p-0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
                    referrerPolicy="no-referrer-when-downgrade"
                    loading="lazy"
                    sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
                    style={{ background: 'transparent' }}
                  />

                  {/* Block Title Bar Overlay */}
                  <div className="absolute top-0 left-0 w-full h-[60px] bg-transparent z-10 pointer-events-auto cursor-default" />
                </div>

                {/* Info Section */}
                <div className="w-full px-2 pb-2 text-left">
                  <h2 className="text-lg md:text-xl font-bold text-black dark:text-white">
                    {selectedVideo.title}
                  </h2>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div inert={selectedVideo ? true : undefined} className={selectedVideo ? "pointer-events-none select-none" : ""}>
      {/* Footer */}
      <footer className="mt-32 pt-12 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-black/20 dark:text-white/20 text-xs font-mono uppercase tracking-widest">
        <div className="flex items-center gap-8">
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms</a>
          <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Support</a>
        </div>
        <p>© 2026 Alis FX.</p>
      </footer>
      </div>
    </div>
  );
};
