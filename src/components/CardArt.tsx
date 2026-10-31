import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { Card } from '../types';
import { initials } from '../lib/format';

interface CardArtProps {
  card: Card;
  className?: string;
  eager?: boolean;
}

export function CardArt({ card, className = '', eager = false }: CardArtProps) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const failed = Boolean(card.image) && failedSrc === card.image;
  const loaded = Boolean(card.image) && loadedSrc === card.image;
  const showFallback = !card.image || failed;

  return (
    <div className={`card-art-frame ${className}`.trim()}>
      {!showFallback && (
        <img
          className={loaded ? 'is-loaded' : ''}
          src={card.image}
          alt={card.name}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setLoadedSrc(card.image)}
          onError={() => setFailedSrc(card.image)}
        />
      )}

      {(showFallback || !loaded) && (
        <div
          className={`card-art-placeholder ${showFallback ? 'is-failed' : 'is-loading'}`}
          aria-hidden="true"
        >
          <span>{initials(card.name) || '?'}</span>
          {showFallback && <ImageOff size={16} />}
        </div>
      )}
    </div>
  );
}
