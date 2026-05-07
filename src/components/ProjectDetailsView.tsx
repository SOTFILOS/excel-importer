import { useEffect, useMemo, useState, useCallback } from 'react';
import { cellStr, cleanLabel, flagKind } from '../utils/fieldCategoriser';
import { DOC_COL_HEADER } from '../utils/constants';
import { findDocumentationUrl, DOC_KEYWORDS, DOC_DOMAINS } from '../utils/docUtils';

interface ProjectDetailsViewProps {
  headers: string[];
  rows: Record<string, unknown>[];
  selectedRow: Record<string, unknown> | null;
  onRowClick: (row: Record<string, unknown>) => void;
  disableDocs?: boolean;
}

type ListItem = {
  row: Record<string, unknown>;
  title: string;
  id: string;
};

function isUrl(value: unknown): boolean {
  const s = cellStr(value).trim();
  return /^https?:\/\//i.test(s);
}

function inferTitle(headers: string[], row: Record<string, unknown>): string {
  const lc = (s: string) => s.toLowerCase();
  const isBizDesc = (hl: string) =>
    hl.includes('σαφή') && hl.includes('επιχειρησιακ') && hl.includes('περιγραφ') && hl.includes('αλλαγ');
  const isTitleHeader = (hl: string) => /\btitle\b/.test(hl);
  const isTechTeamHeader = (hl: string) => (hl.includes('tech') || hl.includes('teck')) && hl.includes('team');

  // Business Description (Greek) if present
  let bizDesc = '';
  for (const h of headers) {
    const v = cellStr(row[h]).trim();
    if (!v) continue;
    const hl = lc(h);
    if (isBizDesc(hl)) { bizDesc = v; break; }
  }

  function firstMatch(pred: (hl: string) => boolean, numericOk = true): string {
    for (const h of headers) {
      const v = cellStr(row[h]).trim();
      if (!v) continue;
      const hl = lc(h);
      if (pred(hl)) {
        if (!numericOk && !isNaN(Number(v))) continue;
        return v;
      }
    }
    return '';
  }

  const item = firstMatch((hl) => hl.includes('item') && (hl.includes('descr') || hl.includes('description')), true);
  const proj = item ? '' : firstMatch((hl) => hl.includes('project') && hl.includes('name'), true);
  const pbi = (!item && !proj) ? firstMatch((hl) => /\bpbi\b/.test(hl), true) : '';
  const redmine = (!item && !proj && !pbi)
    ? firstMatch((hl) =>
        ((hl.includes('redmine') || hl.includes('ticket')) && hl.includes('id')) ||
        (hl.includes('after') && hl.includes('care') && (hl.includes('id') || hl.includes('redmine'))),
      true)
    : '';

  let primary = item || proj || pbi || redmine;

  if (!primary) {
    for (const h of headers) {
      const v = cellStr(row[h]).trim();
      if (!v) continue;
      const hl = lc(h);
      if (!isTitleHeader(hl) && !isTechTeamHeader(hl) && v.length <= 80 && !v.includes('@') && isNaN(Number(v))) {
        primary = v;
        break;
      }
    }
  }

  const p = (primary || '').trim();
  const b = bizDesc.trim();
  const base = p || 'Untitled';

  if (!b) return base;

  const pLower = p.toLowerCase();
  const bLower = b.toLowerCase();

  // Exact duplicate (case-insensitive)
  if (pLower === bLower) return base;

  // One contains the other; prefer the longer (more informative) value
  if (p && (bLower.includes(pLower) || pLower.includes(bLower))) {
    return b.length >= p.length ? b : base;
  }

  return `${base} + ${b}`;
}

function inferId(headers: string[], row: Record<string, unknown>): string {
  for (const h of headers) {
    const v = cellStr(row[h]).trim();
    if (!v) continue;
    const n = Number(v);
    const hlo = h.toLowerCase();
    const isPBI = /\bpbi\b/.test(hlo);
    const isRedmineId =
      ((hlo.includes('redmine') || hlo.includes('ticket')) && hlo.includes('id')) ||
      (hlo.includes('after') && hlo.includes('care') && (hlo.includes('id') || hlo.includes('redmine')));
    if ((isPBI || isRedmineId) && !isNaN(n) && n > 0 && n < 1_000_000) return v;
  }
  for (const h of headers) {
    const v = cellStr(row[h]).trim();
    const n = Number(v);
    if (v && !isNaN(n) && n > 0 && n < 1_000_000) return v;
  }
  return '';
}

