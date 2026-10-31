import type { CardEffect } from './lib/lua';

export interface Card {
  id: number;
  code: string;
  name: string;
  effectText: string;
  normalCost: number;
  goldCost: number;
  atk: number;
  hp: number;
  group: string;
  type: string;
  image: string;
  isToken: boolean;
  effects: CardEffect[];
}

export interface SheetData {
  schema: number;
  versionKey: string;
  versionLabel: string;
  fetchedAt: string;
  cards: Card[];
  tokens: Card[];
  groups: Record<string, string[]>;
  warnings: number;
}

export type SortKey = 'id' | 'name' | 'group' | 'type';
export type SortDirection = 'asc' | 'desc';
export type SyncStatus = 'checking' | 'updating' | 'ready' | 'offline' | 'error';
export type TabKey = 'builder' | 'tokens' | 'deck';
export type StatKey = 'hp' | 'atk' | 'cost' | 'gold';
export type StatCompare = 'gt' | 'lt';
