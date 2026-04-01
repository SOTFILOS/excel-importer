import FileUpload from './FileUpload';

interface LandingPageProps {
  onFileSelect: (file: File) => void;
}

// ── Mini chart illustrations ──────────────────────────────────────────────────

function MiniBarChart() {
  const bars = [85, 60, 45, 72, 30, 90];
  return (
    <svg viewBox="0 0 80 48" width="80" height="48" aria-hidden="true">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 13 + 2}
          y={48 - h * 0.44}
          width={10}
          height={h * 0.44}
          rx={2}
          fill={h >= 70 ? '#22C55E' : h >= 40 ? '#4F46E5' : '#EF4444'}
          opacity={0.85}
        />
      ))}
    </svg>
  );
}

function MiniPieChart() {
  // Completed 40%, In Progress 45%, Delayed 15%
  const slices = [
    { pct: 0.40, color: '#22C55E' },
    { pct: 0.45, color: '#4F46E5' },
    { pct: 0.15, color: '#EF4444' },
  ];
  const cx = 24, cy = 24, r = 20, inner = 11;
  let angle = -Math.PI / 2;

  return (
    <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      {slices.map((s, i) => {
        const sweep = s.pct * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(angle + sweep);
        const y2 = cy + r * Math.sin(angle + sweep);
        const ix1 = cx + inner * Math.cos(angle);
        const iy1 = cy + inner * Math.sin(angle);
        const ix2 = cx + inner * Math.cos(angle + sweep);
        const iy2 = cy + inner * Math.sin(angle + sweep);
        const large = sweep > Math.PI ? 1 : 0;
        const path = `M${ix1} ${iy1} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${ix2} ${iy2} A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`;
        angle += sweep;
        return <path key={i} d={path} fill={s.color} opacity={0.9} />;
      })}
    </svg>
  );
}

