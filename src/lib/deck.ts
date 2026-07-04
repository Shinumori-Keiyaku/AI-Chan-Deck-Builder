export function toBase35(num: number): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXY';
  if (num === 0) return '00';
  let res = '';
  while (num > 0) {
    res = chars[num % 35] + res;
    num = Math.floor(num / 35);
  }
  return res.padStart(2, '0');
}

export function fromBase35(str: string): number {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXY';
  let num = 0;
  for (let i = 0; i < str.length; i++) {
    num = num * 35 + chars.indexOf(str[i]);
  }
  return num;
}

export interface Card {
  id: number;
  name: string;
  effect: string;
  cost: string;
  goldCost: string;
  atk: string;
  hp: string;
  group: string;
  type: string;
  imageUrl: string;
  isToken: boolean;
  targets: string[];
}

export function parseCard(str: string, id: number, isToken: boolean): Card | null {
  if (!str) return null;
  const parts = str.split('|');
  if (parts.length < 9) return null;
  return {
    id,
    name: parts[0],
    effect: parts[1],
    cost: parts[2],
    goldCost: parts[3],
    atk: parts[4],
    hp: parts[5],
    group: parts[6],
    type: parts[7],
    imageUrl: parts[8],
    isToken,
    targets: [],
  };
}

export function parsePData(pStrs: string[], cards: Card[]) {
  if (pStrs.length < 3) return;

  const p2 = pStrs[1];
  const p3Arr = pStrs.slice(2);

  // Parse Sets
  const sets: Record<string, string[]> = {};
  const p2Matches = [...p2.matchAll(/([a-zA-Z0-9_]+)\=\{([^}]+)\}/g)];
  for (const match of p2Matches) {
    const name = match[1];
    const items = match[2].split(',').map(s => s.replace(/"/g, '').trim());
    sets[name] = items;
  }

  // Parse Effects to find targets
  const cardTargets: Record<string, string[]> = {};
  
  for (const p3 of p3Arr) {
    const nameMatch = p3.match(/name="([^"]+)"/);
    if (!nameMatch) continue;
    const cardName = nameMatch[1];
    const targets = new Set<string>();

    let str = p3;
    for (let i = 0; i < str.length; i++) {
      if (str.startsWith('create=', i) || str.startsWith('transform=', i)) {
        let cardsIdx = str.indexOf('cards=', i);
        let nextEffect = str.indexOf('effect=', i + 1);
        
        if (cardsIdx !== -1 && (nextEffect === -1 || cardsIdx < nextEffect)) {
          let rest = str.substring(cardsIdx);
          let cardsMatch = rest.match(/^cards\s*=\s*\{([^}]+)\}/);
          if (cardsMatch) {
            cardsMatch[1].split(',').forEach(s => targets.add(s.replace(/"/g, '').trim()));
          } else {
            let setMatch = rest.match(/^cards\s*=\s*(?:set|cardGroup)\.([a-zA-Z0-9_]+)/);
            if (setMatch) {
              const setName = setMatch[1];
              if (sets[setName]) {
                sets[setName].forEach(t => targets.add(t));
              }
            }
          }
        }
      }
    }
    cardTargets[cardName] = Array.from(targets);
  }

  // Assign targets to cards
  for (const card of cards) {
    if (cardTargets[card.name]) {
      card.targets = cardTargets[card.name];
    }
  }
}

export function encodeDeck(deck: Record<number, number>): string {
  const counts: Record<number, number[]> = { 1: [], 2: [], 3: [] };
  
  for (const [idStr, count] of Object.entries(deck)) {
    const id = parseInt(idStr, 10);
    if (count > 0 && count <= 3) {
      counts[count].push(id);
    }
  }

  let code = '';
  if (counts[1].length > 0) {
    code += 'Z' + counts[1].map(toBase35).join('');
  }
  if (counts[2].length > 0) {
    code += 'ZZ' + counts[2].map(toBase35).join('');
  }
  if (counts[3].length > 0) {
    code += 'ZZZ' + counts[3].map(toBase35).join('');
  }
  
  return code;
}

export function decodeDeck(code: string): Record<number, number> {
  const deck: Record<number, number> = {};
  let currentCount = 0;
  let i = 0;
  
  while (i < code.length) {
    if (code[i] === 'Z') {
      let zCount = 0;
      while (i < code.length && code[i] === 'Z') {
        zCount++;
        i++;
      }
      currentCount = zCount;
    } else {
      const chunk = code.substring(i, i + 2);
      if (chunk.length === 2 && currentCount > 0 && currentCount <= 3) {
        deck[fromBase35(chunk)] = currentCount;
      }
      i += 2;
    }
  }
  return deck;
}
