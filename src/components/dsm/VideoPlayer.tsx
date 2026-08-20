import { tokens } from "@/lib/tokens";
import { useRef, useState, useEffect } from 'react';
import {
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconVolumeOff,
  IconMaximize,
  IconX,
} from '@tabler/icons-react';

interface VideoPlayerProps {
  src: string;
  thumbnail?: string | null;
  title?: string | null;
  onClose?: () => void;
  autoPlay?: boolean;
  onEnded?: () => void;
}

export function VideoPlayer({
  src,
  thumbnail,
  title,
  onClose,
  autoPlay,
  onEnded,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
  }

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    const d = videoRef.current.duration || 1;
    setCurrentTime(t);
    setProgress((t / d) * 100);
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * (videoRef.current.duration || 0);
  }

  function showControlsBriefly() {
    setShowControls(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoPlay, src]);

  return (
    <div
      onClick={showControlsBriefly}
      style={{
        position: 'relative',
        background: '#000',
        borderRadius: 8,
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail ?? undefined}
        controlsList="nodownload noplaybackrate noremoteplayback"
        disablePictureInPicture
        disableRemotePlayback
        onContextMenu={(e) => e.preventDefault()}
        playsInline
        muted={muted}
        title={title ?? undefined}
        style={{ display: 'block', width: '100%', maxHeight: 320, objectFit: 'contain' }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onCanPlay={(e) => {
          if (autoPlay) e.currentTarget.play().catch(() => {});
        }}
        onEnded={() => {
          setPlaying(false);
          setShowControls(true);
          onEnded?.();
        }}
      />

      {/* Big play button when paused */}
      {!playing && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.5)',
              border: '2px solid rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconPlayerPlay size={28} color="#fff" style={{ marginLeft: 4 }} />
          </div>
        </div>
      )}

      {/* Controls overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 12,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s',
        }}
      >
        {/* Progress bar */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleSeek(e);
          }}
          style={{
            height: 3,
            background: 'rgba(255,255,255,0.3)',
            borderRadius: 8,
            marginBottom: 8,
            cursor: 'pointer',
            position: 'relative',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#fff',
              borderRadius: 8,
            }}
          />
        </div>

        {/* Controls row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            {playing ? (
              <IconPlayerPause size={18} color="#fff" />
            ) : (
              <IconPlayerPlay size={18} color="#fff" />
            )}
          </button>

          <span
            style={{
              fontSize: tokens.fontSize.sm,
              color: 'rgba(255,255,255,0.85)',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            aria-label={muted ? 'Unmute' : 'Mute'}
            onClick={(e) => {
              e.stopPropagation();
              setMuted((v) => !v);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            {muted ? <IconVolumeOff size={18} color="#fff" /> : <IconVolume size={18} color="#fff" />}
          </button>

          <button
            type="button"
            aria-label="Fullscreen"
            onClick={(e) => {
              e.stopPropagation();
              videoRef.current?.requestFullscreen();
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <IconMaximize size={18} color="#fff" />
          </button>

          {onClose && (
            <button
              type="button"
              aria-label="Close"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <IconX size={18} color="#fff" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayer;
