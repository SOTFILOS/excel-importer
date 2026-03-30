interface SheetSelectorProps {
  sheets: string[];
  activeSheet: string;
  onSelect: (name: string) => void;
}

export default function SheetSelector({
  sheets,
  activeSheet,
  onSelect,
}: SheetSelectorProps) {
  if (sheets.length <= 1) return null;

  return (
    <div
      role="tablist"
      aria-label="Worksheet tabs"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      {/* Sheet count badge */}
      <span
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '0.6875rem',
          fontWeight: 500,
          color: '#6B7280',
          backgroundColor: '#F3F4F6',
          borderRadius: 20,
          padding: '2px 8px',
          whiteSpace: 'nowrap',
          marginRight: 6,
        }}
      >
        {sheets.length} sheets
      </span>

      {sheets.map((sheet) => {
        const isActive = sheet === activeSheet;
        return (
          <button
            key={sheet}
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(sheet)}
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? '#FFFFFF' : '#374151',
              backgroundColor: isActive ? '#0D6E6E' : '#FFFFFF',
              border: isActive ? '1.5px solid #0D6E6E' : '1.5px solid #E5E7EB',
              borderRadius: 8,
              padding: '5px 14px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#0D6E6E';
                (e.currentTarget as HTMLButtonElement).style.color = '#0D6E6E';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB';
                (e.currentTarget as HTMLButtonElement).style.color = '#374151';
              }
            }}
          >
            {sheet}
          </button>
        );
      })}
    </div>
  );
}
