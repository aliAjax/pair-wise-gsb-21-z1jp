// 判定层：孔探复核规则（纯函数，不碰存储与界面）
import type { BorescopeRecord, Inspector, Instrument, Reading } from "../data/types";
import { isValidOn, today } from "../lib/util";

/** 损伤增长阈值：较上次增长超过 1mm 必须停在待评估 */
export const GROWTH_LIMIT_MM = 1;

export const STATUS_LABEL: Record<BorescopeRecord["status"], string> = {
  pending: "待评估",
  released: "已放行",
};

export type BlockerCode =
  | "GROWTH_OVER_LIMIT"
  | "INSTRUMENT_EXPIRED"
  | "INSPECTOR_EXPIRED"
  | "DATA_INVALID";

export interface Blocker {
  code: BlockerCode;
  message: string;
}

export interface PreviousComparison {
  previous: BorescopeRecord | null;
  /** 同一记录更正重评时，上一版已放行读数来自版本表 */
  fromAmendmentVersion: number | null;
  previousInspectedAt: string;
  previousReading: Reading;
  lengthDelta: number;
  depthDelta: number;
  referenceDelta: number;
  growthOverLimit: boolean;
}

export interface Evaluation {
  blockers: Blocker[];
  comparison: PreviousComparison | null;
  /** 是否可直接进入放行签署（无硬阻断） */
  clearToRelease: boolean;
}

/**
 * 找上次读数：同发动机、同站位、同叶片编号，检查日期早于本次的最近一次记录，
 * 优先已放行记录；日期相同则取创建更早的。
 */
