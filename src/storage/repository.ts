// 本机保存层：资料仓库。首次使用时把种子资料写入本机库，之后只读写本机库。
import { seedEngines, seedInstruments, seedInspectors, seedRecords } from "../data/seed";
import type { BorescopeRecord, Engine, Inspector, Instrument } from "../data/types";
import { dbBulkPut, dbGetAll, dbPut } from "./db";

export interface Database {
  engines: Engine[];
  inspectors: Inspector[];
  instruments: Instrument[];
  records: BorescopeRecord[];
}

async function ensureSeed(): Promise<void> {
  const existing = await dbGetAll<BorescopeRecord>("records");
  if (existing.length > 0) return;
  await dbBulkPut("engines", seedEngines);
  await dbBulkPut("inspectors", seedInspectors);
  await dbBulkPut("instruments", seedInstruments);
  await dbBulkPut("records", seedRecords);
}

export async function loadDatabase(): Promise<Database> {
  await ensureSeed();
  const [engines, inspectors, instruments, records] = await Promise.all([
    dbGetAll<Engine>("engines"),
    dbGetAll<Inspector>("inspectors"),
    dbGetAll<Instrument>("instruments"),
    dbGetAll<BorescopeRecord>("records"),
  ]);
  records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { engines, inspectors, instruments, records };
}

export function saveRecord(record: BorescopeRecord): Promise<IDBValidKey> {
  return dbPut("records", record);
}

export function saveEngine(engine: Engine): Promise<IDBValidKey> {
  return dbPut("engines", engine);
}

export function saveInspector(inspector: Inspector): Promise<IDBValidKey> {
  return dbPut("inspectors", inspector);
}

export function saveInstrument(instrument: Instrument): Promise<IDBValidKey> {
  return dbPut("instruments", instrument);
}
