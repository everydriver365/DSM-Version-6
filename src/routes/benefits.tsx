import { useGoBack } from "@/hooks/useGoBack";
import { tokens } from "@/lib/tokens";
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import DSMTopSheet from "@/components/dsm/DSMTopSheet";
import { EmptyState } from "@/components/dsm/EmptyState";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PageLoader } from '@/components/dsm/LoadingSpinner';
import diaLogoAsset from '@/assets/dia-logo.png.asset.json';
import perkboxLogoAsset from '@/assets/perkbox-logo.jpeg.asset.json';
import pirkxLogoAsset from '@/assets/pirkx-logo.png.asset.json';
import hmcaLogoAsset from '@/assets/hmca-logo.png.asset.json';
import bennendenLogoAsset from '@/assets/bennenden-logo.jpg.asset.json';
import { IconCamera, IconCar, IconCheck, IconChevronDown, IconChevronLeft, IconChevronRight, IconCircleCheck, IconGasStation, IconGift, IconHeartHandshake, IconLock, IconRosetteDiscount, IconShieldCheck, IconStethoscope, IconTable, IconTool } from "@tabler/icons-react";
import {
  createSubscriptionPaymentLink,
  TIERS,
  type PaidTierId,
} from '@/lib/websiteUpgrade';


const BENEFITS = [
  {
    id: 'pirkx',
    name: 'pirkx Wellbeing',
    tagline: 'Health and wellbeing benefits',
    icon: 'stethoscope',
    imageUrl: pirkxLogoAsset.url,
    iconBg: '#E6F1FB',
    iconColor: '#185FA5',
    minTier: 'pro',
    description: 'Access private GP appointments 24/7, mental health support, prescription delivery and physiotherapy — all included with your DSM Pro subscription.',
    perks: [
      '24/7 private GP access',
      'Mental health counselling',
      'Prescription delivery',
      'Physiotherapy sessions',
      'Health cash plan',
      'Wellbeing resources',
    ],
    ctaLabel: 'Access pirkx →',
    ctaAction: 'pirkx_sso',
    comingSoon: true,
    exclusive: false,
  },
  {
    id: 'perkbox',
    name: 'Perkbox Rewards',
    tagline: '4,000+ exclusive discounts',
    icon: 'gift',
    imageUrl: perkboxLogoAsset.url,
    iconBg: '#FBEAF0',
    iconColor: '#993556',
    minTier: 'website',
    description: 'Save money every day with thousands of discounts on retail, restaurants, cinema, travel and more.',
    perks: [
      '4,000+ retail discounts',
      'Restaurant and takeaway deals',
      'Cinema tickets',
      'Travel discounts',
      'Wellbeing hub',
      'Employee recognition',
    ],
    ctaLabel: 'Access Perkbox →',
    ctaAction: 'perkbox_sso',
    comingSoon: true,
    exclusive: false,
  },
  {
    id: 'dia',
    name: 'DIA Membership',
    tagline: 'Free with DSM Pro - Save £125 a year!',
    icon: 'school',
    imageUrl: diaLogoAsset.url,
    iconBg: '#E6F1FB',
    iconColor: '#185FA5',
    minTier: 'website',
    description: 'Full Driving Instructors Association membership included free — saving you money every year.',
    perks: [
      'Full DIA membership',
      'CPD resources and training',
      'Legal support and advice',
      'Industry representation',
      'Member magazine',
      'Networking events',
    ],
    ctaLabel: 'Claim membership →',
    ctaAction: 'dia_claim',
    comingSoon: true,
    exclusive: false,
  },
  {
    id: 'hmca',
    name: 'HMCA Health Insurance',
    tagline: 'Exclusively with DSM',
    icon: 'shield-check',
    imageUrl: hmcaLogoAsset.url,
    iconBg: '#EAF3DE',
    iconColor: '#3B6D11',
    minTier: 'pro',
    description: 'Fast access to medical investigations and treatment with HMCA Insurance. Three plan levels available — exclusively for DSM subscribers.',
    perks: [
      'Fast medical investigations',
      'Private treatment access',
      'Personal claims service',
      'Three plan levels',
      'Minimise time off work',
      'Dedicated support team',
    ],
    ctaLabel: 'Get a quote →',
    ctaAction: 'hmca_enquire',
    comingSoon: false,
    exclusive: true,
  },
  {
    id: 'bennenden',
    name: 'Bennenden Health',
    tagline: 'Free to all DSM members',
    icon: IconHeartHandshake,
    imageUrl: bennendenLogoAsset.url,
    iconBg: '#FEE2E2',
    iconColor: '#B91C1C',
    minTier: 'pro',
    description: 'Bennenden Health provides affordable healthcare for everyone. As a DSM member you get free access — including 24/7 GP helpline, mental health support and medical treatment.',
    perks: [
      '24/7 GP helpline',
      'Mental health support',
      'Medical treatment',
      'Affordable healthcare',
      'No waiting lists',
      'Free to DSM members',
    ],
    ctaLabel: 'Access Bennenden →',
    ctaAction: 'bennenden',
    comingSoon: false,
    exclusive: false,
    freeForAll: true,
  },
];

