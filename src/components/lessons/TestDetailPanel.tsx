import React from 'react';
import { IconMapPin, IconClock, IconX, IconNavigation } from '@tabler/icons-react';

const PF = 'Poppins, sans-serif';

export type TestDetail = {
  pupilName: string;
  testCentre: string | null;
  startTime: string;
  endTime: string;
  testTime: string | null;
  durationLabel: string;
  dateLabel?: string;
  testResult?: string | null;
  onOpenLesson?: () => void;
  onNavigate?: () => void;
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '9px 0', borderBottom: '1px solid #EEF1F6' }}>
      <span style={{ fontSize: 12, color: '#6B7686', fontFamily: PF, fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#0B1F3A', fontFamily: PF, fontWeight: 700, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

export function TestDetailPanel({ detail, onClose }: { detail: TestDetail; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11,31,58,0.45)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          width: '100%',
          maxWidth: 480,
          borderRadius: '16px 16px 0 0',
          padding: 16,
          paddingBottom: 'calc(16px + 80px + env(safe-area-inset-bottom))',
          fontFamily: PF,
          boxShadow: '0 -8px 32px rgba(11,31,58,0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            background: 'linear-gradient(135deg, #1877D6, #0B1F3A)',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            borderRadius: 20,
            padding: '3px 10px',
            letterSpacing: '0.08em',
          }}>
            🚗 TEST DAY
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: '#F2F5F9', border: 'none', borderRadius: 20, width: 30, height: 30, display: 'grid', placeItems: 'center', cursor: 'pointer' }}
          >
            <IconX size={16} stroke={2} color="#0B1F3A" />
          </button>
        </div>

        <div style={{ fontSize: 20, fontWeight: 800, color: '#0B1F3A', letterSpacing: -0.3 }}>{detail.pupilName}</div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 12, background: '#F2F7FD', borderRadius: 16, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <IconClock size={18} stroke={1.8} color="#1877D6" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1877D6', fontFamily: PF }}>
              {detail.dateLabel || 'Test date'}
            </span>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#0B1F3A', fontFamily: PF, fontVariantNumeric: 'tabular-nums' }}>
            {detail.startTime} – {detail.endTime}
          </span>
        </div>

        <div style={{ marginTop: 10 }}>
          <Row label="Test appointment" value={detail.testTime ? detail.testTime : 'Not set'} />
          <Row label="Pick-up" value={detail.startTime} />
          <Row label="Finish" value={detail.endTime} />
          <Row label="Duration" value={detail.durationLabel} />
          <Row
            label="Result"
            value={detail.testResult === 'pass' ? '✓ Passed' : detail.testResult === 'fail' ? '✗ Failed' : 'Pending'}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12 }}>
          <IconMapPin size={16} stroke={1.8} color="#1877D6" style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: '#6B7686', fontWeight: 600, letterSpacing: '0.06em' }}>TEST CENTRE</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: detail.testCentre ? '#0B1F3A' : '#98A2B3', fontStyle: detail.testCentre ? 'normal' : 'italic' }}>
              {detail.testCentre || 'Test centre not set'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          {detail.onNavigate ? (
            <button
              type="button"
              onClick={() => { onClose(); detail.onNavigate?.(); }}
              style={{ flex: 1, background: '#F2F5F9', color: '#0B1F3A', border: 'none', borderRadius: 20, padding: '11px 14px', fontFamily: PF, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <IconNavigation size={15} stroke={1.8} /> Navigate
            </button>
          ) : null}
          {detail.onOpenLesson ? (
            <button
              type="button"
              onClick={() => { onClose(); detail.onOpenLesson?.(); }}
              style={{ flex: 1, background: 'linear-gradient(135deg, #1877D6, #0B1F3A)', color: '#fff', border: 'none', borderRadius: 20, padding: '11px 14px', fontFamily: PF, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
            >
              Open lesson
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Wraps a tile: renders children with an `open` callback, shows the panel on tap. */
export function TestDetailTrigger({
  detail,
  children,
}: {
  detail: TestDetail;
  children: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {children(() => setOpen(true))}
      {open ? <TestDetailPanel detail={detail} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export default TestDetailPanel;
