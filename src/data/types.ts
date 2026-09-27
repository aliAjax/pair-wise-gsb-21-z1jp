// 资料层：孔探复核台的领域资料结构（发动机、人员、仪器、孔探记录）

export interface Engine {
  id: string;
  /** 发动机序列号 ESN */
  serial: string;
  /** 发动机型号 */
  model: string;
  /** 装机机号 */
  aircraft: string;
  /** 该机可用的孔探站位 */
  stations: string[];
}

export interface Inspector {
  id: string;
  name: string;
  /** 可担任孔探检查人 */
  canInspect: boolean;
  /** 可担任放行人员 */
  canRelease: boolean;
  /** 资质有效期（YYYY-MM-DD） */
  qualificationExpiry: string;
}

export interface Instrument {
  id: string;
  /** 孔探仪名称 */
  name: string;
  serial: string;
  /** 仪器校准有效期（YYYY-MM-DD） */
  calibrationExpiry: string;
}

export type RecordStatus = "pending" | "released";

/** 孔探读数（毫米） */
export interface Reading {
  /** 缺陷长度 */
  defectLengthMm: number;
  /** 缺陷深度 */
  defectDepthMm: number;
  /** 参照尺寸 */
  referenceMm: number;
}

/**
 * 放行后的更正版本：只存旧值与更正原因，当前值仍在记录主表上。
 * 第 n 条更正保存的是「第 n 版读数 → 第 n+1 版读数」之前的旧值。
 */
export interface Amendment {
  id: string;
  versionNo: number;
  at: string;
  /** 发起更正的人员 */
  operatorId: string;
  reason: string;
  oldReading: Reading;
  oldInspectorId: string;
  oldInstrumentId: string;
  oldInspectedAt: string;
}

export interface BorescopeRecord {
  id: string;
  engineId: string;
  /** 孔探站位（取自发动机站位表） */
  station: string;
  /** 叶片编号 */
  bladeNo: string;
  reading: Reading;
  inspectorId: string;
  instrumentId: string;
  /** 检查日期 YYYY-MM-DD */
  inspectedAt: string;
  status: RecordStatus;
  /** 工程依据（限长/手册条款/偏离批准），放行时由另一名放行人员填写 */
  engineeringBasis?: string;
  releaseInspectorId?: string;
  releasedAt?: string;
  /** 后续待办事项 */
  todoNote?: string;
  /** 放行后更正留下的历史版本 */
  amendments: Amendment[];
  createdAt: string;
}
