// 资料层：发动机、站位、人员、仪器和示例记录
// 资料单独维护，判定规则和页面不直接改这些数据

import type { BorescopeRecord, Engine, Instrument, Person } from "../domain/judgment";

export const engines: Engine[] = [
  { id: "ENG-1", model: "CFM56-7B", serial: "ESN 874512" },
  { id: "ENG-2", model: "V2500-A5", serial: "ESN V103427" },
];

export const stations = [
  "FAN 风扇",
  "LPC 4级",
  "HPC 3级",
  "HPT 1级",
  "LPT 2级",
];

export const personnel: Person[] = [
  { id: "P-01", name: "王建国", roles: ["检查"], qualificationDue: "2027-03-31" },
  // 李晓峰资质已失效（今天为 2026-09-27），用于演示资质保留
  { id: "P-02", name: "李晓峰", roles: ["检查"], qualificationDue: "2025-12-31" },
  { id: "P-03", name: "赵明", roles: ["放行"], qualificationDue: "2027-06-30" },
  { id: "P-04", name: "陈立", roles: ["检查", "放行"], qualificationDue: "2027-01-31" },
];

export const instruments: Instrument[] = [
  { id: "BS-01", name: "XLG4 孔探仪", calibrationDue: "2027-02-28" },
  // BS-02 校准已过期，用于演示仪器保留
  { id: "BS-02", name: "Mentor Visual iQ", calibrationDue: "2026-05-31" },
];

export function inspectorName(id: string): string {
  return personnel.find((person) => person.id === id)?.name ?? id;
}

export function instrumentName(id: string): string {
  return instruments.find((instrument) => instrument.id === id)?.name ?? id;
}

export function engineLabel(engineId: string): string {
  const engine = engines.find((item) => item.id === engineId);
  return engine ? `${engine.model} · ${engine.serial}` : engineId;
}

// 示例记录：覆盖增长保留、仪器过期、资质失效、已放行锁定与更正留痕
export const seedRecords: BorescopeRecord[] = [
  {
    id: "R-26031001",
    engineId: "ENG-1",
    station: "HPT 1级",
    bladeNo: "B-12",
    inspectorId: "P-01",
    instrumentId: "BS-01",
    inspectedAt: "2026-03-10",
    status: "已放行",
    holdReasons: [],
    versions: [
      {
        version: 1,
        defectLengthMm: 3.0,
        depthMm: 0.8,
        referenceMm: 6.0,
        reason: "首次登记",
        savedBy: "王建国",
        savedAt: "2026-03-10",
      },
      {
        version: 2,
        defectLengthMm: 3.2,
        depthMm: 0.8,
        referenceMm: 6.0,
        reason: "复测校焦后修正读数，原读数偏低 0.2mm",
        savedBy: "王建国",
        savedAt: "2026-03-10",
      },
    ],
    release: {
      releaserId: "P-03",
      releaserName: "赵明",
      engineeringBasis: "依据 AMM 72-31-11 判据，缺陷在可用限制内，同意放行并纳入下次孔探趋势监控。",
      releasedAt: "2026-03-11",
    },
  },
  {
    id: "R-26092001",
    engineId: "ENG-1",
    station: "HPT 1级",
    bladeNo: "B-12",
    inspectorId: "P-01",
    instrumentId: "BS-01",
    inspectedAt: "2026-09-20",
    status: "待评估",
    holdReasons: ["缺陷长度较上次增长 1.4mm，超过 1mm 增长限制"],
    versions: [
      {
        version: 1,
        defectLengthMm: 4.6,
        depthMm: 1.1,
        referenceMm: 6.0,
        reason: "首次登记",
        savedBy: "王建国",
        savedAt: "2026-09-20",
      },
    ],
  },
  {
    id: "R-26091805",
    engineId: "ENG-1",
    station: "HPC 3级",
    bladeNo: "B-05",
    inspectorId: "P-02",
    instrumentId: "BS-01",
    inspectedAt: "2026-09-18",
    status: "待评估",
    holdReasons: ["检查人 李晓峰 资质已于 2025-12-31 失效"],
    versions: [
      {
        version: 1,
        defectLengthMm: 2.1,
        depthMm: 0.5,
        referenceMm: 5.0,
        reason: "首次登记",
        savedBy: "李晓峰",
        savedAt: "2026-09-18",
      },
    ],
  },
  {
    id: "R-26080230",
    engineId: "ENG-2",
    station: "LPT 2级",
    bladeNo: "B-30",
    inspectorId: "P-01",
    instrumentId: "BS-01",
    inspectedAt: "2026-08-02",
    status: "已放行",
    holdReasons: [],
    versions: [
      {
        version: 1,
        defectLengthMm: 1.8,
        depthMm: 0.4,
        referenceMm: 4.5,
        reason: "首次登记",
        savedBy: "王建国",
        savedAt: "2026-08-02",
      },
    ],
    release: {
      releaserId: "P-04",
      releaserName: "陈立",
      engineeringBasis: "对照 ESM 72-21-00 容限表无超限，结合历史照片确认无扩展，放行。",
      releasedAt: "2026-08-03",
    },
  },
  {
    id: "R-26092503",
    engineId: "ENG-2",
    station: "FAN 风扇",
    bladeNo: "B-03",
    inspectorId: "P-01",
    instrumentId: "BS-02",
    inspectedAt: "2026-09-25",
    status: "待评估",
    holdReasons: ["孔探仪 Mentor Visual iQ 校准已于 2026-05-31 到期"],
    versions: [
      {
        version: 1,
        defectLengthMm: 2.4,
        depthMm: 0.6,
        referenceMm: 5.5,
        reason: "首次登记",
        savedBy: "王建国",
        savedAt: "2026-09-25",
      },
    ],
  },
];