function MiniRadarChart() {
  const N = 6;
  const cx = 28, cy = 28, R = 22;
  const values = [0.9, 0.6, 0.75, 0.5, 0.85, 0.65];
  const gridLevels = [0.33, 0.66, 1];
  const pts = (scale: number) =>
    Array.from({ length: N }, (_, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
      return `${cx + scale * R * Math.cos(a)},${cy + scale * R * Math.sin(a)}`;
    }).join(' ');
  const dataPts = values
    .map((v, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
      return `${cx + v * R * Math.cos(a)},${cy + v * R * Math.sin(a)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      {gridLevels.map((s) => (
        <polygon key={s} points={pts(s)} fill="none" stroke="#E2E0D8" strokeWidth="1" />
      ))}
      {Array.from({ length: N }, (_, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / N;
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)}
            stroke="#E2E0D8" strokeWidth="1"
          />
        );
      })}
      <polygon points={dataPts} fill="#4F46E5" fillOpacity="0.25" stroke="#4F46E5" strokeWidth="1.5" />
    </svg>
  );
}

// ── Feature card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  desc,
  accent,
  bg,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  bg: string;
}) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E0D8',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          backgroundColor: bg,
          border: `1px solid ${accent}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '0.875rem', color: '#0F172A', margin: 0 }}>
          {title}
        </p>
        <p style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.75rem', color: '#64748B', margin: '3px 0 0', lineHeight: 1.5 }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

// ── Step badge ────────────────────────────────────────────────────────────────

function Step({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #4F46E5, #0D9488)',
          color: '#FFFFFF',
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 700,
          fontSize: '0.6875rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {n}
      </div>
      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.8125rem', color: '#374151' }}>{label}</span>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function LandingPage({ onFileSelect }: LandingPageProps) {
  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '48px 24px 60px',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) minmax(0,420px)',
        gap: 48,
        alignItems: 'start',
      }}
    >
      {/* ── Left col ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Hero text */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#EEF0F8',
              border: '1px solid #C7D2FE',
              borderRadius: 20,
              padding: '4px 12px',
              marginBottom: 16,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <circle cx="6" cy="6" r="6" fill="#4F46E5" />
              <path d="M3.5 6L5 7.5L8.5 4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.6875rem', fontWeight: 600, color: '#4F46E5' }}>
              Project Analytics Tool
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
              color: '#0F172A',
              margin: '0 0 14px',
              lineHeight: 1.2,
              letterSpacing: '-0.03em',
            }}
          >
            Ανέβασε το Excel σου,{' '}
            <span className="gradient-text">δες τα projects σου</span>{' '}
            σε γραφήματα
          </h1>

          <p style={{ fontFamily: 'Sora, sans-serif', color: '#64748B', fontSize: '1rem', margin: 0, lineHeight: 1.7 }}>
            Διάβασε οποιοδήποτε <strong>.xlsx</strong> αρχείο και απέκτησε αμέσως
            πλήρη εικόνα της προόδου — με αυτόματο υπολογισμό progress, status
            ανά project και interactive γραφήματα.
          </p>
        </div>

        {/* Features grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FeatureCard
            icon={<MiniBarChart />}
            title="Bar Chart Progress"
            desc="Πρόοδος % ανά project με χρωματισμό κατά status"
            accent="#4F46E5"
            bg="#EEF0F8"
          />
          <FeatureCard
            icon={<MiniPieChart />}
            title="Pie Chart Status"
            desc="Completed / In Progress / Delayed σε μια ματιά"
            accent="#22C55E"
            bg="#F0FDF4"
          />
          <FeatureCard
            icon={<MiniRadarChart />}
            title="Radar / Spider Chart"
            desc="Portfolio health radar για Y/N κριτήρια"
            accent="#0D9488"
            bg="#EBF5F5"
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <rect x="2" y="1" width="14" height="18" rx="2" stroke="#EA580C" strokeWidth="1.4" />
                <path d="M6 7h7M6 10.5h7M6 14h4" stroke="#EA580C" strokeWidth="1.3" strokeLinecap="round" />
                <path d="M14 15l2 2 4-4" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
            title="Export Excel"
            desc="Εξαγωγή .xlsx με υπολογισμένες στήλες Progress & Status"
            accent="#EA580C"
            bg="#FFF7ED"
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <circle cx="11" cy="11" r="9" stroke="#7C3AED" strokeWidth="1.4" />
                <path d="M7 11h8M11 7v8" stroke="#7C3AED" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            }
            title="Φίλτρο Project Manager"
            desc="Εμφάνιση projects ανά PM με ένα κλικ"
            accent="#7C3AED"
            bg="#F5F3FF"
          />
          <FeatureCard
            icon={
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                <rect x="2" y="2" width="8" height="8" rx="2" fill="#0EA5E9" fillOpacity="0.2" stroke="#0EA5E9" strokeWidth="1.3" />
                <rect x="12" y="2" width="8" height="8" rx="2" fill="#0EA5E9" fillOpacity="0.1" stroke="#0EA5E9" strokeWidth="1.3" />
                <rect x="2" y="12" width="8" height="8" rx="2" fill="#0EA5E9" fillOpacity="0.1" stroke="#0EA5E9" strokeWidth="1.3" />
                <rect x="12" y="12" width="8" height="8" rx="2" fill="#0EA5E9" fillOpacity="0.2" stroke="#0EA5E9" strokeWidth="1.3" />
              </svg>
            }
            title="Cards & Table view"
            desc="Δύο modes προβολής με search και pagination"
            accent="#0EA5E9"
            bg="#F0F9FF"
          />
        </div>

        {/* Steps */}
        <div
          style={{
            backgroundColor: '#FAFBFF',
            border: '1px solid #E2E0D8',
            borderRadius: 14,
            padding: '16px 20px',
            display: 'flex',
            gap: 28,
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Πώς λειτουργεί
          </span>
          <Step n={1} label="Ανέβασε το .xlsx αρχείο σου" />
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <Step n={2} label="Δες data, γραφήματα & status" />
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <Step n={3} label="Εξήγαγε το ενημερωμένο Excel" />
        </div>
      </div>

      {/* ── Right col: Upload ─────────────────────────────────────────── */}
      <div
        style={{
          position: 'sticky',
          top: 88,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E0D8',
            borderRadius: 20,
            padding: '28px 24px',
            boxShadow: '0 8px 40px -8px rgba(79,70,229,0.15)',
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.0625rem', color: '#0F172A', margin: 0 }}>
              Ξεκίνα εδώ
            </p>
            <p style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.8125rem', color: '#64748B', margin: '4px 0 0' }}>
              Ανέβασε το Excel αρχείο σου για να ξεκινήσει η ανάλυση
            </p>
          </div>

          <FileUpload onFileSelect={onFileSelect} />
        </div>

        {/* Supported formats */}
        <div
          style={{
            backgroundColor: '#F7F5F2',
            border: '1px solid #E2E0D8',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="7" stroke="#94A3B8" strokeWidth="1.3" />
            <path d="M8 5v3.5M8 10.5V11" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.75rem', color: '#64748B' }}>
            Υποστηρίζει <strong>.xlsx</strong> και <strong>.xls</strong> — τα δεδομένα παραμένουν τοπικά στον browser σου
          </span>
        </div>
      </div>
    </div>
  );
}
