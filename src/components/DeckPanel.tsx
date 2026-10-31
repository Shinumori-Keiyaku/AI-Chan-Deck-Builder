import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Layers,
  Trash2,
} from 'lucide-react';
import type { Card } from '../types';
import type { DeckCardEntry } from '../hooks/useDeck';
import { pluralize, titleCase } from '../lib/format';
import { DeckRow } from './DeckRow';

interface DeckPanelProps {
  entries: DeckCardEntry[];
  total: number;
  unique: number;
  onIncrement: (card: Card) => void;
  onDecrement: (card: Card) => void;
  onRemove: (card: Card) => void;
  onClear: () => void;
  onOpenCode: () => void;
  onOpenCard: (card: Card) => void;
  onSwitchToDeck: () => void;
}

const MAX_DECK_SIZE = 40;

export function DeckPanel({
  entries,
  total,
  unique,
  onIncrement,
  onDecrement,
  onRemove,
  onClear,
  onOpenCode,
  onOpenCard,
  onSwitchToDeck,
}: DeckPanelProps) {
  const progress = Math.min(100, (total / MAX_DECK_SIZE) * 100);
  const overLimit = total > MAX_DECK_SIZE;
  const complete = total === MAX_DECK_SIZE;

  const TYPE_ORDER = ['unit', 'building', 'support', 'field'];
  const typeTotals = new Map<string, number>();
  for (const entry of entries) {
    typeTotals.set(entry.card.type, (typeTotals.get(entry.card.type) ?? 0) + entry.count);
  }
  const typeCounts = TYPE_ORDER.map((type) => ({
    type,
    count: typeTotals.get(type) ?? 0,
  }));

  return (
    <aside className="deck-panel" aria-label="Current deck">
      <div className="deck-panel-header">
        <div>
          <span className="eyebrow">Current deck</span>
          <h2>
            {total}
            <span> / {MAX_DECK_SIZE}</span>
          </h2>
        </div>
        <div className="deck-panel-counts">
          <span>{pluralize(unique, 'unique card')}</span>
          <span>max 3 copies</span>
        </div>
      </div>

      <div className={`deck-progress ${overLimit ? 'is-over' : complete ? 'is-complete' : ''}`}>
        <div className="deck-progress-bar" style={{ width: `${progress}%` }} />
      </div>

      <div className={`deck-status ${overLimit ? 'is-warning' : complete ? 'is-complete' : ''}`}>
        {overLimit ? (
          <>
            <AlertTriangle size={14} />
            <span>{total - MAX_DECK_SIZE} cards over the standard limit</span>
          </>
        ) : complete ? (
          <>
            <CheckCircle2 size={14} />
            <span>Deck complete — ready to forge a code</span>
          </>
        ) : (
          <>
            <Layers size={14} />
            <span>{MAX_DECK_SIZE - total} slots remaining</span>
          </>
        )}
      </div>

      <div className="deck-type-counts" aria-label="Cards by type">
        {typeCounts.map(({ type, count }) => (
          <span key={type} className={`deck-type-count type-${type}`}>
            <span>{titleCase(type)}</span>
            <strong>{count}</strong>
          </span>
        ))}
      </div>

      <div className="deck-panel-actions">
        <button type="button" className="primary-button" onClick={onOpenCode} disabled={total === 0}>
          <ClipboardList size={15} />
          Deck code
        </button>
        <button
          type="button"
          className="ghost-button danger-ghost"
          onClick={onClear}
          disabled={total === 0}
          title="Clear the entire deck"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="deck-scroll">
        {entries.length === 0 ? (
          <div className="deck-empty">
            <div className="empty-icon">
              <Layers size={22} />
            </div>
            <h3>Your deck is empty</h3>
            <p>Add cards from the archive to start building.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <DeckRow
              key={entry.card.id}
              entry={entry}
              onOpen={onOpenCard}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onRemove={onRemove}
            />
          ))
        )}
      </div>

      <button type="button" className="deck-view-link" onClick={onSwitchToDeck}>
        Open full deck view
        <ChevronRight size={15} />
      </button>
    </aside>
  );
}
