import { tokens } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconClock,
  IconExternalLink,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  CATEGORY_EMOJI,
  HEALTH_DISCLAIMER,
  LEARN_CATEGORIES,
  LEARN_LIBRARY,
  itemLink,
  searchLibrary,
  tedEmbedUrl,
  type LearnCategory,
  type LearnItem,
} from "@/lib/learnLibrary";
import { loadSaved, markSeen, toggleSaved } from "@/lib/learnSaved";

const NAVY = "#0B1F3A";
const BLUE = "#1877D6";
const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.06)";
const GRAY_BODY = "#6B7A90";
const FONT = "Poppins, sans-serif";

type Filter = LearnCategory | "All" | "Saved";

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "7px 14px",
        borderRadius: 999,
        border: active ? "none" : "0.5px solid #E2E6ED",
        background: active ? NAVY : "#FFFFFF",
        color: active ? "#FFFFFF" : NAVY,
        fontSize: 12.5,
        fontWeight: tokens.fontWeight.semibold,
        fontFamily: FONT,
        whiteSpace: "nowrap",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function ItemCard({
  item,
  saved,
  onOpen,
  onSave,
  wide,
}: {
  item: LearnItem;
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: wide ? 232 : undefined,
        flexShrink: wide ? 0 : undefined,
        background: tokens.white,
        borderRadius: tokens.radiusCard,
        boxShadow: CARD_SHADOW,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{
          textAlign: "left",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          fontFamily: FONT,
        }}
      >
        <div style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: BLUE, marginBottom: 4 }}>
          {CATEGORY_EMOJI[item.category]} {item.category}
        </div>
        <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: NAVY, lineHeight: 1.3 }}>
          {item.title}
        </div>
        <div style={{ fontSize: 12, color: GRAY_BODY, lineHeight: 1.35, marginTop: 3 }}>
          {item.blurb}
        </div>
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "auto" }}>
        <IconClock stroke={1.5} size={13} color={GRAY_BODY} />
        <span style={{ fontSize: 11.5, color: GRAY_BODY, flex: 1 }}>
          {item.minutes} min · {item.source}
        </span>
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? "Remove from saved" : "Save for later"}
          style={{ border: "none", background: "transparent", padding: 2, cursor: "pointer" }}
        >
          {saved ? (
            <IconBookmarkFilled size={17} color={BLUE} />
          ) : (
            <IconBookmark stroke={1.5} size={17} color={GRAY_BODY} />
          )}
        </button>
      </div>
    </div>
  );
}

function ItemSheet({
  item,
  saved,
  onSave,
  onClose,
}: {
  item: LearnItem;
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const link = itemLink(item);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(11,31,58,0.55)",
        display: "flex",
        alignItems: "flex-end",
        fontFamily: FONT,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          background: tokens.white,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "16px 16px calc(24px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: tokens.fontSize.sm, fontWeight: tokens.fontWeight.semibold, color: BLUE }}>
              {CATEGORY_EMOJI[item.category]} {item.category} · {item.minutes} min
            </div>
            <h3 style={{ fontSize: 17, fontWeight: tokens.fontWeight.bold, color: NAVY, margin: "4px 0 2px" }}>
              {item.title}
            </h3>
            <div style={{ fontSize: 12.5, color: GRAY_BODY }}>{item.source}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "#F1F4F9",
              cursor: "pointer",
            }}
          >
            <IconX stroke={1.5} size={18} color={NAVY} />
          </button>
        </div>

        {item.tedSlug && (
          <iframe
            src={tedEmbedUrl(item.tedSlug)}
            title={item.title}
            allow="autoplay; fullscreen; encrypted-media"
            allowFullScreen
            style={{
              width: "100%",
              aspectRatio: "16 / 9",
              border: "none",
              borderRadius: 8,
              marginTop: 14,
              background: "#000",
            }}
          />
        )}

        <p style={{ fontSize: 13.5, color: GRAY_BODY, lineHeight: 1.45, marginTop: 14 }}>
          {item.blurb}
        </p>

        {item.steps && (
          <ol style={{ margin: "10px 0 0", paddingLeft: 18 }}>
            {item.steps.map((s) => (
              <li
                key={s}
                style={{ fontSize: 13.5, color: NAVY, lineHeight: 1.5, marginBottom: 6 }}
              >
                {s}
              </li>
            ))}
          </ol>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onSave}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              border: "0.5px solid #E2E6ED",
              background: tokens.white,
              color: NAVY,
              fontSize: tokens.fontSize.md,
              fontWeight: tokens.fontWeight.semibold,
              fontFamily: FONT,
              cursor: "pointer",
            }}
          >
            {saved ? "Saved" : "Save for later"}
          </button>
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                flex: 1,
                height: 44,
                borderRadius: 12,
                background: BLUE,
                color: tokens.white,
                fontSize: tokens.fontSize.md,
                fontWeight: tokens.fontWeight.semibold,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                textDecoration: "none",
              }}
            >
              Open <IconExternalLink stroke={1.8} size={16} />
            </a>
          )}
        </div>

        {(item.category === "Health" || item.category === "Wellbeing" || item.category === "Mind") && (
          <p style={{ fontSize: tokens.fontSize.sm, color: GRAY_BODY, lineHeight: 1.4, marginTop: 12 }}>
            {HEALTH_DISCLAIMER}
          </p>
        )}
      </div>
    </div>
  );
}

