// 判定层：状态流转动作（生成新记录，由调用方负责本机保存）
import type { BorescopeRecord, Inspector, Reading } from "../data/types";
import { uid } from "../lib/util";
import { checkRelease, checkReopen, type ReleaseCheck } from "./evaluation";

export interface ActionResult {
  ok: boolean;
  record?: BorescopeRecord;
  errors?: string[];
  releaseCheck?: ReleaseCheck;
}

export interface DraftInput {
  engineId: string;
  station: string;
  bladeNo: string;
  reading: Reading;
  inspectorId: string;
  instrumentId: string;
  inspectedAt: string;
  todoNote: string;
}

/** 登记新记录：统一进入「待评估」，阻断与否都不能直接放行。 */
export function createRecord(input: DraftInput, now: string = new Date().toISOString()): BorescopeRecord {
  return {
    id: uid("rec"),
    engineId: input.engineId,
    station: input.station,
    bladeNo: input.bladeNo.trim(),
    reading: input.reading,
    inspectorId: input.inspectorId,
    instrumentId: input.instrumentId,
    inspectedAt: input.inspectedAt,
    status: "pending",
    todoNote: input.todoNote.trim() || undefined,
    amendments: [],
    createdAt: now,
  };
}

export function updatePending(record: BorescopeRecord, input: DraftInput): BorescopeRecord {
  if (record.status !== "pending") return record;
  return {
    ...record,
    reading: input.reading,
    inspectorId: input.inspectorId,
    instrumentId: input.instrumentId,
    inspectedAt: input.inspectedAt,
    todoNote: input.todoNote.trim() || undefined,
    bladeNo: input.bladeNo.trim(),
    station: input.station,
    engineId: input.engineId,
  };
}

export interface ReleaseInput {
  releaseInspectorId: string;
  engineeringBasis: string;
}

/** 放行：另一名放行人员填写工程依据。成功后读数锁定。阻断清单由界面强制展示。 */
export function releaseRecord(
  record: BorescopeRecord,
  inspectors: Inspector[],
  input: ReleaseInput,
  on: string
): ActionResult {
  const check = checkRelease(
    record,
    inspectors,
    input.releaseInspectorId,
    input.engineeringBasis,
    on
  );
  if (!check.ok) return { ok: false, errors: check.errors.map((e) => e.message), releaseCheck: check };

  return {
    ok: true,
    record: {
      ...record,
      status: "released",
      engineeringBasis: input.engineeringBasis.trim(),
      releaseInspectorId: input.releaseInspectorId,
      releasedAt: on,
    },
  };
}

export interface ReopenInput {
  operator: Inspector;
  reason: string;
  reading: Reading;
  inspectorId: string;
  instrumentId: string;
  inspectedAt: string;
  todoNote: string;
}

/**
 * 放行后更正：旧读数/旧检查人/旧仪器另存为版本并保留，记录回到待评估，
 * 清空原工程依据与放行签署，要求重新评估放行。
 */
export function reopenWithAmendment(
  record: BorescopeRecord,
  input: ReopenInput,
  now: string = new Date().toISOString(),
  on: string = now.slice(0, 10)
): ActionResult {
  const check = checkReopen(record, input.operator, input.reason, on);
  if (!check.ok) return { ok: false, errors: [check.message ?? "更正校验未通过。"] };

  const amendment = {
    id: uid("amd"),
    versionNo: record.amendments.length + 1,
    at: now,
    operatorId: input.operator.id,
    reason: input.reason.trim(),
    oldReading: record.reading,
    oldInspectorId: record.inspectorId,
    oldInstrumentId: record.instrumentId,
    oldInspectedAt: record.inspectedAt,
  };

  return {
    ok: true,
    record: {
      ...record,
      reading: input.reading,
      inspectorId: input.inspectorId,
      instrumentId: input.instrumentId,
      inspectedAt: input.inspectedAt,
      todoNote: input.todoNote.trim() || undefined,
      status: "pending",
      engineeringBasis: undefined,
      releaseInspectorId: undefined,
      releasedAt: undefined,
      amendments: [...record.amendments, amendment],
    },
  };
}
