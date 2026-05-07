import FileUpload from './FileUpload';

interface LandingPageProps {
  onFileSelect: (file: File) => void;
}

export default function LandingPage({ onFileSelect }: LandingPageProps) {
  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: '100%', maxWidth: 560 }}>
          <FileUpload onFileSelect={onFileSelect} />
        </div>
      </div>
    </div>
  );
}
