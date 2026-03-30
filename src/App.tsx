import { useState, useCallback, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import SheetSelector from './components/SheetSelector';
import DataTable from './components/DataTable';
import RecordList from './components/RecordList';
import ExportSummary from './components/ExportSummary';
import RowDrawer from './components/RowDrawer';
import { useExcelParser } from './hooks/useExcelParser';

type ViewMode = 'cards' | 'table';

function ViewToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 30,
        border: 'none',
        backgroundColor: active ? '#0D6E6E' : '#FFFFFF',
        color: active ? '#FFFFFF' : '#9CA3AF',
        cursor: active ? 'default' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

interface Toast {
  id: number;
  message: string;
  type: 'error' | 'info';
}

let toastCounter = 0;

const DRAWER_WIDTH = 460;

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  const { sheets, activeSheet, setActiveSheet, headers, rows, loading, error, parsedFile } =
    useExcelParser(file);

  // Reset selected row when sheet or file changes
  useEffect(() => {
    setSelectedRow(null);
  }, [activeSheet, file]);

  // Show toast on parse error
  useEffect(() => {
    if (error) {
      const id = ++toastCounter;
      setToasts((prev) => [...prev, { id, message: error, type: 'error' }]);
      const timer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setSelectedRow(null);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setSelectedRow(null);
  }, []);

  const handleRowClick = useCallback((row: Record<string, unknown>) => {
    setSelectedRow((prev) => (prev === row ? null : row));
  }, []);

  const handleDrawerClose = useCallback(() => {
    setSelectedRow(null);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hasData = parsedFile !== null && !loading;
  const drawerOpen = selectedRow !== null;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F9F7F4',
        fontFamily: 'Sora, sans-serif',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          padding: '0 24px',
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: '#0D6E6E',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <rect x="2" y="2" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.9" />
              <rect x="10" y="2" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="2" y="10" width="6" height="6" rx="1.5" fill="white" fillOpacity="0.5" />
              <rect x="10" y="10" width="6" height="6" rx="1.5" fill="#E8923A" />
            </svg>
          </div>
          <span
            style={{
              fontFamily: 'Sora, sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#111827',
            }}
          >
            Excel Importer
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasData && (
            <span
              style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '0.75rem',
                color: '#0D6E6E',
                backgroundColor: '#EBF5F5',
                border: '1px solid #C6E4E4',
                borderRadius: 20,
                padding: '3px 10px',
              }}
            >
              {parsedFile.fileName}
            </span>
          )}
          {drawerOpen && (
            <span
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: '0.75rem',
                color: '#6B7280',
              }}
            >
              Press <kbd style={{ fontFamily: 'IBM Plex Mono, monospace', backgroundColor: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 4, padding: '1px 5px' }}>Esc</kbd> to close
            </span>
          )}
        </div>
      </header>

      {/* ── Main content — shifts left when drawer opens ─────────── */}
      <main
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px',
          paddingRight: drawerOpen ? `calc(24px + ${DRAWER_WIDTH}px)` : '24px',
          transition: 'padding-right 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Upload screen */}
        {!hasData && !loading && (
          <div
            style={{
              maxWidth: 640,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 32,
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <h1
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                  color: '#111827',
                  margin: '0 0 12px 0',
                  letterSpacing: '-0.03em',
                }}
              >
                Import &amp; explore{' '}
                <span style={{ color: '#0D6E6E' }}>Excel data</span>
              </h1>
              <p
                style={{
                  fontFamily: 'Sora, sans-serif',
                  color: '#6B7280',
                  fontSize: '1rem',
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                Upload any{' '}
                <code style={{ fontFamily: 'IBM Plex Mono, monospace', backgroundColor: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>.xlsx</code>{' '}
                or{' '}
                <code style={{ fontFamily: 'IBM Plex Mono, monospace', backgroundColor: '#F3F4F6', padding: '1px 5px', borderRadius: 4 }}>.xls</code>{' '}
                file to instantly browse, sort, filter, and search your data.
              </p>
            </div>

            <FileUpload onFileSelect={handleFileSelect} />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['Multi-sheet support', 'Sortable columns', 'Live search', 'Row detail view'].map(
                (feat) => (
                  <span
                    key={feat}
                    style={{
                      fontFamily: 'Sora, sans-serif',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#374151',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 20,
                      padding: '4px 12px',
                    }}
                  >
                    {feat}
                  </span>
                )
              )}
            </div>
          </div>
        )}

        {/* Loading spinner */}
        {loading && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 16,
              padding: '80px 0',
            }}
            role="status"
            aria-live="polite"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              style={{ animation: 'spin 0.8s linear infinite' }}
              aria-hidden="true"
            >
              <circle cx="20" cy="20" r="16" stroke="#E5E7EB" strokeWidth="4" />
              <path
                d="M20 4C28.8366 4 36 11.1634 36 20"
                stroke="#0D6E6E"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <p style={{ fontFamily: 'Sora, sans-serif', color: '#6B7280', margin: 0 }}>
              Parsing your file…
            </p>
          </div>
        )}

        {/* Data view */}
        {hasData && (
          <div
            className="animate-fade-in-up"
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <ExportSummary
              excelFile={parsedFile}
              activeSheet={activeSheet}
              totalRows={rows.length}
              totalColumns={headers.length}
              onReset={handleReset}
            />

            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              {/* Card header */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <SheetSelector
                    sheets={sheets}
                    activeSheet={activeSheet}
                    onSelect={setActiveSheet}
                  />
                  {sheets.length === 1 && (
                    <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
                      {activeSheet}
                    </span>
                  )}
                </div>

                {/* Right side: hint + view toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {!drawerOpen && (
                    <span style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.75rem', color: '#9CA3AF' }}>
                      Click a record for details →
                    </span>
                  )}

                  {/* View mode toggle */}
                  <div
                    style={{
                      display: 'flex',
                      border: '1.5px solid #E5E7EB',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <ViewToggleBtn
                      active={viewMode === 'cards'}
                      onClick={() => setViewMode('cards')}
                      label="Card view"
                    >
                      {/* Cards icon */}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <rect x="1" y="1" width="5" height="4" rx="1.5" fill="currentColor" />
                        <rect x="8" y="1" width="5" height="4" rx="1.5" fill="currentColor" fillOpacity="0.4" />
                        <rect x="1" y="7" width="5" height="4" rx="1.5" fill="currentColor" fillOpacity="0.4" />
                        <rect x="8" y="7" width="5" height="4" rx="1.5" fill="currentColor" fillOpacity="0.4" />
                      </svg>
                    </ViewToggleBtn>
                    <ViewToggleBtn
                      active={viewMode === 'table'}
                      onClick={() => setViewMode('table')}
                      label="Table view"
                    >
                      {/* Table icon */}
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <rect x="1" y="1" width="12" height="3" rx="1" fill="currentColor" />
                        <rect x="1" y="6" width="12" height="2" rx="1" fill="currentColor" fillOpacity="0.4" />
                        <rect x="1" y="10" width="12" height="2" rx="1" fill="currentColor" fillOpacity="0.4" />
                      </svg>
                    </ViewToggleBtn>
                  </div>
                </div>
              </div>

              {/* Content area */}
              <div style={{ padding: '16px 20px 20px' }}>
                {viewMode === 'cards' ? (
                  <RecordList
                    headers={headers}
                    rows={rows}
                    selectedRow={selectedRow}
                    onRowClick={handleRowClick}
                  />
                ) : (
                  <DataTable
                    headers={headers}
                    rows={rows}
                    selectedRow={selectedRow}
                    onRowClick={handleRowClick}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Row detail drawer ─────────────────────────────────────── */}
      <RowDrawer
        row={selectedRow}
        headers={headers}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
      />

      {/* ── Toast container ───────────────────────────────────────── */}
      <div
        aria-live="assertive"
        aria-atomic="false"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="animate-slide-in-right"
            style={{
              backgroundColor: toast.type === 'error' ? '#FEF2F2' : '#EBF5F5',
              border: `1px solid ${toast.type === 'error' ? '#FECACA' : '#C6E4E4'}`,
              borderRadius: 10,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              maxWidth: 360,
              pointerEvents: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            {toast.type === 'error' ? (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                <circle cx="9" cy="9" r="8" stroke="#DC2626" strokeWidth="1.5" />
                <path d="M9 5.5V9.5M9 12.5V12" stroke="#DC2626" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
                <circle cx="9" cy="9" r="8" stroke="#0D6E6E" strokeWidth="1.5" />
                <path d="M5.5 9L7.5 11L12.5 6.5" stroke="#0D6E6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '0.8125rem', color: toast.type === 'error' ? '#991B1B' : '#095555', margin: 0 }}>
                {toast.type === 'error' ? 'Parse Error' : 'Info'}
              </p>
              <p style={{ fontFamily: 'Sora, sans-serif', fontSize: '0.8125rem', color: toast.type === 'error' ? '#7F1D1D' : '#0D6E6E', margin: '2px 0 0 0', wordBreak: 'break-word' }}>
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: toast.type === 'error' ? '#DC2626' : '#0D6E6E', padding: 2, flexShrink: 0, lineHeight: 1, fontSize: '1rem' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
