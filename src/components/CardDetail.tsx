import { useEffect, useMemo } from 'react';
import { ArrowLeft, Coins, Gem, Heart, Swords, X } from 'lucide-react';
import type { Card } from '../types';
import { buildDestinationTree } from '../lib/cardGraph';
import { titleCase } from '../lib/format';
import { CardArt } from './CardArt';
import { DestinationTree } from './DestinationTree';

interface CardDetailProps {
  card: Card;
  byName: Map<string, Card>;
  canGoBack: boolean;
  onClose: () => void;
  onBack: () => void;
  onOpenCard: (card: Card) => void;
}

export function CardDetail({
  card,
  byName,
  canGoBack,
  onClose,
  onBack,
  onOpenCard,
}: CardDetailProps) {
  const destinationTree = useMemo(
    () => buildDestinationTree(card, byName),
    [card, byName],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal card-detail-modal" role="dialog" aria-modal="true" aria-label={card.name}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close card details">
          <X size={19} />
        </button>

        <div className="card-detail-layout">
          <div className="card-detail-art-column">
            <CardArt card={card} className="card-detail-art" eager />
          </div>

          <div className="card-detail-content">
            {canGoBack && (
              <button type="button" className="detail-back-button" onClick={onBack}>
                <ArrowLeft size={15} />
                Back
              </button>
            )}

            <div className="card-detail-heading">
              <span className="eyebrow">
                {titleCase(card.type)} · {card.group}
              </span>
              <h2>{card.name}</h2>
            </div>

            <div className="detail-stats">
              <div className="detail-stat stat-cost">
                <span>
                  <Gem size={16} />
                  Normal cost
                </span>
                <strong>{card.normalCost}</strong>
              </div>
              <div className="detail-stat stat-gold">
                <span>
                  <Coins size={16} />
                  Gold cost
                </span>
                <strong>{card.goldCost}</strong>
              </div>
              <div className="detail-stat stat-atk">
                <span>
                  <Swords size={16} />
                  Attack
                </span>
                <strong>{card.atk}</strong>
              </div>
              <div className="detail-stat stat-hp">
                <span>
                  <Heart size={16} />
                  Health
                </span>
                <strong>{card.hp}</strong>
              </div>
            </div>

            <section className="detail-section">
              <h3>Card text</h3>
              <p className="effect-text">{card.effectText || 'No effect text.'}</p>
            </section>

            {destinationTree.length > 0 && (
              <section className="detail-section destination-section">
                <div className="detail-section-heading">
                  <h3>Destination chain</h3>
                  <span>Follows create and transform effects</span>
                </div>
                <DestinationTree nodes={destinationTree} onOpenCard={onOpenCard} />
                <p className="tree-note">
                  Repeated names are marked so loops stop. Click any destination to inspect it.
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
