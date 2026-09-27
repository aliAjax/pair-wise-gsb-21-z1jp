// 判定层：孔探读数的状态机与放行规则
// 与资料、存储、页面解耦，规则改动只维护本文件

export type Role = "检查" | "放行";

export interface Person {
  id: string;
  name: string;
  roles: Role[];
  /** 资质有效期至（ISO 日期） */
  qualificationDue: string;
}

export interface Instrument {
  id: string;
  name: string;
  /** 校准有效期至（ISO 日期） */
  calibrationDue: string;
}

export interface Engine {
  id: string;
  model: string;
  serial: string;
}

export interface Reading {
  /** 缺陷长度 mm */
  defectLengthMm: number;
  /** 缺陷深度 mm */
  depthMm: number;
  /** 参照尺寸 mm（用于比例判定的叶片特征尺寸） */
  referenceMm: number;
}

export interface RecordVersion extends Reading {
  version: number;
  /** 首次登记或更正原因 */
  reason: string;
  savedBy: string;
  savedAt: string;
}

export interface ReleaseInfo {
  releaserId: string;
  releaserName: string;
  engineeringBasis: string;
  releasedAt: string;
}

export type RecordStatus = "待评估" | "已放行";

export interface BorescopeRecord {
  id: string;
  engineId: string;
  station: string;
  bladeNo: string;
  inspectorId: string;
  instrumentId: string;
  inspectedAt: string;
  status: RecordStatus;
  /** 本次登记/最近一次更正时命中的保留项 */
  holdReasons: string[];
  versions: RecordVersion[];
  release?: ReleaseInfo;
}

export interface RegisterInput {
  engineId: string;
  station: string;
  bladeNo: string;
  inspectorId: string;
  instrumentId: string;
  inspectedAt: string;
  reading: Reading;
}

/** 损伤长度允许的最大增长（mm） */
export const GROWTH_LIMIT_MM = 1;

/** 工程依据最少字数，防止"一句话放行" */
const BASIS_MIN_LENGTH = 10;

export function currentReading(record: BorescopeRecord): Reading {
  return record.versions[record.versions.length - 1];
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function growthSince(current: Reading, previous: Reading | undefined): number | undefined {
  if (!previous) return undefined;
  return round1(current.defectLengthMm - previous.defectLengthMm);
}

/** 同一台发动机、同一站位、同一叶片编号下最近一次历史读数 */
export function findPreviousReading(
  records: BorescopeRecord[],
  match: Pick<BorescopeRecord, "engineId" | "station" | "bladeNo">,
  excludeId?: string
): Reading | undefined {
  const candidates = records
    .filter(
      (record) =>
        record.id !== excludeId &&
        record.engineId === match.engineId &&
        record.station === match.station &&
        record.bladeNo === match.bladeNo
    )
    .sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt));
  return candidates.length ? currentReading(candidates[0]) : undefined;
}

/** 核心判定：命中任一保留条件即只能停在待评估 */
export function evaluateReading(args: {
  reading: Reading;
  previous?: Reading;
  instrument: Instrument;
  inspector: Person;
  inspectedAt: string;
}): string[] {
  const reasons: string[] = [];

  const growth = growthSince(args.reading, args.previous);
  if (growth !== undefined && growth > GROWTH_LIMIT_MM) {
    reasons.push(
      `缺陷长度较上次增长 ${growth}mm，超过 ${GROWTH_LIMIT_MM}mm 增长限制`
    );
  }

  if (args.inspectedAt > args.instrument.calibrationDue) {
    reasons.push(`孔探仪 ${args.instrument.name} 校准已于 ${args.instrument.calibrationDue} 到期`);
  }

  if (args.inspectedAt > args.inspector.qualificationDue) {
    reasons.push(`检查人 ${args.inspector.name} 资质已于 ${args.inspector.qualificationDue} 失效`);
  }

  return reasons;
}

/** 放行校验：必须由另一名具备有效放行资质的人填写工程依据 */
export function validateRelease(
  record: BorescopeRecord,
  releaser: Person | undefined,
  basis: string
): string | null {
  if (record.status !== "待评估") return "仅待评估记录需要复核放行";
  if (!releaser) return "请选择放行人员";
  if (!releaser.roles.includes("放行")) return `${releaser.name} 不具备放行资质`;
  if (releaser.qualificationDue < record.inspectedAt)
    return `${releaser.name} 放行资质已于 ${releaser.qualificationDue} 失效`;
  if (releaser.id === record.inspectorId) return "须由另一名放行人员复核，不能与检查人本人相同";
  if (basis.trim().length < BASIS_MIN_LENGTH)
    return `请填写工程依据（不少于 ${BASIS_MIN_LENGTH} 个字）`;
  return null;
}

/** 更正后重新判定：保留项仍在则退回待评估并撤销原放行 */
export function reevaluateAfterCorrection(
  records: BorescopeRecord[],
  record: BorescopeRecord,
  reading: Reading,
  instrument: Instrument,
  inspector: Person
): Pick<BorescopeRecord, "status" | "holdReasons" | "release"> {
  const previous = findPreviousReading(records, record, record.id);
  const holdReasons = evaluateReading({
    reading,
    previous,
    instrument,
    inspector,
    inspectedAt: record.inspectedAt,
  });
  if (holdReasons.length > 0) {
    return { status: "待评估", holdReasons, release: undefined };
  }
  return { status: "已放行", holdReasons, release: record.release };
}
