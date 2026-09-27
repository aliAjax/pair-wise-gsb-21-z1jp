// 本机保存层：React 数据钩子，页面只通过它读写本机库
import { useCallback, useEffect, useState } from "react";
import type { BorescopeRecord, Engine, Inspector, Instrument } from "../data/types";
import {
  loadDatabase,
  saveEngine,
  saveInspector,
  saveInstrument,
  saveRecord,
  type Database,
} from "./repository";

export interface DatabaseApi {
  db: Database | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  persistRecord: (record: BorescopeRecord) => Promise<void>;
  persistEngine: (engine: Engine) => Promise<void>;
  persistInspector: (inspector: Inspector) => Promise<void>;
  persistInstrument: (instrument: Instrument) => Promise<void>;
}

export function useDatabase(): DatabaseApi {
  const [db, setDb] = useState<Database | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const next = await loadDatabase();
      setDb(next);
      setError(null);
    } catch (e) {
      setError(`本机资料库读取失败：${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const persistRecord = useCallback(
    async (record: BorescopeRecord) => {
      await saveRecord(record);
      await reload();
    },
    [reload]
  );
  const persistEngine = useCallback(
    async (engine: Engine) => {
      await saveEngine(engine);
      await reload();
    },
    [reload]
  );
  const persistInspector = useCallback(
    async (inspector: Inspector) => {
      await saveInspector(inspector);
      await reload();
    },
    [reload]
  );
  const persistInstrument = useCallback(
    async (instrument: Instrument) => {
      await saveInstrument(instrument);
      await reload();
    },
    [reload]
  );

  return {
    db,
    loading,
    error,
    reload,
    persistRecord,
    persistEngine,
    persistInspector,
    persistInstrument,
  };
}
