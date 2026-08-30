import {
  useState,
  useRef,
  useCallback,
  useEffect,
  createContext,
  useContext,
} from "react";

const RADIO_PREFS_KEY = "edp-radio-preferences";

const STREAM_URL = "https://ice1.somafm.com/groovesalad-256-mp3";
const SOMAFM_STATUS_URL = "https://api.somafm.com/groovesalad.json";

export interface NowPlaying {
  title: string;
  artist?: string;
  artwork?: string | null;
}

export interface RadioState {
  isPlaying: boolean;
  isLoading: boolean;
  nowPlaying: NowPlaying;
  showName: string;
  isLive: boolean;
  /** True once play() has been triggered at least once this session. */
  hasStarted: boolean;
  /** Name of the currently selected PRO station in the UI. */
  selectedStation: string | null;
  /** Favorite station names, persisted to localStorage. */
  favorites: string[];
}

/**
 * Global PRO Radio audio hook. The <audio> element lives outside React's tree
 * so playback survives every route change. Mount once (in __root) and share
 * through ProRadioContext.
 */
export function useProRadio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedPrefs =
    typeof window !== "undefined"
      ? (() => {
          try {
            const raw = localStorage.getItem(RADIO_PREFS_KEY);
            return raw ? (JSON.parse(raw) as { selectedStation?: string | null; favorites?: string[] }) : null;
          } catch {
            return null;
          }
        })()
      : null;
  const stateRef = useRef<RadioState>({
    isPlaying: false,
    isLoading: false,
    nowPlaying: { title: "PRO Radio" },
    showName: savedPrefs?.selectedStation ?? "PRO Radio",
    isLive: true,
    hasStarted: false,
    selectedStation: savedPrefs?.selectedStation ?? null,
    favorites: savedPrefs?.favorites ?? [],
  });
  const [state, setState] = useState<RadioState>(stateRef.current);

  // Keep event handlers in sync with the latest state values
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Initialise audio element once + poll SomaFM now playing every 30s
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateMediaSession = (
      nowPlaying: NowPlaying,
      showName: string
    ) => {
      if (!("mediaSession" in navigator)) return;

      navigator.mediaSession.metadata = new MediaMetadata({
        title: nowPlaying.title ?? "PRO Radio",
        artist: showName ?? "PRO Radio",
        album: "PRO Radio",
        artwork: nowPlaying.artwork
          ? [
              {
                src: nowPlaying.artwork,
                sizes: "512x512",
                type: "image/jpeg",
              },
            ]
          : [
              {
                src: "/icons/pro-radio-512.png",
                sizes: "512x512",
                type: "image/png",
              },
            ],
      });

      navigator.mediaSession.setActionHandler("play", () => play());
      navigator.mediaSession.setActionHandler("pause", () => pause());
      navigator.mediaSession.setActionHandler("stop", () => pause());
    };

    if (!audioRef.current) {
      const audio = new Audio(STREAM_URL);
      audio.preload = "none";
      audioRef.current = audio;

      audio.onwaiting = () => setState((s) => ({ ...s, isLoading: true }));
      audio.onplaying = () => {
        setState((s) => ({ ...s, isLoading: false, isPlaying: true }));
        updateMediaSession(
          stateRef.current.nowPlaying,
          stateRef.current.showName
        );
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "playing";
        }
      };
      audio.onpause = () => {
        setState((s) => ({ ...s, isPlaying: false }));
        if ("mediaSession" in navigator) {
          navigator.mediaSession.playbackState = "paused";
        }
      };
      audio.onerror = () =>
        setState((s) => ({ ...s, isLoading: false, isPlaying: false }));
    }

    const fetchStatus = async () => {
      try {
        const res = await fetch(SOMAFM_STATUS_URL);
        const data = await res.json();
        const song = data.channel?.lastPlaying;
        const current = data.channel?.songs?.[0];
        const nextNowPlaying = {
          title: current?.title ?? song?.title ?? "Groove Salad",
          artist: current?.artist ?? song?.artist ?? "SomaFM",
          artwork: current?.cover ?? null,
        };
        const nextShowName = "PRO Chill";
        setState((s) => ({
          ...s,
          nowPlaying: nextNowPlaying,
          showName: nextShowName,
          isLive: true,
        }));
        updateMediaSession(nextNowPlaying, nextShowName);
      } catch {
        // fail silently
        const fallbackNowPlaying = {
          title: "Groove Salad",
          artist: "SomaFM",
          artwork: null,
        };
        const fallbackShowName = "PRO Chill";
        setState((s) => ({
          ...s,
          nowPlaying: fallbackNowPlaying,
          showName: fallbackShowName,
          isLive: true,
        }));
        updateMediaSession(fallbackNowPlaying, fallbackShowName);
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
