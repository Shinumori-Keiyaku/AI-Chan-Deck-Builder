import { Coins, Gem, Heart, Minus, Plus, Swords, Trash2 } from 'lucide-react';
import type { Card } from '../types';
import type { DeckCardEntry } from '../hooks/useDeck';
import { titleCase } from '../lib/format';
import { CardArt } from './CardArt';

interface DeckRowProps {
  entry: DeckCardEntry;
  variant?: 'compact' | 'detail';
  onOpen: (card: Card) => void;
  onIncrement: (card: Card) => void;
  onDecrement: (card: Card) => void;
  onRemove: (card: Card) => void;
}

export function DeckRow({
  entry,
  variant = 'compact',
  onOpen,
  onIncrement,
  onDecrement,
  onRemove,
}: DeckRowProps) {
  const { card, count } = entry;

  const quantity = (
    <div className={`quantity-control count-${count}`} aria-label={`${card.name} copies`}>
      <button
        type="button"
        onClick={() => onDecrement(card)}
        disabled={count === 0}
        aria-label={`Remove one copy of ${card.name}`}
      >
        <Minus size={13} />
      </button>
      <span>{count}</span>
      <button
        type="button"
        onClick={() => onIncrement(card)}
        disabled={count >= 3}
        aria-label={`Add one copy of ${card.name}`}
      >
        <Plus size={13} />
      </button>
    </div>
  );

  if (variant === 'compact') {
    return (
      <div className="deck-row deck-row-compact">
        <button type="button" className="deck-row-name" onClick={() => onOpen(card)}>
          {card.name}
        </button>
        <div className="deck-row-controls">{quantity}</div>
      </div>
    );
  }

  return (
    <div className={`deck-row deck-row-${variant}`}>
      <button
        type="button"
        className="deck-row-art"
        onClick={() => onOpen(card)}
        aria-label={`View ${card.name}`}
      >
        <CardArt card={card} className="deck-thumb" />
      </button>

      <div className="deck-row-main">
        <button type="button" className="deck-row-name" onClick={() => onOpen(card)}>
          {card.name}
        </button>
        <div className="deck-row-meta">
          <span className="deck-code">{card.code}</span>
          <span>{card.group}</span>
          <span>{titleCase(card.type)}</span>
        </div>

        <p className="deck-row-effect">{card.effectText || 'No effect text.'}</p>

        <div className="deck-row-stats">
          <span className="stat stat-cost" title="Normal cost">
            <Gem size={11} />
            {card.normalCost}
          </span>
          <span className="stat stat-gold" title="Gold cost">
            <Coins size={11} />
            {card.goldCost}
          </span>
          <span className="stat stat-atk" title="Attack">
            <Swords size={11} />
            {card.atk}
          </span>
          <span className="stat stat-hp" title="Health">
            <Heart size={11} />
            {card.hp}
          </span>
        </div>
      </div>

      <div className="deck-row-controls">
        {quantity}
        <button
          type="button"
          className="remove-button"
          onClick={() => onRemove(card)}
          title={`Remove ${card.name}`}
          aria-label={`Remove all copies of ${card.name}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
