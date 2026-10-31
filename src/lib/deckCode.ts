import type { Card } from '../types';

export const BASE35_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXY';

export function encodeBase35(value: number, width = 2): string {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Cannot encode ${value} in base 35`);
  }

  let remainder = value;
  let result = '';

  do {
    result = BASE35_ALPHABET[remainder % 35] + result;
    remainder = Math.floor(remainder / 35);
  } while (remainder > 0);

  return result.padStart(width, '0');
}

export function decodeBase35(value: string): number | null {
  if (!value) return null;
  let result = 0;

  for (const char of value.toUpperCase()) {
    const digit = BASE35_ALPHABET.indexOf(char);
    if (digit < 0) return null;
    result = result * 35 + digit;
  }

  return result;
}

export function generateDeckCode(
  cards: Card[],
  counts: Record<number, number>,
): string {
  const cardById = new Map(cards.map((card) => [card.id, card]));
  const entries = Object.entries(counts)
    .map(([id, count]) => ({ card: cardById.get(Number(id)), count }))
    .filter((entry): entry is { card: Card; count: number } => Boolean(entry.card))
    .filter((entry) => entry.count > 0 && entry.count <= 3)
    .sort((a, b) => a.card.id - b.card.id);

  let code = '';

  for (let copies = 1; copies <= 3; copies += 1) {
    const group = entries.filter((entry) => entry.count === copies);
    if (group.length === 0) continue;
    code += 'Z'.repeat(copies);
    code += group.map((entry) => entry.card.code).join('');
  }

  return code;
}

export interface DeckCodeParseResult {
  counts: Record<number, number>;
  errors: string[];
  warnings: string[];
}

export function parseDeckCode(code: string, cards: Card[]): DeckCodeParseResult {
  const cleaned = code.trim().toUpperCase().replace(/\s+/g, '');
  const errors: string[] = [];
  const warnings: string[] = [];
  const counts: Record<number, number> = {};
  const cardById = new Map(cards.map((card) => [card.id, card]));

  if (!cleaned) {
    return { counts, errors: ['Enter a deck code to import.'], warnings };
  }

  if (!/^[Z0-9A-Y]+$/.test(cleaned)) {
    return {
      counts,
      errors: ['Deck codes can only contain Z and the base-35 characters 0-9, A-Y.'],
      warnings,
    };
  }

  const seen = new Map<string, number>();
  let index = 0;

  while (index < cleaned.length) {
    let copies = 0;
    while (cleaned[index] === 'Z') {
      copies += 1;
      index += 1;
    }

    if (copies === 0) {
      errors.push(`Expected a Z copy marker at character ${index + 1}.`);
      break;
    }

    if (copies > 3) {
      errors.push(`A card can only have 1-3 copies, found ${copies} Z markers.`);
      break;
    }

    const cardCodes: string[] = [];
    while (index < cleaned.length && cleaned[index] !== 'Z') {
      const pair = cleaned.slice(index, index + 2);
      if (pair.length !== 2) {
        errors.push(`Incomplete card code "${pair}" at the end of the deck code.`);
        break;
      }
      if (!/^[0-9A-Y]{2}$/.test(pair)) {
        errors.push(`"${pair}" is not a valid 2-digit base-35 card code.`);
        break;
      }
      cardCodes.push(pair);
      index += 2;
    }

    if (errors.length > 0) break;
    if (cardCodes.length === 0) {
      errors.push(`The ${copies}-copy marker is not followed by a card code.`);
      break;
    }

    for (const cardCode of cardCodes) {
      seen.set(cardCode, (seen.get(cardCode) ?? 0) + 1);

      if ((seen.get(cardCode) ?? 0) > 1) {
        warnings.push(`Card ${cardCode} appears more than once; its copies were combined.`);
      }

      const id = decodeBase35(cardCode);
      const card = id === null ? undefined : cardById.get(id);

      if (!card) {
        errors.push(`Card code ${cardCode} does not match a card in the current database.`);
        continue;
      }

      counts[card.id] = Math.min(3, (counts[card.id] ?? 0) + copies);
    }
  }

  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (total > 40) {
    warnings.push(`This code contains ${total} cards. The standard deck limit is 40.`);
  }

  return { counts, errors, warnings: [...new Set(warnings)] };
}
