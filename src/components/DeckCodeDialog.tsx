import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Upload, X } from 'lucide-react';
import type { Card } from '../types';
import { generateDeckCode, parseDeckCode } from '../lib/deckCode';

interface DeckCodeDialogProps {
  cards: Card[];
  counts: Record<number, number>;
  onClose: () => void;
  onImport: (counts: Record<number, number>, warnings: string[]) => void;
}

export function DeckCodeDialog({ cards, counts, onClose, onImport }: DeckCodeDialogProps) {
  const [importValue, setImportValue] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const code = useMemo(() => generateDeckCode(cards, counts), [cards, counts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copyCode = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setImportErrors(['Clipboard access was blocked by the browser. Select the code and copy it manually.']);
    }
  };

  const loadCode = () => {
    const result = parseDeckCode(importValue, cards);
    setImportErrors(result.errors);
    setImportWarnings(result.warnings);

    if (result.errors.length === 0) {
      onImport(result.counts, result.warnings);
      onClose();
    }
  };

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal code-modal" role="dialog" aria-modal="true" aria-label="Deck code">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close deck code dialog">
          <X size={19} />
        </button>

        <section className="code-output-panel">
          <div className="code-output-heading">
            <span>Generated code</span>
          </div>
          <div className={`code-output ${code ? '' : 'is-empty'}`}>
            {code || 'Add cards to your deck to generate a code.'}
          </div>
          <div className="code-output-actions">
            <button type="button" className="primary-button" onClick={copyCode} disabled={!code}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

        <section className="code-import-panel">
          <div className="code-import-heading">
            <h3>Load code</h3>
          </div>
          <div className="code-import-row">
            <input
              type="text"
              value={importValue}
              onChange={(event) => {
                setImportValue(event.target.value.toUpperCase());
                setImportErrors([]);
                setImportWarnings([]);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') loadCode();
              }}
              placeholder="e.g. Z0510A1ZZB2ZZZ42"
              spellCheck={false}
              autoComplete="off"
              aria-label="Deck code to import"
            />
            <button type="button" className="primary-button" onClick={loadCode} disabled={!importValue.trim()}>
              <Upload size={15} />
              Load
            </button>
          </div>

          {importErrors.length > 0 && (
            <div className="code-message is-error">
              <AlertTriangle size={14} />
              <div>
                {importErrors.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            </div>
          )}

          {importWarnings.length > 0 && (
            <div className="code-message is-warning">
              <AlertTriangle size={14} />
              <div>
                {importWarnings.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
