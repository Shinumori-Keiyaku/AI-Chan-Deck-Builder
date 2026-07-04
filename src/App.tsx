/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Card, parseCard, parsePData, encodeDeck, decodeDeck } from './lib/deck';
import { Search, Filter, ArrowUpDown, Layers, Plus, Minus, Info, X, Check, Copy } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [cards, setCards] = useState<Card[]>([]);
  const [deck, setDeck] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Database Update status state
  const [updateStatus, setUpdateStatus] = useState<string>('');

  // Confirmation state for Clear Deck
  const [confirmClear, setConfirmClear] = useState(false);

  // UI State
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortField, setSortField] = useState<'id' | 'name' | 'group' | 'type'>('id');
  const [viewTab, setViewTab] = useState<'all' | 'deck'>('all');
  
  const [gridCols, setGridCols] = useState(7);
  
  // Card Details Modal
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  
  // Deck Code
  const [deckCodeInput, setDeckCodeInput] = useState('');

  const gridColsClasses: Record<number, string> = {
    5: "xl:grid-cols-5",
    6: "xl:grid-cols-6",
    7: "xl:grid-cols-7",
    8: "xl:grid-cols-8",
    9: "xl:grid-cols-9",
    10: "xl:grid-cols-10",
  };

  const SHEET_ID = '1TDHBWj79saP6by70vFLPOMoUwoLMxdX19eYfD6eJXSY';
  const SHEETS_API_KEY = 'AIzaSyBasQBsecNqcPTHe3OjmC6QP67EyWtl5Hg';

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError('');
        setUpdateStatus('Checking for database updates...');
        
        let serverDate = '';
        try {
          const res1 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!P1?key=${SHEETS_API_KEY}`);
          const data1 = await res1.json();
          if (res1.ok && !data1.error) {
            serverDate = data1.values?.[0]?.[0] || '';
          }
        } catch (e) {
          console.warn('Could not retrieve remote database update date:', e);
        }

        const localDate = localStorage.getItem('sheetUpdatedDate');
        const cached = localStorage.getItem('sheetData');
        
        let rawData;
        if (serverDate && localDate === serverDate && cached) {
          try {
            rawData = JSON.parse(cached);
            setUpdateStatus('Database is up-to-date.');
          } catch (e) {
            console.error('Error parsing cached data, refetching...', e);
          }
        }
        
        if (!rawData) {
          setUpdateStatus('Downloading latest card data...');
          const res2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!N:P?key=${SHEETS_API_KEY}`);
          const data2 = await res2.json();
          if (!res2.ok || data2.error) {
            throw new Error(data2.error?.message || data2.error || 'Failed to fetch latest database.');
          }
          rawData = data2.values;
          if (rawData && rawData.length > 0) {
            localStorage.setItem('sheetUpdatedDate', serverDate || new Date().toLocaleDateString());
            localStorage.setItem('sheetData', JSON.stringify(rawData));
            setUpdateStatus('Database successfully updated.');
          } else if (cached) {
            rawData = JSON.parse(cached);
            setUpdateStatus('Using offline cached database.');
          }
        }

        if (rawData && rawData.length > 0) {
          processRawData(rawData);
        } else {
          setError('No card data available. Please check network connection.');
        }
      } catch (err: any) {
        console.error(err);
        const cached = localStorage.getItem('sheetData');
        if (cached) {
          try {
            processRawData(JSON.parse(cached));
            setUpdateStatus('Offline mode: Using cached database.');
          } catch (e) {
            setError('Failed to load local database.');
          }
        } else {
          setError(err.message || 'Failed to sync card data from Google Sheets.');
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function processRawData(rawData: any) {
    const newCards: Card[] = [];
    let idCounter = 1;
    
    const nStrs = rawData.map((r: any) => r[0]).filter(Boolean);
    const oStrs = rawData.map((r: any) => r[1]).filter(Boolean);
    const pStrs = rawData.map((r: any) => r[2]).filter(Boolean);

    for (const str of nStrs) {
      const card = parseCard(str, idCounter++, false);
      if (card) newCards.push(card);
    }
    
    for (const str of oStrs) {
      const card = parseCard(str, idCounter++, true);
      if (card) newCards.push(card);
    }

    parsePData(pStrs, newCards);
    setCards(newCards);
    
    // Load deck from local storage if exists
    const savedDeck = localStorage.getItem('savedDeck');
    if (savedDeck) {
      setDeck(JSON.parse(savedDeck));
    }
  }

  const handleForceUpdate = async () => {
    try {
      setLoading(true);
      setError('');
      setUpdateStatus('Force-updating database...');

      const res1 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!P1?key=${SHEETS_API_KEY}`);
      const data1 = await res1.json();
      if (data1.error) {
        throw new Error(data1.error.message || 'Failed to fetch update metadata.');
      }
      const serverDate = data1.values?.[0]?.[0] || new Date().toLocaleDateString();

      const res2 = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/NewDataBase!N:P?key=${SHEETS_API_KEY}`);
      const data2 = await res2.json();
      if (data2.error) {
        throw new Error(data2.error.message || 'Failed to force fetch data.');
      }
      const rawData = data2.values;
      if (!rawData || rawData.length === 0) {
        throw new Error('Fetched card data is empty.');
      }
      
      localStorage.setItem('sheetUpdatedDate', serverDate);
      localStorage.setItem('sheetData', JSON.stringify(rawData));
      processRawData(rawData);
      setUpdateStatus('Force update completed successfully.');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Force update failed.');
    } finally {
      setLoading(false);
    }
  };

  // Save deck changes
  useEffect(() => {
    if (Object.keys(deck).length > 0) {
      localStorage.setItem('savedDeck', JSON.stringify(deck));
    } else {
      localStorage.removeItem('savedDeck');
    }
  }, [deck]);

  const deckSize = useMemo(() => {
    return (Object.values(deck) as number[]).reduce((sum, count) => sum + count, 0);
  }, [deck]);

  const cardTypes = useMemo(() => {
    const types = new Set(cards.map(c => c.type));
    return ['All', ...Array.from(types).filter(Boolean).sort()];
  }, [cards]);

  const filteredCards = useMemo(() => {
    let result = cards;
    
    if (viewTab === 'deck') {
      result = result.filter(c => deck[c.id] > 0);
    }

    if (typeFilter !== 'All') {
      result = result.filter(c => c.type === typeFilter);
    }

    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(s) || 
        c.effect.toLowerCase().includes(s) ||
        (c.group && c.group.toLowerCase().includes(s))
      );
    }

    result = [...result].sort((a, b) => {
      if (sortField === 'id') return a.id - b.id;
      if (sortField === 'name') return a.name.localeCompare(b.name);
      if (sortField === 'group') return a.group.localeCompare(b.group);
      if (sortField === 'type') return a.type.localeCompare(b.type);
      return 0;
    });

    return result;
  }, [cards, search, typeFilter, sortField, viewTab, deck]);

  const addToDeck = (card: Card) => {
    if (card.isToken) return;
    setDeck(prev => {
      const current = prev[card.id] || 0;
      if (current >= 3) return prev;
      return { ...prev, [card.id]: current + 1 };
    });
  };

  const removeFromDeck = (card: Card) => {
    setDeck(prev => {
      const current = prev[card.id] || 0;
      if (current <= 0) return prev;
      const next = { ...prev };
      next[card.id] = current - 1;
      if (next[card.id] === 0) delete next[card.id];
      return next;
    });
  };

  const handleImport = () => {
    if (!deckCodeInput.trim()) return;
    try {
      const imported = decodeDeck(deckCodeInput.trim());
      setDeck(imported);
      setViewTab('deck');
      setDeckCodeInput('');
    } catch (e) {
      alert("Invalid deck code");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-zinc-950 text-white gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <div className="text-sm text-zinc-400 font-mono animate-pulse">{updateStatus}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-zinc-950 text-red-400 p-8 text-center max-w-md mx-auto">
        <h2 className="text-xl font-bold mb-2 text-white">Database Synchronisation Failed</h2>
        <p className="mb-6 text-sm text-zinc-400 leading-relaxed">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-5 py-2.5 bg-zinc-800 text-white hover:bg-zinc-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
        >
          Retry Synchronisation
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col md:flex-row">
      {/* Sidebar Controls */}
      <div className="w-full md:w-80 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-6 h-screen sticky top-0 overflow-y-auto shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold tracking-tight mb-1 text-white">Deck Builder</h1>
            <p className="text-xs text-zinc-400">
              Total Cards: <span className={deckSize > 40 ? "text-red-500 font-semibold" : "text-zinc-100"}>{deckSize}</span> / 40
            </p>
          </div>
        </div>

        <div className="flex gap-2 p-1 bg-zinc-950 rounded-lg">
          <button 
            onClick={() => setViewTab('all')}
            className={cn("flex-1 text-sm py-1.5 rounded-md transition-colors cursor-pointer", viewTab === 'all' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white")}
          >
            Database
          </button>
          <button 
            onClick={() => setViewTab('deck')}
            className={cn("flex-1 text-sm py-1.5 rounded-md transition-colors cursor-pointer", viewTab === 'deck' ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white")}
          >
            My Deck
          </button>
        </div>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search name or effect..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:border-zinc-600 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1"><Filter className="w-3 h-3"/> Filter Type</label>
            <select 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-zinc-600"
            >
              {cardTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1"><ArrowUpDown className="w-3 h-3"/> Sort By</label>
            <select 
              value={sortField} 
              onChange={e => setSortField(e.target.value as any)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-2 px-3 text-sm focus:outline-none focus:border-zinc-600"
            >
              <option value="id">ID (Sequence)</option>
              <option value="name">Name</option>
              <option value="group">Group</option>
              <option value="type">Card Type</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 justify-between">
              Grid Columns ({gridCols})
            </label>
            <input 
              type="range" 
              min="5" 
              max="10" 
              value={gridCols} 
              onChange={e => setGridCols(parseInt(e.target.value))}
              className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-400"
            />
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-800">
          <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Deck Code</div>
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              readOnly 
              value={encodeDeck(deck)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-sm text-zinc-300 focus:outline-none font-mono"
            />
            <button 
              onClick={() => navigator.clipboard.writeText(encodeDeck(deck))}
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Paste code..." 
              value={deckCodeInput}
              onChange={e => setDeckCodeInput(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-md py-1.5 px-3 text-sm text-zinc-300 focus:outline-none font-mono"
            />
            <button 
              onClick={handleImport}
              className="px-3 py-1.5 bg-zinc-200 text-zinc-950 hover:bg-white text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              Import
            </button>
          </div>

          {confirmClear ? (
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => {
                  setDeck({});
                  setConfirmClear(false);
                }}
                className="flex-1 py-1.5 bg-red-600 text-white hover:bg-red-700 text-sm font-medium rounded-md transition-colors cursor-pointer"
              >
                Yes, Clear
              </button>
              <button 
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-1.5 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-sm font-medium rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setConfirmClear(true)}
              className="w-full mt-2 py-1.5 bg-red-950/30 text-red-400 hover:bg-red-950/50 border border-red-900/50 text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              Clear Deck
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className={cn("grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4", gridColsClasses[gridCols])}>
          {filteredCards.map(card => (
            <div key={card.id} className="group relative bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors flex flex-col">
              <div 
                className="aspect-[2/3] bg-zinc-950 w-full relative cursor-pointer"
                onClick={() => setSelectedCard(card)}
              >
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-700">No Image</div>
                )}
                {card.isToken && (
                  <div className="absolute top-2 left-2 bg-purple-900/80 text-purple-200 text-[10px] uppercase px-1.5 py-0.5 rounded backdrop-blur-sm border border-purple-700/50">
                    Token
                  </div>
                )}
              </div>
              
              <div className="p-3 flex flex-col flex-1">
                <h3 className="font-medium text-sm leading-tight mb-1 truncate" title={card.name}>{card.name}</h3>
                <div className="text-[10px] text-zinc-500 mb-2 truncate">{card.type} • {card.group}</div>
                
                {!card.isToken && (
                  <div className="mt-auto flex items-center justify-between border-t border-zinc-800 pt-2">
                    <button 
                      onClick={() => removeFromDeck(card)}
                      disabled={!deck[card.id]}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className={cn(
                      "text-sm font-mono w-8 text-center",
                      (deck[card.id] || 0) === 0 ? "text-zinc-500" :
                      (deck[card.id] || 0) === 1 ? "text-green-500" :
                      (deck[card.id] || 0) === 2 ? "text-yellow-500" :
                      "text-red-500"
                    )}>
                      {deck[card.id] || 0}
                    </div>
                    <button 
                      onClick={() => addToDeck(card)}
                      disabled={(deck[card.id] || 0) >= 3}
                      className="p-1 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredCards.length === 0 && (
            <div className="col-span-full py-12 text-center text-zinc-500">
              No cards found matching your criteria.
            </div>
          )}
        </div>
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <CardModal 
          card={selectedCard} 
          cards={cards} 
          onClose={() => setSelectedCard(null)} 
          onNavigate={(c) => setSelectedCard(c)}
        />
      )}
    </div>
  );
}

function CardModal({ card, cards, onClose, onNavigate }: { card: Card, cards: Card[], onClose: () => void, onNavigate: (c: Card) => void }) {
  // Find recursive target cards for the current card
  const targetCards = useMemo(() => {
    if (!card.targets || card.targets.length === 0) return [];
    
    const seen = new Set<string>();
    seen.add(card.name);
    
    const result: Card[] = [];
    const queue = [...card.targets];
    
    while (queue.length > 0) {
      const currentName = queue.shift()!;
      if (!seen.has(currentName)) {
        seen.add(currentName);
        const tCard = cards.find(c => c.name === currentName);
        if (tCard) {
          result.push(tCard);
          if (tCard.targets) {
            queue.push(...tCard.targets);
          }
        }
      }
    }
    return result;
  }, [card, cards]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden w-full max-w-6xl md:h-[85vh] max-h-[95vh] flex flex-col md:flex-row shadow-2xl" onClick={e => e.stopPropagation()}>
        
        {/* Image Section */}
        <div className="w-full md:w-1/2 bg-zinc-950 p-6 flex items-center justify-center h-[45vh] md:h-full">
          <div className="relative w-full h-full max-w-lg rounded-lg overflow-hidden shadow-2xl border border-zinc-800/50 bg-zinc-900/40 flex items-center justify-center">
             {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.name} referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700">No Image</div>
              )}
          </div>
        </div>

        {/* Details Section */}
        <div className="w-full md:w-1/2 p-8 overflow-y-auto flex flex-col h-[50vh] md:h-full">
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold text-white">{card.name}</h2>
                {card.isToken && (
                  <span className="bg-purple-900/50 text-purple-300 text-xs px-2 py-0.5 rounded-full border border-purple-700/50">Token</span>
                )}
              </div>
              <div className="text-sm text-zinc-400">{card.type} • {card.group}</div>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 bg-zinc-800/50 rounded-md transition-colors"><X className="w-5 h-5"/></button>
          </div>

          <div className="flex gap-4 mb-6">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex-1 text-center">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Cost</div>
              <div className="font-mono text-lg text-blue-400">{card.cost}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex-1 text-center">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Gold</div>
              <div className="font-mono text-lg text-amber-400">{card.goldCost}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex-1 text-center">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">ATK</div>
              <div className="font-mono text-lg text-red-400">{card.atk}</div>
            </div>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 flex-1 text-center">
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">HP</div>
              <div className="font-mono text-lg text-green-400">{card.hp}</div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-medium text-white mb-2">Effect</h3>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {card.effect}
            </div>
          </div>

          {targetCards.length > 0 && (
            <div className="mt-auto pt-4 border-t border-zinc-800">
              <h3 className="text-sm font-medium text-white mb-3">Related Cards</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {targetCards.map(tc => (
                  <button 
                    key={tc.id}
                    onClick={() => onNavigate(tc)}
                    className="flex-shrink-0 w-24 group"
                  >
                    <div className="aspect-[2/3] bg-zinc-950 rounded border border-zinc-800 mb-1 overflow-hidden relative">
                      {tc.imageUrl && <img src={tc.imageUrl} referrerPolicy="no-referrer" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
                    </div>
                    <div className="text-[10px] text-center text-zinc-400 truncate group-hover:text-white transition-colors">{tc.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}