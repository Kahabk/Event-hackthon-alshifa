import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LOADER_PLAYBACK_RATE, LOADER_VIDEO_SRC } from '../loaderConfig';

interface FullScreenVideoLoaderProps {
  label?: string;
}

export default function FullScreenVideoLoader({ label = 'Loading dashboard' }: FullScreenVideoLoaderProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startVideo = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.playbackRate = LOADER_PLAYBACK_RATE;
    void video.play().catch(() => {
      // Mobile browsers may wait for enough buffered data; onCanPlay retries.
    });
  };

  useEffect(() => {
    startVideo();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-hidden bg-white px-4 py-[max(1rem,env(safe-area-inset-top))] text-[#191A23]"
      role="status"
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#191A23_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.08]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,white_74%)]" />

      <div className="relative flex h-full w-full flex-col items-center justify-center gap-3">
        <div className="aspect-square w-[min(88vw,72dvh,680px)] overflow-hidden">
          <video
            ref={videoRef}
            className="h-full w-full object-cover object-center"
            src={LOADER_VIDEO_SRC}
            autoPlay
            defaultMuted
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onLoadedData={startVideo}
            onLoadedMetadata={(event) => {
              event.currentTarget.playbackRate = LOADER_PLAYBACK_RATE;
              startVideo();
            }}
            onCanPlay={startVideo}
          />
        </div>

        <p className="max-w-[92vw] truncate font-mono text-[11px] font-black uppercase tracking-widest text-[#191A23]/65">
          {label}
        </p>
      </div>
    </motion.div>
  );
}
