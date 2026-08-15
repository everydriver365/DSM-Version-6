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
} from '@tabler/icons-react';

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

const TIER_NAMES: Record<string, string> = {
  free: 'Free',
  website: 'Essential',
  pro: 'Pro',
  managed: 'Max',
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
        onBack={() => navigate({ to: '/home' as never })}
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
                  navigate({ to: '/benefits' as never });
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
                      {TIER_NAMES[perk.minTier] ?? perk.minTier}+
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
    </div>
  );
}