const DEALS = [
  {
    id: 'dashcam',
    name: 'Dashcams',
    tagline: 'Up to 20% off for DSM members',
    icon: IconCamera,
    iconBg: '#EEF2F7',
    iconColor: '#0B1F3A',
    minTier: 'website',
    description: 'Exclusive discounts on leading dashcam brands. Perfect for ADIs — front and rear recording, loop recording and parking mode.',
    dealLabel: 'View dashcam deals →',
    comingSoon: true,
  },
  {
    id: 'fuel',
    name: 'Fuel card',
    tagline: 'Save up to 10p per litre',
    icon: IconGasStation,
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    minTier: 'website',
    description: 'Save on every fill-up with a DSM partner fuel card. Works at thousands of forecourts across the UK.',
    dealLabel: 'Apply free →',
    comingSoon: true,
  },
  {
    id: 'tyres',
    name: 'Tyres and servicing',
    tagline: 'Member discount rates',
    icon: IconCar,
    iconBg: '#F0FDF4',
    iconColor: '#15803D',
    minTier: 'website',
    description: 'Discounted tyre fitting, MOT and servicing from our network of approved garages nationwide.',
    dealLabel: 'Find a garage →',
    comingSoon: true,
  },
  {
    id: 'breakdown',
    name: 'Breakdown cover',
    tagline: 'ADI-specific cover',
    icon: IconTool,
    iconBg: '#FEE2E2',
    iconColor: '#B91C1C',
    minTier: 'website',
    description: 'Breakdown cover designed for driving instructors — includes dual-control vehicle cover and roadside assistance.',
    dealLabel: 'Get a quote →',
    comingSoon: true,
  },
];

function iconFor(name: string | React.ComponentType<any>) {
  if (typeof name === 'function') return name;
  switch (name) {
    case 'stethoscope':
      return IconStethoscope;
    case 'gift':
      return IconGift;
    case 'shield-check':
    case 'school':
    default:
      return IconShieldCheck;
  }
}

const MIN_TIER_LABEL: Record<string, string> = {
  free: 'Free',
  website: 'Essential',
  pro: 'Pro',
  managed: 'Max',
};

const MIN_TIER_COLOR: Record<string, { bg: string; color: string }> = {
  free: { bg: '#F0FDF4', color: '#15803D' },
  website: { bg: '#EFF6FF', color: '#1877D6' },
  pro: { bg: '#EDE9FE', color: '#7C3AED' },
  managed: { bg: '#FEF3C7', color: '#B45309' },
};

const BENEFIT_COMPARISON = [
  {
    group: 'Website',
    rows: [
      { label: 'Mini-site', from: 0 },
      { label: 'Custom domain', from: 1 },
      { label: 'Remove watermark', from: 1 },
      { label: 'Analytics', from: 1 },
      { label: 'Area pages', from: 2 },
      { label: 'Blog', from: 2 },
      { label: 'Managed by DSM', from: 3 },
    ],
  },
  {
    group: 'Member benefits',
    rows: [
      { label: 'DIA membership', from: 1 },
      { label: 'HMCA insurance', from: 1 },
      { label: 'pirkx Wellbeing', from: 2 },
      { label: 'Perkbox Rewards', from: 2 },
      { label: 'Bennenden Health', from: 2 },
    ],
  },
  {
    group: 'Deals',
    rows: [
      { label: 'Dashcam discount', from: 1 },
      { label: 'Fuel card', from: 1 },
      { label: 'Tyres and servicing', from: 1 },
      { label: 'Breakdown cover', from: 1 },
    ],
  },
];

