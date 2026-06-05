import { PlayCircle } from "lucide-react";

interface LessonVideoPlayerProps {
  videoUrl: string;
  lessonTitle: string;
  isLessonSwitching: boolean;
}

function canEmbed(url: string): boolean {
  return Boolean(url.trim()) && /^(https?:)?\/\//i.test(url);
}

export function LessonVideoPlayer({ videoUrl, lessonTitle, isLessonSwitching }: LessonVideoPlayerProps) {
  const embeddable = canEmbed(videoUrl);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-slate-900 shadow-[0_18px_50px_rgba(15,23,42,0.35)]">
      <div className="relative aspect-video">
        {isLessonSwitching && (
          <div className="absolute inset-x-0 top-0 z-10 h-1.5 bg-white/20">
            <div className="h-full w-full animate-pulse bg-[#6bb6ff]/85" />
          </div>
        )}

        {embeddable ? (
          <iframe
            key={videoUrl}
            title={lessonTitle}
            src={videoUrl}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white px-6 text-center">
            <PlayCircle className="h-14 w-14 mb-3 text-[#6bb6ff]" />
            <p className="text-lg font-semibold">Video source unavailable</p>
            <p className="text-sm text-slate-200 max-w-md">
              Lesson content is still available below while the video stream is being prepared.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