function looksLikeDocUrl(href: string): boolean {
  const url = href.trim().toLowerCase();
  if (!url) return false;
  return DOC_DOMAINS.some((d) => url.includes(d)) || DOC_KEYWORDS.some((k) => url.includes(k));
}

function StatusChip({ label, isYes }: { label: string; isYes: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        backgroundColor: isYes ? '#F0FDF4' : '#FFF7ED',
        border: `1px solid ${isYes ? '#BBF7D0' : '#FED7AA'}`,
        borderRadius: 8,
        padding: '3px 8px',
        fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: isYes ? '#16A34A' : '#C2410C',
        whiteSpace: 'nowrap',
      }}
    >
      {isYes ? '✓' : '✗'} {cleanLabel(label)}
    </span>
  );
}

function SystemChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
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
      <svg width="7" height="7" viewBox="0 0 8 8" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="4" fill="#0D9488" />
      </svg>
      {cleanLabel(label)}
    </span>
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

export default function ProjectDetailsView({
  headers,
  rows,
  selectedRow,
  onRowClick,
  disableDocs,
}: ProjectDetailsViewProps) {
  const [search, setSearch] = useState('');

  const items: ListItem[] = useMemo(
    () =>
      rows.map((row) => ({
        row,
        title: inferTitle(headers, row),
        id: inferId(headers, row),
      })),
    [rows, headers]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      if (it.title.toLowerCase().includes(q)) return true;
      if (it.id && it.id.toLowerCase().includes(q)) return true;
      // fallback to row scan
      return headers.some((h) => cellStr(it.row[h]).toLowerCase().includes(q));
    });
  }, [items, search, headers]);

  // Auto-select first when none selected
  useEffect(() => {
    if (!selectedRow && filtered.length > 0) onRowClick(filtered[0].row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered.length]);

  const current = selectedRow;

  const makeSections = useCallback(() => {
    if (!current) return null;

    const kvItems: { header: string; value: unknown }[] = [];
    const yesItems: string[] = [];
    const noItems: string[] = [];
    const activeSystems: string[] = [];
    const urlItems: { header: string; value: unknown }[] = [];

    headers.forEach((h) => {
      const v = (current as any)[h];
      if (isUrl(v)) {
        urlItems.push({ header: h, value: v });
        return;
      }
      const fk = flagKind(v);
      if (fk === 'yes') yesItems.push(h);
      else if (fk === 'no') noItems.push(h);
      else if (fk === 'active') activeSystems.push(h);
      else {
        const s = cellStr(v).trim();
        if (s !== '' && s !== '-' && s !== '_') kvItems.push({ header: h, value: v });
      }
    });

    // Documentation link preference
    let docUrl = '';
    if (!disableDocs && current) {
      const fromCol = cellStr((current as any)[DOC_COL_HEADER] ?? '').trim();
      docUrl = fromCol || findDocumentationUrl(headers, current) || '';
    }

    // Filter URL items to exclude doc URL and likely doc-like duplicates
    const cleanUrls = urlItems.filter(({ value }) => {
      const href = cellStr(value).trim();
      if (!href) return false;
      if (docUrl && href.toLowerCase() === docUrl.toLowerCase()) return false;
      return !looksLikeDocUrl(href);
    });

    return { kvItems, yesItems, noItems, activeSystems, urlItems: cleanUrls, docUrl };
  }, [current, headers, disableDocs]);

  const sections = makeSections();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) 1fr', gap: 16 }}>
      {/* Left: Projects list */}
      <aside
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E0D8',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 420,
          maxHeight: 'calc(80vh)',
        }}
      >
        {/* Search */}
        <div style={{ padding: 12, borderBottom: '1px solid #F3F1EE' }}>
          <div style={{ position: 'relative' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              aria-hidden="true"
            >
              <circle cx="6.5" cy="6.5" r="5" stroke="#9CA3AF" strokeWidth="1.5" />
              <path d="M10.5 10.5L14 14" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              style={{
                width: '100%',
                paddingLeft: 34,
                paddingRight: 10,
                paddingTop: 8,
                paddingBottom: 8,
                border: '1.5px solid #E2E0D8',
                borderRadius: 8,
                fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                fontSize: '0.875rem',
                color: '#0F172A',
                outline: 'none',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
          <div style={{ marginTop: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: '#94A3B8' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* List */}
        <div style={{ overflowY: 'auto', padding: '6px 0' }}>
          {filtered.map((it, idx) => {
            const isActive = current === it.row;
            return (
              <button
                key={idx}
                onClick={() => onRowClick(it.row)}
                aria-pressed={isActive}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  backgroundColor: isActive ? '#F0FDF4' : '#FFFFFF',
                  border: 'none',
                  borderTop: '1px solid #F8FAFC',
                  borderBottom: '1px solid #F8FAFC',
                  padding: '10px 12px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: isActive ? '#22C55E' : '#CBD5E1',
                      flexShrink: 0,
                    }}
                    aria-hidden="true"
                  />
                  <span
                    style={{
                      fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0F172A',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                    }}
                    title={it.title}
                  >
                    {it.title}
                  </span>
                  {it.id && (
                    <span
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#4F46E5',
                        backgroundColor: '#EEF0F8',
                        border: '1px solid #C7D2FE',
                        borderRadius: 5,
                        padding: '1px 6px',
                        flexShrink: 0,
                      }}
                    >
                      #{it.id}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p style={{ fontFamily: 'Roboto, Arial, Helvetica, sans-serif', color: '#94A3B8', textAlign: 'center', padding: 16, margin: 0 }}>
              No projects found
            </p>
          )}
        </div>
      </aside>

      {/* Right: Details */}
      <section
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E0D8',
          borderRadius: 12,
          padding: 18,
          minHeight: 420,
          maxHeight: 'calc(80vh)',
          overflowY: 'auto',
        }}
      >
        {!current ? (
          <div style={{ padding: 40, color: '#94A3B8', textAlign: 'center' }}>
            <p style={{ fontFamily: 'Roboto, Arial, Helvetica, sans-serif', fontSize: '0.9375rem', margin: 0 }}>
              Select a project to see its details
            </p>
          </div>
        ) : (
          <>
            {/* Header: Title + meta */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
              <h2
                style={{
                  fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.0625rem',
                  color: '#0F172A',
                  margin: 0,
                }}
              >
                {inferTitle(headers, current)}
              </h2>
              {(() => {
                const id = inferId(headers, current);
                return id ? (
                  <span
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      backgroundColor: '#0D9488',
                      borderRadius: 6,
                      padding: '3px 9px',
                    }}
                  >
                    #{id}
                  </span>
                ) : null;
              })()}
            </div>

            {/* Documentation quick link */}
            {!disableDocs && sections?.docUrl && (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px dashed #C7D2FE',
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div>
                  <p
                    style={{
                      fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#4F46E5',
                      margin: 0,
                    }}
                  >
                    Documentation
                  </p>
                  <p
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '0.75rem',
                      color: '#94A3B8',
                      margin: 0,
                      maxWidth: 540,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={sections.docUrl}
                  >
                    {sections.docUrl}
                  </p>
                </div>
                <a
                  href={sections.docUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    padding: '6px 10px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: 'pointer',
                    color: '#FFFFFF',
                    backgroundColor: '#4F46E5',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Open ↗
                </a>
              </div>
            )}

            {/* Active systems */}
            {sections && sections.activeSystems.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <p
                  style={{
                    fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#94A3B8',
                    margin: 0,
                  }}
                >
                  Systems affected
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sections.activeSystems.map((name) => (
                    <SystemChip key={name} label={name} />
                  ))}
                </div>
              </div>
            )}

            {/* Status flags */}
            {sections && (sections.yesItems.length > 0 || sections.noItems.length > 0) && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                <p
                  style={{
                    fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#94A3B8',
                    margin: 0,
                  }}
                >
                  Status
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sections.yesItems.map((h) => (
                    <StatusChip key={h} label={h} isYes={true} />
                  ))}
                  {sections.noItems.map((h) => (
                    <StatusChip key={h} label={h} isYes={false} />
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            {sections && sections.kvItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                <p
                  style={{
                    fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#94A3B8',
                    margin: 0,
                  }}
                >
                  Details
                </p>
                {sections.kvItems.map(({ header, value }) => {
                  const str = cellStr(value);
                  const isLong = str.length > 80;
                  return (
                    <div
                      key={header}
                      style={{
                        display: isLong ? 'block' : 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        borderBottom: '1px solid #F3F1EE',
                        paddingBottom: 8,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                          fontSize: '0.75rem',
                          color: '#94A3B8',
                          minWidth: isLong ? undefined : 160,
                          display: 'inline-block',
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
                })}
              </div>
            )}

            {/* Links */}
            {sections && sections.urlItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <p
                  style={{
                    fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#94A3B8',
                    margin: 0,
                  }}
                >
                  Links
                </p>
                {sections.urlItems.map(({ header, value }) => (
                  <UrlCard key={header} header={header} value={value} />
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}