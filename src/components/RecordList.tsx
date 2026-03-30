import { useState, useMemo, useCallback } from 'react';
import type { ChangeEvent } from 'react';
import {
  cellStr,
  cleanLabel,
  buildCardContent,
  type PaletteColor,
} from '../utils/fieldCategoriser';

interface RecordListProps {
  headers: string[];
  rows: Record<string, unknown>[];
  selectedRow: Record<string, unknown> | null;
  onRowClick: (row: Record<string, unknown>) => void;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

// ── Chip atoms ────────────────────────────────────────────────────────────────

function SystemChip({ label }: { label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#EBF5F5',
        border: '1px solid #C6E4E4',
        borderRadius: 6,
        padding: '2px 8px',
        fontFamily: 'Sora, sans-serif',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: '#0D6E6E',
        whiteSpace: 'nowrap',
      }}
    >
      <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden="true">
        <circle cx="3" cy="3" r="3" fill="#0D6E6E" />
      </svg>
      {label}
    </span>
  );
}

function StatusChip({ label, isYes }: { label: string; isYes: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        backgroundColor: isYes ? '#F0FDF4' : '#FFF7ED',
        border: `1px solid ${isYes ? '#BBF7D0' : '#FED7AA'}`,
        borderRadius: 6,
        padding: '2px 8px',
        fontFamily: 'Sora, sans-serif',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: isYes ? '#16A34A' : '#C2410C',
        whiteSpace: 'nowrap',
      }}
    >
      {isYes ? '✓' : '✗'} {label}
    </span>
  );
}

function TypeBadge({ value, color }: { value: string; color: PaletteColor }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: color.bg,
        border: `1px solid ${color.border}`,
        borderRadius: 6,
        padding: '3px 10px',
        fontFamily: 'Sora, sans-serif',
        fontSize: '0.6875rem',
        fontWeight: 700,
        color: color.text,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        flexShrink: 0,
      }}
    >
      {value}
    </span>
  );
}

// ── Single record card ────────────────────────────────────────────────────────

interface RecordCardProps {
  headers: string[];
  row: Record<string, unknown>;
  isSelected: boolean;
  onClick: () => void;
}

