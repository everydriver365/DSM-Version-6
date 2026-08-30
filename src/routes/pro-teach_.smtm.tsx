import { createFileRoute, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import {
  IconArrowLeft,
  IconCheck,
  IconHandClick,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";

export const Route = createFileRoute("/pro-teach_/smtm")({
  head: () => ({
    meta: [
      { title: "Show Me Tell Me Flashcards — Every Driver Pro" },
      {
        name: "description",
        content:
          "Revise every official DVSA show me, tell me question with swipeable flashcards for driving lessons.",
      },
      { property: "og:title", content: "Show Me Tell Me Flashcards — Every Driver Pro" },
      {
        property: "og:description",
        content: "Swipeable DVSA show me, tell me flashcards for in-car revision.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SmtmPage,
});

const NAVY = "#0B2341";
const BLUE = "#2C97DE";
const MUTED = "#536579";
const BORDER = "#E4E8EF";

type SmtmQuestion = { id: string; type: "show" | "tell"; question: string; answer: string };

const SMTM_QUESTIONS: SmtmQuestion[] = [
  // SHOW ME questions
  {
    id: "sm1",
    type: "show",
    question: "Show me how you would check that the horn is working.",
    answer: "Switch on ignition (if required), press the horn.",
  },
  {
    id: "sm2",
    type: "show",
    question: "Show me how you would check the parking brake for excessive wear.",
    answer:
      "Apply the parking brake, it should secure itself and not feel loose. Limited movement before securing.",
  },
  {
    id: "sm3",
    type: "show",
    question: "Show me how you would check that the direction indicators are working.",
    answer: "Operate the indicator switch and check all lights are functioning.",
  },
  {
    id: "sm4",
    type: "show",
    question: "Show me how you would check the brake lights are working.",
    answer:
      "Apply footbrake, make use of reflections in garage doors, glass, with the help of another person, or use of a CCTV display.",
  },
  {
    id: "sm5",
    type: "show",
    question: "Show me how you would clean the windscreen using the washer and wipers.",
    answer: "Operate the wiper/washer control.",
  },
  {
    id: "sm6",
    type: "show",
    question: "Show me how you would set the rear demister.",
    answer: "Operate the rear demister control.",
  },
  {
    id: "sm7",
    type: "show",
    question: "Show me how you would switch your headlights from dipped to main beam.",
    answer: "Switch on dipped headlights, operate the main beam switch and explain the warning light.",
  },
  {
    id: "sm8",
    type: "show",
    question:
      "Show me how you would check the tyre pressure for this car using a tyre pressure gauge.",
    answer:
      "Identify the tyre pressure from the manufacturer's guide, connect the gauge to the valve and check the reading.",
  },
  {
    id: "sm9",
    type: "show",
    question: "Show me how you would check that the brake fluid is at the correct level.",
    answer: "Identify the reservoir and check that the level is between the min and max marks.",
  },
  {
    id: "sm10",
    type: "show",
    question: "Show me how you would check the engine coolant level is at the correct level.",
    answer: "Identify the reservoir and check that the level is between the min and max marks.",
  },
  {
    id: "sm11",
    type: "show",
    question: "Show me how you would check the engine oil level is at the correct level.",
    answer:
      "Identify the dipstick, wipe it clean, reinsert fully then remove and check between the min and max marks.",
  },
  {
    id: "sm12",
    type: "show",
    question:
      "Show me how you would check the power-assisted steering is working before starting a journey.",
    answer:
      "Apply gentle pressure to the steering wheel, start the engine and check that the steering does not become heavy.",
  },
  // TELL ME questions
  {
    id: "tm1",
    type: "tell",
    question: "Tell me how you would check that the brakes are working before starting a journey.",
    answer:
      "Brakes should not feel spongy or slack. Test them as you set off — they should be effective and not pulling to one side.",
  },
  {
    id: "tm2",
    type: "tell",
    question:
      "Tell me where you would find information about the recommended tyre pressures for this car and how tyre pressure should be checked.",
    answer: "From the manufacturer's guide. Use a tyre pressure gauge when tyres are cold.",
  },
  {
    id: "tm3",
    type: "tell",
    question:
      "Tell me how you make sure your head restraint is correctly adjusted so it provides the best protection in the event of a crash.",
    answer:
      "The head restraint should be adjusted so the rigid part is at least as high as the eye/top of ears and as close to the back of the head as possible.",
  },
  {
    id: "tm4",
    type: "tell",
    question: "Tell me how you would know if there was a problem with your anti-lock braking system.",
    answer:
      "The warning light should illuminate if there is a fault with the anti-lock braking system.",
  },
  {
    id: "tm5",
    type: "tell",
    question:
      "Tell me how you would check the tyres to ensure they have sufficient tread depth and that their general condition is safe to use on the road.",
    answer:
      "No cuts or bulges, 1.6mm of tread depth across the central three-quarters of the breadth of the tyre and around the entire outer circumference.",
  },
  {
    id: "tm6",
    type: "tell",
    question: "Tell me how you would check that the headlights and tail lights are working.",
    answer:
      "Operate the switch (turn on engine if required), walk round the vehicle, check all lights are functioning.",
  },
  {
    id: "tm7",
    type: "tell",
    question: "Tell me how you would check the direction indicators are working.",
    answer:
      "Operate the indicator switch, walk round the vehicle, check all indicators are functioning.",
  },
  {
    id: "tm8",
    type: "tell",
    question: "Tell me how you would check the windscreen washer fluid is at the correct level.",
    answer: "Identify the reservoir and check the fluid level against the markings.",
  },
  {
    id: "tm9",
    type: "tell",
    question: "Tell me how you would check that the windscreen washers are working.",
    answer: "Operate the control to check the jets operate correctly.",
  },
  {
    id: "tm10",
    type: "tell",
    question: "Tell me how you would check the parking brake for excessive wear.",
    answer:
      "Apply the parking brake, demonstrate that when applied it secures itself and is not at the end of the working travel.",
  },
  {
    id: "tm11",
    type: "tell",
    question:
      "Tell me how you would switch your headlights from dipped to main beam and explain how you would know the main beam is on.",
    answer: "Operate the main beam switch, check the blue main beam warning light is on.",
  },
  {
    id: "tm12",
    type: "tell",
    question: "Tell me how you would check the engine has sufficient oil.",
    answer:
      "Identify the dipstick, wipe it clean, reinsert and remove to check level is between min and max marks.",
  },
];

const FILTERS: { key: "all" | "show" | "tell" | "missed"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "show", label: "Show me" },
  { key: "tell", label: "Tell me" },
  { key: "missed", label: "Missed" },
];

function SmtmPage() {
  const navigate = useNavigate();

  const [deck, setDeck] = React.useState<SmtmQuestion[]>(SMTM_QUESTIONS);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [filter, setFilter] = React.useState<"all" | "show" | "tell" | "missed">("all");
  const [showAnswer, setShowAnswer] = React.useState(false);
  const [missed, setMissed] = React.useState<string[]>([]);
  const [correct, setCorrect] = React.useState<string[]>([]);

  const filtered = React.useMemo(
    () =>
      deck.filter((q) => {
        if (filter === "show") return q.type === "show";
        if (filter === "tell") return q.type === "tell";
        if (filter === "missed") return missed.includes(q.id);
        return true;
      }),
    [deck, filter, missed],
  );

  const total = filtered.length;
  const safeIndex = total === 0 ? 0 : Math.min(currentIndex, total - 1);
  const card = filtered[safeIndex];

  // reset the reveal whenever the visible card changes
  React.useEffect(() => {
    setShowAnswer(false);
  }, [safeIndex, filter, deck]);

  const next = () => setCurrentIndex((i) => (total === 0 ? 0 : (i + 1) % total));
  const prev = () => setCurrentIndex((i) => (total === 0 ? 0 : (i - 1 + total) % total));

  const markMissed = () => {
    if (!card) return;
    setMissed((m) => (m.includes(card.id) ? m : [...m, card.id]));
    setCorrect((c) => c.filter((id) => id !== card.id));
    next();
  };

  const markCorrect = () => {
    if (!card) return;
    setCorrect((c) => (c.includes(card.id) ? c : [...c, card.id]));
    setMissed((m) => m.filter((id) => id !== card.id));
    next();
  };

  const shuffle = () => {
    const copy = [...deck];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setDeck(copy);
    setCurrentIndex(0);
  };

  // swipe detection
  const touchStartX = React.useRef(0);
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) next();
      else prev();
    }
  };

  const isShow = card?.type === "show";

  return (
    <div style={{ minHeight: "100%", background: "#F4F6F8", paddingBottom: 24 }}>
      {/* header */}
      <div
        style={{
          background: NAVY,
          padding: "10px 12px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/pro-teach" as never })}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            border: "none",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconArrowLeft size={18} color="#fff" />
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Show Me Tell Me</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>
            Card {total === 0 ? 0 : safeIndex + 1} of {total}
          </div>
        </div>
        <button
          type="button"
          aria-label="Shuffle deck"
          onClick={shuffle}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            border: "none",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <IconRefresh size={18} color="#fff" />
        </button>
      </div>

      {/* progress */}
      <div style={{ height: 4, background: BORDER }}>
        <div
          style={{
            height: 4,
            width: `${total === 0 ? 0 : ((safeIndex + 1) / total) * 100}%`,
            background: BLUE,
            borderRadius: "0 2px 2px 0",
            transition: "width 0.2s ease",
          }}
        />
      </div>

      {/* filter pills */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "10px 16px",
          overflowX: "auto",
        }}
      >
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setFilter(key);
                setCurrentIndex(0);
              }}
              style={{
                flexShrink: 0,
                border: "none",
                borderRadius: 20,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                background: active ? NAVY : "#EAF5FC",
                color: active ? "#fff" : BLUE,
              }}
            >
              {label}
              {key === "missed" && missed.length > 0 ? ` (${missed.length})` : ""}
            </button>
          );
        })}
      </div>

      {/* flashcard */}
      {card ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => setShowAnswer((v) => !v)}
          onKeyDown={(e) => e.key === "Enter" && setShowAnswer((v) => !v)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          style={{
            margin: "0 16px 16px",
            background: "linear-gradient(135deg, #F4F6F8, #EAF5FC)",
            borderRadius: 16,
            border: showAnswer ? "2px solid #16A34A" : `1px solid ${BORDER}`,
            padding: 24,
            minHeight: 180,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.2s ease",
          }}
        >
          <span
            style={{
              background: isShow ? "#FEF3C7" : "#EAF5FC",
              color: isShow ? "#F59E0B" : BLUE,
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderRadius: 10,
              padding: "4px 12px",
              marginBottom: 16,
            }}
          >
            {isShow ? "Show me" : "Tell me"}
          </span>
          <div style={{ fontSize: 16, fontWeight: 700, color: NAVY, lineHeight: 1.4, marginBottom: 12 }}>
            {card.question}
          </div>
          {showAnswer ? (
            <div
              style={{
                fontSize: 14,
                color: MUTED,
                lineHeight: 1.5,
                animation: "smtmFade 0.25s ease",
              }}
            >
              {card.answer}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: MUTED,
              }}
            >
              <IconHandClick size={14} color={MUTED} />
              Tap to reveal answer
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            margin: "0 16px 16px",
            background: "#fff",
            borderRadius: 16,
            border: `1px solid ${BORDER}`,
            padding: 24,
            textAlign: "center",
            fontSize: 13,
            color: MUTED,
          }}
        >
          {filter === "missed"
            ? "No missed cards yet — nice work."
            : "No cards in this filter."}
        </div>
      )}

      {/* action buttons */}
      <div style={{ display: "flex", gap: 10, padding: "0 16px 16px" }}>
        <button
          type="button"
          onClick={markMissed}
          disabled={!card}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 12,
            border: "none",
            background: "#FEE2E2",
            color: "#E53935",
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: card ? "pointer" : "default",
            opacity: card ? 1 : 0.5,
          }}
        >
          <IconX size={16} /> Missed
        </button>
        <button
          type="button"
          onClick={markCorrect}
          disabled={!card}
          style={{
            flex: 1,
            height: 44,
            borderRadius: 12,
            border: "none",
            background: "#DCFCE7",
            color: "#16A34A",
            fontSize: 14,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: card ? "pointer" : "default",
            opacity: card ? 1 : 0.5,
          }}
        >
          <IconCheck size={16} /> Got it
        </button>
      </div>

      {/* navigation */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "0 16px 16px",
        }}
      >
        <button
          type="button"
          onClick={prev}
          style={{
            background: "#F4F6F8",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "8px 16px",
            fontSize: 13,
            color: MUTED,
            cursor: "pointer",
          }}
        >
          ← Previous
        </button>
        <div style={{ fontSize: 12, color: MUTED }}>Swipe to navigate</div>
        <button
          type="button"
          onClick={next}
          style={{
            background: NAVY,
            border: "none",
            borderRadius: 10,
            padding: "8px 16px",
            fontSize: 13,
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Next →
        </button>
      </div>

      <div style={{ padding: "0 16px", fontSize: 11, color: MUTED, textAlign: "center" }}>
        {correct.length} correct · {missed.length} missed
      </div>

      <style>{`@keyframes smtmFade { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }`}</style>
    </div>
  );
}
