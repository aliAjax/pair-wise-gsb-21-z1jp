// 资料层：种子资料（首次启动写入本机库，之后以本机保存为准）
import type { BorescopeRecord, Engine, Inspector, Instrument } from "./types";

export const seedEngines: Engine[] = [
  {
    id: "eng-1001",
    serial: "CFM56-7B-809-771",
    model: "CFM56-7B",
    aircraft: "B-5612",
    stations: ["S1-风扇叶片", "S2-增压器", "S3-高压压气机前", "S8-高压涡轮"],
  },
  {
    id: "eng-1002",
    serial: "CFM56-7B-809-802",
    model: "CFM56-7B",
    aircraft: "B-5627",
    stations: ["S1-风扇叶片", "S2-增压器", "S3-高压压气机前", "S8-高压涡轮"],
  },
];

export const seedInspectors: Inspector[] = [
  { id: "ins-01", name: "李伟", canInspect: true, canRelease: false, qualificationExpiry: "2027-03-31" },
  { id: "ins-02", name: "王敏", canInspect: true, canRelease: true, qualificationExpiry: "2026-12-15" },
  { id: "ins-03", name: "赵强", canInspect: false, canRelease: true, qualificationExpiry: "2026-08-31" },
  { id: "ins-04", name: "陈芳", canInspect: true, canRelease: true, qualificationExpiry: "2026-10-09" },
  { id: "ins-05", name: "周军", canInspect: true, canRelease: false, qualificationExpiry: "2026-09-15" },
];

export const seedInstruments: Instrument[] = [
  { id: "itm-01", name: "韦林 XL Go 孔探仪", serial: "XLG-2031", calibrationExpiry: "2026-12-01" },
  { id: "itm-02", name: "奥林巴斯 IPLEX NX", serial: "IPN-1187", calibrationExpiry: "2026-09-10" },
  { id: "itm-03", name: "韦林 Everest Mentor", serial: "EMB-4402", calibrationExpiry: "2027-02-28" },
];

export const seedRecords: BorescopeRecord[] = [
  {
    // R1：已放行的基线，缺陷 2.2mm，将与后续 R2 对比
    id: "rec-001",
    engineId: "eng-1001",
    station: "S1-风扇叶片",
    bladeNo: "B14",
    reading: { defectLengthMm: 2.2, defectDepthMm: 0.32, referenceMm: 42.8 },
    inspectorId: "ins-01",
    instrumentId: "itm-01",
    inspectedAt: "2026-07-18",
    status: "released",
    engineeringBasis: "CMM 72-00-00 风扇叶片缺口限长 3.0mm，当前 2.2mm 低于限长，下次孔探复查。",
    releaseInspectorId: "ins-02",
    releasedAt: "2026-07-18",
    todoNote: "下次 A 检复测 B14，对比增长。",
    amendments: [],
    createdAt: "2026-07-18T09:12:00.000Z",
  },
  {
    // R2：待评估 —— 长度由 2.2 增至 3.5，增长 1.3mm 超过 1mm
    id: "rec-002",
    engineId: "eng-1001",
    station: "S1-风扇叶片",
    bladeNo: "B14",
    reading: { defectLengthMm: 3.5, defectDepthMm: 0.55, referenceMm: 42.9 },
    inspectorId: "ins-01",
    instrumentId: "itm-01",
    inspectedAt: "2026-09-24",
    status: "pending",
    todoNote: "缺口明显扩大，等工程评估是否换叶。",
    amendments: [],
    createdAt: "2026-09-24T10:05:00.000Z",
  },
  {
    // R3：待评估 —— 无硬阻断，另一名放行人员填工程依据即可放行
    id: "rec-003",
    engineId: "eng-1001",
    station: "S2-增压器",
    bladeNo: "B07",
    reading: { defectLengthMm: 0.8, defectDepthMm: 0.1, referenceMm: 18.5 },
    inspectorId: "ins-04",
    instrumentId: "itm-03",
    inspectedAt: "2026-09-25",
    status: "pending",
    amendments: [],
    createdAt: "2026-09-25T14:40:00.000Z",
  },
  {
    // R4：待评估 —— 仪器 itm-02 校准已过期
    id: "rec-004",
    engineId: "eng-1002",
    station: "S3-高压压气机前",
    bladeNo: "B22",
    reading: { defectLengthMm: 1.1, defectDepthMm: 0.08, referenceMm: 26.4 },
    inspectorId: "ins-02",
    instrumentId: "itm-02",
    inspectedAt: "2026-09-26",
    status: "pending",
    amendments: [],
    createdAt: "2026-09-26T08:20:00.000Z",
  },
  {
    // R5：待评估 —— 检查人 ins-05 资质 2026-09-15 已失效
    id: "rec-005",
    engineId: "eng-1002",
    station: "S8-高压涡轮",
    bladeNo: "B31",
    reading: { defectLengthMm: 0.6, defectDepthMm: 0.05, referenceMm: 31.2 },
    inspectorId: "ins-05",
    instrumentId: "itm-01",
    inspectedAt: "2026-09-26",
    status: "pending",
    amendments: [],
    createdAt: "2026-09-26T11:55:00.000Z",
  },
  {
    // R6：已放行且发生过一次更正，用于展示版本与旧值保留
    id: "rec-006",
    engineId: "eng-1002",
    station: "S1-风扇叶片",
    bladeNo: "B03",
    reading: { defectLengthMm: 1.4, defectDepthMm: 0.18, referenceMm: 42.6 },
    inspectorId: "ins-02",
    instrumentId: "itm-01",
    inspectedAt: "2026-09-12",
    status: "released",
    engineeringBasis: "限长 3.0mm，1.4mm 可接受，持续监控。",
    releaseInspectorId: "ins-04",
    releasedAt: "2026-09-12",
    amendments: [
      {
        id: "amd-001",
        versionNo: 1,
        at: "2026-09-13T16:30:00.000Z",
        operatorId: "ins-02",
        reason: "复核照片发现参照尺寸误录（42.9 → 42.6），按复核结果更正。",
        oldReading: { defectLengthMm: 1.4, defectDepthMm: 0.2, referenceMm: 42.9 },
        oldInspectorId: "ins-02",
        oldInstrumentId: "itm-01",
        oldInspectedAt: "2026-09-12",
      },
    ],
    createdAt: "2026-09-12T09:00:00.000Z",
  },
];
