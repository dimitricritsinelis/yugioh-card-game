import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const TRACKS = [
  { src: "/audio/duel-theme-main.mp3" },
  { src: "/audio/duel-theme-ra.mp3" },
] as const;

const DEFAULT_VOLUME = 0.03;
const CROSSFADE_MS = 4000;

export function MusicPlayer() {
  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const activeIndexRef = useRef(0);
  const fadeFrameRef = useRef<number | null>(null);
  const monitorFrameRef = useRef<number | null>(null);
  const crossfadingRef = useRef(false);
  const playingRef = useRef(false);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const mutedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  const stopFade = useCallback(() => {
    if (fadeFrameRef.current !== null) {
      window.cancelAnimationFrame(fadeFrameRef.current);
      fadeFrameRef.current = null;
    }
    crossfadingRef.current = false;
  }, []);

  const applyAudibleVolume = useCallback((audio: HTMLAudioElement, level = 1) => {
    audio.muted = mutedRef.current;
    audio.volume = mutedRef.current ? 0 : volumeRef.current * level;
  }, []);

  const playSequentialTrack = useCallback(
    (nextIndex: number, crossfade: boolean) => {
      const audios = audioRefs.current;
      const currentIndex = activeIndexRef.current;
      const currentAudio = audios[currentIndex];
      const nextAudio = audios[nextIndex];

      if (!nextAudio) {
        return;
      }

      stopFade();
      activeIndexRef.current = nextIndex;
      setAutoplayBlocked(false);

      nextAudio.currentTime = 0;
      applyAudibleVolume(nextAudio, crossfade ? 0 : 1);
      const playPromise = nextAudio.play();

      if (playPromise) {
        void playPromise
          .then(() => {
            playingRef.current = true;
            setIsPlaying(true);
          })
          .catch(() => {
            playingRef.current = false;
            setIsPlaying(false);
            setAutoplayBlocked(true);
          });
      }

      if (!crossfade || !currentAudio || currentAudio === nextAudio) {
        audios.forEach((audio, index) => {
          if (index !== nextIndex) {
            audio.pause();
            audio.currentTime = 0;
            applyAudibleVolume(audio, 0);
          }
        });
        applyAudibleVolume(nextAudio, 1);
        return;
      }

      crossfadingRef.current = true;
      const startedAt = performance.now();

      const fade = (now: number) => {
        const progress = Math.min((now - startedAt) / CROSSFADE_MS, 1);
        applyAudibleVolume(currentAudio, 1 - progress);
        applyAudibleVolume(nextAudio, progress);

        if (progress < 1) {
          fadeFrameRef.current = window.requestAnimationFrame(fade);
          return;
        }

        currentAudio.pause();
        currentAudio.currentTime = 0;
        applyAudibleVolume(currentAudio, 0);
        applyAudibleVolume(nextAudio, 1);
        fadeFrameRef.current = null;
        crossfadingRef.current = false;
      };

      fadeFrameRef.current = window.requestAnimationFrame(fade);
    },
    [applyAudibleVolume, stopFade],
  );

  const startPlayback = useCallback(() => {
    const audio = audioRefs.current[activeIndexRef.current];

    if (!audio) {
      return;
    }

    stopFade();
    applyAudibleVolume(audio, 1);
    const playPromise = audio.play();

    if (playPromise) {
      void playPromise
        .then(() => {
          playingRef.current = true;
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          playingRef.current = false;
          setIsPlaying(false);
          setAutoplayBlocked(true);
        });
    }
  }, [applyAudibleVolume, stopFade]);

  useEffect(() => {
    const audios = audioRefs.current.filter(Boolean);

    volumeRef.current = DEFAULT_VOLUME;
    audios.forEach((audio) => {
      audio.preload = "auto";
      audio.loop = false;
      audio.volume = DEFAULT_VOLUME;
    });
    activeIndexRef.current = 0;

    const handleEnded = () => {
      if (!crossfadingRef.current && playingRef.current) {
        playSequentialTrack((activeIndexRef.current + 1) % TRACKS.length, false);
      }
    };

    audios.forEach((audio) => audio.addEventListener("ended", handleEnded));
    startPlayback();

    return () => {
      if (monitorFrameRef.current !== null) {
        window.cancelAnimationFrame(monitorFrameRef.current);
      }
      if (fadeFrameRef.current !== null) {
        window.cancelAnimationFrame(fadeFrameRef.current);
      }
      audios.forEach((audio) => {
        audio.removeEventListener("ended", handleEnded);
        audio.pause();
      });
    };
  }, [playSequentialTrack, startPlayback]);

  useEffect(() => {
    const monitor = () => {
      const audio = audioRefs.current[activeIndexRef.current];

      if (
        playingRef.current &&
        audio &&
        Number.isFinite(audio.duration) &&
        audio.duration > CROSSFADE_MS / 1000 &&
        audio.duration - audio.currentTime <= CROSSFADE_MS / 1000 &&
        !crossfadingRef.current
      ) {
        playSequentialTrack((activeIndexRef.current + 1) % TRACKS.length, true);
      }

      monitorFrameRef.current = window.requestAnimationFrame(monitor);
    };

    monitorFrameRef.current = window.requestAnimationFrame(monitor);

    return () => {
      if (monitorFrameRef.current !== null) {
        window.cancelAnimationFrame(monitorFrameRef.current);
        monitorFrameRef.current = null;
      }
    };
  }, [playSequentialTrack]);

  useEffect(() => {
    mutedRef.current = muted;
    audioRefs.current.forEach((audio, index) => {
      applyAudibleVolume(audio, index === activeIndexRef.current ? 1 : 0);
    });
  }, [applyAudibleVolume, muted]);

  function handleMuteClick() {
    if (!playingRef.current && autoplayBlocked) {
      startPlayback();
      return;
    }

    setMuted((current) => !current);
  }

  const buttonLabel = autoplayBlocked && !isPlaying ? "Start music" : muted ? "Unmute" : "Mute";
  const ariaLabel =
    autoplayBlocked && !isPlaying
      ? "Start background music"
      : muted
        ? "Unmute background music"
        : "Mute background music";

  return (
    <div className="music-player">
      <button type="button" className="rail-btn music-mute-btn" onClick={handleMuteClick} aria-label={ariaLabel}>
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        {buttonLabel}
      </button>

      <div className="music-audio-sources" aria-hidden="true">
        {TRACKS.map((track, index) => (
          <audio
            key={track.src}
            data-audio-volume={DEFAULT_VOLUME}
            ref={(element) => {
              if (element) {
                audioRefs.current[index] = element;
              }
            }}
            preload="auto"
            src={track.src}
          />
        ))}
      </div>
    </div>
  );
}
