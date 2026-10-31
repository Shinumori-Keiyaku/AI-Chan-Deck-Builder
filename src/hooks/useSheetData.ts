import { useCallback, useEffect, useRef, useState } from 'react';
import type { SheetData, SyncStatus } from '../types';
import {
  fetchSheetData,
  fetchSheetVersion,
  loadCachedSheet,
  makeSheetData,
  saveCachedSheet,
} from '../lib/sheet';

interface SheetDataState {
  data: SheetData | null;
  status: SyncStatus;
  error: string | null;
  lastChecked: string | null;
  source: 'api' | 'gviz' | null;
  updateNotice: string | null;
  refresh: () => Promise<void>;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useSheetData(): SheetDataState {
  const [data, setData] = useState<SheetData | null>(() => loadCachedSheet());
  const [status, setStatus] = useState<SyncStatus>('checking');
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [source, setSource] = useState<'api' | 'gviz' | null>(null);
  const [updateNotice, setUpdateNotice] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;

    const cached = loadCachedSheet();
    if (cached) setData(cached);
    setStatus('checking');
    setError(null);
    setUpdateNotice(null);

    try {
      const version = await fetchSheetVersion(controller.signal);
      setSource(version.source);

      if (cached && cached.versionKey === version.versionKey) {
        setData(cached);
        setStatus('ready');
        setLastChecked(new Date().toISOString());
        return;
      }

      setStatus('updating');
      const snapshot = await fetchSheetData(controller.signal);
      setSource(snapshot.source);

      const nextData = makeSheetData(snapshot.data, version);
      saveCachedSheet(nextData);
      setData(nextData);
      setLastChecked(nextData.fetchedAt);
      setStatus('ready');
      setUpdateNotice(cached ? 'Card database updated.' : null);
    } catch (caught) {
      if (isAbortError(caught)) return;

      const message = caught instanceof Error ? caught.message : String(caught);
      setError(message);

      if (cached) {
        setData(cached);
        setStatus('offline');
      } else {
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    void refresh();

    return () => {
      activeRequest.current?.abort();
    };
  }, [refresh]);

  return { data, status, error, lastChecked, source, updateNotice, refresh };
}
