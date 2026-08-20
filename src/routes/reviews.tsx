import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { IconStar } from "@tabler/icons-react";
import { EmptyState } from "@/components/dsm/EmptyState";
import { toast } from "sonner";
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
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
          <IconStar
            key={i}
            size={size}
            color={filled ? "#1877D6" : "#EEF2F7"}
            fill={filled ? "#1877D6" : "#EEF2F7"}
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
    <DSMTopSheet title="Reviews">
      <div style={{ fontFamily: "Poppins, sans-serif" }}>


      {/* Summary card */}
      <div
        className="mx-4 mt-3 flex flex-col items-center"
        style={{ backgroundColor: "#0B1F3A", borderRadius: 8, padding: 16 }}
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
          <EmptyState
            icon={<IconStar size={32} color="#9CA3AF" stroke={1.5} />}
            title="No reviews yet"
            subtitle="Reviews from your pupils will appear here"
          />
        ) : (
          <div className="flex flex-col" style={{ gap: 8 }}>
            {reviews.map((r) => {
              const name = r.pupils?.name ?? r.pupil_name ?? "Anonymous";
              return (
                <Card key={r.id}>
                  <div className="flex items-start justify-between" style={{ gap: 8 }}>
                    <div className="text-[14px] font-semibold truncate" style={{ color: "#0B1F3A", ...POPPINS }}>
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
    </DSMTopSheet>
  );
}
