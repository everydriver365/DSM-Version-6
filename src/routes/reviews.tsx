import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { Card } from "../components/dsm/Card";
import { SectionHeader } from "../components/dsm/SectionHeader";
import { supabase } from "../lib/supabaseClient";

export const Route = createFileRoute("/reviews")({
  head: () => ({
    meta: [{ title: "Reviews — DSM by EveryDriver" }],
  }),
  component: ReviewsPage,
});

const POPPINS = { fontFamily: "Poppins, sans-serif" } as const;

interface Review {
  id: string;
  pupil_id: string | null;
  pupil_name: string | null;
  rating: number;
  review_text: string | null;
  created_at: string;
  pupils: { name: string } | null;
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center" style={{ gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(rating);
        return (
          <Star
            key={i}
            size={size}
            color={filled ? "#F59E0B" : "#E2E6ED"}
            fill={filled ? "#F59E0B" : "#E2E6ED"}
          />
        );
      })}
    </div>
  );
}

function ReviewsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) setUserId(data.user.id);
    })();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("id, pupil_id, pupil_name, rating, review_text, created_at, pupils(name)")
        .eq("instructor_id", userId)
        .order("created_at", { ascending: false });
      if (error) console.error("[reviews] fetch error", error);
      setReviews((data ?? []) as unknown as Review[]);
    })();
  }, [userId]);

  const count = reviews.length;
  const average = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  return (
    <div className="min-h-screen bg-white pb-8" style={POPPINS}>
      {/* Top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between px-2"
        style={{ height: 52, backgroundColor: "#0F2044" }}
      >
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/home" })}
          className="flex items-center justify-center"
          style={{ width: 40, height: 40 }}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </button>
        <div className="flex-1 text-center text-[15px] font-semibold text-white" style={POPPINS}>
          Reviews
        </div>
        <div style={{ width: 40, height: 40 }} />
      </div>

      {/* Summary card */}
      <div
        className="mx-4 mt-3 flex flex-col items-center"
        style={{ backgroundColor: "#0F2044", borderRadius: 12, padding: 16 }}
      >
        <div className="text-white font-bold" style={{ fontSize: 36, lineHeight: 1, ...POPPINS }}>
          {count > 0 ? average.toFixed(1) : "—"}
        </div>
        <div className="mt-2">
          <Stars rating={average} size={20} />
        </div>
        <div className="mt-1 text-[13px]" style={{ color: "#9CA3AF", ...POPPINS }}>
          {count} {count === 1 ? "review" : "reviews"}
        </div>
      </div>

      <div className="px-4">
        <SectionHeader>RECENT REVIEWS</SectionHeader>
        {reviews.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center text-[13px]"
            style={{ color: "#6B7280", padding: "24px 0" }}
          >
            <Star size={24} color="#6B7280" />
            <div className="mt-2">No reviews yet</div>
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {reviews.map((r) => {
              const name = r.pupils?.name ?? r.pupil_name ?? "Anonymous";
              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between" style={{ gap: 8 }}>
                    <div className="text-[14px] font-semibold truncate" style={{ color: "#0F2044", ...POPPINS }}>
                      {name}
                    </div>
                    <div className="text-[11px] shrink-0" style={{ color: "#6B7280", ...POPPINS }}>
                      {formatShortDate(r.created_at)}
                    </div>
                  </div>
                  <div className="mt-1">
                    <Stars rating={r.rating} />
                  </div>
                  {r.review_text && (
                    <div
                      className="text-[13px] italic mt-2"
                      style={{ color: "#6B7280", ...POPPINS }}
                    >
                      {r.review_text}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
