import { useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface VideoItem {
  id: string;
  src: string;
  title: string;
  description: string;
  tag: string;
}

const VIDEOS: VideoItem[] = [
  {
    id: 'uneen',
    src: '/Uneen.mp4',
    title: 'Innovation Bootcamp',
    description: 'Student teams sharpening ideas through design thinking, mentoring, and structured innovation sessions.',
    tag: 'IGNITE',
  },
  {
    id: 'startup',
    src: '/startup.mp4',
    title: 'Final Pitch Stage',
    description: 'Finalists presenting SDG-focused solutions to mentors, investors, industry leaders, and the jury panel.',
    tag: 'PITCH',
  },
  {
    id: 'girl',
    src: '/girl.mp4',
    title: 'Student Innovation',
    description: 'Young innovators transforming real-world problems into practical, sustainable, and scalable solutions.',
    tag: 'IMPACT',
  },
];

function SingleVideoPlayer({ video }: { video: VideoItem; key?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playCount, setPlayCount] = useState(1);

  const handleEnded = () => {
    if (playCount < 3) {
      setPlayCount((prev) => prev + 1);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch((error: DOMException) => {
          if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
            console.error('Video replay error:', error);
          }
        });
      }
    }
  };

  return (
    <div className="w-full overflow-hidden rounded-[28px] sm:rounded-[36px] bg-[#191A23] aspect-[16/10] sm:aspect-[16/9]">
      <video
        ref={videoRef}
        src={video.src}
        className="w-full h-full object-cover"
        muted
        playsInline
        autoPlay
        onEnded={handleEnded}
      />
    </div>
  );
}

export default function ProductVideos() {
  return (
    <section id="product-videos" className="py-12 md:py-16 px-4 md:px-8 bg-white text-[#191A23] border-b-3 border-[#191A23]">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Section Header */}
        <div className="text-left space-y-2">
          <h2 id="videos-heading" className="text-3xl sm:text-4xl font-black tracking-tight text-[#191A23]">
            Event Glimpses
          </h2>
        </div>

        {/* Clean, borderless, buttonless vertical stack list */}
        <div className="flex flex-col gap-6">
          {VIDEOS.map((video) => (
            <SingleVideoPlayer key={video.id} video={video} />
          ))}
        </div>
      </div>
    </section>
  );
}
