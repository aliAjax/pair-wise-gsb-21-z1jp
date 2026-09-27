import { useMemo } from "react";
import type { BorescopeRecord, Engine, Inspector, Instrument, Reading } from "../data/types";
import { isValidOn, today } from "../lib/util";
import { evaluate } from "../rules/evaluation";

export interface FormValues {
  engineId: string;
  station: string;
  bladeNo: string;
  defectLengthMm: string;
  defectDepthMm: string;
  referenceMm: string;
  inspectorId: string;
  instrumentId: string;
  inspectedAt: string;
  todoNote: string;
}

export const emptyForm = (engines: Engine[]): FormValues => ({
  engineId: engines[0]?.id ?? "",
  station: engines[0]?.stations[0] ?? "",
  bladeNo: "",
  defectLengthMm: "",
  defectDepthMm: "",
  referenceMm: "",
  inspectorId: "",
  instrumentId: "",
  inspectedAt: today(),
  todoNote: "",
});

export function formFromRecord(record: BorescopeRecord): FormValues {
  return {
    engineId: record.engineId,
    station: record.station,
    bladeNo: record.bladeNo,
    defectLengthMm: String(record.reading.defectLengthMm),
    defectDepthMm: String(record.reading.defectDepthMm),
    referenceMm: String(record.reading.referenceMm),
    inspectorId: record.inspectorId,
    instrumentId: record.instrumentId,
    inspectedAt: record.inspectedAt,
    todoNote: record.todoNote ?? "",
  };
}

export function toDraftInput(values: FormValues): {
  engineId: string;
  station: string;
  bladeNo: string;
  reading: Reading;
  inspectorId: string;
  instrumentId: string;
  inspectedAt: string;
  todoNote: string;
} {
  return {
    engineId: values.engineId,
    station: values.station,
    bladeNo: values.bladeNo,
    reading: {
      defectLengthMm: Number(values.defectLengthMm),
      defectDepthMm: Number(values.defectDepthMm),
      referenceMm: Number(values.referenceMm),
    },
    inspectorId: values.inspectorId,
    instrumentId: values.instrumentId,
    inspectedAt: values.inspectedAt,
    todoNote: values.todoNote,
  };
}

interface RecordFormProps {
  values: FormValues;
  onChange: (next: FormValues) => void;
  engines: Engine[];
  inspectors: Inspector[];
  instruments: Instrument[];
  /** 传入全部记录用于实时显示「较上次增长」 */
  records: BorescopeRecord[];
  /** 预览用的草稿（带 id 的临时记录），由父组件构造后传入 */
  previewRecord: BorescopeRecord;
  disabled?: boolean;
}

export function RecordForm({
  values,
  onChange,
  engines,
  inspectors,
  instruments,
  records,
  previewRecord,
  disabled,
}: RecordFormProps) {
  const selectedEngine = engines.find((e) => e.id === values.engineId);
  const evaluation = useMemo(
    () => evaluate(previewRecord, records, inspectors, instruments),
    [previewRecord, records, inspectors, instruments]
  );

  const set = (patch: Partial<FormValues>) => onChange({ ...values, ...patch });

  const selectEngine = (engineId: string) => {
    const engine = engines.find((e) => e.id === engineId);
    onChange({ ...values, engineId, station: engine?.stations[0] ?? "" });
  };

  return (
    <div className={disabled ? "record-form disabled" : "record-form"}>
      <div className="field-grid">
        <label>
          <span>发动机</span>
          <select
            value={values.engineId}
            onChange={(e) => selectEngine(e.target.value)}
            disabled={disabled}
          >
            {engines.map((e) => (
              <option key={e.id} value={e.id}>
                {e.serial}（{e.aircraft} / {e.model}）
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>孔探站位</span>
          <select value={values.station} onChange={(e) => set({ station: e.target.value })} disabled={disabled}>
            {(selectedEngine?.stations ?? []).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>叶片编号 *</span>
          <input
            value={values.bladeNo}
            onChange={(e) => set({ bladeNo: e.target.value })}
            placeholder="如 B14"
            disabled={disabled}
          />
        </label>
        <label>
          <span>检查日期</span>
          <input
            type="date"
            value={values.inspectedAt}
            onChange={(e) => set({ inspectedAt: e.target.value })}
            disabled={disabled}
          />
        </label>
        <label className="mm-field">
          <span>缺陷长度 (mm)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.defectLengthMm}
            onChange={(e) => set({ defectLengthMm: e.target.value })}
            placeholder="0.00"
            disabled={disabled}
          />
        </label>
        <label className="mm-field">
          <span>缺陷深度 (mm)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.defectDepthMm}
            onChange={(e) => set({ defectDepthMm: e.target.value })}
            placeholder="0.00"
            disabled={disabled}
          />
        </label>
        <label className="mm-field">
          <span>参照尺寸 (mm)</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={values.referenceMm}
            onChange={(e) => set({ referenceMm: e.target.value })}
            placeholder="照片参照物尺寸"
            disabled={disabled}
          />
        </label>
        <label>
          <span>检查人</span>
          <select
            value={values.inspectorId}
            onChange={(e) => set({ inspectorId: e.target.value })}
            disabled={disabled}
          >
            <option value="">请选择检查人</option>
            {inspectors
              .filter((i) => i.canInspect)
              .map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}（资质至 {i.qualificationExpiry}
                  {isValidOn(i.qualificationExpiry) ? "" : "·已失效"}）
                </option>
              ))}
          </select>
        </label>
        <label>
          <span>孔探仪</span>
          <select
            value={values.instrumentId}
            onChange={(e) => set({ instrumentId: e.target.value })}
            disabled={disabled}
          >
            <option value="">请选择仪器</option>
            {instruments.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}（校准至 {i.calibrationExpiry}
                {isValidOn(i.calibrationExpiry) ? "" : "·已过期"}）
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>待办事项</span>
          <input
            value={values.todoNote}
            onChange={(e) => set({ todoNote: e.target.value })}
            placeholder="如：下次 A 检复测，或等工程评估换叶"
            disabled={disabled}
          />
        </label>
      </div>

      {!disabled && (
        <div className={`live-eval ${evaluation.blockers.length > 0 ? "has-blockers" : ""}`}>
          <p className="live-eval-title">
            登记即判定（记录保存为「待评估」，任何记录都不能直接放行）
          </p>
          {evaluation.comparison && (
            <p className="comparison-line">
              上次读数：长度 {evaluation.comparison.previousReading.defectLengthMm.toFixed(2)}mm →
              本次 {Number(values.defectLengthMm || 0).toFixed(2)}mm，增长
              <strong
                className={evaluation.comparison.growthOverLimit ? "delta-danger" : "delta-ok"}
              >
                {" "}
                {evaluation.comparison.lengthDelta >= 0 ? "+" : ""}
                {evaluation.comparison.lengthDelta.toFixed(2)}mm
              </strong>
            </p>
          )}
          {evaluation.blockers.length === 0 ? (
            <p className="blocker-ok">无硬阻断，可提交至待评估，由另一名放行人员签署工程依据后放行。</p>
          ) : (
            <ul className="blocker-list">
              {evaluation.blockers.map((b) => (
                <li key={b.code}>{b.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
