import { useEffect } from 'react';

interface RowDrawerProps {
  row: Record<string, unknown> | null;
  headers: string[];
  isOpen: boolean;
  onClose: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function cellStr(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/** Strip leading asterisks and trim — headers like "*A/A" → "A/A" */
function cleanLabel(header: string): string {
  return header.replace(/^\*+/, '').trim();
}

function isUrl(value: unknown): boolean {
  return /^https?:\/\//i.test(cellStr(value).trim());
}

type FlagKind = 'active' | 'yes' | 'no' | 'empty';

function flagKind(value: unknown): FlagKind | null {
  const s = cellStr(value).trim().toUpperCase();
  if (s === 'X') return 'active';
  if (s === 'Y' || s === 'YES') return 'yes';
  if (s === 'N' || s === 'NO') return 'no';
  if (s === '' || s === '-' || s === '_') return 'empty';
  return null;
}

// ── Field grouping ────────────────────────────────────────────────────────────

interface KvItem { header: string; value: unknown }

interface DrawerSections {
  id: string;
  title: string;
  kvItems: KvItem[];
  activeSystems: KvItem[];     // flag === 'active' (X)
  statusItems: KvItem[];       // flag === 'yes' | 'no'
  urlItems: KvItem[];
}

function buildSections(headers: string[], row: Record<string, unknown>): DrawerSections {
  const kvItems: KvItem[] = [];
  const activeSystems: KvItem[] = [];
  const statusItems: KvItem[] = [];
  const urlItems: KvItem[] = [];

  headers.forEach((h) => {
    const v = row[h];
    if (isUrl(v)) {
      urlItems.push({ header: h, value: v });
      return;
    }
    const kind = flagKind(v);
    if (kind === 'active') {
      activeSystems.push({ header: h, value: v });
    } else if (kind === 'yes' || kind === 'no') {
      statusItems.push({ header: h, value: v });
    } else if (kind === 'empty') {
      // silently drop '-' / '_' / '' flag cells — not relevant
    } else {
      kvItems.push({ header: h, value: v });
    }
  });

  // Title = first short non-numeric kv value
  let title = '';
  let id = '';
  for (const item of kvItems) {
    const s = cellStr(item.value).trim();
    if (!id && !isNaN(Number(s)) && s !== '') {
      id = s;
      continue;
    }
    if (!title && s.length > 0 && s.length <= 60 && isNaN(Number(s))) {
      title = s;
    }
    if (id && title) break;
  }

  return { id, title: title || 'Row', kvItems, activeSystems, statusItems, urlItems };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'Sora, sans-serif',
        fontWeight: 700,
        fontSize: '0.6875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#9CA3AF',
        margin: '0 0 12px 0',
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: '#F3F4F6', margin: '20px 0' }} />;
}

function KvRow({ header, value }: { header: string; value: unknown }) {
  const str = cellStr(value);
  const isLong = str.length > 50;

  return (
    <div
      style={{
        display: isLong ? 'block' : 'flex',
        alignItems: isLong ? undefined : 'flex-start',
        gap: 8,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: '0.75rem',
          color: '#9CA3AF',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          minWidth: isLong ? undefined : 140,
          display: 'block',
          marginBottom: isLong ? 4 : 0,
        }}
      >
        {cleanLabel(header)}
      </span>
      <span
        style={{
          fontFamily: isLong ? 'Sora, sans-serif' : 'IBM Plex Mono, monospace',
          fontSize: '0.8125rem',
          color: '#111827',
          fontWeight: 500,
          wordBreak: 'break-word',
          lineHeight: 1.5,
        }}
      >
        {str || <span style={{ color: '#D1D5DB' }}>—</span>}
      </span>
    </div>
  );
}

function SystemChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        backgroundColor: '#EBF5F5',
        border: '1.5px solid #C6E4E4',
        borderRadius: 8,
        padding: '4px 10px',
        fontFamily: 'Sora, sans-serif',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#0D6E6E',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="#0D6E6E" />
      </svg>
      {cleanLabel(label)}
    </span>
  );
}

function StatusRow({ header, kind }: { header: string; kind: 'yes' | 'no' }) {
  const isYes = kind === 'yes';
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 0',
        borderBottom: '1px solid #F9F7F4',
      }}
    >
      <span
        style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: '0.8125rem',
          color: '#374151',
        }}
      >
        {cleanLabel(header)}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: 'Sora, sans-serif',
          fontSize: '0.75rem',
          fontWeight: 600,
          color: isYes ? '#16A34A' : '#C2410C',
          backgroundColor: isYes ? '#F0FDF4' : '#FFF7ED',
          border: `1px solid ${isYes ? '#BBF7D0' : '#FED7AA'}`,
          borderRadius: 6,
          padding: '3px 8px',
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          {isYes ? (
            <path d="M1.5 5L3.5 7L8.5 2.5" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <>
              <path d="M2.5 2.5L7.5 7.5" stroke="#C2410C" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7.5 2.5L2.5 7.5" stroke="#C2410C" strokeWidth="1.5" strokeLinecap="round" />
            </>
          )}
        </svg>
        {isYes ? 'Yes' : 'No'}
      </span>
    </div>
  );
}