export function findPrevious(
  records: BorescopeRecord[],
  target: BorescopeRecord
): BorescopeRecord | null {
  const candidates = records.filter(
    (r) =>
      r.id !== target.id &&
      r.status === "released" &&
      r.engineId === target.engineId &&
      r.station === target.station &&
      r.bladeNo.trim() === target.bladeNo.trim() &&
      (r.inspectedAt < target.inspectedAt ||
        (r.inspectedAt === target.inspectedAt && r.createdAt < target.createdAt))
  );
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => {
    if (a.inspectedAt !== b.inspectedAt) return b.inspectedAt.localeCompare(a.inspectedAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
  return candidates[0];
}

export function compareWithPrevious(
  records: BorescopeRecord[],
  record: BorescopeRecord
): PreviousComparison | null {
  // 同一记录经「更正另存」回到待评估时，上一版已放行读数优先取自身最新版本
  if (record.status === "pending" && record.amendments.length > 0) {
    const last = record.amendments[record.amendments.length - 1];
    const lengthDelta = record.reading.defectLengthMm - last.oldReading.defectLengthMm;
    const depthDelta = record.reading.defectDepthMm - last.oldReading.defectDepthMm;
    const referenceDelta = record.reading.referenceMm - last.oldReading.referenceMm;
    return {
      previous: null,
      fromAmendmentVersion: last.versionNo,
      previousInspectedAt: last.oldInspectedAt,
      previousReading: last.oldReading,
      lengthDelta,
      depthDelta,
      referenceDelta,
      growthOverLimit: lengthDelta > GROWTH_LIMIT_MM + 1e-9,
    };
  }

  const previous = findPrevious(records, record);
  if (!previous) return null;
  const lengthDelta = record.reading.defectLengthMm - previous.reading.defectLengthMm;
  const depthDelta = record.reading.defectDepthMm - previous.reading.defectDepthMm;
  const referenceDelta = record.reading.referenceMm - previous.reading.referenceMm;
  return {
    previous,
    fromAmendmentVersion: null,
    previousInspectedAt: previous.inspectedAt,
    previousReading: previous.reading,
    lengthDelta,
    depthDelta,
    referenceDelta,
    growthOverLimit: lengthDelta > GROWTH_LIMIT_MM + 1e-9,
  };
}

function isReadingValid(record: BorescopeRecord): boolean {
  const r = record.reading;
  return (
    r &&
    Number.isFinite(r.defectLengthMm) &&
    Number.isFinite(r.defectDepthMm) &&
    Number.isFinite(r.referenceMm) &&
    r.defectLengthMm >= 0 &&
    r.defectDepthMm >= 0 &&
    r.referenceMm > 0 &&
    record.bladeNo.trim().length > 0
  );
}

/**
 * 评估一条待评估记录：仪器过期 / 检查人资质失效 / 损伤较上次增长超 1mm 时，
 * 只能停在待评估，等待另一名放行人员填写工程依据。
 */
export function evaluate(
  record: BorescopeRecord,
  records: BorescopeRecord[],
  inspectors: Inspector[],
  instruments: Instrument[],
  on: string = today()
): Evaluation {
  const blockers: Blocker[] = [];

  if (!isReadingValid(record)) {
    blockers.push({
      code: "DATA_INVALID",
      message: "读数不完整或无效（长度、深度、参照尺寸需为非负数值，叶片编号必填）。",
    });
  }

  const instrument = instruments.find((i) => i.id === record.instrumentId);
  if (!instrument || !isValidOn(instrument.calibrationExpiry, on)) {
    blockers.push({
      code: "INSTRUMENT_EXPIRED",
      message: instrument
        ? `仪器 ${instrument.name} 校准已于 ${instrument.calibrationExpiry} 过期，读数不可放行。`
        : "选用的仪器资料缺失，无法确认校准有效期。",
    });
  }

  const inspector = inspectors.find((i) => i.id === record.inspectorId);
  if (!inspector || !inspector.canInspect || !isValidOn(inspector.qualificationExpiry, on)) {
    blockers.push({
      code: "INSPECTOR_EXPIRED",
      message: inspector
        ? `检查人 ${inspector.name} 的孔探资质${
            inspector.canInspect ? "" : "或检查授权"
          }于 ${inspector.qualificationExpiry} 失效，检查无效。`
        : "检查人资料缺失，无法确认资质有效期。",
    });
  }

  const comparison = compareWithPrevious(records, record);
  if (comparison?.growthOverLimit) {
    blockers.push({
      code: "GROWTH_OVER_LIMIT",
      message: `缺陷长度由上次 ${comparison.previousReading.defectLengthMm.toFixed(
        2
      )}mm 增至 ${record.reading.defectLengthMm.toFixed(2)}mm，增长 ${comparison.lengthDelta.toFixed(
        2
      )}mm，超过 ${GROWTH_LIMIT_MM}mm 限值。`,
    });
  }

  return { blockers, comparison, clearToRelease: blockers.length === 0 };
}

export type ReleaseErrorCode =
  | "NOT_PENDING"
  | "RELEASE_PERSON_REQUIRED"
  | "RELEASE_PERSON_UNQUALIFIED"
  | "SAME_PERSON"
  | "ENGINEERING_BASIS_REQUIRED";

export interface ReleaseCheck {
  ok: boolean;
  errors: { code: ReleaseErrorCode; message: string }[];
}

/**
 * 放行校验：阻断项不自动消失，必须由另一名放行人员（有效资质、且不是检查人本人）
 * 在工程依据中逐条覆盖后放行。阻断清单由界面强制展示，这里只校验签署要件。
 */
export function checkRelease(
  record: BorescopeRecord,
  inspectors: Inspector[],
  releaseInspectorId: string,
  engineeringBasis: string,
  on: string = today()
): ReleaseCheck {
  const errors: ReleaseCheck["errors"] = [];

  if (record.status !== "pending") {
    errors.push({ code: "NOT_PENDING", message: "只有待评估记录可以放行。" });
  }

  const releasePerson = inspectors.find((i) => i.id === releaseInspectorId);
  if (!releaseInspectorId || !releasePerson) {
    errors.push({ code: "RELEASE_PERSON_REQUIRED", message: "请选择放行人员。" });
  } else {
    if (!releasePerson.canRelease) {
      errors.push({
        code: "RELEASE_PERSON_UNQUALIFIED",
        message: `${releasePerson.name} 不是授权放行人员。`,
      });
    } else if (!isValidOn(releasePerson.qualificationExpiry, on)) {
      errors.push({
        code: "RELEASE_PERSON_UNQUALIFIED",
        message: `放行人员 ${releasePerson.name} 的资质已于 ${releasePerson.qualificationExpiry} 失效。`,
      });
    }
    if (releaseInspectorId === record.inspectorId) {
      errors.push({ code: "SAME_PERSON", message: "放行人员不能与检查人为同一人，须由另一名放行人员复核签署。" });
    }
  }

  if (!engineeringBasis.trim()) {
    errors.push({
      code: "ENGINEERING_BASIS_REQUIRED",
      message: "必须填写工程依据（限长数据 / 手册条款 / 工程偏离批准编号）。",
    });
  }

  return { ok: errors.length === 0, errors };
}

export interface ReopenCheck {
  ok: boolean;
  message?: string;
}

/** 放行后更正：填写更正原因和操作人，旧值另存为新版本。 */
export function checkReopen(
  record: BorescopeRecord,
  operator: Inspector | undefined,
  reason: string,
  on: string = today()
): ReopenCheck {
  if (record.status !== "released") return { ok: false, message: "只有已放行记录可以发起更正。" };
  if (!operator) return { ok: false, message: "请选择发起更正的人员。" };
  if (!operator.canRelease) return { ok: false, message: "更正须由授权放行人员发起。" };
  if (!isValidOn(operator.qualificationExpiry, on)) {
    return { ok: false, message: `${operator.name} 的资质已失效，不能发起更正。` };
  }
  if (!reason.trim()) return { ok: false, message: "请填写更正原因，旧值将作为版本保留。" };
  return { ok: true };
}
