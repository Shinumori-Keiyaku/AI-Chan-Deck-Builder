import { AlertTriangle, CornerDownRight, Repeat2 } from 'lucide-react';
import type { Card } from '../types';
import type { DestinationNode } from '../lib/cardGraph';
import { CardArt } from './CardArt';

interface DestinationTreeProps {
  nodes: DestinationNode[];
  onOpenCard: (card: Card) => void;
}

function DestinationNodeItem({
  node,
  depth,
  onOpenCard,
}: {
  node: DestinationNode;
  depth: number;
  onOpenCard: (card: Card) => void;
}) {
  return (
    <li className={`dest-node ${node.repeated ? 'is-repeat' : ''}`}>
      <button
        type="button"
        className="dest-node-main"
        onClick={() => node.card && onOpenCard(node.card)}
        disabled={!node.card}
        style={{ paddingLeft: `${depth * 18}px` }}
      >
        {node.card ? (
          <CardArt card={node.card} className="dest-thumb" />
        ) : (
          <span className="dest-thumb dest-thumb-missing">
            <AlertTriangle size={14} />
          </span>
        )}
        <span className="dest-node-copy">
          <span className="dest-node-name">
            {depth > 0 && <CornerDownRight size={11} />}
            {node.name}
          </span>
          <span className="dest-node-via">
            {node.kind === 'transform' ? 'Transforms into' : 'Creates'} · {node.effectName}
            {node.amount && node.amount > 1 ? ` ×${node.amount}` : ''}
          </span>
        </span>
        {node.repeated && (
          <span className="dest-node-badge repeat">
            <Repeat2 size={10} />
            loop / shown
          </span>
        )}
        {node.missing && <span className="dest-node-badge missing">not found</span>}
      </button>

      {node.children.length > 0 && (
        <ul className="dest-tree dest-tree-child">
          {node.children.map((child) => (
            <DestinationNodeItem
              key={child.key}
              node={child}
              depth={depth + 1}
              onOpenCard={onOpenCard}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function DestinationTree({ nodes, onOpenCard }: DestinationTreeProps) {
  if (nodes.length === 0) return null;

  return (
    <ul className="dest-tree">
      {nodes.map((node) => (
        <DestinationNodeItem key={node.key} node={node} depth={0} onOpenCard={onOpenCard} />
      ))}
    </ul>
  );
}