const COLS = [
  { id: 'free', name: 'Free', price: '£0' },
  { id: 'website', name: 'Essential', price: '£9.99' },
  { id: 'pro', name: 'Pro', price: '£19.99' },
  { id: 'managed', name: 'Max', price: '£29.99' },
];

const TIER_INDEX: Record<string, number> = { free: 0, website: 1, pro: 2, managed: 3 };

export const Route = createFileRoute('/benefits')({
  head: () => ({
    meta: [
      { title: 'Member Benefits — DSM' },
      { name: 'description', content: 'Your DSM member benefits: pirkx Wellbeing, Perkbox Rewards, DIA membership and HMCA health insurance.' },
    ],
  }),
  component: BenefitsPage,
});

function BenefitsPage() {
  const [reloadKey, setReloadKey] = useState(0);
  const [websiteTier, setWebsiteTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [upgradeStep, setUpgradeStep] = useState<'idle' | 'choose-tier' | 'processing'>('idle');
  const [chosenDomain, setChosenDomain] = useState<string | null>(null);
  const [chosenTier, setChosenTier] = useState<PaidTierId | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [benefits, setBenefits] = useState<typeof BENEFITS>(BENEFITS);


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
  }, [reloadKey]);

  const { pullToRefreshProps } = usePullToRefresh({
    onRefresh: async () => { setReloadKey((k) => k + 1); },
  });

  // Benefit partners are managed from the admin hub; fall back to the built-in
  // list when the table is empty or unavailable.
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('benefit_partners')
        .select('*')
        .eq('active', true)
        .order('sort_order');
      if (error || !data || data.length === 0) return;
      setBenefits(
        data.map((p: any) => {
          const preset = BENEFITS.find(
            (b) => b.id === p.id || b.name.toLowerCase() === String(p.name ?? '').toLowerCase(),
          );
          return {
            ...(preset ?? {}),
            id: p.id,
            name: p.name,
            tagline: p.tagline ?? '',
            icon: p.icon ?? preset?.icon ?? 'gift',
            imageUrl: preset?.imageUrl,
            iconBg: p.icon_bg ?? preset?.iconBg ?? '#EEF2F7',
            iconColor: p.icon_color ?? preset?.iconColor ?? '#0B1F3A',
            minTier: p.min_tier ?? 'pro',
            description: p.description ?? '',
            perks: p.perks ?? [],
            ctaLabel: p.cta_label ?? 'Access →',
            ctaAction: p.cta_action ?? '',
            comingSoon: !!p.coming_soon,
            exclusive: !!p.exclusive,
          };
        }) as typeof BENEFITS,
      );
    })();
  }, []);

  const goBack = useGoBack();

  const isPaid = websiteTier !== 'free';

  const TIER_RANK: Record<string, number> = { free: 0, website: 1, pro: 2, managed: 3 };
  function canAccessTier(minTier: string) {
    return TIER_RANK[websiteTier] >= TIER_RANK[minTier];
  }

  function handleBenefitCta(action: string) {
    switch (action) {
      case 'pirkx_sso':
        toast.info('pirkx coming soon — we\'ll notify you when live');
        break;
      case 'perkbox_sso':
        toast.info('Perkbox coming soon — we\'ll notify you when live');
        break;
      case 'dia_claim':
        toast.info('DIA claim coming soon — we\'ll notify you when live');
        break;
      case 'hmca_enquire':
        window.open(
          'mailto:info@everydriver.co.uk?subject=HMCA Health Insurance Enquiry',
          '_blank',
        );
        break;
      case 'bennenden':
        toast.info('Bennenden Health coming soon — we\'ll notify you when live');
        break;
    }
  }


  async function handleUpgrade(tier: PaidTierId) {
    setUpgradeStep('processing');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please log in first');

      const { url } = await createSubscriptionPaymentLink(
        tier,
        chosenDomain,
        session.access_token,
      );

      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? 'Could not start upgrade');
      setUpgradeStep('choose-tier');
    }
  }

  function renderTiers(
    onPick: (tier: PaidTierId) => void,
    ctaLabel: string | null,
  ) {
    return TIERS.map((t) => (
      <div
        key={t.id}
        style={{
          background: '#fff',
          borderRadius: tokens.radiusCard,
          boxShadow: '0 1px 3px rgba(11,31,58,0.06)',
          padding: 16,
          marginBottom: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              background: t.pillBg,
              color: t.pillColor,
              fontSize: 12,
              fontWeight: tokens.fontWeight.bold,
              borderRadius: tokens.radiusCard,
              padding: '4px 10px',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            {t.price}
          </span>
          {t.badge && (
            <span
              style={{
                background: '#FEF3C7',
                color: '#B45309',
                fontSize: tokens.fontSize.xs,
                fontWeight: tokens.fontWeight.bold,
                borderRadius: tokens.radiusCard,
                padding: '3px 8px',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {t.badge}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: tokens.fontSize.lg,
            fontWeight: tokens.fontWeight.extrabold,
            color: '#0B1F3A',
            marginTop: 8,
            fontFamily: 'Poppins, sans-serif',
          }}
        >
          {t.name}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
          {t.features.map((f) => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <IconCheck size={12} color="#15803D" />
              <span style={{ fontSize: 12, color: '#6B7686', fontFamily: 'Poppins, sans-serif' }}>{f}</span>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            if (t.id === 'managed') {
              window.open(
                'https://wa.me/447767693279?text=' +
                  encodeURIComponent('Hi, I\'m interested in DSM Managed Website'),
                '_blank',
              );
              return;
            }
            onPick(t.id);
          }}
          style={{
            width: '100%',
            background: t.id === 'managed' ? '#D68A1B' : t.btnBg,
            color: '#fff',
            borderRadius: tokens.radiusCard,
            padding: 16,
            fontSize: tokens.fontSize.md,
            fontWeight: tokens.fontWeight.bold,
            marginTop: 12,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Poppins, sans-serif',
            boxShadow: t.id === 'managed' ? '0 3px 0 #9C6012' : t.btnShadow,
          }}
        >
          {t.id === 'managed' ? 'Contact us →' : (ctaLabel ?? t.cta)}
        </button>
      </div>
    ));
  }


  return (
    <DSMTopSheet title="Benefits">
    <div
      {...pullToRefreshProps}
      style={{
        background: '#EEF2F7',
        minHeight: '100%',
        paddingBottom: 100,
      }}
    >

      {isPaid ? (
        <div
          style={{
            margin: 16,
            background: 'linear-gradient(135deg, #15803D, #15803D)',
            borderRadius: tokens.radiusCard,
            padding: '16px 20px',
            boxShadow: '0 4px 0 #14532D',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <IconCircleCheck size={32} color="#fff" stroke={1.5} />
          <div>
            <div style={{ fontSize: tokens.fontSize.lg, fontWeight: tokens.fontWeight.extrabold, color: '#fff' }}>
              Your benefits are active
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
              4 benefits included with DSM Pro
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            margin: 16,
            background: 'linear-gradient(135deg, #14509E, #0B1F3A)',
            borderRadius: tokens.radiusCard,
            padding: 16,
            boxShadow: '0 4px 0 #091628',
          }}
        >
          <IconRosetteDiscount size={28} color="#fff" stroke={1.5} />
          <div
            style={{
              fontSize: tokens.fontSize.lg,
              fontWeight: tokens.fontWeight.extrabold,
              color: '#fff',
              marginTop: 8,
              marginBottom: 6,
            }}
          >
            Unlock your member benefits
          </div>
          <div
            style={{
              fontSize: tokens.fontSize.base,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            Upgrade to DSM Pro to access private GP, DIA membership, 4,000+ discounts and exclusive HMCA health insurance.
          </div>
          <button
            type="button"
            onClick={() => {
              setUpgradeStep('choose-tier');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            style={{
              background: '#fff',
              color: '#14509E',
              borderRadius: tokens.radiusCard,
              padding: '12px 24px',
              fontSize: tokens.fontSize.md,
              fontWeight: tokens.fontWeight.extrabold,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'Poppins, sans-serif',
            }}
          >
            Upgrade to Pro →
          </button>
        </div>
      )}


      <div
        style={{
          fontSize: tokens.fontSize.sm,
          fontWeight: tokens.fontWeight.semibold,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '8px 16px 6px',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        Included benefits
      </div>

      {benefits.length === 0 && (
        <EmptyState
          icon={IconGift}
          title="No benefits available"
          subtitle="Benefits will appear here based on your plan."
        />
      )}

      {benefits.map((benefit) => {
        const Icon = iconFor(benefit.icon);
        return (
          <div
            key={benefit.id}
            style={{
              margin: '0 16px 12px',
              background: '#fff',
              borderRadius: tokens.radiusCard,
              border: '1px solid #E4E8EF',
              boxShadow: '0 1px 3px rgba(11,31,58,0.06)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: benefit.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {benefit.imageUrl ? (
                  <img
                    src={benefit.imageUrl}
                    alt={benefit.name}
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Icon size={20} color={benefit.iconColor} stroke={1.5} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.bold, color: '#0B1F3A' }}>
                  {benefit.name}
                </div>
                <div style={{ fontSize: tokens.fontSize.sm, color: '#6B7686', marginTop: 2 }}>
                  {benefit.tagline}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    background: MIN_TIER_COLOR[benefit.minTier].bg,
                    color: MIN_TIER_COLOR[benefit.minTier].color,
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: tokens.radiusCard,
                    padding: '3px 8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  {benefit.minTier === 'free' ? 'All members' : `${MIN_TIER_LABEL[benefit.minTier]} and above`}
                </span>
                {!canAccessTier(benefit.minTier) && (
                  <IconLock size={14} color="#9CA3AF" stroke={1.5} />
                )}
              </div>
            </div>

            <div style={{ height: 1, background: '#E4E8EF' }} />

            <div
              style={{
                padding: '12px 16px',
                fontSize: 12,
                color: '#6B7686',
                lineHeight: 1.6,
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              {benefit.description}
            </div>

            <div
              style={{
                padding: '0 16px 12px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 4,
              }}
            >
              {benefit.perks.map((perk) => (
                <div key={perk} style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                  <IconCheck size={12} color="#15803D" stroke={2} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: tokens.fontSize.sm, color: '#6B7686', lineHeight: 1.4 }}>{perk}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #E4E8EF',
              }}
            >
              {benefit.freeForAll ? (
                benefit.comingSoon ? (
                  <div>
                    <span
                      style={{
                        background: '#FEF3C7',
                        color: '#B45309',
                        fontSize: tokens.fontSize.sm,
                        fontWeight: tokens.fontWeight.bold,
                        borderRadius: tokens.radiusCard,
                        padding: '5px 12px',
                        display: 'inline-block',
                        fontFamily: 'Poppins, sans-serif',
                      }}
                    >
                      Coming soon
                    </span>
                    <div style={{ fontSize: tokens.fontSize.xs, color: '#9CA3AF', display: 'block', marginTop: 4 }}>
                      We'll notify you when this goes live
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBenefitCta(benefit.ctaAction)}
                    style={{
                      width: '100%',
                      background: '#1877D6',
                      color: '#fff',
                      borderRadius: tokens.radiusCard,
                      padding: 11,
                      fontSize: tokens.fontSize.md,
                      fontWeight: tokens.fontWeight.bold,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Poppins, sans-serif',
                      boxShadow: '0 3px 0 #0F52A8',
                    }}
                  >
                    {benefit.ctaLabel}
                  </button>
                )
              ) : !canAccessTier(benefit.minTier) ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <IconLock size={13} color="#9CA3AF" stroke={1.5} />
                    <span style={{ fontSize: 12, color: '#9CA3AF' }}>
                      Included with {MIN_TIER_LABEL[benefit.minTier]}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUpgradeStep('choose-tier');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      background: '#1877D6',
                      color: '#fff',
                      borderRadius: tokens.radiusCard,
                      padding: '6px 14px',
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.bold,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    Upgrade →
                  </button>
                </div>
              ) : benefit.comingSoon ? (

                <div>
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#B45309',
                      fontSize: tokens.fontSize.sm,
                      fontWeight: tokens.fontWeight.bold,
                      borderRadius: tokens.radiusCard,
                      padding: '5px 12px',
                      display: 'inline-block',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    Coming soon
                  </span>
                  <div style={{ fontSize: tokens.fontSize.xs, color: '#9CA3AF', display: 'block', marginTop: 4 }}>
                    Available now.
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBenefitCta(benefit.ctaAction)}
                  style={{
                    width: '100%',
                    background: '#1877D6',
                    color: '#fff',
                    borderRadius: tokens.radiusCard,
                    padding: 11,
                    fontSize: tokens.fontSize.md,
                    fontWeight: tokens.fontWeight.bold,
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                    boxShadow: '0 3px 0 #0F52A8',
                  }}
                >
                  {benefit.ctaLabel}
                </button>
              )}
            </div>
          </div>
        );
      })}

      <div
        style={{
          fontSize: tokens.fontSize.sm,
          fontWeight: tokens.fontWeight.semibold,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '8px 16px 6px',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        Deals and discounts
      </div>

      <div
        style={{
          margin: '0 16px 12px',
          background: '#fff',
          borderRadius: tokens.radiusCard,
          border: '1px solid #E4E8EF',
          boxShadow: '0 1px 3px rgba(11,31,58,0.06)',
          overflow: 'hidden',
        }}
      >
        {DEALS.map((deal, index) => {
          const Icon = deal.icon;
          const isLast = index === DEALS.length - 1;
          const dealAccess = canAccessTier(deal.minTier);
          return (
            <div
              key={deal.id}
              onClick={() => {
                if (deal.comingSoon) {
                  toast.info('Coming soon — check back shortly');
                } else {
                  // navigate to deal page when available
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '14px 16px',
                borderBottom: isLast ? 'none' : '1px solid #E4E8EF',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: deal.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={18} color={deal.iconColor} stroke={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: tokens.fontSize.base, fontWeight: tokens.fontWeight.bold, color: '#0B1F3A' }}>
                  {deal.name}
                </div>
                <div style={{ fontSize: tokens.fontSize.sm, color: '#6B7686', marginTop: 2 }}>
                  {deal.tagline}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    background: MIN_TIER_COLOR[deal.minTier].bg,
                    color: MIN_TIER_COLOR[deal.minTier].color,
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: tokens.radiusCard,
                    padding: '3px 8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  {deal.minTier === 'free' ? 'All members' : `${MIN_TIER_LABEL[deal.minTier]} and above`}
                </span>
                {!dealAccess ? (
                  <IconLock size={14} color="#9CA3AF" stroke={1.5} />
                ) : deal.comingSoon ? (
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#B45309',
                      fontSize: 9,
                      fontWeight: tokens.fontWeight.bold,
                      borderRadius: tokens.radiusCard,
                      padding: '2px 7px',
                      flexShrink: 0,
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    Soon
                  </span>
                ) : (
                  <IconChevronRight size={16} color="#C7D0DC" stroke={2} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compare plans */}
      <button
        type="button"
        onClick={() => setShowComparison((prev) => !prev)}
        style={{
          margin: '0 16px 12px',
          background: '#fff',
          borderRadius: tokens.radiusCard,
          border: '1px solid #E4E8EF',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <IconTable size={18} color="#1877D6" stroke={1.5} />
          <span style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: '#0B1F3A', fontFamily: 'Poppins, sans-serif' }}>
            Compare all plans
          </span>
        </div>
        <IconChevronDown
          size={16}
          color="#9CA3AF"
          stroke={2}
          style={{ transform: showComparison ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        />
      </button>

      {showComparison && (
        <div
          style={{
            margin: '0 16px 16px',
            background: '#fff',
            borderRadius: 8,
            border: '1px solid #E4E8EF',
            overflow: 'hidden',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr',
          }}
        >
          {/* Header row */}
          <div key="header-corner" style={{ padding: '10px 6px', borderBottom: '1px solid #E4E8EF' }} />
          {COLS.map((col) => (
            <div
              key={`header-${col.id}`}
              style={{
                padding: '10px 6px',
                textAlign: 'center',
                borderBottom: '1px solid #E4E8EF',
                background: col.id === websiteTier ? '#EFF6FF' : 'transparent',
              }}
            >
              <div
                style={{
                  fontSize: tokens.fontSize.xs,
                  fontWeight: tokens.fontWeight.bold,
                  color: col.id === websiteTier ? '#1877D6' : '#0B1F3A',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {col.name}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: col.id === websiteTier ? '#1877D6' : '#9CA3AF',
                  marginTop: 2,
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {col.price}
              </div>
              {col.id === websiteTier && (
                <span
                  style={{
                    background: '#1877D6',
                    color: '#fff',
                    fontSize: 8,
                    fontWeight: tokens.fontWeight.extrabold,
                    borderRadius: tokens.radiusCard,
                    padding: '1px 5px',
                    marginTop: 3,
                    display: 'block',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  YOUR PLAN
                </span>
              )}
            </div>
          ))}

          {/* Group rows */}
          {BENEFIT_COMPARISON.map((group) => (
            <div key={group.group} style={{ display: 'contents' }}>
              <div
                style={{
                  gridColumn: '1 / -1',
                  background: '#F8FAFC',
                  padding: '8px 12px',
                  fontSize: tokens.fontSize.xs,
                  fontWeight: tokens.fontWeight.bold,
                  color: '#9CA3AF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                {group.group}
              </div>
              {group.rows.map((row) => (
                <div key={row.label} style={{ display: 'contents' }}>
                  <div
                    style={{
                      padding: '9px 12px',
                      fontSize: tokens.fontSize.sm,
                      color: '#6B7686',
                      borderBottom: '1px solid #F1F5F9',
                      fontFamily: 'Poppins, sans-serif',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {row.label}
                  </div>
                  {COLS.map((col) => (
                    <div
                      key={`${row.label}-${col.id}`}
                      style={{
                        padding: '9px 6px',
                        textAlign: 'center',
                        borderBottom: '1px solid #F1F5F9',
                        background: col.id === websiteTier ? '#F7FAFE' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {TIER_INDEX[col.id] >= row.from ? (
                        <IconCheck size={14} color="#15803D" stroke={2} />
                      ) : (
                        <span style={{ fontSize: 12, color: '#D1D5DB' }}>—</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Bottom CTA row */}
          <div
            key="cta-corner"
            style={{ borderTop: '2px solid #E4E8EF', padding: '10px 0' }}
          />
          {COLS.map((col) => (
            <div
              key={`cta-${col.id}`}
              style={{
                textAlign: 'center',
                padding: 6,
                borderTop: '2px solid #E4E8EF',
              }}
            >
              {col.id === websiteTier ? (
                <span
                  style={{
                    background: '#EEF2F7',
                    color: '#9CA3AF',
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: tokens.radiusCard,
                    padding: '4px 8px',
                    border: 'none',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Current
                </span>
              ) : col.id === 'managed' ? (
                <button
                  type="button"
                  onClick={() =>
                    window.open(
                      'https://wa.me/447767693279?text=' +
                        encodeURIComponent("Hi, I'm interested in DSM Managed Website"),
                      '_blank',
                    )
                  }
                  style={{
                    background: '#D68A1B',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: tokens.radiusCard,
                    padding: '4px 8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Contact
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeStep('choose-tier');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  style={{
                    background: '#1877D6',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: tokens.fontWeight.bold,
                    borderRadius: tokens.radiusCard,
                    padding: '4px 8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  Upgrade
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upgrade overlay — domain + plan */}
      {upgradeStep !== 'idle' && upgradeStep !== 'processing' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#EEF2F7',
            zIndex: 200,
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              background: '#0B1F3A',
              padding: 16,
              display: 'flex',
              gap: 12,
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => setUpgradeStep('idle')}
              aria-label="Back"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#fff',
                display: 'flex',
              }}
            >
              <IconChevronLeft size={22} />
            </button>
            <div style={{ color: '#fff', fontSize: tokens.fontSize.xl, fontWeight: tokens.fontWeight.extrabold, fontFamily: 'Poppins, sans-serif' }}>
              Choose your plan
            </div>
          </div>

          <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
            {renderTiers(
              (tier) => {
                setChosenTier(tier);
                handleUpgrade(tier);
              },
              'Subscribe →',
            )}
          </div>
        </div>
      )}

      {upgradeStep === 'processing' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#EEF2F7',
            zIndex: 210,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <PageLoader />
          <div style={{ fontSize: tokens.fontSize.md, fontWeight: tokens.fontWeight.semibold, color: '#0B1F3A', fontFamily: 'Poppins, sans-serif' }}>
            Setting up your subscription...
          </div>
        </div>
      )}
    </div>
    </DSMTopSheet>
  );
}