export default function LearnLibrarySection() {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [saved, setSaved] = useState<string[]>([]);
  const [open, setOpen] = useState<LearnItem | null>(null);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  const handleSave = (id: string) => setSaved(toggleSaved(id));

  const openItem = (item: LearnItem) => {
    markSeen(item.id);
    setOpen(item);
  };

  const featured = useMemo(() => LEARN_LIBRARY.filter((i) => i.featured), []);
  const quick = useMemo(
    () =>
      LEARN_LIBRARY.filter((i) => i.minutes <= 10).sort((a, b) => a.minutes - b.minutes).slice(0, 10),
    [],
  );

  const list = useMemo(() => {
    let items = LEARN_LIBRARY;
    if (filter === "Saved") items = items.filter((i) => saved.includes(i.id));
    else if (filter !== "All") items = items.filter((i) => i.category === filter);
    return searchLibrary(items, query);
  }, [filter, query, saved]);

  return (
    <div style={{ marginTop: 24, fontFamily: FONT }}>
      <div style={{ padding: "0 16px 10px" }}>
        <div style={{ fontSize: 15, fontWeight: tokens.fontWeight.bold, color: NAVY }}>Wellbeing &amp; development</div>
        <div style={{ fontSize: 12.5, color: GRAY_BODY, marginTop: 2 }}>
          TED talks, short reads and 5-minute resets — for you, not just your pupils.
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "0 16px 10px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: tokens.white,
            borderRadius: 12,
            boxShadow: CARD_SHADOW,
            padding: "0 12px",
            height: 42,
          }}
        >
          <IconSearch stroke={1.5} size={17} color={GRAY_BODY} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search stress, sleep, motivation…"
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              fontSize: tokens.fontSize.md,
              color: NAVY,
              fontFamily: FONT,
              background: "transparent",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }}
            >
              <IconX stroke={1.5} size={16} color={GRAY_BODY} />
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "0 16px 12px",
          scrollbarWidth: "none",
        }}
      >
        <Chip label="All" active={filter === "All"} onClick={() => setFilter("All")} />
        {LEARN_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={`${CATEGORY_EMOJI[c]} ${c}`}
            active={filter === c}
            onClick={() => setFilter(c)}
          />
        ))}
        <Chip
          label={`🔖 Saved${saved.length ? ` (${saved.length})` : ""}`}
          active={filter === "Saved"}
          onClick={() => setFilter("Saved")}
        />
      </div>

      {filter === "All" && !query && (
        <>
          <div style={{ padding: "0 16px 8px", fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: NAVY }}>
            Featured
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              padding: "0 16px 16px",
              scrollbarWidth: "none",
            }}
          >
            {featured.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                wide
                saved={saved.includes(item.id)}
                onOpen={() => openItem(item)}
                onSave={() => handleSave(item.id)}
              />
            ))}
          </div>

          <div style={{ padding: "0 16px 8px", fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: NAVY }}>
            Your next 10 minutes
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              padding: "0 16px 16px",
              scrollbarWidth: "none",
            }}
          >
            {quick.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                wide
                saved={saved.includes(item.id)}
                onOpen={() => openItem(item)}
                onSave={() => handleSave(item.id)}
              />
            ))}
          </div>
        </>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          padding: "0 16px",
        }}
      >
        {list.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            saved={saved.includes(item.id)}
            onOpen={() => openItem(item)}
            onSave={() => handleSave(item.id)}
          />
        ))}
      </div>

      {list.length === 0 && (
        <div style={{ padding: "0 16px", fontSize: tokens.fontSize.base, color: GRAY_BODY }}>
          {filter === "Saved"
            ? "Nothing saved yet — tap the bookmark on any item."
            : "No results. Try a different search."}
        </div>
      )}

      <p style={{ fontSize: tokens.fontSize.sm, color: GRAY_BODY, lineHeight: 1.4, padding: "14px 16px 0" }}>
        {HEALTH_DISCLAIMER}
      </p>

      {open && (
        <ItemSheet
          item={open}
          saved={saved.includes(open.id)}
          onSave={() => handleSave(open.id)}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  );
}
