import {
  ArrowDown,
  ArrowUp,
  Minus,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type { SortDirection, SortKey, StatCompare, StatKey } from '../types';
import { titleCase } from '../lib/format';

interface ToolbarProps {
  query: string;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  groupFilter: string;
  onGroupFilterChange: (value: string) => void;
  statKey: StatKey | 'all';
  onStatKeyChange: (value: StatKey | 'all') => void;
  statCompare: StatCompare;
  onStatCompareChange: (value: StatCompare) => void;
  statValue: string;
  onStatValueChange: (value: string) => void;
  sort: SortKey;
  onSortChange: (value: SortKey) => void;
  direction: SortDirection;
  onDirectionChange: (value: SortDirection) => void;
  columns: number;
  onColumnsChange: (value: number) => void;
  types: string[];
  groups: string[];
  typeCounts: Record<string, number>;
  resultCount: number;
  totalCount: number;
  onReset: () => void;
}

const STAT_LABELS: Record<StatKey, string> = {
  hp: 'HP',
  atk: 'ATK',
  cost: 'Cost',
  gold: 'Gold cost',
};

const SORT_LABELS: Record<SortKey, string> = {
  id: 'Card ID',
  name: 'Name',
  group: 'Group',
  type: 'Card type',
};

const MIN_COLUMNS = 5;
const MAX_COLUMNS = 8;

export function Toolbar({
  query,
  typeFilter,
  onTypeFilterChange,
  groupFilter,
  onGroupFilterChange,
  statKey,
  onStatKeyChange,
  statCompare,
  onStatCompareChange,
  statValue,
  onStatValueChange,
  sort,
  onSortChange,
  direction,
  onDirectionChange,
  columns,
  onColumnsChange,
  types,
  groups,
  typeCounts,
  resultCount,
  totalCount,
  onReset,
}: ToolbarProps) {
  const hasFilters =
    Boolean(query.trim()) ||
    typeFilter !== 'all' ||
    groupFilter !== 'all' ||
    (statKey !== 'all' && statValue.trim() !== '');

  return (
    <section className="toolbar" aria-label="Card filters">
      <div className="toolbar-top">
        <div className="toolbar-selects">
          <label className="select-field">
            <span>Group</span>
            <select value={groupFilter} onChange={(event) => onGroupFilterChange(event.target.value)}>
              <option value="all">All groups</option>
              {groups.map((group) => (
                <option value={group} key={group}>
                  {group}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field stat-select">
            <span>Stat</span>
            <select
              value={statKey}
              onChange={(event) => onStatKeyChange(event.target.value as StatKey | 'all')}
            >
              <option value="all">Any stat</option>
              {(Object.keys(STAT_LABELS) as StatKey[]).map((key) => (
                <option value={key} key={key}>
                  {STAT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <label className="select-field stat-mode">
            <span>Compare</span>
            <select
              value={statCompare}
              onChange={(event) => onStatCompareChange(event.target.value as StatCompare)}
              disabled={statKey === 'all'}
            >
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
            </select>
          </label>

          <label className="select-field stat-value-field">
            <span>Value</span>
            <input
              type="number"
              inputMode="numeric"
              value={statValue}
              onChange={(event) => onStatValueChange(event.target.value)}
              placeholder="0"
              disabled={statKey === 'all'}
              aria-label="Stat filter value"
            />
          </label>

          <label className="select-field">
            <span>Sort</span>
            <select value={sort} onChange={(event) => onSortChange(event.target.value as SortKey)}>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <option value={key} key={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="direction-button"
            onClick={() => onDirectionChange(direction === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${direction === 'asc' ? 'descending' : 'ascending'}`}
            aria-label={`Sort ${direction === 'asc' ? 'descending' : 'ascending'}`}
          >
            {direction === 'asc' ? <ArrowUp size={17} /> : <ArrowDown size={17} />}
          </button>
        </div>
      </div>

      <div className="toolbar-bottom">
        <div className="type-chips" role="group" aria-label="Filter by card type">
          <button
            type="button"
            className={`type-chip ${typeFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => onTypeFilterChange('all')}
          >
            <SlidersHorizontal size={13} />
            All cards
            <span>{totalCount}</span>
          </button>
          {types.map((type) => (
            <button
              type="button"
              className={`type-chip ${typeFilter === type ? 'is-active' : ''}`}
              onClick={() => onTypeFilterChange(type)}
              key={type}
            >
              {titleCase(type)}
              <span>{typeCounts[type] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="results-summary">
          <div className="grid-size-control" title="Card grid columns">
            <span className="grid-size-label">Columns</span>
            <div className="grid-size-stepper">
              <button
                type="button"
                onClick={() => onColumnsChange(Math.max(MIN_COLUMNS, columns - 1))}
                disabled={columns <= MIN_COLUMNS}
                aria-label="Show fewer columns"
              >
                <Minus size={11} />
              </button>
              <span>{columns}</span>
              <button
                type="button"
                onClick={() => onColumnsChange(Math.min(MAX_COLUMNS, columns + 1))}
                disabled={columns >= MAX_COLUMNS}
                aria-label="Show more columns"
              >
                <Plus size={11} />
              </button>
            </div>
          </div>
          <span>
            <strong>{resultCount}</strong> {resultCount === 1 ? 'card' : 'cards'}
          </span>
          {hasFilters && (
            <button type="button" className="reset-button" onClick={onReset}>
              <RotateCcw size={13} />
              Reset
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
