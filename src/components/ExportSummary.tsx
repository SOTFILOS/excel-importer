import type { ExcelFile } from '../types/excel';

interface ExportSummaryProps {
  excelFile: ExcelFile;
  activeSheet: string;
  totalRows: number;
  totalColumns: number;
  onReset: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: boolean;
}

function StatCard({ label, value, accent }: StatCardProps) {
  return (
    <div
      style={{
        backgroundColor: accent ? '#EBF5F5' : '#FFFFFF',
        border: `1px solid ${accent ? '#C6E4E4' : '#E5E7EB'}`,
        borderRadius: 10,
        padding: '12px 18px',
        minWidth: 120,
        flex: '1 1 120px',
      }}
    >
      <p
        style={{
          fontFamily: 'Sora, sans-serif',
          fontSize: '0.6875rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: accent ? '#095555' : '#9CA3AF',
          margin: '0 0 4px 0',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 500,
          fontSize: '1.125rem',
          color: accent ? '#0D6E6E' : '#111827',
          margin: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  );
}

export default function ExportSummary({
  excelFile,
  activeSheet,
  totalRows,
  totalColumns,
  onReset,
}: ExportSummaryProps) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      {/* Stats */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          flex: '1 1 auto',
          flexWrap: 'wrap',
        }}
      >
        <StatCard label="File" value={excelFile.fileName} />
        <StatCard label="Size" value={formatBytes(excelFile.fileSize)} />
        <StatCard label="Sheet" value={activeSheet} accent />
        <StatCard label="Rows" value={totalRows.toLocaleString()} accent />
        <StatCard label="Columns" value={totalColumns} accent />
      </div>

      {/* Reset button */}
      <button
        onClick={onReset}
        aria-label="Clear current file and upload a new one"
        style={{
          fontFamily: 'Sora, sans-serif',
          fontWeight: 600,
          fontSize: '0.8125rem',
          color: '#FFFFFF',
          backgroundColor: '#E8923A',
          border: 'none',
          borderRadius: 8,
          padding: '9px 18px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'background-color 0.15s',
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#C97420')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8923A')
        }
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M1 7C1 3.68629 3.68629 1 7 1C9.12 1 10.99 2.11 12.07 3.79M13 7C13 10.3137 10.3137 13 7 13C4.88 13 3.01 11.89 1.93 10.21"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path d="M12 1L12 4H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 13L2 10H5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Upload New File
      </button>
    </div>
  );
}
