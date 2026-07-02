import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, X, ChevronLeft, ChevronRight, BadgeCheck } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/i/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Driving Instructor — ${params.slug} | EveryDriver` },
      {
        name: "description",
        content: "Book driving lessons with a DVSA-approved instructor on EveryDriver.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&family=Inter:wght@400;600;700&family=Playfair+Display:wght@400;600;700&display=swap",
      },
    ],
  }),
  component: InstructorMiniSite,
});

type Theme = "classic" | "modern" | "warm" | "bold";
type Font = "poppins" | "inter" | "playfair";
type HeaderStyle = "standard" | "centered" | "split";

type Instructor = {
  id: string;
  full_name: string | null;
  app_slug: string;
  website_published: boolean;
  website_theme: Theme | null;
  website_font: Font | null;
  website_header_style: HeaderStyle | null;
  website_hero_image_url: string | null;
  website_bio: string | null;
  website_gallery_urls: string[] | null;
  brand_colour: string | null;
  profile_image_url: string | null;
};

type Course = {
  id: string;
  course_type: string;
  name: string;
  total_hours: number;
  price: number;
  start_date: string | null;
};

type Review = {
  id: string;
  pupil_name: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
};

const THEMES: Record<Theme, { bg: string; primary: string; accent: string; surface: string; muted: string; border: string; isDark: boolean }> = {
  classic: { bg: "#FFFFFF", primary: "#0B1F3A", accent: "#1877D6", surface: "#F8FAFC", muted: "#475569", border: "#E2E8F0", isDark: false },
  modern: { bg: "#0A0A0A", primary: "#FFFFFF", accent: "#6366F1", surface: "#171717", muted: "#A3A3A3", border: "#262626", isDark: true },
  warm: { bg: "#FFF8F0", primary: "#7C2D12", accent: "#EA580C", surface: "#FFEDD5", muted: "#78350F", border: "#FED7AA", isDark: false },
  bold: { bg: "#0A0A0A", primary: "#DC2626", accent: "#FFFFFF", surface: "#171717", muted: "#A3A3A3", border: "#262626", isDark: true },
};

const FONT_FAMILY: Record<Font, string> = {
  poppins: "'Inter', sans-serif",
  inter: "'Inter', sans-serif",
  playfair: "'Playfair Display', serif",
};

function InstructorMiniSite() {
  const { slug } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: inst } = await supabase
        .from("instructors")
        .select("*")
        .eq("app_slug", slug)
        .eq("website_published", true)
        .maybeSingle();

      if (!alive) return;
      if (!inst) {
        setInstructor(null);
        setLoading(false);
        return;
      }
      setInstructor(inst as Instructor);

      const [{ data: courseRows }, { data: reviewRows }] = await Promise.all([
        supabase
          .from("instructor_courses")
          .select("id, course_type, name, total_hours, price, start_date")
          .eq("instructor_id", inst.id)
          .eq("publish_marketplace", true)
          .eq("status", "active")
          .order("start_date", { ascending: true })
          .limit(6),
        supabase
          .from("reviews")
          .select("id, pupil_name, rating, review_text, created_at")
          .eq("instructor_id", inst.id)
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (!alive) return;
      setCourses((courseRows ?? []) as Course[]);
      setReviews((reviewRows ?? []) as Review[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FFFFFF", color: "#0B1F3A", fontFamily: "system-ui" }}>
        Loading…
      </div>
    );
  }

  if (!instructor) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FFFFFF", color: "#0B1F3A", fontFamily: "system-ui", padding: 24, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>This page isn't available</h1>
          <p style={{ color: "#475569", marginBottom: 20 }}>
            The instructor page you're looking for doesn't exist or isn't published.
          </p>
          <Link to="/courses" style={{ color: "#1877D6", fontWeight: 600, textDecoration: "underline" }}>
            Browse all courses →
          </Link>
        </div>
      </div>
    );
  }

  const theme = THEMES[instructor.website_theme ?? "classic"];
  const font = FONT_FAMILY[instructor.website_font ?? "poppins"];
  const headerStyle: HeaderStyle = instructor.website_header_style ?? "standard";
  const accent = instructor.brand_colour || theme.accent;
  const name = instructor.full_name || "Driving Instructor";
  const gallery = (instructor.website_gallery_urls ?? []).filter(Boolean);
  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;
  const bookHref = `/courses?instructor=${instructor.id}`;

  const btnPrimary: React.CSSProperties = {
    display: "inline-block",
    padding: "14px 28px",
    borderRadius: 10,
    background: accent,
    color: theme.isDark && accent === "#FFFFFF" ? "#000" : "#FFFFFF",
    fontWeight: 600,
    textDecoration: "none",
    fontSize: 16,
    border: "none",
    cursor: "pointer",
  };

  return (
    <div style={{ background: theme.bg, color: theme.primary, fontFamily: font, minHeight: "100vh" }}>
      {/* HERO */}
      {headerStyle === "standard" && (
        <section
          style={{
            position: "relative",
            minHeight: 520,
            background: instructor.website_hero_image_url
              ? `url(${instructor.website_hero_image_url}) center/cover`
              : `linear-gradient(135deg, ${accent}, ${theme.primary})`,
            display: "flex",
            alignItems: "flex-end",
            padding: 32,
          }}
        >
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0.1))" }} />
          <div style={{ position: "relative", color: "#FFFFFF", maxWidth: 800 }}>
            <Badge accent={accent} />
            <h1 style={{ fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 700, margin: "12px 0 8px", lineHeight: 1.1 }}>{name}</h1>
            {avgRating > 0 && <Rating value={avgRating} count={reviews.length} color="#FFFFFF" />}
            <div style={{ marginTop: 20 }}>
              <a href={bookHref} style={btnPrimary}>Book a lesson</a>
            </div>
          </div>
        </section>
      )}

      {headerStyle === "centered" && (
        <section style={{ padding: "64px 24px 48px", textAlign: "center", background: theme.surface }}>
          {instructor.profile_image_url || instructor.website_hero_image_url ? (
            <img
              src={instructor.profile_image_url || instructor.website_hero_image_url || ""}
              alt={name}
              style={{ width: 160, height: 160, borderRadius: "50%", objectFit: "cover", margin: "0 auto 20px", border: `4px solid ${accent}` }}
            />
          ) : null}
          <Badge accent={accent} />
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, margin: "12px 0 8px" }}>{name}</h1>
          {avgRating > 0 && (
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Rating value={avgRating} count={reviews.length} color={theme.primary} />
            </div>
          )}
          <div style={{ marginTop: 24 }}>
            <a href={bookHref} style={btnPrimary}>Book a lesson</a>
          </div>
        </section>
      )}

      {headerStyle === "split" && (
        <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: 480 }}>
          <div
            style={{
              background: instructor.website_hero_image_url
                ? `url(${instructor.website_hero_image_url}) center/cover`
                : `linear-gradient(135deg, ${accent}, ${theme.primary})`,
              minHeight: 320,
            }}
          />
          <div style={{ padding: 40, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <Badge accent={accent} />
            <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 700, margin: "12px 0 8px" }}>{name}</h1>
            {avgRating > 0 && <Rating value={avgRating} count={reviews.length} color={theme.primary} />}
            <div style={{ marginTop: 24 }}>
              <a href={bookHref} style={btnPrimary}>Book a lesson</a>
            </div>
          </div>
        </section>
      )}

      {/* ABOUT */}
      {instructor.website_bio && (
        <Section theme={theme}>
          <h2 style={h2Style}>About me</h2>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: theme.muted, whiteSpace: "pre-wrap" }}>
            {instructor.website_bio}
          </p>
        </Section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <Section theme={theme} alt>
          <h2 style={h2Style}>Gallery</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            {gallery.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightbox(i)}
                style={{
                  padding: 0,
                  border: "none",
                  borderRadius: 12,
                  overflow: "hidden",
                  cursor: "pointer",
                  aspectRatio: "1 / 1",
                  background: theme.surface,
                }}
              >
                <img src={url} alt={`Gallery ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* COURSES */}
      {courses.length > 0 && (
        <Section theme={theme}>
          <h2 style={h2Style}>Courses offered</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {courses.map((c) => (
              <div
                key={c.id}
                style={{
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {c.course_type}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, margin: "6px 0 12px", color: theme.primary }}>{c.name}</div>
                <div style={{ fontSize: 14, color: theme.muted, marginBottom: 4 }}>{c.total_hours} hours</div>
                {c.start_date && (
                  <div style={{ fontSize: 14, color: theme.muted, marginBottom: 10 }}>
                    Starts {new Date(c.start_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </div>
                )}
                <div style={{ fontSize: 22, fontWeight: 700, color: theme.primary }}>£{Number(c.price).toFixed(0)}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <a href={bookHref} style={{ color: accent, fontWeight: 600, textDecoration: "underline" }}>
              View all courses →
            </a>
          </div>
        </Section>
      )}

      {/* REVIEWS */}
      {reviews.length > 0 && (
        <Section theme={theme} alt>
          <h2 style={h2Style}>What pupils say</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  background: theme.bg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 14,
                  padding: 20,
                }}
              >
                <Rating value={r.rating} color={accent} />
                {r.review_text && (
                  <p style={{ fontSize: 15, lineHeight: 1.6, color: theme.muted, margin: "10px 0" }}>
                    "{r.review_text}"
                  </p>
                )}
                {r.pupil_name && (
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.primary }}>— {r.pupil_name}</div>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* CTA */}
      <section style={{ padding: "64px 24px", textAlign: "center", background: theme.surface }}>
        <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, marginBottom: 12, color: theme.primary }}>
          Ready to start driving?
        </h2>
        <p style={{ fontSize: 17, color: theme.muted, marginBottom: 24 }}>
          Book your first lesson with {name.split(" ")[0]} today.
        </p>
        <a href={bookHref} style={btnPrimary}>Book your first lesson</a>
        <div style={{ marginTop: 40, fontSize: 13, color: theme.muted }}>
          Powered by{" "}
          <a href="/" style={{ color: accent, textDecoration: "underline" }}>
            EveryDriver
          </a>
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox !== null && gallery[lightbox] && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <button
            aria-label="Close"
            onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
          >
            <X size={32} />
          </button>
          {lightbox > 0 && (
            <button
              aria-label="Previous"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox - 1); }}
              style={{ position: "absolute", left: 16, background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
            >
              <ChevronLeft size={40} />
            </button>
          )}
          {lightbox < gallery.length - 1 && (
            <button
              aria-label="Next"
              onClick={(e) => { e.stopPropagation(); setLightbox(lightbox + 1); }}
              style={{ position: "absolute", right: 16, background: "transparent", border: "none", color: "#fff", cursor: "pointer" }}
            >
              <ChevronRight size={40} />
            </button>
          )}
          <img
            src={gallery[lightbox]}
            alt={`Gallery ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
}

const h2Style: React.CSSProperties = {
  fontSize: "clamp(24px, 3vw, 32px)",
  fontWeight: 700,
  marginBottom: 20,
};

function Section({ children, theme, alt = false }: { children: React.ReactNode; theme: typeof THEMES[Theme]; alt?: boolean }) {
  return (
    <section style={{ padding: "56px 24px", background: alt ? theme.surface : theme.bg }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>{children}</div>
    </section>
  );
}

function Badge({ accent }: { accent: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: accent,
        color: "#FFFFFF",
        padding: "6px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: 0.3,
      }}
    >
      <BadgeCheck size={14} />
      DVSA Approved Instructor
    </span>
  );
}

function Rating({ value, count, color }: { value: number; count?: number; color: string }) {
  const full = Math.round(value);
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={18} fill={i <= full ? color : "none"} stroke={color} />
      ))}
      <span style={{ fontSize: 14, fontWeight: 600 }}>
        {value.toFixed(1)}
        {count !== undefined && ` (${count})`}
      </span>
    </div>
  );
}
