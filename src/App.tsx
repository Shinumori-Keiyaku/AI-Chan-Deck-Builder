import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { ArrowUpRight, Layers, SearchX, Sparkles } from 'lucide-react';
import type {
  Card,
  SortDirection,
  SortKey,
  StatCompare,
  StatKey,
  TabKey,
} from './types';
import { API_KEY, buildNameIndex, formatVersionLabel, searchTextForCard } from './lib/sheet';
import { relativeTime } from './lib/format';
import { useSheetData } from './hooks/useSheetData';
import { useDeck } from './hooks/useDeck';
import { Header } from './components/Header';
import { Toolbar } from './components/Toolbar';
import { CardTile } from './components/CardTile';
import { DeckPanel } from './components/DeckPanel';
import { DeckView } from './components/DeckView';
import { CardDetail } from './components/CardDetail';
import { DeckCodeDialog } from './components/DeckCodeDialog';
import { ErrorState, LoadingState, OfflineBanner } from './components/DataState';
import { Toast, type ToastMessage } from './components/Toast';

const TYPE_ORDER = ['unit', 'support', 'building', 'field'];
const MAX_DECK_SIZE = 40;

function cardKey(card: Card): string {
  return `${card.isToken ? 't' : 'c'}-${card.id}`;
}

function typeRank(type: string): number {
  const index = TYPE_ORDER.indexOf(type);
  return index === -1 ? TYPE_ORDER.length : index;
}

