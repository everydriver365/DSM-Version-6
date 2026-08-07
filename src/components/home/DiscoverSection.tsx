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
  const [liveActive, setLiveActive] = useState(false);

  
  
  const [showcaseCount, setShowcaseCount] = useState<number | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [newsCount, setNewsCount] = useState<number | null>(null);
  const [newsUnread, setNewsUnread] = useState(false);

  const [liveHero, setLiveHero] = useState<string | null>(null);
  const [showcaseHero, setShowcaseHero] = useState<string | null>(null);
  const [marketplaceHero, setMarketplaceHero] = useState<string | null>(null);
  const [newsHero, setNewsHero] = useState<string | null>(null);
  const [latestNewsTitle, setLatestNewsTitle] = useState<string | null>(null);
  const [latestNewsSource, setLatestNewsSource] = useState<string | null>(null);
  const [latestNewsDate, setLatestNewsDate] = useState<string | null>(null);


  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Showcase view count (table may not exist yet)
      try {
        const { data, error } = await supabase.from("reels" as never).select("views");
        if (!cancelled && !error && Array.isArray(data)) {
          const total = (data as { views?: number | null }[]).reduce(
            (sum, r) => sum + (r.views ?? 0),
            0,
          );
          setShowcaseCount(total);
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
        if (!cancelled && Array.isArray(data)) {
          setLive(data);
          const now = new Date();
          const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          const isHighlighted = data.some((s) => {
            if (!s.session_date || !s.session_time) return false;
            const start = new Date(`${s.session_date}T${s.session_time}`);
            const end = new Date(start.getTime() + (s.duration_minutes ?? 60) * 60000);
            const isLive = now >= start && now <= end;
            const isSoon = start <= twoHoursFromNow && start >= now;
            return isLive || isSoon;
          });
          setLiveActive(isHighlighted);
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
    // DSM Live — latest session image
    supabase
      .from("dsm_live_sessions")
      .select("image_url")
      .not("image_url", "is", null)
      .is("deleted_at", null)
      .order("session_date", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setLiveHero(data?.image_url ?? null));

    // DSM Showcase — latest reel thumbnail
    supabase
      .from("reels")
      .select("thumbnail_url")
      .not("thumbnail_url", "is", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => setShowcaseHero(data?.thumbnail_url ?? null));

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
      .select("image_url, title, source, published_at")
      .not("image_url", "is", null)
      .eq("is_hidden", false)
      .order("published_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        setNewsHero(data?.image_url ?? null);
        setLatestNewsTitle(data?.title ?? null);
        setLatestNewsSource(data?.source ?? null);
        setLatestNewsDate(
          data?.published_at
            ? new Date(data.published_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : null,
        );
      });

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
    border: `0.5px solid ${HAIRLINE}`,
    borderRadius: 14,
    overflow: "hidden",
    cursor: "pointer",
    fontFamily: FONT,
  };

  const strip = (tint: string): React.CSSProperties => ({
    height: 46,
    background: tint,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px",
  });

  const stripPill = (accent: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 3,
    background: "#FFFFFF",
    color: accent,
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    borderRadius: 999,
    padding: "3px 7px",
    lineHeight: 1.2,
  });

  const tileLabelWrap: React.CSSProperties = { padding: "9px 12px 11px" };
  const tileTitle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: NAVY };
  const tileSub: React.CSSProperties = { fontSize: 10, color: "#6B7686", marginTop: 1 };
  const bodyRow: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 8,
  };


  return (
    <div style={{ margin: "0 -16px 0", padding: "0 16px 2px", borderRadius: 0, fontFamily: FONT }}>
      <div style={{ margin: "16px 0 10px" }}>
        <SectionHeader style={{ margin: 0 }}>Discover</SectionHeader>
      </div>

      <style>
        {`
          .dsm-discover-scroll::-webkit-scrollbar{display:none}
          @keyframes dsmLivePulse{0%{opacity:1}50%{opacity:.3}100%{opacity:1}}
          .dsm-live-pulse{animation:dsmLivePulse 1.4s ease infinite}
          @keyframes livePulse {
            0%, 100% { box-shadow: 0 0 0 3px rgba(204,34,41,0.15), 0 4px 16px rgba(204,34,41,0.2); }
            50% { box-shadow: 0 0 0 6px rgba(204,34,41,0.08), 0 4px 20px rgba(204,34,41,0.3); }
          }
          @keyframes dotPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          .dsm-live-dot-pulse { animation: dotPulse 1s ease-in-out infinite; }
        `}
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
          style={{
            ...tileShell,
            border: liveActive ? "2px solid #CC2229" : `0.5px solid ${HAIRLINE}`,
            boxShadow: liveActive
              ? "0 0 0 3px rgba(204,34,41,0.15), 0 4px 16px rgba(204,34,41,0.2)"
              : "none",
            animation: liveActive ? "livePulse 2s ease-in-out infinite" : "none",
          }}
        >
          <div style={strip("#D6E3F2")}>
            {liveActive ? (
              <span style={stripPill(RED)}>
                <span className="dsm-live-dot-pulse" style={{ display: "inline-flex" }}>
                  <span
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: RED,
                      display: "inline-block",
                    }}
                  />
                </span>
                Live
              </span>
            ) : (
              <span style={stripPill(BLUE)}>Live</span>
            )}
            <IconRadio size={20} color={BLUE} stroke={1.8} style={{ opacity: 0.55 }} />
          </div>
          <div style={tileLabelWrap}>
            <div style={bodyRow}>
              <div style={{ minWidth: 0 }}>
                <div style={tileTitle}>DSM Live</div>
                <div style={tileSub}>Events &amp; webinars</div>
              </div>
              <IconChevronRight size={14} color="#C7CEDA" stroke={2} />
            </div>
          </div>
        </div>

        {/* TILE 2 — Bitesize */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/bitesize" as never })}
          style={tileShell}
        >
          <div style={strip("#E5DDF7")}>
            <span style={stripPill("#7C3AED")}>CPD</span>
            <IconBook size={20} color="#7C3AED" stroke={1.8} style={{ opacity: 0.55 }} />
          </div>
          <div style={tileLabelWrap}>
            <div style={bodyRow}>
              <div style={{ minWidth: 0 }}>
                <div style={tileTitle}>Bitesize</div>
                <div style={tileSub}>Learn &amp; develop</div>
              </div>
              <IconChevronRight size={14} color="#C7CEDA" stroke={2} />
            </div>
          </div>
        </div>

        {/* TILE 3 — DSM Showcase */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/reels" as never })}
          style={tileShell}
        >
          <div style={strip("#F5DEDC")}>
            <span style={stripPill(RED)}>New</span>
            <IconPlayerPlay size={20} color={RED} stroke={1.8} style={{ opacity: 0.55 }} />
          </div>
          <div style={tileLabelWrap}>
            <div style={bodyRow}>
              <div style={{ minWidth: 0 }}>
                <div style={tileTitle}>DSM Showcase</div>
                <div style={tileSub}>
                  {showcaseCount != null ? `${showcaseCount} views` : "Fun clips"}
                </div>
              </div>
              <IconChevronRight size={14} color="#C7CEDA" stroke={2} />
            </div>
          </div>
        </div>

        {/* TILE 4 — Marketplace */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate({ to: "/marketplace" as never })}
          style={tileShell}
        >
          <div style={strip("#D9EDE3")}>
            <span style={stripPill(GREEN)}>Shop</span>
            <IconShoppingBag size={20} color={GREEN} stroke={1.8} style={{ opacity: 0.55 }} />
          </div>
          <div style={tileLabelWrap}>
            <div style={bodyRow}>
              <div style={{ minWidth: 0 }}>
                <div style={tileTitle}>Marketplace</div>
                <div style={tileSub}>
                  {listingCount != null ? `${listingCount} listings` : "Services & deals"}
                </div>
              </div>
              <IconChevronRight size={14} color="#C7CEDA" stroke={2} />
            </div>
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
        <div style={strip("#DDE0E6")}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
            <span style={stripPill(NAVY)}>DVSA</span>
            <span style={stripPill(NAVY)}>DIA</span>
            <span style={stripPill(NAVY)}>+ 2 more</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {newsUnread && (
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: RED,
                  display: "inline-block",
                }}
              />
            )}
            <IconNews size={20} color={NAVY} stroke={1.8} style={{ opacity: 0.55 }} />
          </div>
        </div>
        <div style={{ padding: "9px 12px 11px" }}>
          <div style={bodyRow}>
            <div style={{ minWidth: 0 }}>
              <div style={tileTitle}>Industry News</div>
              {latestNewsTitle && (
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: NAVY,
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    marginTop: 4,
                  }}
                >
                  {latestNewsTitle}
                </div>
              )}
              <div style={tileSub}>
                {latestNewsSource
                  ? `${latestNewsSource} · ${latestNewsDate ?? ""}`
                  : newsCount != null
                    ? `${newsCount} articles`
                    : "Latest updates"}
              </div>
            </div>
            <IconChevronRight size={14} color="#C7CEDA" stroke={2} />
          </div>
        </div>
      </div>




    </div>
  );
}

export default DiscoverSection;
