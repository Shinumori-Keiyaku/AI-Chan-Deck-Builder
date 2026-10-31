import { memo } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Card } from '../types';
import { CardArt } from './CardArt';

interface CardTileProps {
  card: Card;
  count: number;
  onOpen: (card: Card) => void;
  onAdd: (card: Card) => void;
  onDecrement: (card: Card) => void;
}

export const CardTile = memo(function CardTile({
  card,
  count,
  onOpen,
  onAdd,
  onDecrement,
}: CardTileProps) {
  const atMax = count >= 3;
  const canAdd = !card.isToken && !atMax;

  return (
    <article className="card-tile">
      <button
        type="button"
        className="card-art-button"
        onClick={() => onOpen(card)}
        aria-label={`View ${card.name}`}
      >
        <CardArt card={card} className="card-tile-art" />
      </button>

      <div className="card-tile-body">
        <button type="button" className="card-name" onClick={() => onOpen(card)}>
          {card.name}
        </button>

        <div
          className={`quantity-control card-quantity count-${count}`}
          aria-label={`${card.name} copies`}
        >
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
            onClick={() => onAdd(card)}
            disabled={!canAdd}
            aria-label={`Add one copy of ${card.name}`}
          >
            <Plus size={13} />
          </button>
        </div>
      </div>
    </article>
  );
});
