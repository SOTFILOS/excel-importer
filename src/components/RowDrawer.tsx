import { useEffect, useState, useMemo, useCallback } from 'react';
import { DOC_COL_HEADER } from '../utils/constants';
import { findDocumentationUrl, DOC_KEYWORDS, DOC_DOMAINS } from '../utils/docUtils';

interface RowDrawerProps {
  row: Record<string, unknown> | null;
  headers: string[];
  isOpen: boolean;
  onClose: () => void;
  disableDocs?: boolean;
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

  const lc = (s: string) => s.trim().toLowerCase();
  const hasValue = (v: unknown) => {
    const s = cellStr(v).trim();
    return s !== '';
  };

  // Build title as: Item Description OR Project Name OR PBI Id OR AfterCare/Redmine Id
  // + 'σαφή επιχειρησιακή περιγραφή των αλλαγών που υλοποιούνται' (if present)
  const isItemDesc = (hl: string) => hl.includes('item') && (hl.includes('descr') || hl.includes('description'));
  const isProjectName = (hl: string) => hl.includes('project') && hl.includes('name');
  const isPBI = (hl: string) => /\bpbi\b/.test(hl);
  const isRedmineId = (hl: string) =>
    ((hl.includes('redmine') || hl.includes('ticket')) && hl.includes('id')) ||
    (hl.includes('after') && hl.includes('care') && (hl.includes('id') || hl.includes('redmine')));
  const isBizDesc = (hl: string) =>
    hl.includes('σαφή') && hl.includes('επιχειρησιακ') && hl.includes('περιγραφ') && hl.includes('αλλαγ');
  const isBlocked = (hl: string) =>
    /\btitle\b/.test(hl) || ((hl.includes('tech') || hl.includes('teck')) && hl.includes('team'));

  let itemDescVal = '', itemDescHeader: string | null = null;
  let projNameVal = '', projNameHeader: string | null = null;
  let pbiVal = '', pbiHeader: string | null = null;
  let redmineVal = '', redmineHeader: string | null = null;
  let bizDescVal = '', bizDescHeader: string | null = null;

  for (const h of headers) {
    const v = row[h];
    if (!hasValue(v)) continue;
    const s = cellStr(v).trim();
    const hl = lc(h);
    if (!bizDescVal && isBizDesc(hl)) { bizDescVal = s; bizDescHeader = h; continue; }
    if (!itemDescVal && isItemDesc(hl)) { itemDescVal = s; itemDescHeader = h; continue; }
    if (!projNameVal && isProjectName(hl)) { projNameVal = s; projNameHeader = h; continue; }
    if (!pbiVal && isPBI(hl)) { pbiVal = s; pbiHeader = h; continue; }
    if (!redmineVal && isRedmineId(hl)) { redmineVal = s; redmineHeader = h; continue; }
  }

  let primaryTitle = itemDescVal || projNameVal || pbiVal || redmineVal || '';
  let titleHeader: string | null =
    primaryTitle === itemDescVal ? itemDescHeader
    : primaryTitle === projNameVal ? projNameHeader
    : primaryTitle === pbiVal ? pbiHeader
    : primaryTitle === redmineVal ? redmineHeader
    : null;

  // Fallback for title if still empty: first reasonable non-numeric, excluding blocked headers
  if (!primaryTitle) {
    for (const item of kvItems) {
      const s = cellStr(item.value).trim();
      const hl = lc(item.header);
      if (s && !isNaN(Number(s))) continue;
      if (s && !isBlocked(hl) && !s.includes('@') && s.length <= 80) {
        primaryTitle = s;
        titleHeader = item.header;
        break;
      }
    }
  }

  // Compose final title with business description
  const title = [primaryTitle || 'Row', bizDescVal].filter(Boolean).join(' + ');

  // ID: prefer numeric PBI/Redmine, else first numeric from kvItems
  let id = '';
  if (pbiVal && !isNaN(Number(pbiVal))) id = pbiVal;
  else if (redmineVal && !isNaN(Number(redmineVal))) id = redmineVal;
  if (!id) {
    for (const item of kvItems) {
      const s = cellStr(item.value).trim();
      if (s !== '' && !isNaN(Number(s))) { id = s; break; }
    }
  }

  // Exclude used headers (title sources and biz desc) from Details
  const used = new Set<string>();
  if (titleHeader) used.add(titleHeader);
  if (bizDescHeader && bizDescVal) used.add(bizDescHeader);
  const filteredKvItems = kvItems.filter((it) => !used.has(it.header));

