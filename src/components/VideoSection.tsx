"use client";

import { useState, useRef } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "./ui/blur-fade";
import { cn } from "@/lib/utils";

interface VideoSectionProps {
  videoSrc?: string;
  posterSrc?: string;
  showTitle?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

export function VideoSection({
  videoSrc = "/videos/sushi-preparation.mp4",
  posterSrc = "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1920&h=1080&fit=crop",
  showTitle = true,
  autoPlay = true,
  loop = true,
  className,
}: VideoSectionProps) {
  const t = useTranslations("video");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <section className={cn("py-24 px-6", className)}>
      <div className="max-w-6xl mx-auto">
        {showTitle && (
          <BlurFade inView>
            <div className="text-center mb-12">
              <span className="text-gold text-sm font-medium tracking-[0.3em] uppercase">
                {t("sectionLabel")}
              </span>
              <h2 className="font-display text-4xl md:text-5xl font-semibold mt-4">
                {t("title")}
              </h2>
            </div>
          </BlurFade>
        )}

        <BlurFade delay={0.1} inView>
          <div className="relative rounded-lg overflow-hidden aspect-video bg-card group">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              poster={posterSrc}
              autoPlay={autoPlay}
              muted={isMuted}
              loop={loop}
              playsInline
            >
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support the video tag.
            </video>

            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-center justify-between opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
              <button
                onClick={togglePlay}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-white/10 text-white hover:border-gold hover:text-gold transition-all duration-300"
                aria-label={isPlaying ? t("pause") : t("play")}
              >
                {isPlaying ? <Pause size={20} aria-hidden="true" /> : <Play size={20} className="ml-1" aria-hidden="true" />}
              </button>

              <button
                onClick={toggleMute}
                className="w-12 h-12 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-sm border border-white/10 text-white hover:border-gold hover:text-gold transition-all duration-300"
                aria-label={isMuted ? t("unmute") : t("mute")}
              >
                {isMuted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
              </button>
            </div>

            {/* Play button overlay when paused */}
            {!isPlaying && (
              <button
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center"
                aria-label={t("play")}
              >
                <div className="w-20 h-20 flex items-center justify-center rounded-full bg-gold/90 text-background hover:bg-gold transition-all duration-300 hover:scale-110">
                  <Play size={32} className="ml-1" />
                </div>
              </button>
            )}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
