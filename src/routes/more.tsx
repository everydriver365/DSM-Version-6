import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Search, X, Briefcase, RefreshCw, Award, ArrowLeftRight, GraduationCap,
  ClipboardCheck, FileText, Receipt, Fuel, Car, MapPin, Calendar,
  BarChart3, Calculator,

  Moon, TrendingUp, Activity, Radio, ShoppingBag, Users, GraduationCap as GraduationCapIcon,
  ChevronRight, PlayCircle,
} from "lucide-react";
import { toast } from "sonner";
import InstructorTopBar from "@/components/dsm/InstructorTopBar";

// Toggle to false when Learn is no longer "new" — hides the NEW badge only.
const LEARN_IS_NEW = true;

export const Route = createFileRoute("/more")({
  head: () => ({
    meta: [
      { title: "More — DSM" },
      { name: "description", content: "All tools and features for driving instructors: teaching, business, admin, reports and community." },
      { property: "og:title", content: "More — DSM" },
      { property: "og:description", content: "All tools and features for driving instructors." },
    ],
  }),
  component: MorePage,
});

type Tool = {
  icon: any;
  colour: string;
  label: string;
  sub: string;
  route: string;
  group: string;
};

const allTools: Tool[] = [
  // Teaching
  { icon: Briefcase, colour: '#7C3AED', label: 'Jobs', sub: 'Job offers & requests', route: '/jobs', group: 'Teaching' },
  { icon: RefreshCw, colour: '#1A52A0', label: 'Recurring lessons', sub: 'Weekly series', route: '/lesson-series', group: 'Teaching' },
  { icon: Award, colour: '#7C3AED', label: 'Log test result', sub: 'Pass or fail', route: '/tests', group: 'Teaching' },
  { icon: ArrowLeftRight, colour: '#7C3AED', label: 'Test swap', sub: 'Manage per pupil', route: '/pupils', group: 'Teaching' },
  { icon: GraduationCap, colour: '#16A34A', label: 'Syllabus', sub: 'Standards check', route: '/standards', group: 'Teaching' },
  { icon: ClipboardCheck, colour: '#16A34A', label: 'Mock tests', sub: 'Practice tests', route: '/mock-tests', group: 'Teaching' },
  { icon: FileText, colour: '#9CA3AF', label: 'Lesson notes', sub: 'Templates', route: '/lesson-notes', group: 'Teaching' },
  // Business
  { icon: Award, colour: '#D97706', label: 'Certifications', sub: 'Licences & renewals', route: '/certifications', group: 'Business' },
  { icon: GraduationCap, colour: '#16A34A', label: 'CPD log', sub: 'Development hours', route: '/cpd', group: 'Business' },
  { icon: Receipt, colour: '#CC2229', label: 'Expenses', sub: 'Track costs', route: '/expenses', group: 'Business' },
  { icon: Fuel, colour: '#D97706', label: 'Find fuel', sub: 'Nearby stations', route: '/fuel', group: 'Business' },
  { icon: Car, colour: '#6B7280', label: 'Vehicle', sub: 'Health & MOT', route: '/vehicle', group: 'Business' },
  { icon: MapPin, colour: '#6B7280', label: 'Mileage', sub: 'Log miles', route: '/mileage', group: 'Business' },
  { icon: FileText, colour: '#1A52A0', label: 'Invoices', sub: 'Billing', route: '/invoices', group: 'Business' },
  { icon: MapPin, colour: '#1A52A0', label: 'Coverage areas', sub: 'Service areas', route: '/coverage-areas', group: 'Business' },
  // Admin
  { icon: Settings, colour: '#6B7280', label: 'Settings', sub: 'Account settings', route: '/settings', group: 'Admin' },
  { icon: Clock, colour: '#1A52A0', label: 'Availability', sub: 'Working hours', route: '/availability-settings', group: 'Admin' },
  { icon: Calendar, colour: '#1A52A0', label: 'Calendar sync', sub: 'Google Calendar', route: '/calendarsync', group: 'Admin' },
  { icon: Gift, colour: '#00B5A5', label: 'Referrals', sub: 'Reward programme', route: '/referrals', group: 'Admin' },
  { icon: FileCheck, colour: '#16A34A', label: 'Terms & conditions', sub: 'T&Cs', route: '/terms', group: 'Admin' },
  { icon: Zap, colour: '#D97706', label: 'Automations', sub: 'Auto actions', route: '/automations', group: 'Admin' },
  { icon: ClipboardList, colour: '#7C3AED', label: 'Intake questions', sub: 'New pupils', route: '/intake-questions', group: 'Admin' },
  { icon: AlertTriangle, colour: '#CC2229', label: 'No-show policy', sub: 'Cancellation fees', route: '/no-show-policy', group: 'Admin' },
  // Reports
  { icon: BarChart3, colour: '#1A52A0', label: 'MTD', sub: 'Month to date', route: '/mtd', group: 'Reports' },
  { icon: Calculator, colour: '#D97706', label: 'Tax report', sub: 'Self assessment', route: '/tax-report', group: 'Reports' },
  { icon: Calendar, colour: '#16A34A', label: 'Weekly report', sub: 'Week summary', route: '/weekly-report', group: 'Reports' },
  { icon: Moon, colour: '#7C3AED', label: 'End of day', sub: 'Daily wrap up', route: '/end-of-day', group: 'Reports' },
  { icon: TrendingUp, colour: '#16A34A', label: 'Earnings forecast', sub: 'Predict income', route: '/earnings-forecast', group: 'Reports' },
  { icon: Activity, colour: '#CC2229', label: 'Business health', sub: 'Key metrics', route: '/business-health', group: 'Reports' },
  // Community
  { icon: Radio, colour: '#CC2229', label: 'DSM Live', sub: 'Sessions & podcasts', route: '/dsm-live', group: 'Community' },
  { icon: ShoppingBag, colour: '#1A52A0', label: 'Marketplace', sub: 'Products & services', route: '/marketplace', group: 'Community' },
  { icon: Users, colour: '#00B5A5', label: 'Community', sub: 'Connect with ADIs', route: '/community', group: 'Community' },
];

