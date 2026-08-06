import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  IconPlayerPlay,
  IconChevronRight,
  IconRadio,
  IconBook,
  IconShoppingBag,
  IconNews,
} from "@tabler/icons-react";
import { SectionHeader } from "@/components/dsm/SectionHeader";
import { supabase } from "@/lib/supabaseClient";


const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const RED = "#CC2229";
const GREEN = "#3C9B5A";
const HAIRLINE = "#E1E7EF";
const MUTED = "#8A94A3";
const FONT = "Poppins, Inter, sans-serif";

const SUPABASE_URL = "https://bjpqxfrihwjcqprmoqfs.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqcHF4ZnJpaHdqY3Fwcm1vcWZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NzQ4MjEsImV4cCI6MjA5NzA1MDgyMX0.HKlgx3dxP3uxX9wMRRUnfb0IPwaBpFcut_iUgT5XFeo";

type LiveItem = {
  id: string;
  title: string;
  session_date: string;
  session_time: string;
  duration_minutes: number | null;
  is_live: boolean | null;
  max_spaces: number | null;
  spaces_taken: number | null;
  image_url: string | null;
};


function startMs(d: string, t: string) {
  try {
    return new Date(`${d}T${(t || "00:00:00").slice(0, 8)}`).getTime();
  } catch {
    return 0;
  }
}

function isLiveNow(s: LiveItem) {
  if (s.is_live) return true;
  const start = startMs(s.session_date, s.session_time);
  if (!start) return false;
  const end = start + (s.duration_minutes ?? 60) * 60000;
  const now = Date.now();
  return now >= start && now < end;
}



