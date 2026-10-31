import type { Card, SheetData } from '../types';
import { encodeBase35 } from './deckCode';
import { parseCardEffects, parseGroups, type CardEffect } from './lua';

const DEFAULT_SHEET_ID = '1TDHBWj79saP6by70vFLPOMoUwoLMxdX19eYfD6eJXSY';
const DEFAULT_SHEET_TAB = 'NewDataBase';

const env = (import.meta.env ?? {}) as ImportMetaEnv;
export const SHEET_ID = (env.VITE_SHEET_ID || DEFAULT_SHEET_ID).trim();
export const SHEET_TAB = (env.VITE_SHEET_TAB || DEFAULT_SHEET_TAB).trim();
export const API_KEY = (
  env.VITE_GOOGLE_SHEETS_API_KEY ||
  env.VITE_GOOGLE_SHEETS_KEY ||
  ''
).trim();

const CACHE_KEY = 'deckforge.sheet.v1';
const CACHE_SCHEMA = 1;
const REQUEST_TIMEOUT_MS = 30_000;

export interface SheetVersion {
  versionKey: string;
  versionLabel: string;
  source: 'api' | 'gviz';
}

export interface SheetSnapshot {
  rows: string[][];
  source: 'api' | 'gviz';
}

interface GvizCell {
  v?: string | number | boolean | null;
  f?: string;
}

interface GvizResponse {
  status?: string;
  table?: {
    rows?: Array<{ c?: Array<GvizCell | null> }>;
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function normalizeVersionLabel(label: string): string {
  const trimmed = label.trim();

  const dateFunction = /^Date\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(trimmed);
  if (dateFunction) {
    const [, year, month, day] = dateFunction;
    return `${year}-${pad(Number(month) + 1)}-${pad(Number(day))}`;
  }

  const dayFirst = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(trimmed);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year}-${pad(Number(month))}-${pad(Number(day))}`;
  }

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return iso[0];

  return trimmed;
}

export function formatVersionLabel(label: string): string {
  const normalized = normalizeVersionLabel(label);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (!match) return label.trim();

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function getCell(row: string[] | undefined, index: number): string {
  const value = row?.[index];
  return typeof value === 'string' ? value : '';
}

async function fetchApiRange(range: string, signal: AbortSignal): Promise<string[][]> {
  const rangePath = `${encodeURIComponent(SHEET_TAB)}!${range}`;
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${rangePath}`,
  );
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
  url.searchParams.set('majorDimension', 'ROWS');

  const response = await fetch(url.toString(), {
    signal,
    cache: 'no-store',
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      if (payload.error?.message) detail = payload.error.message;
    } catch {
      // Keep the HTTP status if Google did not return JSON.
    }
    throw new Error(`Google Sheets API request failed: ${detail}`);
  }

  const payload = (await response.json()) as { values?: unknown };
  if (!Array.isArray(payload.values)) return [];

  return payload.values.map((row) =>
    Array.isArray(row) ? row.map((cell) => (cell == null ? '' : String(cell))) : [],
  );
}

let jsonpCounter = 0;