  return { id, title, kvItems: filteredKvItems, activeSystems, statusItems, urlItems };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
        fontWeight: 700,
        fontSize: '0.6875rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#94A3B8',
        margin: '0 0 12px 0',
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: '#E2E0D8', margin: '20px 0' }} />;
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
          fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
          fontSize: '0.75rem',
          color: '#94A3B8',
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
          fontFamily: isLong ? 'Roboto, Arial, Helvetica, sans-serif' : 'JetBrains Mono, monospace',
          fontSize: '0.8125rem',
          color: '#0F172A',
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
        fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#0D9488',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="8" height="8" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="#0D9488" />
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
        borderBottom: '1px solid #E2E0D8',
      }}
    >
      <span
        style={{
          fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
          fontSize: '0.8125rem',
          color: '#1F2937',
        }}
      >
        {cleanLabel(header)}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
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

// ── Status donut chart ────────────────────────────────────────────────────────

/** Systems summary with names for the project */
function SystemsCount({ names }: { names: string[] }) {
  const count = names.length;
  if (count <= 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        backgroundColor: '#F3F1EE',
        border: '1px solid #E2E0D8',
        borderRadius: 14,
        padding: '14px 18px',
        marginBottom: 18,
      }}
    >
      {/* Circular badge with count */}
      <div
        style={{
          width: 76,
          height: 76,
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          border: '7px solid #0D9488',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'inset 0 0 0 2px #C6E4E4',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '1rem',
            fontWeight: 700,
            color: '#0F172A',
            lineHeight: 1,
          }}
        >
          {count}
        </span>
      </div>

      {/* Labels + names */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <p
            style={{
              fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
              fontSize: '0.625rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#94A3B8',
              margin: 0,
            }}
          >
            Systems
          </p>
          <p
            style={{
              fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
              fontSize: '0.8125rem',
              color: '#1F2937',
              margin: 0,
            }}
          >
            Names of systems referenced by this project
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {names.map((label) => (
            <SystemChip key={label} label={label} />
          ))}
        </div>
      </div>
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
        border: '1.5px solid #E2E0D8',
        borderRadius: 10,
        textDecoration: 'none',
        marginBottom: 8,
        transition: 'border-color 0.15s, background 0.15s',
        backgroundColor: '#FAFBFF',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0D9488';
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#EBF5F5';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E2E0D8';
        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#FAFBFF';
      }}
    >
      <span style={{ fontFamily: 'Roboto, Arial, Helvetica, sans-serif', fontSize: '0.8125rem', fontWeight: 500, color: '#0D9488' }}>
        {cleanLabel(header)}
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
          fontSize: '0.75rem',
          color: '#0D9488',
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

