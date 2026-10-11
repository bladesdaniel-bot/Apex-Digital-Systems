import { useEffect, useRef, useState } from "react";

type AdLoopProps = {
  mp4: string;
  webm?: string;
  poster: string;
  className?: string;
  label?: string;
};

// Apple devices (every iOS browser and desktop Safari) can play a muted MP4 inside an <img>.
// That path never shows native play/pause overlays, keeps looping, and still animates in Low Power Mode.
function prefersImageVideo() {
  const ua = navigator.userAgent;
  const iOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const desktopSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|FxiOS|EdgiOS|Edg\/|Android/.test(ua);
  return iOS || desktopSafari;
}

export function AdLoop({ mp4, webm, poster, className = "", label }: AdLoopProps) {
  const [mode, setMode] = useState<"video" | "image">("video");
  const [imageFailed, setImageFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (prefersImageVideo()) setMode("image");
  }, []);

  // Non-Apple browsers: keep the loop running if anything ever pauses or ends it.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || mode !== "video") return;
    const resume = () => {
      if (document.visibilityState === "visible") video.play().catch(() => undefined);
    };
    const restart = () => {
      video.currentTime = 0;
      resume();
    };
    video.addEventListener("pause", resume);
    video.addEventListener("ended", restart);
    document.addEventListener("visibilitychange", resume);
    resume();
    return () => {
      video.removeEventListener("pause", resume);
      video.removeEventListener("ended", restart);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [mode]);

  if (mode === "image") {
    return (
      <img
        src={imageFailed ? poster : mp4}
        onError={() => setImageFailed(true)}
        alt={label ?? ""}
        aria-hidden={label ? undefined : true}
        draggable={false}
        className={`ad-loop pointer-events-none select-none ${className}`}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      controls={false}
      disablePictureInPicture
      disableRemotePlayback
      preload="auto"
      aria-label={label}
      aria-hidden={label ? undefined : true}
      tabIndex={-1}
      className={`ad-loop pointer-events-none select-none ${className}`}
    >
      {webm && <source src={webm} type="video/webm" />}
      <source src={mp4} type="video/mp4" />
    </video>
  );
}
