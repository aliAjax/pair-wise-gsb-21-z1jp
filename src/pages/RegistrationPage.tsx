import { useMemo, useState } from "react";
import type { BorescopeRecord, Engine, Inspector, Instrument } from "../data/types";
import { createRecord } from "../rules/actions";
import { evaluate } from "../rules/evaluation";
import {
  emptyForm,
  FormValues,
  RecordForm,
  toDraftInput,
} from "../components/RecordForm";
import { BlockerPill, EmptyState, StatusBadge } from "../components/ui";

interface RegistrationPageProps {
  db: {
    engines: Engine[];
    inspectors: Inspector[];
    instruments: Instrument[];
    records: BorescopeRecord[];
  };
  onPersist: (record: BorescopeRecord) => Promise<void>;
  onOpenRecord: (record: BorescopeRecord) => void;
}

export function RegistrationPage({ db, onPersist, onOpenRecord }: RegistrationPageProps) {
  const [values, setValues] = useState<FormValues>(() => emptyForm(db.engines));
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [engineFilter, setEngineFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "released">("all");
  const [blockersOnly, setBlockersOnly] = useState(false);

  // 给表单实时判定用的临时记录
  const previewRecord = useMemo<BorescopeRecord>(() => {
    const input = toDraftInput(values);
    return {
      id: "preview",
      ...input,
      status: "pending",
      amendments: [],
      createdAt: new Date(0).toISOString(),
    };
  }, [values]);

  const filtered = useMemo(() => {
    return db.records.filter((r) => {
      if (engineFilter !== "all" && r.engineId !== engineFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (blockersOnly) {
        const ev = evaluate(r, db.records, db.inspectors, db.instruments);
        if (ev.blockers.length === 0) return false;
      }
      return true;
    });
  }, [db.records, db.inspectors, db.instruments, engineFilter, statusFilter, blockersOnly]);

  const submit = async () => {
    setFormError(null);
    const input = toDraftInput(values);
    if (!input.engineId || !input.station) {
      setFormError("请选择发动机与孔探站位。");
      return;
    }
    if (!input.bladeNo.trim()) {
      setFormError("叶片编号必填。");
      return;
    }
    if (
      !Number.isFinite(input.reading.defectLengthMm) ||
      !Number.isFinite(input.reading.defectDepthMm) ||
      !Number.isFinite(input.reading.referenceMm) ||
      input.reading.defectLengthMm < 0 ||
      input.reading.defectDepthMm < 0 ||
      input.reading.referenceMm <= 0
    ) {
      setFormError("长度、深度须为不小于 0 的数值，参照尺寸须大于 0。");
      return;
    }
    if (!input.inspectorId) {
      setFormError("请选择检查人。");
      return;
    }
    if (!input.instrumentId) {
      setFormError("请选择孔探仪器。");
      return;
    }
    if (!input.inspectedAt) {
      setFormError("请填写检查日期。");
      return;
    }

    setBusy(true);
    try {
      const record = createRecord(input);
      await onPersist(record);
      setValues(emptyForm(db.engines));
      onOpenRecord(record);
    } finally {
      setBusy(false);
    }
  };

  const nameOf = (id: string, list: { id: string; name: string }[]) =>
    list.find((x) => x.id === id)?.name ?? id;

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>孔探登记</p>
            <h2>按发动机 / 站位登记叶片读数</h2>
          </div>
          <span className="pill pill-warn">所有新记录进入「待评估」</span>
        </div>
        <RecordForm
          values={values}
          onChange={setValues}
          engines={db.engines}
          inspectors={db.inspectors}
          instruments={db.instruments}
          records={db.records}
          previewRecord={previewRecord}
        />
        {formError && <p className="field-error">{formError}</p>}
        <div className="form-actions">
          <button className="primary-action" disabled={busy} onClick={submit}>
            {busy ? "保存中…" : "登记为待评估"}
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>记录台</p>
            <h2>孔探记录</h2>
          </div>
        </div>
        <div className="filter-row">
          <select value={engineFilter} onChange={(e) => setEngineFilter(e.target.value)}>
            <option value="all">全部发动机</option>
            {db.engines.map((e) => (
              <option key={e.id} value={e.id}>
                {e.serial}
              </option>
            ))}
          </select>
          <div className="seg">
            {(["all", "pending", "released"] as const).map((s) => (
              <button
                key={s}
                className={statusFilter === s ? "seg-on" : ""}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "全部" : s === "pending" ? "待评估" : "已放行"}
              </button>
            ))}
          </div>
          <label className="check-line">
            <input
              type="checkbox"
              checked={blockersOnly}
              onChange={(e) => setBlockersOnly(e.target.checked)}
            />
            仅看有阻断
          </label>
        </div>

        {filtered.length === 0 ? (
          <EmptyState>没有符合筛选条件的记录。</EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="record-table">
              <thead>
                <tr>
                  <th>发动机</th>
                  <th>站位 / 叶片</th>
                  <th>长度</th>
                  <th>深度</th>
                  <th>参照</th>
                  <th>检查人</th>
                  <th>日期</th>
                  <th>判定</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const ev = evaluate(r, db.records, db.inspectors, db.instruments);
                  const engine = db.engines.find((e) => e.id === r.engineId);
                  return (
                    <tr key={r.id} className="clickable-row" onClick={() => onOpenRecord(r)}>
                      <td>{engine?.serial ?? r.engineId}</td>
                      <td>
                        {r.station}
                        <br />
                        <strong>{r.bladeNo}</strong>
                      </td>
                      <td>{r.reading.defectLengthMm.toFixed(2)}</td>
                      <td>{r.reading.defectDepthMm.toFixed(2)}</td>
                      <td>{r.reading.referenceMm.toFixed(2)}</td>
                      <td>{nameOf(r.inspectorId, db.inspectors)}</td>
                      <td>{r.inspectedAt}</td>
                      <td>
                        <BlockerPill count={ev.blockers.length} />
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