export default function RowDrawer({ row, headers, isOpen, onClose, disableDocs }: RowDrawerProps) {
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

  // Documentation quick access state, derived from the row
  const initialDoc = useMemo(() => {
    if (!row) return '';
    if (disableDocs) return '';
    const fromCol = cellStr((row as any)[DOC_COL_HEADER] ?? '').trim();
    if (fromCol) return fromCol;
    return findDocumentationUrl(headers, row) ?? '';
  }, [row, headers, disableDocs]);

  const [docInput, setDocInput] = useState<string>(initialDoc);
  useEffect(() => { setDocInput(initialDoc); }, [initialDoc]);

  function normalizeUrlLocal(input: string): string {
    const t = input.trim();
    if (!t) return '';
    if (/^https?:\/\//i.test(t)) return t;
    if (/^[\w.-]+\.[a-z]{2,}([/:?].*)?$/i.test(t)) return `https://${t}`;
    return t;
  }

  function looksLikeDocumentationUrl(input: string): boolean {
    const url = input.trim().toLowerCase();
    if (!url) return false;
    return DOC_DOMAINS.some((d) => url.includes(d)) || DOC_KEYWORDS.some((k) => url.includes(k));
  }

  const normalizedDocUrl = useMemo(() => normalizeUrlLocal(docInput), [docInput]);
  const isValidDoc = useMemo(() => isUrl(normalizedDocUrl), [normalizedDocUrl]);
  const openDocs = useCallback(() => {
    if (isValidDoc && normalizedDocUrl) {
      window.open(normalizedDocUrl, '_blank', 'noopener,noreferrer');
    }
  }, [isValidDoc, normalizedDocUrl]);

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
          borderLeft: '1px solid #E2E0D8',
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
                borderBottom: '1px solid #E2E0D8',
                position: 'sticky',
                top: 0,
                background: 'linear-gradient(180deg, #FAFBFF 0%, #FFFFFF 100%)',
                zIndex: 1,
              }}
            >
              {/* Top row: Title first + close button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <h2
                  style={{
                    fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                    fontWeight: 700,
                    fontSize: '1.0625rem',
                    color: '#000000',
                    margin: 0,
                    lineHeight: 1.3,
                    wordBreak: 'break-word',
                  }}
                >
                  {sections.title}
                </h2>

                {/* Close button */}
                <button
                  onClick={onClose}
                  aria-label="Close detail panel"
                  style={{
                    width: 32,
                    height: 32,
                    border: '1.5px solid #E2E0D8',
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
                    (e.currentTarget as HTMLButtonElement).style.borderColor = '#E2E0D8';
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M1 1L11 11M11 1L1 11" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              {/* Meta row: ID badge + Active system count */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {sections.id && (
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      backgroundColor: '#0D9488',
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
                      fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      color: '#0D9488',
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
            </div>

            {/* ── Scrollable body ────────────────────────────────────── */}
            <div style={{ padding: '20px 24px', flex: 1 }}>
              {/* DOCUMENTATION quick access */}
              {!disableDocs && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '1px dashed #C7D2FE',
                    borderRadius: 12,
                    padding: 12,
                    marginBottom: 18,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span
                      style={{
                        fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: '#4F46E5',
                        letterSpacing: '0.02em',
                      }}
                    >
                      Documentation
                    </span>
                    <button
                      type="button"
                      onClick={openDocs}
                      disabled={!isValidDoc}
                      style={{
                        fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: isValidDoc ? 'pointer' : 'not-allowed',
                        color: isValidDoc ? '#FFFFFF' : '#94A3B8',
                        backgroundColor: isValidDoc ? '#4F46E5' : '#E2E0D8',
                        transition: 'opacity 0.15s',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                      aria-label="Open documentation link in a new tab"
                      title={isValidDoc ? 'Open documentation' : 'Enter a valid URL to enable'}
                    >
                      Open ↗
                    </button>
                  </div>
                  <input
                    type="url"
                    inputMode="url"
                    placeholder="Paste documentation link or edit detected one…"
                    value={docInput}
                    onChange={(e) => setDocInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        openDocs();
                      }
                    }}
                    style={{
                      width: '100%',
                      fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                      fontSize: '0.875rem',
                      color: '#0F172A',
                      border: `1.5px solid ${docInput ? (isValidDoc ? '#C7D2FE' : '#FCA5A5') : '#E2E0D8'}`,
                      borderRadius: 8,
                      padding: '8px 10px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                    aria-invalid={!!docInput && !isValidDoc}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                      fontSize: '0.75rem',
                      color: docInput && !isValidDoc ? '#DC2626' : '#94A3B8',
                    }}
                  >
                    {docInput && !isValidDoc
                      ? 'Enter a valid URL starting with http(s) or a domain name.'
                      : 'Tip: Press Enter to open immediately.'}
                  </p>
                </div>
              )}

              {/* DETAILS section */}
              {sections.kvItems.length > 0 && (
                <>
                  <SectionLabel>Details</SectionLabel>
                  {sections.kvItems.map(({ header, value }) => (
                    <KvRow key={header} header={header} value={value} />
                  ))}
                </>
              )}



              {/* SYSTEMS summary */}
              {sections.activeSystems.length > 0 && (
                <>
                  <Divider />
                  <SectionLabel>Systems</SectionLabel>
                  <SystemsCount names={sections.activeSystems.map(({ header }) => header)} />
                </>
              )}

              {/* LINKS section */}
              {(() => {
                const otherLinks = sections.urlItems.filter(({ value }) => {
                  const href = cellStr(value).trim();
                  if (!href) return false;
                  if (normalizedDocUrl && href.toLowerCase() === normalizedDocUrl.toLowerCase()) return false;
                  return !looksLikeDocumentationUrl(href);
                });
                if (otherLinks.length === 0) return null;
                return (
                  <>
                    <Divider />
                    <SectionLabel>Links</SectionLabel>
                    {otherLinks.map(({ header, value }) => (
                      <UrlCard key={header} header={header} value={value} />
                    ))}
                  </>
                );
              })()}

              {/* Empty row fallback */}
              {sections.kvItems.length === 0 &&
                sections.activeSystems.length === 0 &&
                sections.statusItems.length === 0 &&
                sections.urlItems.length === 0 && (
                  <p style={{ fontFamily: 'Roboto, Arial, Helvetica, sans-serif', color: '#94A3B8', textAlign: 'center', paddingTop: 40 }}>
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