function UrlCard({ header, value }: { header: string; value: unknown }) {
  const href = cellStr(value).trim();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        border: '1.5px solid #E5E7EB',
        borderRadius: 10,
        textDecoration: 'none',
        marginBottom: 8,
        transition: 'border-color 0.15s, background 0.15s',
        backgroundColor: '#FAFAFA',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0D6E6E';
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#EBF5F5';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E5E7EB';
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#FAFAFA';
      }}
    >
      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.8125rem', fontWeight: 500, color: '#0D6E6E' }}>
        {cleanLabel(header)}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'Sora, sans-serif',
          fontSize: '0.75rem',
          color: '#0D6E6E',
          backgroundColor: '#EBF5F5',
          border: '1px solid #C6E4E4',
          borderRadius: 6,
          padding: '3px 8px',
        }}
      >
        Open ↗
      </span>
    </a>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RowDrawer({ row, headers, isOpen, onClose }: RowDrawerProps) {
  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [isOpen, onClose]);

  // Always render so the close animation plays correctly
  const sections = row ? buildSections(headers, row) : null;

  return (
    <>
      {/* Backdrop — subtle, doesn't block the table */}
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          top: 60,
          backgroundColor: 'rgba(0,0,0,0.12)',
          backdropFilter: 'blur(1px)',
          zIndex: 29,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.28s ease',
        }}
      />

      {/* Drawer panel */}
      <aside
        role="complementary"
        aria-label="Row details"
        style={{
          position: 'fixed',
          right: 0,
          top: 60,
          width: 'min(460px, 92vw)',
          height: 'calc(100vh - 60px)',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E5E7EB',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 30,
          overflowY: 'auto',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.08)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {sections && row && (
          <>
            {/* ── Drawer header ─────────────────────────────────────── */}
            <div
              style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #F3F4F6',
                position: 'sticky',
                top: 0,
                backgroundColor: '#FFFFFF',
                zIndex: 1,
              }}
            >
              {/* Top row: ID badge + close button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {sections.id && (
                    <span
                      style={{
                        fontFamily: 'IBM Plex Mono, monospace',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#FFFFFF',
                        backgroundColor: '#0D6E6E',
                        borderRadius: 6,
                        padding: '3px 9px',
                      }}
                    >
                      #{sections.id}
                    </span>
                  )}
                  {/* Active system count badge */}
                  {sections.activeSystems.length > 0 && (
                    <span
                      style={{
                        fontFamily: 'Sora, sans-serif',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        color: '#0D6E6E',
                        backgroundColor: '#EBF5F5',
                        border: '1px solid #C6E4E4',
                        borderRadius: 20,
                        padding: '2px 8px',
                      }}
                    >
                      {sections.activeSystems.length} system{sections.activeSystems.length !== 1 ? 's' : ''} affected
                    </span>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  aria-label="Close detail panel"
                  style={{
                    width: 32,
                    height: 32,
                    border: '1.5px solid #E5E7EB',
                    borderRadius: 8,
                    backgroundColor: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FEF2F2';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#FECACA';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF';
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M1 1L11 11M11 1L1 11" stroke="#6B7280" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Title */}
              <h2
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.0625rem',
                  color: '#111827',
                  margin: 0,
                  lineHeight: 1.3,
                  wordBreak: 'break-word',
                }}
              >
                {sections.title}
              </h2>
            </div>

            {/* ── Scrollable body ────────────────────────────────────── */}
            <div style={{ padding: '20px 24px', flex: 1 }}>

              {/* DETAILS section */}
              {sections.kvItems.length > 0 && (
                <>
                  <SectionLabel>Details</SectionLabel>
                  {sections.kvItems.map(({ header, value }) => (
                    <KvRow key={header} header={header} value={value} />
                  ))}
                </>
              )}

              {/* ACTIVE SYSTEMS section */}
              {sections.activeSystems.length > 0 && (
                <>
                  <Divider />
                  <SectionLabel>Active Systems</SectionLabel>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {sections.activeSystems.map(({ header }) => (
                      <SystemChip key={header} label={header} />
                    ))}
                  </div>
                </>
              )}

              {/* No active systems note */}
              {sections.activeSystems.length === 0 && sections.statusItems.length > 0 && (
                <>
                  <Divider />
                  <p
                    style={{
                      fontFamily: 'Sora, sans-serif',
                      fontSize: '0.8125rem',
                      color: '#9CA3AF',
                      fontStyle: 'italic',
                      margin: 0,
                    }}
                  >
                    No systems marked as affected.
                  </p>
                </>
              )}

              {/* STATUS section */}
              {sections.statusItems.length > 0 && (
                <>
                  <Divider />
                  <SectionLabel>Status</SectionLabel>
                  <div>
                    {sections.statusItems.map(({ header, value }) => {
                      const kind = flagKind(value);
                      if (kind !== 'yes' && kind !== 'no') return null;
                      return <StatusRow key={header} header={header} kind={kind} />;
                    })}
                  </div>
                </>
              )}

              {/* LINKS section */}
              {sections.urlItems.length > 0 && (
                <>
                  <Divider />
                  <SectionLabel>Links</SectionLabel>
                  {sections.urlItems.map(({ header, value }) => (
                    <UrlCard key={header} header={header} value={value} />
                  ))}
                </>
              )}

              {/* Empty row fallback */}
              {sections.kvItems.length === 0 &&
                sections.activeSystems.length === 0 &&
                sections.statusItems.length === 0 &&
                sections.urlItems.length === 0 && (
                  <p style={{ fontFamily: 'Sora, sans-serif', color: '#9CA3AF', textAlign: 'center', paddingTop: 40 }}>
                    No data for this row.
                  </p>
                )}

              {/* Bottom padding */}
              <div style={{ height: 32 }} />
            </div>
          </>
        )}
      </aside>
    </>
  );
}
