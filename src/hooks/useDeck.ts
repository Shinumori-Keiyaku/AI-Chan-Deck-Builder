import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Card } from '../types';

const STORAGE_KEY = 'deckforge.deck.v1';

interface StoredDeck {
  schema: 1;
  counts: Record<string, number>;
  names?: Record<string, string>;
}

function loadDeckCounts(): Record<number, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Partial<StoredDeck>;
    if (parsed.schema !== 1 || !parsed.counts || typeof parsed.counts !== 'object') {
      return {};
    }

    const counts: Record<number, number> = {};
    for (const [id, count] of Object.entries(parsed.counts)) {
      const numericId = Number(id);
      const numericCount = Number(count);
      if (Number.isInteger(numericId) && numericCount > 0) {
        counts[numericId] = Math.min(3, Math.floor(numericCount));
      }
    }
    return counts;
  } catch {
    return {};
  }
}

function saveDeckCounts(counts: Record<number, number>, cards: Card[]): void {
  try {
    const cardById = new Map(cards.map((card) => [card.id, card]));
    const names: Record<string, string> = {};
    for (const id of Object.keys(counts)) {
      const card = cardById.get(Number(id));
      if (card) names[id] = card.name;
    }

    const payload: StoredDeck = {
      schema: 1,
      counts: Object.fromEntries(
        Object.entries(counts).filter(([, count]) => count > 0),
      ),
      names,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Storage can be disabled or full.
  }
}

export interface DeckCardEntry {
  card: Card;
  count: number;
}

export interface AddCardResult {
  ok: boolean;
  message?: string;
}

export function useDeck(cards: Card[] | undefined) {
  const [counts, setCounts] = useState<Record<number, number>>(() => loadDeckCounts());

  useEffect(() => {
    if (!cards || cards.length === 0) return;
    const availableIds = new Set(cards.map((card) => card.id));
    setCounts((previous) => {
      let changed = false;
      const next: Record<number, number> = {};
      for (const [id, count] of Object.entries(previous)) {
        if (availableIds.has(Number(id))) {
          next[Number(id)] = count;
        } else {
          changed = true;
        }
      }
      return changed ? next : previous;
    });
  }, [cards]);

  useEffect(() => {
    saveDeckCounts(counts, cards ?? []);
  }, [counts, cards]);

  const deckCards = useMemo<DeckCardEntry[]>(() => {
    if (!cards) return [];
    const cardById = new Map(cards.map((card) => [card.id, card]));
    return Object.entries(counts)
      .map(([id, count]) => {
        const card = cardById.get(Number(id));
        return card ? { card, count } : null;
      })
      .filter((entry): entry is DeckCardEntry => Boolean(entry))
      .sort((a, b) => a.card.id - b.card.id);
  }, [cards, counts]);

  const total = useMemo(
    () => deckCards.reduce((sum, entry) => sum + entry.count, 0),
    [deckCards],
  );

  const unique = deckCards.length;

  const typeCounts = useMemo(() => {
    const result: Record<string, number> = {};
    for (const entry of deckCards) {
      result[entry.card.type] = (result[entry.card.type] ?? 0) + entry.count;
    }
    return result;
  }, [deckCards]);

  const getCount = useCallback(
    (cardId: number) => counts[cardId] ?? 0,
    [counts],
  );

  const addCard = useCallback(
    (card: Card): AddCardResult => {
      if (card.isToken) {
        return { ok: false, message: 'Token cards cannot be added to a deck.' };
      }

      if ((counts[card.id] ?? 0) >= 3) {
        return { ok: false, message: 'Maximum 3 copies of a card.' };
      }

      setCounts((previous) => {
        const current = previous[card.id] ?? 0;
        if (current >= 3) return previous;
        return { ...previous, [card.id]: current + 1 };
      });

      return { ok: true };
    },
    [counts],
  );

  const increment = useCallback((card: Card) => addCard(card), [addCard]);

  const decrement = useCallback((card: Card) => {
    setCounts((previous) => {
      const current = previous[card.id] ?? 0;
      if (current <= 1) {
        const next = { ...previous };
        delete next[card.id];
        return next;
      }
      return { ...previous, [card.id]: current - 1 };
    });
  }, []);

  const removeCard = useCallback((card: Card) => {
    setCounts((previous) => {
      if (!(card.id in previous)) return previous;
      const next = { ...previous };
      delete next[card.id];
      return next;
    });
  }, []);

  const setCardCount = useCallback((card: Card, value: number) => {
    const nextValue = Math.max(0, Math.min(3, Math.floor(value)));
    setCounts((previous) => {
      if (nextValue === 0) {
        if (!(card.id in previous)) return previous;
        const next = { ...previous };
        delete next[card.id];
        return next;
      }
      return { ...previous, [card.id]: nextValue };
    });
  }, []);

  const clearDeck = useCallback(() => setCounts({}), []);

  const replaceDeck = useCallback((nextCounts: Record<number, number>) => {
    const cleaned: Record<number, number> = {};
    for (const [id, count] of Object.entries(nextCounts)) {
      const numericId = Number(id);
      if (Number.isInteger(numericId) && count > 0) {
        cleaned[numericId] = Math.min(3, Math.floor(count));
      }
    }
    setCounts(cleaned);
  }, []);

  // Keep a referentially stable API object so that memoized consumers
  // (e.g. the memoized CardTile grid) are not re-rendered when unrelated
  // App state (selection, tab, …) changes.
  return useMemo(
    () => ({
      counts,
      deckCards,
      total,
      unique,
      typeCounts,
      getCount,
      addCard,
      increment,
      decrement,
      removeCard,
      setCardCount,
      clearDeck,
      replaceDeck,
    }),
    [
      counts,
      deckCards,
      total,
      unique,
      typeCounts,
      getCount,
      addCard,
      increment,
      decrement,
      removeCard,
      setCardCount,
      clearDeck,
      replaceDeck,
    ],
  );
}
