import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import InstructorTopBar from '@/components/dsm/InstructorTopBar';
import { PageLoader } from '@/components/dsm/LoadingSpinner';
import {
  IconSearch,
  IconRosetteDiscount,
  IconLock,
  IconChevronRight,
  IconX,
  IconCheck,
} from '@tabler/icons-react';
import {
  createSubscriptionPaymentLink,
  type PaidTierId,
} from '@/lib/websiteUpgrade';

export const Route = createFileRoute('/perks')({
  component: PerksPage,
});

type Perk = {
  id: string;
  name: string;
  provider: string;
  category: string;
  description: string;
  saving: string;
  minTier: string;
  logo: string;
};

const TIER_ORDER = ['free', 'website', 'pro', 'managed'];

const TIER_DISPLAY: Record<string, string> = {
  free: 'Free',
  website: 'Essential',
  pro: 'Pro',
  managed: 'Max',
};

const TIER_PRICE: Record<string, string> = {
  website: 'from £9.99/month',
  pro: 'from £19.99/month',
  managed: 'from £29.99/month',
};

function hasAccess(userTier: string, minTier: string): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(minTier);
}

const CATEGORIES = [
  'All',
  'Health',
  'Food',
  'Shopping',
  'Travel',
  'Entertainment',
  'Motoring',
  'Finance',
];

const PERKS: Perk[] = [
  {
    id: '1',
    name: '24/7 Private GP',
    provider: 'pirkx',
    category: 'Health',
    description: 'Book a GP appointment any time, day or night.',
    saving: 'Worth £50+ per visit',
    minTier: 'pro',
    logo: '🏥',
  },
  {
    id: '2',
    name: 'Mental health support',
    provider: 'pirkx',
    category: 'Health',
    description: 'Access counselling and therapy sessions online.',
    saving: 'Included free',
    minTier: 'pro',
    logo: '🧠',
  },
  {
    id: '3',
    name: 'Prescription delivery',
    provider: 'pirkx',
    category: 'Health',
    description: 'Get prescriptions delivered straight to your door.',
    saving: 'Free delivery',
    minTier: 'pro',
    logo: '💊',
  },
  {
    id: '4',
    name: 'Physiotherapy',
    provider: 'pirkx',
    category: 'Health',
    description: 'Online and in-person physio sessions.',
    saving: 'Discounted rates',
    minTier: 'pro',
    logo: '🫀',
  },
  {
    id: '5',
    name: 'Bennenden Health cover',
    provider: 'Bennenden',
    category: 'Health',
    description: 'Fast access to medical treatment and investigations.',
    saving: '3 plan levels',
    minTier: 'pro',
    logo: '🛡️',
  },
  {
    id: '6',
    name: 'HMCA health insurance',
    provider: 'HMCA',
    category: 'Health',
    description: 'Private health insurance exclusively for DSM members.',
    saving: 'DSM exclusive rates',
    minTier: 'website',
    logo: '❤️',
  },
  {
    id: '7',
    name: 'Cinema tickets',
    provider: 'Perkbox',
    category: 'Entertainment',
    description: 'Discounted tickets at Vue, Odeon, Cineworld and more.',
    saving: 'Up to 40% off',
    minTier: 'pro',
    logo: '🎬',
  },
  {
    id: '8',
    name: 'Restaurant discounts',
    provider: 'Perkbox',
    category: 'Food',
    description: 'Save at thousands of restaurants nationwide.',
    saving: 'Up to 25% off',
    minTier: 'pro',
    logo: '🍽️',
  },
  {
    id: '9',
    name: 'Takeaway deals',
    provider: 'Perkbox',
    category: 'Food',
    description: 'Discounts on Just Eat, Deliveroo and more.',
    saving: 'Up to 15% off',
    minTier: 'pro',
    logo: '🛵',
  },
  {
    id: '10',
    name: 'Supermarket savings',
    provider: 'Perkbox',
    category: 'Shopping',
    description: 'Discounts at Tesco, Sainsbury\'s, Asda and more.',
    saving: 'Up to 10% off',
    minTier: 'pro',
    logo: '🛒',
  },
  {
    id: '11',
    name: 'Amazon vouchers',
    provider: 'Perkbox',
    category: 'Shopping',
    description: 'Regular Amazon discount vouchers for members.',
    saving: 'Up to 5% off',
    minTier: 'pro',
    logo: '📦',
  },
  {
    id: '12',
    name: 'Travel discounts',
    provider: 'Perkbox',
    category: 'Travel',
    description: 'Save on hotels, flights and package holidays.',
    saving: 'Up to 30% off',
    minTier: 'pro',
    logo: '✈️',
  },
  {
    id: '13',
    name: 'Gym membership',
    provider: 'Perkbox',
    category: 'Health',
    description: 'Discounted gym memberships at major chains.',
    saving: 'Up to 25% off',
    minTier: 'pro',
    logo: '💪',
  },
  {
    id: '14',
    name: 'DIA membership',
    provider: 'DIA',
    category: 'Finance',
    description: 'Full DIA membership included free with your DSM subscription.',
    saving: 'Free — saves £XX/year',
    minTier: 'website',
    logo: '🎓',
  },
  {
    id: '15',
    name: 'Dashcam discount',
    provider: 'DSM partner',
    category: 'Motoring',
    description: 'Exclusive discounts on leading dashcam brands.',
    saving: 'Up to 20% off',
    minTier: 'website',
    logo: '📷',
  },
  {
    id: '16',
    name: 'Fuel card',
    provider: 'DSM partner',
    category: 'Motoring',
    description: 'Save on every fill-up at thousands of UK forecourts.',
    saving: 'Up to 10p per litre',
    minTier: 'website',
    logo: '⛽',
  },
  {
    id: '17',
    name: 'Tyre and servicing',
    provider: 'DSM partner',
    category: 'Motoring',
    description: 'Discounted tyres, MOT and servicing from approved garages.',
    saving: 'Member rates',
    minTier: 'website',
    logo: '🔧',
  },
  {
    id: '18',
    name: 'Breakdown cover',
    provider: 'DSM partner',
    category: 'Motoring',
    description: 'ADI-specific breakdown cover including dual-control vehicles.',
    saving: 'Exclusive rates',
    minTier: 'website',
    logo: '🚨',
  },
  {
    id: '19',
    name: 'Cashback rewards',
    provider: 'Perkbox',
    category: 'Shopping',
    description: 'Earn cashback on everyday purchases at major retailers.',
    saving: 'Up to 15% cashback',
    minTier: 'pro',
    logo: '💰',
  },
  {
    id: '20',
    name: 'Coffee and cafes',
    provider: 'Perkbox',
    category: 'Food',
    description: 'Discounts at Costa, Caffe Nero, Starbucks and more.',
    saving: 'Up to 25% off',
    minTier: 'pro',
    logo: '☕',
  },
];

