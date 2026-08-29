import {
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react";

const STREAM_URL = "https://streams.radio.co/s056b6f87a/listen";
const RADIO_CO_STATUS_URL =
  "https://public.radio.co/stations/s056b6f87a/status";

export interface NowPlaying {
  title: string;
  artist?: string;
  artwork?: string;
}

export interface RadioState {
  isPlaying: boolean;
  isLoading: boolean;
  nowPlaying: NowPlaying;
  showName: string;
  isLive: boolean;
  /** True once play() has been triggered at least once this session. */
  hasStarted: boolean;
}

/**
 * Global PRO Radio audio hook. The <audio> element lives outside React's tree
 * so playback survives every route change. Mount once (in __root) and share
 * through ProRadioContext.
 */
export function useProRadio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<RadioState>({
    isPlaying: false,
    isLoading: false,
    nowPlaying: { title: "PRO Radio" },
    showName: "PRO Radio",
    isLive: true,
    hasStarted: false,
  });

  // Initialise audio element once + poll Radio.co status every 30s
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!audioRef.current) {
      const audio = new Audio(STREAM_URL);
      audio.preload = "none";
      audioRef.current = audio;

      audio.onwaiting = () => setState((s) => ({ ...s, isLoading: true }));
      audio.onplaying = () =>
        setState((s) => ({ ...s, isLoading: false, isPlaying: true }));
      audio.onpause = () => setState((s) => ({ ...s, isPlaying: false }));
      audio.onerror = () =>
        setState((s) => ({ ...s, isLoading: false, isPlaying: false }));
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(RADIO_CO_STATUS_URL);
        const data = await res.json();
        setState((s) => ({
          ...s,
          nowPlaying: {
            title: data.current_track?.title ?? "PRO Radio",
            artist: data.current_track?.artist,
            artwork: data.current_track?.artwork_url,
          },
          showName: data.current_show?.name ?? "PRO Radio",
          isLive: data.status === "online",
        }));
      } catch {
        // fail silently
      }
    };

    fetchStatus();
    const interval = window.setInterval(fetchStatus, 30000);
    return () => window.clearInterval(interval);
  }, []);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Reload the stream so we always join at the live edge
    audio.src = STREAM_URL;
    audio.load();
    setState((s) => ({ ...s, isLoading: true, hasStarted: true }));
    audio.play().catch(() => setState((s) => ({ ...s, isLoading: false })));
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    // Clear src to stop buffering in the background
    audio.src = "";
    setState((s) => ({ ...s, isPlaying: false, isLoading: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) pause();
    else play();
  }, [state.isPlaying, play, pause]);

  return { ...state, play, pause, toggle, audioRef };
}

export type ProRadio = ReturnType<typeof useProRadio>;

export const ProRadioContext = createContext<ProRadio | null>(null);

export const useProRadioContext = () => {
  const ctx = useContext(ProRadioContext);
  if (!ctx)
    throw new Error(
      "useProRadioContext must be used within ProRadioProvider"
    );
  return ctx;
};