function fetchGvizRange(range: string, signal: AbortSignal): Promise<GvizResponse> {
  return new Promise((resolve, reject) => {
    const callbackName = `__deckforgeSheet_${Date.now()}_${jsonpCounter++}`;
    const script = document.createElement('script');
    const timeout = window.setTimeout(() => {
      cleanup(true);
      (window as unknown as Record<string, unknown>)[callbackName] = () => {};
      reject(new Error('The public Google Sheets endpoint timed out.'));
    }, REQUEST_TIMEOUT_MS);

    const cleanup = (keepCallback = false) => {
      window.clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      if (!keepCallback) {
        delete (window as unknown as Record<string, unknown>)[callbackName];
      }
      script.remove();
    };

    const onAbort = () => {
      cleanup(true);
      (window as unknown as Record<string, unknown>)[callbackName] = () => {};
      reject(new DOMException('The request was aborted.', 'AbortError'));
    };

    (window as unknown as Record<string, unknown>)[callbackName] = (payload: GvizResponse) => {
      cleanup();
      if (payload?.status && payload.status !== 'ok') {
        reject(new Error(`Google Sheets returned status "${payload.status}".`));
        return;
      }
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error('Could not load the public Google Sheets endpoint.'));
    };

    signal.addEventListener('abort', onAbort, { once: true });

    const params = new URLSearchParams({
      tqx: `responseHandler:${callbackName}`,
      sheet: SHEET_TAB,
      range,
    });
    script.src = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params.toString()}`;
    script.async = true;
    document.head.appendChild(script);
  });
}

function gvizToRows(payload: GvizResponse): string[][] {
  const rows = payload.table?.rows ?? [];
  return rows.map((row) =>
    (row.c ?? []).map((cell) => {
      if (!cell) return '';
      if (typeof cell.f === 'string' && cell.f.length > 0) return cell.f;
      if (cell.v === null || cell.v === undefined) return '';
      return String(cell.v);
    }),
  );
}

async function fetchRange(
  range: string,
  signal: AbortSignal,
): Promise<SheetSnapshot> {
  if (API_KEY) {
    try {
      const rows = await fetchApiRange(range, signal);
      return { rows, source: 'api' };
    } catch (error) {
      if (signal.aborted) throw error;
      // A public sheet can still be read through the visualization endpoint.
      // This keeps the app usable when the key is missing, invalid, or restricted.
    }
  }

  const payload = await fetchGvizRange(range, signal);
  return { rows: gvizToRows(payload), source: 'gviz' };
}

export async function fetchSheetVersion(signal: AbortSignal): Promise<SheetVersion> {
  const snapshot = await fetchRange('P1', signal);
  const versionLabel = getCell(snapshot.rows[0], 0).trim();

  if (!versionLabel) {
    throw new Error('The update date in cell P1 is empty.');
  }

  return {
    versionLabel,
    versionKey: normalizeVersionLabel(versionLabel),
    source: snapshot.source,
  };
}

function parseNumber(value: string): number {
  const parsed = Number.parseInt(value.trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseCard(
  raw: string,
  rowIndex: number,
  isToken: boolean,
  effectsByName: Map<string, CardEffect[]>,
): Card | null {
  const parts = raw.split('|');
  const name = (parts[0] ?? '').trim();
  if (!name) return null;

  const id = rowIndex + 1;
  const code = isToken ? `T${encodeBase35(id, 2)}` : encodeBase35(id, 2);

  return {
    id,
    code,
    name,
    effectText: (parts[1] ?? '').trim(),
    normalCost: parseNumber(parts[2] ?? '0'),
    goldCost: parseNumber(parts[3] ?? '0'),
    atk: parseNumber(parts[4] ?? '0'),
    hp: parseNumber(parts[5] ?? '0'),
    group: (parts[6] ?? 'Unknown').trim() || 'Unknown',
    type: ((parts[7] ?? 'unknown').trim() || 'unknown').toLowerCase(),
    image: (parts[8] ?? '').trim(),
    isToken,
    effects: effectsByName.get(name) ?? [],
  };
}

export interface ParsedSheetData {
  cards: Card[];
  tokens: Card[];
  groups: Record<string, string[]>;
  warnings: number;
}

export function parseSheetRows(rows: string[][]): ParsedSheetData {
  const groupsRaw = getCell(rows[1], 2);
  const groups = parseGroups(groupsRaw);

  const effectsRaw = rows
    .slice(2)
    .map((row) => getCell(row, 2))
    .filter((value) => value.trim().length > 0)
    .join('\n');

  const parsedEffects = parseCardEffects(effectsRaw, groups);
  const cards: Card[] = [];
  const tokens: Card[] = [];

  rows.forEach((row, rowIndex) => {
    const deckableRaw = getCell(row, 0);
    const tokenRaw = getCell(row, 1);

    if (deckableRaw.trim()) {
      const card = parseCard(deckableRaw, rowIndex, false, parsedEffects.effectsByName);
      if (card) cards.push(card);
    }

    if (tokenRaw.trim()) {
      const token = parseCard(tokenRaw, rowIndex, true, parsedEffects.effectsByName);
      if (token) tokens.push(token);
    }
  });

  return {
    cards,
    tokens,
    groups,
    warnings: parsedEffects.errors.length,
  };
}

export async function fetchSheetData(signal: AbortSignal): Promise<{
  data: ParsedSheetData;
  source: 'api' | 'gviz';
}> {
  const snapshot = await fetchRange('N:P', signal);
  return { data: parseSheetRows(snapshot.rows), source: snapshot.source };
}

export function buildNameIndex(cards: Card[], tokens: Card[]): Map<string, Card> {
  const index = new Map<string, Card>();

  for (const token of tokens) {
    index.set(token.name, token);
  }

  // Deckable cards win if a token shares the same name.
  for (const card of cards) {
    index.set(card.name, card);
  }

  return index;
}

export function loadCachedSheet(): SheetData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SheetData>;
    if (
      parsed.schema !== CACHE_SCHEMA ||
      typeof parsed.versionKey !== 'string' ||
      typeof parsed.versionLabel !== 'string' ||
      !Array.isArray(parsed.cards) ||
      !Array.isArray(parsed.tokens) ||
      !parsed.groups ||
      typeof parsed.groups !== 'object'
    ) {
      return null;
    }

    return {
      schema: CACHE_SCHEMA,
      versionKey: parsed.versionKey,
      versionLabel: parsed.versionLabel,
      fetchedAt: typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : '',
      cards: parsed.cards,
      tokens: parsed.tokens,
      groups: parsed.groups as Record<string, string[]>,
      warnings: typeof parsed.warnings === 'number' ? parsed.warnings : 0,
    };
  } catch {
    return null;
  }
}

export function saveCachedSheet(data: SheetData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // Storage can be disabled or full. The app still works for this session.
  }
}

export function makeSheetData(
  parsed: ParsedSheetData,
  version: SheetVersion,
): SheetData {
  return {
    schema: CACHE_SCHEMA,
    versionKey: version.versionKey,
    versionLabel: version.versionLabel,
    fetchedAt: new Date().toISOString(),
    cards: parsed.cards,
    tokens: parsed.tokens,
    groups: parsed.groups,
    warnings: parsed.warnings,
  };
}

export function searchTextForCard(card: Card): string {
  const effectNames = card.effects.map((effect) => effect.name);
  const destinations = card.effects.flatMap((effect) => effect.targets);
  return [
    card.name,
    card.effectText,
    card.group,
    card.type,
    ...effectNames,
    ...destinations,
  ]
    .join(' ')
    .toLowerCase();
}
