import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import InstructorTopBar from '@/components/dsm/InstructorTopBar';
import { PageLoader } from '@/components/dsm/LoadingSpinner';
import diaLogoAsset from '@/assets/dia-logo.png.asset.json';
import {
  IconCircleCheck,
  IconLock,
  IconCheck,
  IconRosetteDiscount,
  IconStethoscope,
  IconGift,
  IconShieldCheck,
  IconCamera,
  IconGasStation,
  IconCar,
  IconTool,
  IconChevronRight,
} from '@tabler/icons-react';

const BENEFITS = [
  {
    id: 'pirkx',
    name: 'pirkx Wellbeing',
    tagline: 'Health and wellbeing benefits',
    icon: 'stethoscope',
    iconBg: '#E6F1FB',
    iconColor: '#185FA5',
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
    iconBg: '#FBEAF0',
    iconColor: '#993556',
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
    iconBg: '#EAF3DE',
    iconColor: '#3B6D11',
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
];

const DEALS = [
  {
    id: 'dashcam',
    name: 'Dashcams',
    tagline: 'Up to 20% off for DSM members',
    icon: IconCamera,
    iconBg: '#EEF2F7',
    iconColor: '#0B1F3A',
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
    iconColor: '#92400E',
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
    iconColor: '#991B1B',
    description: 'Breakdown cover designed for driving instructors — includes dual-control vehicle cover and roadside assistance.',
    dealLabel: 'Get a quote →',
    comingSoon: true,
  },
];
];

function iconFor(name: string) {
  switch (name) {
    case 'stethoscope':
      return IconStethoscope;
    case 'gift':
      return IconGift;
    case 'school':
    default:
      return IconShieldCheck;
  }
}

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
  const [websiteTier, setWebsiteTier] = useState<string>('free');
  const [loading, setLoading] = useState(true);
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
    }
  }

  if (loading) return <PageLoader />;

  return (
    <div
      style={{
        background: '#EEF2F7',
        minHeight: '100vh',
        paddingBottom: 100,
      }}
    >
      <InstructorTopBar
        firstName=""
        pageTitle="Benefits"
        onBack={() => navigate({ to: '/home' as never })}
        onBell={() => navigate({ to: '/notifications' as never })}
        onPhone={() => navigate({ to: '/enquiries' as never })}
        onLiveTrack={() => navigate({ to: '/live' as never })}
        onMenu={() => {/* no-op */}}
        onMicPress={() => toast.info('Voice commands coming soon!')}
      />
      <div style={{ height: 'calc(60px + env(safe-area-inset-top, 0px))' }} />

      {isPaid ? (
        <div
          style={{
            margin: 16,
            background: 'linear-gradient(135deg, #15803D, #166534)',
            borderRadius: 20,
            padding: '16px 20px',
            boxShadow: '0 4px 0 #14532D',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <IconCircleCheck size={32} color="#fff" stroke={1.5} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
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
            borderRadius: 20,
            padding: 20,
            boxShadow: '0 4px 0 #091628',
          }}
        >
          <IconRosetteDiscount size={28} color="#fff" stroke={1.5} />
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#fff',
              marginTop: 8,
              marginBottom: 6,
            }}
          >
            Unlock your member benefits
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            Upgrade to DSM Pro to access private GP, DIA membership, 4,000+ discounts and exclusive HMCA health insurance.
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: '/minisite' as never })}
            style={{
              background: '#fff',
              color: '#14509E',
              borderRadius: 20,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 800,
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
          fontSize: 11,
          fontWeight: 600,
          color: '#9CA3AF',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '8px 16px 6px',
          fontFamily: 'Poppins, sans-serif',
        }}
      >
        Included benefits
      </div>

      {BENEFITS.map((benefit) => {
        const Icon = iconFor(benefit.icon);
        return (
          <div
            key={benefit.id}
            style={{
              margin: '0 16px 12px',
              background: '#fff',
              borderRadius: 16,
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
                  borderRadius: 10,
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
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <Icon size={20} color={benefit.iconColor} stroke={1.5} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0B1F3A' }}>
                  {benefit.name}
                </div>
                <div style={{ fontSize: 11, color: '#6B7686', marginTop: 2 }}>
                  {benefit.tagline}
                </div>
              </div>
              {benefit.exclusive && (
                <span
                  style={{
                    background: '#DCFCE7',
                    color: '#15803D',
                    fontSize: 9,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: '2px 8px',
                    flexShrink: 0,
                    fontFamily: 'Poppins, sans-serif',
                  }}
                >
                  DSM exclusive
                </span>
              )}
              {!isPaid && (
                <IconLock size={16} color="#9CA3AF" stroke={1.5} />
              )}
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
                gap: 5,
              }}
            >
              {benefit.perks.map((perk) => (
                <div key={perk} style={{ display: 'flex', gap: 5, alignItems: 'flex-start' }}>
                  <IconCheck size={12} color="#15803D" stroke={2} style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#6B7686', lineHeight: 1.4 }}>{perk}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #E4E8EF',
              }}
            >
              {!isPaid ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <IconLock size={13} color="#9CA3AF" stroke={1.5} />
                  <span style={{ fontSize: 13, color: '#9CA3AF' }}>Upgrade to unlock</span>
                </div>
              ) : benefit.comingSoon ? (
                <div>
                  <span
                    style={{
                      background: '#FEF3C7',
                      color: '#92400E',
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 20,
                      padding: '5px 12px',
                      display: 'inline-block',
                      fontFamily: 'Poppins, sans-serif',
                    }}
                  >
                    Coming soon
                  </span>
                  <div style={{ fontSize: 10, color: '#9CA3AF', display: 'block', marginTop: 4 }}>
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
                    borderRadius: 20,
                    padding: 11,
                    fontSize: 14,
                    fontWeight: 700,
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
    </div>
  );
}