export default function App() {
  const { data, status, error, lastChecked, updateNotice, refresh } = useSheetData();
  const cards = useMemo(() => data?.cards ?? [], [data]);
  const tokens = useMemo(() => data?.tokens ?? [], [data]);
  const deck = useDeck(cards);

  const [tab, setTab] = useState<TabKey>('builder');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [typeFilter, setTypeFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statKey, setStatKey] = useState<StatKey | 'all'>('all');
  const [statCompare, setStatCompare] = useState<StatCompare>('gt');
  const [statValue, setStatValue] = useState('');
  const [sort, setSort] = useState<SortKey>('id');
  const [direction, setDirection] = useState<SortDirection>('asc');
  const [gridColumns, setGridColumns] = useState(5);
  const [selection, setSelection] = useState<{ current: string; root: string } | null>(null);
  const [codeOpen, setCodeOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimer = useRef<number | null>(null);

  const allCards = useMemo(() => [...cards, ...tokens], [cards, tokens]);
  const allCardsByKey = useMemo(
    () => new Map(allCards.map((card) => [cardKey(card), card])),
    [allCards],
  );
  const byName = useMemo(() => buildNameIndex(cards, tokens), [cards, tokens]);
  const searchIndex = useMemo(
    () => new Map(cards.map((card) => [card.id, searchTextForCard(card)])),
    [cards],
  );

  const types = useMemo(() => {
    const unique = new Set(cards.map((card) => card.type));
    return [...unique].sort((a, b) => {
      const rank = typeRank(a) - typeRank(b);
      return rank !== 0 ? rank : a.localeCompare(b);
    });
  }, [cards]);

  const groups = useMemo(
    () => [...new Set(cards.map((card) => card.group))].sort((a, b) => a.localeCompare(b)),
    [cards],
  );

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of cards) {
      counts[card.type] = (counts[card.type] ?? 0) + 1;
    }
    return counts;
  }, [cards]);

  const filteredCards = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const numericStat = Number(statValue);
    const statActive = statKey !== 'all' && statValue.trim() !== '' && Number.isFinite(numericStat);

    const result = cards.filter((card) => {
      if (typeFilter !== 'all' && card.type !== typeFilter) return false;
      if (groupFilter !== 'all' && card.group !== groupFilter) return false;
      if (normalizedQuery && !searchIndex.get(card.id)?.includes(normalizedQuery)) return false;
      if (statActive) {
        const cardStat =
          statKey === 'hp'
            ? card.hp
            : statKey === 'atk'
              ? card.atk
              : statKey === 'cost'
                ? card.normalCost
                : card.goldCost;
        if (statCompare === 'gt' ? cardStat <= numericStat : cardStat >= numericStat) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sort) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'group':
          comparison = a.group.localeCompare(b.group);
          break;
        case 'type':
          comparison = typeRank(a.type) - typeRank(b.type) || a.type.localeCompare(b.type);
          break;
        default:
          comparison = a.id - b.id;
      }
      if (comparison === 0) comparison = a.id - b.id;
      return direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [
    cards,
    deferredQuery,
    direction,
    groupFilter,
    searchIndex,
    sort,
    statCompare,
    statKey,
    statValue,
    typeFilter,
  ]);

  const selectedCard = selection ? allCardsByKey.get(selection.current) ?? null : null;
  const canGoBack = Boolean(selection && selection.current !== selection.root);
  const gridStyle = { '--card-columns': gridColumns } as CSSProperties;

  useEffect(() => {
    if (typeFilter !== 'all' && !types.includes(typeFilter)) setTypeFilter('all');
  }, [typeFilter, types]);

  useEffect(() => {
    if (groupFilter !== 'all' && !groups.includes(groupFilter)) setGroupFilter('all');
  }, [groupFilter, groups]);

  useEffect(() => {
    if (updateNotice) {
      showToast(updateNotice, 'success');
    }
  }, [updateNotice]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT' ||
        target?.isContentEditable;

      if (event.key === '/' && !isTyping) {
        event.preventDefault();
        document.getElementById('card-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function showToast(message: string, tone: ToastMessage['tone'] = 'info') {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, tone });
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }

  const openCard = useCallback((card: Card) => {
    const key = cardKey(card);
    setSelection({ current: key, root: key });
  }, []);

  const openDestination = useCallback((card: Card) => {
    const key = cardKey(card);
    setSelection((previous) => {
      if (!previous) return { current: key, root: key };
      return { ...previous, current: key };
    });
  }, []);

  const returnToRootCard = useCallback(() => {
    setSelection((previous) => (previous ? { ...previous, current: previous.root } : previous));
  }, []);

  const handleAdd = useCallback(
    (card: Card) => {
      const result = deck.addCard(card);
      if (!result.ok) {
        if (result.message) showToast(result.message, 'warning');
        return;
      }
      if (deck.total + 1 === MAX_DECK_SIZE) {
        showToast('Deck reached 40 cards.', 'success');
      }
    },
    [deck],
  );

  const handleClear = useCallback(() => {
    if (deck.total === 0) return;
    if (!window.confirm('Clear every card from the current deck?')) return;
    deck.clearDeck();
    showToast('Deck cleared.', 'info');
  }, [deck]);

  const handleImport = useCallback(
    (nextCounts: Record<number, number>, warnings: string[]) => {
      deck.replaceDeck(nextCounts);
      const importedTotal = Object.values(nextCounts).reduce((sum, count) => sum + count, 0);
      if (warnings.length > 0) {
        showToast(warnings[0], 'warning');
      } else {
        showToast(`Loaded ${importedTotal} cards from the deck code.`, 'success');
      }
    },
    [deck],
  );

  const resetFilters = useCallback(() => {
    setQuery('');
    setTypeFilter('all');
    setGroupFilter('all');
    setStatKey('all');
    setStatCompare('gt');
    setStatValue('');
    setSort('id');
    setDirection('asc');
  }, []);

  const hasData = Boolean(data);

  return (
    <div className="app-shell">
      <Header
        tab={tab}
        onTabChange={setTab}
        status={status}
        versionLabel={data?.versionLabel ?? null}
        lastChecked={lastChecked}
        deckTotal={deck.total}
        cardCount={cards.length}
        tokenCount={tokens.length}
        error={error}
        searchQuery={query}
        onSearchChange={setQuery}
        onRefresh={() => void refresh()}
      />

      {!hasData && status === 'error' ? (
        <main className="app-container centered-state">
          <ErrorState message={error ?? 'Unknown error'} hasApiKey={Boolean(API_KEY)} onRetry={() => void refresh()} />
        </main>
      ) : !hasData ? (
        <main className="app-container centered-state">
          <LoadingState status={status} />
        </main>
      ) : (
        <>
          {status === 'offline' && error && (
            <div className="app-container">
              <OfflineBanner message={error} onRetry={() => void refresh()} />
            </div>
          )}

          <main className="app-container builder-page" hidden={tab !== 'builder'}>
            <Toolbar
              query={query}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              groupFilter={groupFilter}
              onGroupFilterChange={setGroupFilter}
              statKey={statKey}
              onStatKeyChange={setStatKey}
              statCompare={statCompare}
              onStatCompareChange={setStatCompare}
              statValue={statValue}
              onStatValueChange={setStatValue}
              sort={sort}
              onSortChange={setSort}
              direction={direction}
              onDirectionChange={setDirection}
              columns={gridColumns}
              onColumnsChange={setGridColumns}
              types={types}
              groups={groups}
              typeCounts={typeCounts}
              resultCount={filteredCards.length}
              totalCount={cards.length}
              onReset={resetFilters}
            />

              <div className="builder-layout">
                <section className="card-browser" aria-label="Card archive">
                  {filteredCards.length === 0 ? (
                    <div className="cards-empty">
                      <div className="empty-icon large">
                        <SearchX size={28} />
                      </div>
                      <h2>No cards match</h2>
                      <p>Try a different name, effect, group, or card type.</p>
                      <button type="button" className="ghost-button" onClick={resetFilters}>
                        Clear all filters
                      </button>
                    </div>
                  ) : (
                    <div className="card-grid" style={gridStyle}>
                      {filteredCards.map((card) => (
                        <CardTile
                          key={card.id}
                          card={card}
                          count={deck.getCount(card.id)}
                          onOpen={openCard}
                          onAdd={handleAdd}
                          onDecrement={deck.decrement}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <DeckPanel
                  entries={deck.deckCards}
                  total={deck.total}
                  unique={deck.unique}
                  onIncrement={handleAdd}
                  onDecrement={deck.decrement}
                  onRemove={deck.removeCard}
                  onClear={handleClear}
                  onOpenCode={() => setCodeOpen(true)}
                  onOpenCard={openCard}
                  onSwitchToDeck={() => setTab('deck')}
                />
              </div>
            </main>

            <main className="app-container token-page" hidden={tab !== 'tokens'}>
              <section className="token-heading">
                <div>
                  <span className="eyebrow">Token archive</span>
                  <h2>All tokens</h2>
                  <p>Tokens are created by effects and cannot be added to a deck.</p>
                </div>
                <span className="token-total">
                  {tokens.length} {tokens.length === 1 ? 'token' : 'tokens'}
                </span>
              </section>

              {tokens.length === 0 ? (
                <div className="cards-empty">
                  <div className="empty-icon large">
                    <Sparkles size={28} />
                  </div>
                  <h2>No tokens found</h2>
                  <p>The card database does not contain any token cards yet.</p>
                </div>
              ) : (
                <div className="card-grid token-grid" style={gridStyle}>
                  {tokens.map((card) => (
                    <CardTile
                      key={cardKey(card)}
                      card={card}
                      count={0}
                      onOpen={openCard}
                      onAdd={handleAdd}
                      onDecrement={deck.decrement}
                    />
                  ))}
                </div>
              )}
            </main>

            <main className="app-container deck-page" hidden={tab !== 'deck'}>
              <DeckView
                entries={deck.deckCards}
                total={deck.total}
                unique={deck.unique}
                typeCounts={deck.typeCounts}
                onBackToBuilder={() => setTab('builder')}
                onOpenCode={() => setCodeOpen(true)}
                onClear={handleClear}
                onIncrement={handleAdd}
                onDecrement={deck.decrement}
                onRemove={deck.removeCard}
                onOpenCard={openCard}
              />
            </main>

            <footer className="app-footer app-container">
            <span>
              <span className={`footer-dot status-${status}`} />
              Data cached locally · checked {relativeTime(lastChecked)}
            </span>
            <span>
              {cards.length} cards · {tokens.length} tokens · {groups.length} groups
            </span>
            <span>
              {data?.versionLabel ? `Sheet ${formatVersionLabel(data.versionLabel)}` : 'Local archive'} ·{' '}
              <a href="#builder" onClick={() => setTab('builder')}>
                Back to builder <ArrowUpRight size={12} />
              </a>
            </span>
          </footer>
        </>
      )}

      {tab === 'builder' && hasData && (
        <div className="mobile-deck-bar">
          <div className="mobile-deck-info">
            <span>Deck</span>
            <strong>
              {deck.total} / {MAX_DECK_SIZE}
            </strong>
          </div>
          <div className="mobile-deck-progress">
            <div
              className={deck.total > MAX_DECK_SIZE ? 'is-over' : ''}
              style={{ width: `${Math.min(100, (deck.total / MAX_DECK_SIZE) * 100)}%` }}
            />
          </div>
          <button type="button" onClick={() => setTab('deck')}>
            <Layers size={15} />
            View deck
          </button>
        </div>
      )}

      {selectedCard && (
        <CardDetail
          key={selection?.current}
          card={selectedCard}
          byName={byName}
          canGoBack={canGoBack}
          onClose={() => setSelection(null)}
          onBack={returnToRootCard}
          onOpenCard={openDestination}
        />
      )}

      {codeOpen && (
        <DeckCodeDialog
          cards={cards}
          counts={deck.counts}
          onClose={() => setCodeOpen(false)}
          onImport={handleImport}
        />
      )}

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
