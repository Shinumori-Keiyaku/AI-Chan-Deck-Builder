import type { Card } from '../types';
import type { CardEffect } from './lua';

export interface DirectDestination {
  name: string;
  card?: Card;
  kind: 'create' | 'transform';
  effectName: string;
  amount?: number;
}

export interface DestinationNode extends DirectDestination {
  key: string;
  repeated: boolean;
  missing: boolean;
  children: DestinationNode[];
}

export function getDirectDestinations(
  card: Card,
  byName: Map<string, Card>,
): DirectDestination[] {
  const destinations: DirectDestination[] = [];

  for (const effect of card.effects) {
    if (effect.kind !== 'create' && effect.kind !== 'transform') continue;
    for (const name of effect.targets) {
      destinations.push({
        name,
        card: byName.get(name),
        kind: effect.kind,
        effectName: effect.name,
        amount: effect.amount,
      });
    }
  }

  return destinations;
}

export function buildDestinationTree(
  root: Card,
  byName: Map<string, Card>,
): DestinationNode[] {
  const seen = new Set<string>([root.name]);

  function walk(card: Card, path: string): DestinationNode[] {
    const nodes: DestinationNode[] = [];
    let effectIndex = 0;

    for (const effect of card.effects) {
      if (effect.kind !== 'create' && effect.kind !== 'transform') {
        effectIndex += 1;
        continue;
      }

      let targetIndex = 0;
      for (const name of effect.targets) {
        const key = `${path}-${effectIndex}-${targetIndex}`;
        const targetCard = byName.get(name);
        const repeated = seen.has(name);
        const node: DestinationNode = {
          key,
          name,
          card: targetCard,
          kind: effect.kind,
          effectName: effect.name,
          amount: effect.amount,
          repeated,
          missing: !targetCard,
          children: [],
        };

        if (!repeated && targetCard) {
          seen.add(name);
          node.children = walk(targetCard, key);
        }

        nodes.push(node);
        targetIndex += 1;
      }

      effectIndex += 1;
    }

    return nodes;
  }

  return walk(root, 'root');
}

export function describeEffectTarget(effect: CardEffect): string {
  if (effect.kind === 'create') {
    const amount = effect.amount ?? 1;
    const suffix = effect.hand ? ' to hand' : '';
    if (effect.targets.length === 1) {
      return `Create ${amount} × ${effect.targets[0]}${suffix}`;
    }
    return `Create ${amount} from ${effect.targets.length} possible cards${suffix}`;
  }

  if (effect.kind === 'transform') {
    const destination =
      effect.targets.length === 1 ? effect.targets[0] : `${effect.targets.length} possible cards`;
    return `Transform ${effect.target === 'self' ? 'this card' : 'a chosen card'} into ${destination}`;
  }

  if (effect.kind === 'add') {
    const filter = effect.filter;
    const parts: string[] = [];
    if (filter?.group) parts.push(`group ${filter.group}`);
    if (filter?.type) parts.push(`type ${filter.type}`);
    if (filter?.name) parts.push(`name ${filter.name}`);
    if (filter?.nameBan) parts.push(`excluding ${filter.nameBan}`);
    if (filter?.cost) {
      const cost = filter.cost;
      if (cost.equal !== undefined) parts.push(`cost ${cost.equal}`);
      else if (cost.min !== undefined || cost.max !== undefined) {
        parts.push(`cost ${cost.min ?? 0}-${cost.max ?? '∞'}`);
      }
      if (cost.even) parts.push('even cost');
      if (cost.gold !== undefined) parts.push(`${cost.gold} gold`);
    }
    const amount = effect.amount ?? 1;
    return `Search ${amount} card${amount === 1 ? '' : 's'}${parts.length ? ` (${parts.join(', ')})` : ''}`;
  }

  return effect.name;
}