function PerksPage() {
  const [websiteTier, setWebsiteTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [upgradeSheetOpen, setUpgradeSheetOpen] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState<Perk | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('instructors')
        .select('website_tier')
        .eq('id', user.id)
        .single();
      setWebsiteTier(data?.website_tier ?? 'free');
      setLoading(false);
    })();
  }, []);

  const canGoBack = typeof window !== "undefined" && window.history.length > 1;
  function goBack(fallback: string) {
    if (canGoBack) {
      navigate({ to: -1 as any });
    } else {
      navigate({ to: fallback as never });
    }
  }

  const isPaid = websiteTier !== 'free';

  const filteredPerks = useMemo(() => {
    return PERKS.filter((p) => {
      const matchCategory = activeCategory === 'All' || p.category === activeCategory;
      const matchSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.provider.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [search, activeCategory]);

  const accessibleCount = PERKS.filter((p) => hasAccess(websiteTier, p.minTier)).length;

  const unlockedPerks = useMemo(() => {
    if (!selectedPerk) return [];
    return PERKS.filter(
      (p) =>
        TIER_ORDER.indexOf(p.minTier) <= TIER_ORDER.indexOf(selectedPerk.minTier) &&
        !hasAccess(websiteTier, p.minTier)
    );
  }, [selectedPerk, websiteTier]);

  const planCircle = useMemo(() => {
    if (!selectedPerk) return { bg: '#EFF6FF', color: '#1877D6', letter: 'E' };
    switch (selectedPerk.minTier) {
      case 'pro':
        return { bg: '#EDE9FE', color: '#7C3AED', letter: 'P' };
      case 'managed':
        return { bg: '#FEF3C7', color: '#D68A1B', letter: 'M' };
      default:
        return { bg: '#EFF6FF', color: '#1877D6', letter: 'E' };
    }
  }, [selectedPerk]);

  if (loading) return <PageLoader />;

  return (
    <div
      style={{
        background: '#EEF2F7',
        minHeight: '100vh',
        paddingBottom: 100,
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      <InstructorTopBar
        firstName=""
        pageTitle="My Perks"
        onBack={() => goBack('/more')}
        onBell={() => navigate({ to: '/notifications' as never })}
        onPhone={() => navigate({ to: '/enquiries' as never })}
        onLiveTrack={() => navigate({ to: '/live' as never })}
        onMenu={() => navigate({ to: '/more' as never })}
        onMicPress={() => toast.info('Voice commands coming soon!')}
      />
      <div style={{ height: 'calc(60px + env(safe-area-inset-top, 0px))' }} />

      {!isPaid && (
        <div
          style={{
            margin: '12px 16px',
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #E4E8EF',
            padding: '11px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <IconRosetteDiscount size={16} color="#1877D6" stroke={1.5} />
          <span style={{ flex: 1, fontSize: 12, color: '#6B7686' }}>
            {accessibleCount} of {PERKS.length} perks available on your plan
          </span>
          <button
            type="button"
            onClick={() => navigate({ to: '/benefits' as never })}
            style={{
              background: '#1877D6',
              color: '#fff',
              borderRadius: 20,
              padding: '5px 12px',
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Upgrade →
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div style={{ margin: '0 16px 10px', position: 'relative' }}>
        <IconSearch
          size={14}
          color="#9CA3AF"
          stroke={1.5}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search perks..."
          style={{
            width: '100%',
            background: '#fff',
            border: '1px solid #E4E8EF',
            borderRadius: 12,
            padding: '10px 36px 10px 34px',
            fontSize: 14,
            color: '#0B1F3A',
            fontFamily: 'Poppins, sans-serif',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            style={{
              position: 'absolute',
              right: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            aria-label="Clear search"
          >
            <IconX size={16} stroke={2} />
          </button>
        )}
      </div>

      {/* CATEGORY CHIPS */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          padding: '0 16px 10px',
          scrollbarWidth: 'none',
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                height: 32,
                borderRadius: 20,
                padding: '0 14px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                border: isActive ? 'none' : '1px solid #E4E8EF',
                whiteSpace: 'nowrap',
                fontFamily: 'Poppins, sans-serif',
                background: isActive ? '#0B1F3A' : '#fff',
                color: isActive ? '#fff' : '#6B7686',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* RESULTS COUNT */}
      <div style={{ padding: '0 16px 8px', fontSize: 11, color: '#9CA3AF' }}>
        {filteredPerks.length} perks
        {search && ` matching '${search}'`}
      </div>

      {/* PERKS LIST */}
      <div
        style={{
          margin: '0 16px',
          background: '#fff',
          borderRadius: 16,
          border: '1px solid #E4E8EF',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(11,31,58,0.06)',
        }}
      >
        {filteredPerks.map((perk, idx) => {
          const accessible = hasAccess(websiteTier, perk.minTier);
          return (
            <button
              key={perk.id}
              type="button"
              onClick={() => {
                if (accessible) {
                  toast.info('Coming soon — full perk access launching shortly');
                } else {
                  setSelectedPerk(perk);
                  setUpgradeSheetOpen(true);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '13px 16px',
                borderBottom: idx === filteredPerks.length - 1 ? 'none' : '1px solid #E4E8EF',
                cursor: 'pointer',
                background: 'transparent',
                width: '100%',
                textAlign: 'left',
                border: 'none',
                outline: 'none',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: '#EEF2F7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {perk.logo}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0B1F3A' }}>{perk.name}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                  {perk.provider} · {perk.category}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#F0FDF4',
                    color: '#15803D',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: '2px 7px',
                    marginTop: 4,
                  }}
                >
                  {perk.saving}
                </span>
              </span>
              <span style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
                {accessible ? (
                  <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                ) : (
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                    <span
                      style={{
                        background: '#EFF6FF',
                        color: '#1877D6',
                        fontSize: 9,
                        fontWeight: 700,
                        borderRadius: 20,
                        padding: '2px 7px',
                      }}
                    >
                      {TIER_DISPLAY[perk.minTier] ?? perk.minTier} and above
                    </span>
                    <IconLock size={13} color="#9CA3AF" stroke={1.5} />
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {filteredPerks.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <IconSearch size={32} color="#D1D5DB" stroke={1.5} />
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6B7686', marginTop: 8 }}>No perks found</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>Try a different search or category</div>
          </div>
        )}
      </div>

      {/* UPGRADE BOTTOM SHEET */}
      {upgradeSheetOpen && selectedPerk && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'flex-end',
            fontFamily: 'Poppins, sans-serif',
          }}
          onClick={() => setUpgradeSheetOpen(false)}
        >
          <div
            style={{
              background: '#EEF2F7',
              borderRadius: '22px 22px 0 0',
              padding: '0 0 32px',
              maxHeight: '90vh',
              overflowY: 'auto',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div
              style={{
                width: 36,
                height: 5,
                background: '#D1D1D6',
                borderRadius: 3,
                margin: '12px auto 16px',
              }}
            />

            {/* Selected perk preview */}
            <div
              style={{
                margin: '0 16px 16px',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #E4E8EF',
                padding: 16,
                display: 'flex',
                gap: 12,
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#EFF6FF',
                  color: '#1877D6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {selectedPerk.logo}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0B1F3A' }}>{selectedPerk.name}</div>
                <div style={{ fontSize: 12, color: '#6B7686', marginTop: 2 }}>
                  {selectedPerk.provider} · {selectedPerk.category}
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#F0FDF4',
                    color: '#15803D',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: '2px 7px',
                    marginTop: 4,
                  }}
                >
                  {selectedPerk.saving}
                </span>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6 }}>Unlock this perk</div>
              </span>
            </div>

            {/* What you get */}
            <div style={{ padding: '0 16px 8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
              What's included
            </div>
            {unlockedPerks.length > 0 ? (
              <div
                style={{
                  margin: '0 16px 16px',
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #E4E8EF',
                  overflow: 'hidden',
                }}
              >
                {unlockedPerks.map((perk, idx) => (
                  <div
                    key={perk.id}
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                      padding: '11px 16px',
                      borderBottom: idx === unlockedPerks.length - 1 ? 'none' : '1px solid #E4E8EF',
                    }}
                  >
                    <IconCheck size={14} color="#15803D" stroke={2} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#0B1F3A', flex: 1, minWidth: 0 }}>
                      {perk.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 'auto' }}>{perk.provider}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  margin: '0 16px 16px',
                  background: '#fff',
                  borderRadius: 16,
                  border: '1px solid #E4E8EF',
                  padding: 16,
                  fontSize: 14,
                  color: '#15803D',
                  textAlign: 'center',
                }}
              >
                You already have access to this perk
              </div>
            )}

            {/* Plan required */}
            <div style={{ padding: '0 16px 8px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase' }}>
              Plan required
            </div>
            <div
              style={{
                margin: '0 16px 16px',
                background: '#fff',
                borderRadius: 16,
                border: '1px solid #E4E8EF',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: planCircle.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  color: planCircle.color,
                  flexShrink: 0,
                }}
              >
                {planCircle.letter}
              </div>
              <span style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F3A' }}>
                  {TIER_DISPLAY[selectedPerk.minTier] ?? selectedPerk.minTier} and above
                </div>
                <div style={{ fontSize: 12, color: '#6B7686', marginTop: 2 }}>
                  {TIER_PRICE[selectedPerk.minTier] ?? ''}
                </div>
              </span>
              <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
            </div>

            {/* Upgrade CTA */}
            <button
              type="button"
              onClick={async () => {
                setUpgradeSheetOpen(false);
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                  toast.error('Please log in first');
                  return;
                }
                try {
                  const { url } = await createSubscriptionPaymentLink(
                    (selectedPerk?.minTier as PaidTierId) ?? 'website',
                    null,
                    session.access_token
                  );
                  window.location.href = url;
                } catch (e: any) {
                  toast.error(e.message ?? 'Could not start upgrade');
                }
              }}
              style={{
                margin: '0 16px',
                width: 'calc(100% - 32px)',
                background: '#1877D6',
                color: '#fff',
                borderRadius: 20,
                padding: 15,
                fontSize: 15,
                fontWeight: 800,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                boxShadow: '0 4px 0 #0F52A8',
              }}
            >
              Upgrade to {TIER_DISPLAY[selectedPerk?.minTier ?? 'website']} →
            </button>

            <div
              style={{
                textAlign: 'center',
                marginTop: 12,
                fontSize: 13,
                color: '#9CA3AF',
                cursor: 'pointer',
              }}
              onClick={() => setUpgradeSheetOpen(false)}
            >
              Cancel
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