export function DiscoverSection({ unreadIds = [] }: { unreadIds?: string[] } = {}) {
  const navigate = useNavigate();
  const [live, setLive] = useState<LiveItem[]>([]);
  
  
  const [reelCount, setReelCount] = useState<number | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [newsCount, setNewsCount] = useState<number | null>(null);
  const [newsUnread, setNewsUnread] = useState(false);

  const [liveHero, setLiveHero] = useState<string | null>(null);
  const [reelsHero, setReelsHero] = useState<string | null>(null);
  const [marketplaceHero, setMarketplaceHero] = useState<string | null>(null);
  const [newsHero, setNewsHero] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Reels view count (table may not exist yet)
      try {
        const { data, error } = await supabase.from("reels" as never).select("views");
        if (!cancelled && !error && Array.isArray(data)) {
          const total = (data as { views?: number | null }[]).reduce(
            (sum, r) => sum + (r.views ?? 0),
            0,
          );
          setReelCount(total);
        }
      } catch {
        /* table may not exist */
      }

      try {
        const { count, error } = await supabase
          .from("marketplace_listings")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .is("deleted_at", null);
        if (!cancelled && !error && count != null) setListingCount(count);
      } catch {
        /* ignore */
      }

      try {
        const { count, error } = await supabase
          .from("news_articles" as never)
          .select("id", { count: "exact", head: true });
        if (!cancelled && !error && count != null) setNewsCount(count);
        const lastVisit = localStorage.getItem("dsm_news_last_visit");
        if (lastVisit) {
          const { count: unread } = await supabase
            .from("news_articles" as never)
            .select("id", { count: "exact", head: true })
            .gt("fetched_at", lastVisit);
          if (!cancelled) setNewsUnread((unread ?? 0) > 0);
        } else if (!cancelled && (count ?? 0) > 0) {
          setNewsUnread(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);



  useEffect(() => {
    let cancelled = false;
    const headers = {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    };

    (async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/dsm_live_sessions?deleted_at=is.null&status=eq.upcoming&session_date=gte.${today}&order=session_date.asc&order=session_time.asc&limit=10&select=id,title,session_date,session_time,duration_minutes,is_live,max_spaces,spaces_taken,image_url`,
          { headers },
        );
        const data = (await res.json()) as LiveItem[];
        if (!cancelled && Array.isArray(data)) setLive(data);
      } catch {
        /* ignore */
      }
    })();



    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // DSM Live — latest session image
    supabase
      .from("live_sessions")
      .select("image_url")
      .not("image_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setLiveHero(data?.image_url ?? null));

    // DSM Reels — latest reel thumbnail
    supabase
      .from("reels")
      .select("thumbnail_url")
      .not("thumbnail_url", "is", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setReelsHero(data?.thumbnail_url ?? null));

    // Marketplace — latest listing image
    supabase
      .from("marketplace_listings")
      .select("image_urls")
      .not("image_urls", "is", null)
      .eq("is_active", true)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        const imgs = data?.image_urls;
        setMarketplaceHero(
          Array.isArray(imgs) && imgs.length > 0 ? imgs[0] : null,
        );
      });

    // Industry News — latest article image
    supabase
      .from("news_articles")
      .select("image_url")
      .not("image_url", "is", null)
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setNewsHero(data?.image_url ?? null));
  }, []);

  const liveSorted = [...live].sort((a, b) => {
    const la = isLiveNow(a) ? 1 : 0;
    const lb = isLiveNow(b) ? 1 : 0;
    if (la !== lb) return lb - la;
    return startMs(a.session_date, a.session_time) - startMs(b.session_date, b.session_time);
  });




  // Re-render each minute so "Starts in X min" and the live window stay accurate.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(id);
  }, []);






  const tileShell: React.CSSProperties = {
    background: "#fff",
    border: "0.5px solid #E4E8EF",
    borderRadius: 14,
    overflow: "hidden",
    cursor: "pointer",
    fontFamily: FONT,
  };

  const tileImageWrap: React.CSSProperties = { position: "relative", height: 100, overflow: "hidden" };
  const layerFill: React.CSSProperties = { position: "absolute", inset: 0 };
  const iconLayer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  const tileBadge: React.CSSProperties = {
    position: "absolute",
    top: 6,
    right: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    padding: "2px 6px",
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: "0.06em",
    color: "#FFFFFF",
  };

  const tileStat: React.CSSProperties = {
    position: "absolute",
    left: 8,
    bottom: 7,
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    fontSize: 9,
    fontWeight: 600,
    color: "rgba(255,255,255,0.72)",
  };

  const tileLabelWrap: React.CSSProperties = { padding: "9px 11px 11px" };
  const tileTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: NAVY };
  const tileSub: React.CSSProperties = { fontSize: 10, color: "#6B7686", marginTop: 1 };

  const newsPill: React.CSSProperties = {
    background: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    fontSize: 7,
    fontWeight: 700,
    color: "#FFFFFF",
    borderRadius: 20,
    padding: "2px 7px",
    lineHeight: 1.4,
  };

  return (
    <div style={{ margin: "0 -16px 0", padding: "0 16px 2px", borderRadius: 0, fontFamily: FONT }}>
      <div style={{ margin: "16px 0 10px" }}>
        <SectionHeader style={{ margin: 0 }}>Discover</SectionHeader>
      </div>

      <style>
        {`.dsm-discover-scroll::-webkit-scrollbar{display:none}@keyframes dsmLivePulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}.dsm-live-pulse{animation:dsmLivePulse 1.4s ease infinite}`}
      </style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10,
        }}
      >
        {/* TILE 1 — DSM Live */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/dsm-live" as never })}
          style={tileShell}
        >
          <div style={tileImageWrap}>
            {liveHero && (
              <img
                src={liveHero}
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}
            <div
              style={{
                ...layerFill,
                background: "linear-gradient(135deg,#1877D6,#0B1F3A)",
                opacity: liveHero ? 0.4 : 1,
              }}
            />
            <div style={{ ...layerFill, background: "rgba(0,0,0,0.3)" }} />
            <div style={iconLayer}>
              <IconRadio size={38} color="rgba(255,255,255,0.7)" stroke={1.6} />
            </div>
            {liveSorted.some((s) => isLiveNow(s)) && (
              <span style={{ ...tileBadge, background: RED }}>
                <span className="dsm-live-pulse" style={{ display: "inline-flex" }}>
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: "#FFFFFF",
                      display: "inline-block",
                    }}
                  />
                </span>
                LIVE
              </span>
            )}
          </div>
          <div style={tileLabelWrap}>
            <div style={tileTitle}>DSM Live</div>
            <div style={tileSub}>Events &amp; webinars</div>
          </div>
        </div>

        {/* TILE 2 — Bitesize */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/bitesize" as never })}
          style={tileShell}
        >
          <div style={tileImageWrap}>
            <div
              style={{
                ...layerFill,
                background: "linear-gradient(135deg,#7C3AED,#4F1D96)",
                opacity: 1,
              }}
            />
            <div style={{ ...layerFill, background: "rgba(0,0,0,0.3)" }} />
            <div style={iconLayer}>
              <IconBook size={38} color="rgba(255,255,255,0.7)" stroke={1.6} />
            </div>
            <span style={{ ...tileBadge, background: "rgba(255,255,255,0.2)" }}>CPD</span>
          </div>
          <div style={tileLabelWrap}>
            <div style={tileTitle}>Bitesize</div>
            <div style={tileSub}>Learn &amp; develop</div>
          </div>
        </div>

        {/* TILE 3 — DSM Reels */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/reels" as never })}
          style={tileShell}
        >
          <div style={tileImageWrap}>
            <div
              style={{ ...layerFill, background: "linear-gradient(135deg,#CC2229,#7C1D1D)" }}
            />
            <div style={{ ...layerFill, background: "rgba(0,0,0,0.3)" }} />
            <div style={iconLayer}>
              <IconPlayerPlay size={38} color="rgba(255,255,255,0.7)" stroke={1.6} />
            </div>
            <span style={{ ...tileBadge, background: "rgba(255,255,255,0.2)" }}>NEW</span>
            {reelCount != null && (
              <span style={tileStat}>
                <i className="ti ti-eye" style={{ fontSize: 9 }} />
                {reelCount} views
              </span>
            )}
          </div>
          <div style={tileLabelWrap}>
            <div style={tileTitle}>DSM Reels</div>
            <div style={tileSub}>Fun clips</div>
          </div>
        </div>

        {/* TILE 4 — Marketplace */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/marketplace" as never })}
          style={tileShell}
        >
          <div style={tileImageWrap}>
            <div
              style={{ ...layerFill, background: "linear-gradient(135deg,#15803D,#064E3B)" }}
            />
            <div style={{ ...layerFill, background: "rgba(0,0,0,0.3)" }} />
            <div style={iconLayer}>
              <IconShoppingBag size={38} color="rgba(255,255,255,0.7)" stroke={1.6} />
            </div>
            <span style={{ ...tileBadge, background: "rgba(255,255,255,0.2)" }}>SHOP</span>
            {listingCount != null && (
              <span style={tileStat}>
                <i className="ti ti-tag" style={{ fontSize: 9 }} />
                {listingCount} listings
              </span>
            )}
          </div>
          <div style={tileLabelWrap}>
            <div style={tileTitle}>Marketplace</div>
            <div style={tileSub}>Services &amp; deals</div>
          </div>
        </div>
      </div>

      {/* TILE 5 — Industry News (full width) */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => navigate({ to: "/news" as never })}
        style={{ ...tileShell, marginBottom: 16 }}
      >
        <div style={tileImageWrap}>
          <div style={{ ...layerFill, background: "linear-gradient(135deg,#0B1F3A,#1e3a5f)" }} />
          <div style={{ ...layerFill, background: "rgba(0,0,0,0.25)" }} />
          <div style={iconLayer}>
            <IconNews size={38} color="rgba(255,255,255,0.65)" stroke={1.6} />
          </div>
          <div
            style={{
              position: "absolute",
              top: 8,
              left: 8,
              display: "flex",
              gap: 4,
              alignItems: "center",
            }}
          >
            <span style={newsPill}>DVSA</span>
            <span style={newsPill}>DIA</span>
            <span style={newsPill}>+ 2 more</span>
          </div>
          {newsUnread && (
            <span
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: RED,
              }}
            />
          )}
          {newsCount != null && (
            <span style={{ ...tileStat, color: "rgba(255,255,255,0.6)" }}>
              <i className="ti ti-file-text" style={{ fontSize: 9 }} />
              {newsCount} articles
            </span>
          )}
        </div>
        <div
          style={{
            ...tileLabelWrap,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={tileTitle}>Industry News</div>
            <div style={tileSub}>DVSA · DIA · Intelligent Instructor</div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 16, color: "#E4E8EF" }} />
        </div>
      </div>



    </div>
  );
}

export default DiscoverSection;
