import {
  AlertTriangle,
  Layers,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import type { SyncStatus, TabKey } from '../types';
import { relativeTime } from '../lib/format';
import { formatVersionLabel } from '../lib/sheet';

interface HeaderProps {
  tab: TabKey;
  onTabChange: (tab: TabKey) => void;
  status: SyncStatus;
  versionLabel: string | null;
  lastChecked: string | null;
  deckTotal: number;
  cardCount: number;
  tokenCount: number;
  error: string | null;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
}

function statusCopy(status: SyncStatus, versionLabel: string | null): { title: string; detail: string } {
  switch (status) {
    case 'checking':
      return { title: 'Checking for updates', detail: versionLabel ? 'Comparing P1…' : 'Connecting to Google Sheets…' };
    case 'updating':
      return { title: 'Updating archive', detail: 'Downloading N:P…' };
    case 'offline':
      return { title: 'Offline copy', detail: versionLabel ? `Saved ${formatVersionLabel(versionLabel)}` : 'Using saved data' };
    case 'error':
      return { title: 'Connection error', detail: 'No saved copy available' };
    default:
      return {
        title: 'Archive synced',
        detail: versionLabel ? `Updated ${formatVersionLabel(versionLabel)}` : 'Data is current',
      };
  }
}

export function Header({
  tab,
  onTabChange,
  status,
  versionLabel,
  lastChecked,
  deckTotal,
  cardCount,
  tokenCount,
  error,
  searchQuery,
  onSearchChange,
  onRefresh,
}: HeaderProps) {
  const copy = statusCopy(status, versionLabel);
  const busy = status === 'checking' || status === 'updating';
  const StatusIcon =
    status === 'offline' ? WifiOff : status === 'error' ? AlertTriangle : null;

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <div className="logo-mark" aria-hidden="true">
            <Layers size={21} />
            <span className="logo-spark">✦</span>
          </div>
          <div className="brand-copy">
            <h1>Ai-Chan Deck Building</h1>
            <p>Card archive · deck builder</p>
          </div>
        </div>

        <nav className="main-tabs" aria-label="Main navigation">
          <button
            type="button"
            className={tab === 'builder' ? 'is-active' : ''}
            onClick={() => onTabChange('builder')}
          >
            <LayoutGrid size={16} />
            Builder
            <span className="tab-count">{cardCount}</span>
          </button>
          <button
            type="button"
            className={tab === 'tokens' ? 'is-active' : ''}
            onClick={() => onTabChange('tokens')}
          >
            <Sparkles size={16} />
            Token
            <span className="tab-count">{tokenCount}</span>
          </button>
          <button
            type="button"
            className={tab === 'deck' ? 'is-active' : ''}
            onClick={() => onTabChange('deck')}
          >
            <Layers size={16} />
            Deck
            <span className="tab-count">{deckTotal}</span>
          </button>
        </nav>

        <div className="header-search">
          <label className="search-field">
            <Search size={18} />
            <input
              id="card-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search names, effects, groups, destinations…"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <kbd>/</kbd>
          </label>
        </div>

        <div className="topbar-actions">
          <div
            className={`sync-pill status-${status}`}
            title={error ?? `${copy.title}. Last checked ${relativeTime(lastChecked)}.`}
          >
            <span className="sync-indicator">
              {busy ? (
                <Loader2 size={14} className="spin" />
              ) : StatusIcon ? (
                <StatusIcon size={14} />
              ) : (
                <span className="sync-dot" />
              )}
            </span>
            <span className="sync-copy">
              <span className="sync-title">{copy.title}</span>
              <span className="sync-detail">{copy.detail}</span>
            </span>
          </div>

          <button
            type="button"
            className="icon-button refresh-button"
            onClick={onRefresh}
            disabled={busy}
            title="Check P1 and refresh if needed"
            aria-label="Check for sheet updates"
          >
            <RefreshCw size={17} className={busy ? 'spin' : ''} />
          </button>
        </div>
      </div>
    </header>
  );
}
