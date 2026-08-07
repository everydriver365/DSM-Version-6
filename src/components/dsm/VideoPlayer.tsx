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
  description?: string | null;
  onClose?: () => void;
  autoPlay?: boolean;
}

export default function VideoPlayer({
  src,
  thumbnail,
  title,
  description,
  onClose,
  autoPlay,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function formatTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function togglePlay() {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
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

  function showControlsTemporarily() {
    setShowControls(true);
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
    }
    controlsTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }

  useEffect(() => {
    if (autoPlay && videoRef.current) {
      videoRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => {});
    }
    return () => {
      if (controlsTimer.current) {
        clearTimeout(controlsTimer.current);
      }
    };
  }, [autoPlay]);

  return (
    <div style={{ background: '#000', borderRadius: 12, overflow: 'hidden', position: 'relative', width: '100%' }} onClick={showControlsTemporarily}>
      <video
        ref={videoRef}
        src={src}
        poster={thumbnail ?? undefined}
        width="100%"
        style={{
          display: 'block',
          maxHeight: 280,
          objectFit: 'contain',
        }}
        muted={muted}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
        onEnded={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          opacity: showControls ? 1 : 0,
          transition: 'opacity 0.3s',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
          padding: 12,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div
          style={{ marginBottom: 8, cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            handleSeek(e);
          }}
        >
          <div style={{ height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}>
            <div
              style={{
                width: `${progress}%`,
                background: '#fff',
                height: '100%',
                borderRadius: 2,
                transition: 'width 0.1s',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {playing ? (
              <IconPlayerPause size={16} color="#fff" />
            ) : (
              <IconPlayerPlay size={16} color="#fff" />
            )}
          </button>

          <span
            style={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.8)',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMuted((m) => !m);
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {muted ? (
              <IconVolumeOff size={16} color="#fff" />
            ) : (
              <IconVolume size={16} color="#fff" />
            )}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              videoRef.current?.requestFullscreen();
            }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <IconMaximize size={16} color="#fff" />
          </button>

          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <IconX size={16} color="#fff" />
            </button>
          )}
        </div>
      </div>

      {!playing && showControls && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
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

      {title && (
        <div style={{ background: '#F8FAFC', padding: '10px 12px', borderTop: '0.5px solid #E4E8EF' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0B1F3A', fontFamily: 'Poppins, sans-serif' }}>{title}</div>
          {description && (
            <div
              style={{
                fontSize: 12,
                color: '#6B7686',
                fontFamily: 'Poppins, sans-serif',
                marginTop: 4,
                lineHeight: 1.4,
              }}
            >
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
