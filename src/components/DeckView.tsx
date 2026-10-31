import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  Layers,
  Trash2,
} from 'lucide-react';
import type { Card } from '../types';
import type { DeckCardEntry } from '../hooks/useDeck';
import { pluralize, titleCase } from '../lib/format';
import { DeckRow } from './DeckRow';

interface DeckViewProps {
  entries: DeckCardEntry[];
  total: number;
  unique: number;
  typeCounts: Record<string, number>;
  onBackToBuilder: () => void;
  onOpenCode: () => void;
  onClear: () => void;
  onIncrement: (card: Card) => void;
  onDecrement: (card: Card) => void;
  onRemove: (card: Card) => void;
  onOpenCard: (card: Card) => void;
}

const MAX_DECK_SIZE = 40;
const TYPE_ORDER = ['unit', 'support', 'building', 'field'];

export function DeckView({
  entries,
  total,
  unique,
  typeCounts,
  onBackToBuilder,
  onOpenCode,
  onClear,
  onIncrement,
  onDecrement,
  onRemove,
  onOpenCard,
}: DeckViewProps) {
  const progress = Math.min(100, (total / MAX_DECK_SIZE) * 100);
  const overLimit = total > MAX_DECK_SIZE;
  const complete = total === MAX_DECK_SIZE;

  const grouped = new Map<string, DeckCardEntry[]>();
  for (const entry of entries) {
    const list = grouped.get(entry.card.type) ?? [];
    list.push(entry);
    grouped.set(entry.card.type, list);
  }

  const orderedTypes = [
    ...TYPE_ORDER.filter((type) => grouped.has(type)),
    ...[...grouped.keys()].filter((type) => !TYPE_ORDER.includes(type)).sort(),
  ];

  return (
    <div className="deck-view">
      <section className={`deck-hero ${overLimit ? 'is-over' : complete ? 'is-complete' : ''}`}>
        <div className="deck-hero-main">
          <span className="eyebrow">Deck workbench</span>
          <div className="deck-hero-title-row">
            <h2>Your deck</h2>
            <span className="deck-hero-total">
              {total}
              <span> / {MAX_DECK_SIZE}</span>
            </span>
          </div>
          <div className={`deck-progress deck-hero-progress ${overLimit ? 'is-over' : complete ? 'is-complete' : ''}`}>
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
        </div>

        <div className="deck-hero-stats">
          <div className="hero-stat">
            <span>Unique cards</span>
            <strong>{unique}</strong>
          </div>
          <div className="hero-stat">
            <span>Total copies</span>
            <strong>{total}</strong>
          </div>
          <div className="hero-stat hero-stat-types">
            <span>Composition</span>
            <div className="composition-chips">
              {Object.entries(typeCounts).length === 0 ? (
                <em>No cards yet</em>
              ) : (
                Object.entries(typeCounts).map(([type, count]) => (
                  <span key={type}>
                    {titleCase(type)} <strong>{count}</strong>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="deck-hero-actions">
          <button type="button" className="ghost-button" onClick={onBackToBuilder}>
            <ArrowLeft size={15} />
            Add cards
          </button>
          <button type="button" className="primary-button" onClick={onOpenCode} disabled={total === 0}>
            <ClipboardList size={15} />
            Generate code
          </button>
          <button
            type="button"
            className="ghost-button danger-ghost"
            onClick={onClear}
            disabled={total === 0}
          >
            <Trash2 size={15} />
            Clear
          </button>
        </div>
      </section>

      {entries.length === 0 ? (
        <section className="deck-view-empty">
          <div className="empty-icon large">
            <Layers size={30} />
          </div>
          <h2>Nothing forged yet</h2>
          <p>Your deck is empty. Return to the builder and add cards from the archive.</p>
          <button type="button" className="primary-button" onClick={onBackToBuilder}>
            <ArrowLeft size={15} />
            Browse cards
          </button>
        </section>
      ) : (
        <div className="deck-sections">
          {orderedTypes.map((type) => {
            const typeEntries = grouped.get(type) ?? [];
            const typeTotal = typeEntries.reduce((sum, entry) => sum + entry.count, 0);
            return (
              <section className="deck-section" key={type}>
                <div className="deck-section-header">
                  <div>
                    <h3>{titleCase(type)}s</h3>
                    <p>{pluralize(typeTotal, 'card')}</p>
                  </div>
                  <span className="section-rule" />
                </div>
                <div className="deck-detail-grid">
                  {typeEntries.map((entry) => (
                    <DeckRow
                      key={entry.card.id}
                      entry={entry}
                      variant="detail"
                      onOpen={onOpenCard}
                      onIncrement={onIncrement}
                      onDecrement={onDecrement}
                      onRemove={onRemove}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