function RecordCard({ headers, row, isSelected, onClick }: RecordCardProps) {
  const c = buildCardContent(headers, row);
  const accent = c.paletteColor.accent;

  // Compact details line: show values separated by · (skip emails and long text)
  const detailLine = c.details
    .map((d) => d.value)
    .filter((v) => v.length <= 50)
    .slice(0, 6)
    .join('  ·  ');

  const hasChips =
    c.systemChips.length > 0 ||
    c.yesChips.length > 0 ||
    c.noChips.length > 0 ||
    c.links.length > 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        backgroundColor: isSelected ? '#EBF5F5' : '#FFFFFF',
        border: `1.5px solid ${isSelected ? '#C6E4E4' : '#EBEBEB'}`,
        borderLeft: `4px solid ${isSelected ? '#0D6E6E' : accent}`,
        borderRadius: 12,
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        outline: 'none',
      }}
      onMouseEnter={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#F9F7F4';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#D1D5DB';
          (e.currentTarget as HTMLDivElement).style.borderLeftColor = accent;
        }
      }}
      onMouseLeave={(e) => {
        if (!isSelected) {
          (e.currentTarget as HTMLDivElement).style.backgroundColor = '#FFFFFF';
          (e.currentTarget as HTMLDivElement).style.borderColor = '#EBEBEB';
          (e.currentTarget as HTMLDivElement).style.borderLeftColor = accent;
        }
      }}
    >
      {/* ── Row 1: ID + Title + Type badge ─────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          minWidth: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* ID badge */}
          {c.id && (
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '0.6875rem',
                fontWeight: 700,
                color: '#FFFFFF',
                backgroundColor: accent,
                borderRadius: 6,
                padding: '2px 8px',
                flexShrink: 0,
                letterSpacing: '0.02em',
              }}
            >
              #{c.id}
            </span>
          )}

          {/* Title */}
          <span
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: '0.9375rem',
              fontWeight: 700,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {c.title}
          </span>
        </div>

        {/* Type badge */}
        {c.typeBadge && (
          <TypeBadge value={c.typeBadge} color={c.paletteColor} />
        )}
      </div>

      {/* ── Row 2: Details sub-line ─────────────────────────────────── */}
      {detailLine && (
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.75rem',
            color: '#9CA3AF',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            paddingLeft: c.id ? 46 : 0,
          }}
        >
          {detailLine}
        </p>
      )}

      {/* ── Row 3: Chips ─────────────────────────────────────────────── */}
      {hasChips && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 5,
            alignItems: 'center',
            paddingLeft: c.id ? 46 : 0,
          }}
        >
          {/* Active system chips */}
          {c.systemChips.map((chip) => (
            <SystemChip key={chip} label={chip} />
          ))}

          {/* Vertical divider between systems and status */}
          {c.systemChips.length > 0 &&
            (c.yesChips.length > 0 || c.noChips.length > 0) && (
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  width: 1,
                  height: 14,
                  backgroundColor: '#E5E7EB',
                  marginInline: 2,
                  flexShrink: 0,
                }}
              />
            )}

          {/* Status chips */}
          {c.yesChips.map((chip) => (
            <StatusChip key={chip} label={chip} isYes={true} />
          ))}
          {c.noChips.map((chip) => (
            <StatusChip key={chip} label={chip} isYes={false} />
          ))}

          {/* Link chips */}
          {c.links.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                backgroundColor: '#F9F7F4',
                border: '1px solid #E5E7EB',
                borderRadius: 6,
                padding: '2px 8px',
                fontFamily: 'Sora, sans-serif',
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: '#0D6E6E',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                transition: 'all 0.12s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#EBF5F5';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = '#C6E4E4';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = '#F9F7F4';
                (e.currentTarget as HTMLAnchorElement).style.borderColor = '#E5E7EB';
              }}
            >
              {link.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div
      style={{
        padding: '60px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14,
        color: '#9CA3AF',
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect width="48" height="48" rx="14" fill="#F3F4F6" />
        <path d="M14 18h20M14 24h14M14 30h8" stroke="#D1D5DB" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#6B7280', margin: 0 }}>
        {isFiltered ? 'No records match your search' : 'No data to display'}
      </p>
      {isFiltered && (
        <p style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.875rem', margin: 0 }}>
          Try a different search term
        </p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RecordList({
  headers,
  rows,
  selectedRow,
  onRowClick,
}: RecordListProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(25);

  const handleSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  }, []);

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const lower = search.toLowerCase();
    return rows.filter((row) =>
      headers.some((h) => cellStr(row[h]).toLowerCase().includes(lower))
    );
  }, [rows, headers, search]);

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRows);
  const visibleRows = filteredRows.slice(startIdx, endIdx);

  if (headers.length === 0) return <EmptyState isFiltered={false} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 180 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="5" stroke="#9CA3AF" strokeWidth="1.5" />
            <path d="M10.5 10.5L14 14" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={handleSearch}
            placeholder="Search records…"
            aria-label="Search records"
            style={{
              width: '100%',
              paddingLeft: 34,
              paddingRight: 12,
              paddingTop: 8,
              paddingBottom: 8,
              border: '1.5px solid #E5E7EB',
              borderRadius: 8,
              fontFamily: 'Sora, sans-serif',
              fontSize: '0.875rem',
              color: '#111827',
              backgroundColor: '#FFFFFF',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = '#0D6E6E')}
            onBlur={(e) => (e.currentTarget.style.borderColor = '#E5E7EB')}
          />
        </div>

        {/* Rows per page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <label
            htmlFor="rpl-page-size"
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: '0.8125rem',
              color: '#6B7280',
              whiteSpace: 'nowrap',
            }}
          >
            Per page
          </label>
          <select
            id="rpl-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value) as PageSize);
              setPage(1);
            }}
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.8125rem',
              border: '1.5px solid #E5E7EB',
              borderRadius: 8,
              padding: '6px 10px',
              backgroundColor: '#FFFFFF',
              color: '#111827',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Card list ───────────────────────────────────────────────── */}
      {visibleRows.length === 0 ? (
        <EmptyState isFiltered={search.trim().length > 0} />
      ) : (
        <div
          role="list"
          aria-label="Records"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {visibleRows.map((row, idx) => (
            <div key={idx} role="listitem">
              <RecordCard
                headers={headers}
                row={row}
                isSelected={row === selectedRow}
                onClick={() => onRowClick(row)}
              />
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination footer ───────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          paddingTop: 4,
        }}
      >
        <p
          style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '0.8125rem',
            color: '#6B7280',
            margin: 0,
          }}
        >
          {totalRows === 0
            ? 'No results'
            : `${startIdx + 1}–${endIdx} of ${totalRows} records`}
          {search && rows.length !== totalRows && (
            <span style={{ color: '#9CA3AF' }}> (filtered from {rows.length})</span>
          )}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <PgBtn onClick={() => setPage(1)} disabled={safePage === 1} label="First page">«</PgBtn>
          <PgBtn onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1} label="Previous page">‹</PgBtn>
          <span
            style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '0.8125rem',
              color: '#374151',
              padding: '4px 12px',
              minWidth: 72,
              textAlign: 'center',
            }}
          >
            {safePage} / {totalPages}
          </span>
          <PgBtn onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} label="Next page">›</PgBtn>
          <PgBtn onClick={() => setPage(totalPages)} disabled={safePage === totalPages} label="Last page">»</PgBtn>
        </div>
      </div>
    </div>
  );
}

function PgBtn({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 32,
        height: 32,
        border: '1.5px solid #E5E7EB',
        borderRadius: 6,
        backgroundColor: disabled ? '#F9FAFB' : '#FFFFFF',
        color: disabled ? '#D1D5DB' : '#374151',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '0.875rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

/** Compact key-value display — used when a column name needs a label prefix. */
export function KvLine({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: '#9CA3AF' }}>
      {cleanLabel(label)}:{' '}
      <span style={{ color: '#374151' }}>{value}</span>
    </span>
  );
}
