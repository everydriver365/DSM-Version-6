import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  IconArrowLeft,
  IconBrain,
  IconCheck,
  IconFlag,
  IconMicrophone,
} from "@tabler/icons-react";
import { useVoiceAssistant } from "@/hooks/useVoiceAssistant";
import { tokens } from "@/lib/tokens";

export const Route = createFileRoute("/ed-settings")({
  head: () => ({
    meta: [
      { title: "ED Settings — EDP by EveryDriver" },
      { name: "description", content: "Configure your ED voice assistant." },
    ],
  }),
  component: EDSettingsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

function EDSettingsPage() {
  const navigate = useNavigate();
  const { availableVoices, selectedVoiceName, setVoice, speak } = useVoiceAssistant({});
  const [aiLimit, setAiLimit] = useState<{ date: string; count: number } | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const stored = localStorage.getItem("ed_ai_limit");
      if (!stored) {
        setAiLimit({ date: today, count: 0 });
      } else {
        const parsed = JSON.parse(stored);
        setAiLimit(parsed.date === today ? parsed : { date: today, count: 0 });
      }
    } catch {
      setAiLimit({ date: today, count: 0 });
    }
  }, []);

  const ukVoices = useMemo(
    () => availableVoices.filter((v) => v.lang === "en-GB" || v.lang.toLowerCase().includes("gb")),
    [availableVoices],
  );
  const usVoices = useMemo(
    () => availableVoices.filter((v) => v.lang === "en-US" || v.lang.toLowerCase().includes("us")),
    [availableVoices],
  );

  const isPremium = (name: string) =>
    ["Samantha", "Daniel", "Kate", "Serena", "Martha", "Arthur"].includes(name);

  const handleTestED = () => {
    (window as any).__edVoice?.activate?.();
  };

  return (
    <div style={{ ...POPPINS, minHeight: "100vh", background: "#F4F6F8", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div
        style={{
          background: "#0B2341",
          padding: "16px",
          paddingTop: "env(safe-area-inset-top, 16px)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <button
          type="button"
          onClick={() => navigate({ to: "/settings" })}
          style={{
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
          }}
        >
          <IconArrowLeft size={24} color="#fff" />
        </button>
        <div>
          <div
            style={{
              color: "#fff",
              fontSize: 18,
              fontWeight: tokens.fontWeight.bold,
              ...POPPINS,
            }}
          >
            ED Settings
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              ...POPPINS,
            }}
          >
            Voice assistant
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* About ED */}
        <div
          style={{
            background: tokens.white,
            borderRadius: 12,
            border: "1px solid #E4E8EF",
            padding: 16,
            display: "flex",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              minWidth: 48,
              minHeight: 48,
              borderRadius: "50%",
              background: "#0B2341",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              ...POPPINS,
            }}
          >
            <span style={{ color: "#fff", fontSize: 16, fontWeight: tokens.fontWeight.bold }}>ED</span>
          </div>
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: tokens.fontWeight.bold,
                color: "#0B2341",
                ...POPPINS,
              }}
            >
              ED — Your driving assistant
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#536579",
                marginTop: 4,
                ...POPPINS,
              }}
            >
              Tap the microphone or say Hey ED to activate hands-free.
            </div>
          </div>
        </div>

        {/* Voice selection */}
        <div
          style={{
            background: tokens.white,
            borderRadius: 12,
            border: "1px solid #E4E8EF",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid #F4F6F8",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <IconMicrophone size={20} color="#2C97DE" />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: tokens.fontWeight.bold,
                  color: "#0B2341",
                  ...POPPINS,
                }}
              >
                ED Voice
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#536579",
                  ...POPPINS,
                }}
              >
                Choose how ED sounds
              </div>
            </div>
          </div>

          {/* Note */}
          <div
            style={{
              padding: "10px 16px",
              background: "#EAF5FC",
              borderBottom: "1px solid #E4E8EF",
              fontSize: 12,
              color: "#2C97DE",
              ...POPPINS,
            }}
          >
            For the best voice download Daniel in iPhone Settings → Accessibility → Spoken Content → Voices → English (UK)
          </div>

          {/* Default row */}
          <button
            type="button"
            onClick={() => setVoice(null)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              background: "transparent",
              border: "none",
              borderBottom: availableVoices.length > 0 ? "1px solid #F4F6F8" : "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "#EAF5FC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <IconMicrophone size={16} color="#2C97DE" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#0B2341",
                  ...POPPINS,
                }}
              >
                Default (recommended)
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "#536579",
                  ...POPPINS,
                }}
              >
                Best available voice
              </div>
            </div>
            {selectedVoiceName === null && <IconCheck size={20} color="#16A34A" />}
          </button>

          {/* UK English voices */}
          {ukVoices.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#536579",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  padding: "10px 16px 4px",
                  background: "#F9FBFD",
                  ...POPPINS,
                }}
              >
                UK English
              </div>
              {ukVoices.map((voice, idx) => {
                const selected = selectedVoiceName === voice.name;
                const premium = isPremium(voice.name);
                return (
                  <button
                    key={`uk-${voice.name}-${idx}`}
                    type="button"
                    onClick={() => setVoice(voice.name)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      borderBottom: idx < ukVoices.length - 1 ? "1px solid #F4F6F8" : "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "#EAF5FC",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconFlag size={16} color="#2C97DE" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#0B2341",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          ...POPPINS,
                        }}
                      >
                        {voice.name}
                        {premium && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: tokens.fontWeight.bold,
                              color: "#1877D6",
                              background: "#E7F1FC",
                              borderRadius: 4,
                              padding: "1px 5px",
                              ...POPPINS,
                            }}
                          >
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#536579",
                          ...POPPINS,
                        }}
                      >
                        UK English
                      </div>
                    </div>
                    {selected ? (
                      <IconCheck size={20} color="#16A34A" />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speak("Hi, I'm ED. How can I help?", false);
                        }}
                        style={{
                          background: "#EAF5FC",
                          color: "#2C97DE",
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 20,
                          border: "none",
                          cursor: "pointer",
                          ...POPPINS,
                        }}
                      >
                        Preview
                      </button>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {/* US English voices */}
          {usVoices.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#536579",
                  textTransform: "uppercase",
                  letterSpacing: "0.6px",
                  padding: "10px 16px 4px",
                  background: "#F9FBFD",
                  ...POPPINS,
                }}
              >
                US English
              </div>
              {usVoices.map((voice, idx) => {
                const selected = selectedVoiceName === voice.name;
                const premium = isPremium(voice.name);
                return (
                  <button
                    key={`us-${voice.name}-${idx}`}
                    type="button"
                    onClick={() => setVoice(voice.name)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 16px",
                      background: "transparent",
                      border: "none",
                      borderBottom: idx < usVoices.length - 1 ? "1px solid #F4F6F8" : "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "#FEF3C7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <IconFlag size={16} color="#F59E0B" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: "#0B2341",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          ...POPPINS,
                        }}
                      >
                        {voice.name}
                        {premium && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: tokens.fontWeight.bold,
                              color: "#1877D6",
                              background: "#E7F1FC",
                              borderRadius: 4,
                              padding: "1px 5px",
                              ...POPPINS,
                            }}
                          >
                            PREMIUM
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "#536579",
                          ...POPPINS,
                        }}
                      >
                        US English
                      </div>
                    </div>
                    {selected ? (
                      <IconCheck size={20} color="#16A34A" />
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          speak("Hi, I'm ED. How can I help?", false);
                        }}
                        style={{
                          background: "#EAF5FC",
                          color: "#2C97DE",
                          fontSize: 11,
                          padding: "3px 10px",
                          borderRadius: 20,
                          border: "none",
                          cursor: "pointer",
                          ...POPPINS,
                        }}
                      >
                        Preview
                      </button>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Daily limit */}
        <div
          style={{
            background: tokens.white,
            borderRadius: 12,
            border: "1px solid #E4E8EF",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#EDE9FE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconBrain size={18} color="#7B61FF" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: tokens.fontWeight.bold,
                color: "#0B2341",
                ...POPPINS,
              }}
            >
              AI Questions
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#536579",
                ...POPPINS,
              }}
            >
              Daily question limit
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#536579",
              ...POPPINS,
            }}
          >
            {aiLimit ? `${aiLimit.count} / 20 today` : "— / 20 today"}
          </div>
        </div>

        {/* Test button */}
        <div
          style={{
            background: tokens.white,
            borderRadius: 12,
            border: "1px solid #E4E8EF",
            padding: 16,
          }}
        >
          <button
            type="button"
            onClick={handleTestED}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 12,
              background: "#0B2341",
              color: "#fff",
              fontSize: 15,
              fontWeight: tokens.fontWeight.bold,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              ...POPPINS,
            }}
          >
            <IconMicrophone size={18} color="#fff" />
            Test ED
          </button>
        </div>
      </div>
    </div>
  );
}
