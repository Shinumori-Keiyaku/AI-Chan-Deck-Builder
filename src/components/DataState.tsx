import { AlertTriangle, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import type { SyncStatus } from '../types';
import { SHEET_ID, SHEET_TAB } from '../lib/sheet';

export function LoadingState({ status }: { status: SyncStatus }) {
  return (
    <div className="loading-state">
      <div className="loading-orbit">
        <Loader2 size={26} className="spin" />
      </div>
      <h2>{status === 'updating' ? 'Updating the archive' : 'Opening the archive'}</h2>
      <p>
        {status === 'updating'
          ? 'P1 changed, so the card database is being downloaded and cached in this browser.'
          : 'Checking the sheet update date in P1 before loading cards.'}
      </p>
      <div className="loading-skeletons" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, index) => (
          <div className="skeleton-card" key={index}>
            <div className="skeleton-art" />
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  hasApiKey: boolean;
  onRetry: () => void;
}

export function ErrorState({ message, hasApiKey, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state">
      <div className="error-icon">
        <AlertTriangle size={28} />
      </div>
      <span className="eyebrow">Archive unavailable</span>
      <h2>Could not load the card database</h2>
      <p className="error-message">{message}</p>

      <div className="error-help">
        <p>
          The app reads <code>{SHEET_TAB}!P1</code> first, then <code>{SHEET_TAB}!N:P</code> from
          sheet <code>{SHEET_ID}</code>.
        </p>
        <ul>
          <li>
            Add <code>VITE_GOOGLE_SHEETS_API_KEY=your_key</code> to <code>.env</code> and restart
            the dev server.
          </li>
          <li>Or share the sheet so that anyone with the link can view it.</li>
          <li>Check that the tab is named <code>{SHEET_TAB}</code> and that P1 contains an update date.</li>
        </ul>
        {!hasApiKey && (
          <p className="error-note">
            No API key is configured, so the app tried the public Google Sheets viewer endpoint.
          </p>
        )}
      </div>

      <button type="button" className="primary-button" onClick={onRetry}>
        <RefreshCw size={15} />
        Retry connection
      </button>
    </div>
  );
}

interface OfflineBannerProps {
  message: string;
  onRetry: () => void;
}

export function OfflineBanner({ message, onRetry }: OfflineBannerProps) {
  return (
    <div className="offline-banner" role="status">
      <WifiOff size={16} />
      <span>
        <strong>Using the saved copy.</strong> {message}
      </span>
      <button type="button" onClick={onRetry}>
        <RefreshCw size={13} />
        Retry
      </button>
    </div>
  );
}