const GROUP_ORDER = ['Teaching', 'Business', 'Admin', 'Reports', 'Community'] as const;

function MorePage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();
  const filtered = q
    ? allTools.filter(t =>
        t.label.toLowerCase().includes(q) ||
        t.sub.toLowerCase().includes(q) ||
        t.group.toLowerCase().includes(q)
      )
    : allTools;

  const go = (route: string) => navigate({ to: route as never });

  return (
    <div style={{ background: '#F7FAFC', minHeight: '100vh', paddingBottom: 80, fontFamily: 'Inter, sans-serif' }}>
      <InstructorTopBar
        firstName=""
        pageTitle="More"
        onBack={() => navigate({ to: "/home" as never })}
        onBell={() => navigate({ to: "/notifications" as never })}
        onPhone={() => navigate({ to: "/enquiries" as never })}
        onLiveTrack={() => navigate({ to: "/live" as never })}
        onMenu={() => {/* already on More */}}
        onMicPress={() => toast.info("Voice commands coming soon!")}
      />
      <div style={{ height: "calc(60px + env(safe-area-inset-top, 0px))" }} />

      {/* Search */}
      <div
        style={{
          background: 'white',
          border: '0.5px solid #E2E6ED',
          borderRadius: 14,
          padding: '12px 16px',
          margin: '16px 16px 4px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 2px 8px rgba(15,32,68,0.04)',
        }}
      >
        <Search size={16} color="#9CA3AF" />
        <input
          type="text"
          autoFocus
          placeholder="Search features..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            fontSize: 13,
            fontFamily: 'Inter, sans-serif',
            color: '#0F2044',
            background: 'transparent',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex' }}
            aria-label="Clear search"
          >
            <X size={16} color="#9CA3AF" />
          </button>
        )}
      </div>

      {q ? (
        // Flat list of search results
        filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 14, color: '#9CA3AF' }}>
            No features found for "{searchQuery}"
          </div>
        ) : (
          <div style={{ marginTop: 12, background: 'white' }}>
            {filtered.map((tool) => (
              <button
                key={tool.label}
                onClick={() => go(tool.route)}
                style={{
                  width: '100%',
                  background: 'white',
                  border: 'none',
                  borderBottom: '0.5px solid #F3F4F6',
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: tool.colour + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <tool.icon size={18} color={tool.colour} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#0F2044' }}>{tool.label}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{tool.sub}</div>
                </div>
                <span style={{ fontSize: 10, color: '#9CA3AF', marginLeft: 'auto' }}>{tool.group}</span>
              </button>
            ))}
          </div>
        )
      ) : (
        // Grouped view
        GROUP_ORDER.map((group, groupIdx) => {
          const items = filtered.filter((t) => t.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group}>
              {groupIdx === 0 && (
                <div style={{ margin: '16px 16px 0' }}>
                  <button
                    type="button"
                    onClick={() => go('/learn')}
                    style={{
                      width: '100%',
                      background: 'white',
                      border: 'none',
                      borderRadius: 14,
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'Inter, sans-serif',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: '#0F2044',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <PlayCircle size={18} color="white" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0F2044' }}>Learn</div>
                        {LEARN_IS_NEW && (
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              color: 'white',
                              background: '#1877D6',
                              padding: '2px 6px',
                              borderRadius: 999,
                              letterSpacing: '0.06em',
                              textTransform: 'uppercase',
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#6B7A90', marginTop: 1 }}>
                        Quick guides and how-to videos
                      </div>
                    </div>
                    <ChevronRight size={18} color="#8592A6" />
                  </button>
                </div>
              )}
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  margin: '16px 16px 8px',
                }}
              >
                {group}
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  margin: '0 16px',
                }}
              >
                {items.map((tool) => (
                  <button
                    key={tool.label}
                    onClick={() => go(tool.route)}
                    style={{
                      background: 'white',
                      borderRadius: 14,
                      padding: '14px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(15,32,68,0.04)',
                      border: '0.5px solid #F0F0F0',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontFamily: 'Inter, sans-serif',
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        background: tool.colour + '15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 6,
                      }}
                    >
                      <tool.icon size={20} color={tool.colour} />
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 11, color: '#0F2044', lineHeight: 1.2 }}>{tool.label}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 1, lineHeight: 1.2 }}>{tool.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
