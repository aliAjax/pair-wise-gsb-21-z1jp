import { useEffect, useMemo, useState } from "react";
import type { BorescopeRecord, Engine, Inspector, Instrument, Reading } from "../data/types";
import { fmtDateTime, fmtMm, isValidOn, today } from "../lib/util";
import { evaluate, STATUS_LABEL } from "../rules/evaluation";
import { releaseRecord, reopenWithAmendment } from "../rules/actions";
import { StatusBadge } from "./ui";

interface RecordDetailProps {
  record: BorescopeRecord;
  records: BorescopeRecord[];
  engines: Engine[];
  inspectors: Inspector[];
  instruments: Instrument[];
  onClose: () => void;
  onPersist: (record: BorescopeRecord) => Promise<void>;
}

function ReadingGrid({ reading }: { reading: Reading }) {
  return (
    <div className="reading-grid">
      <div>
        <span>缺陷长度</span>
        <strong>{fmtMm(reading.defectLengthMm)}</strong>
      </div>
      <div>
        <span>缺陷深度</span>
        <strong>{fmtMm(reading.defectDepthMm)}</strong>
      </div>
      <div>
        <span>参照尺寸</span>
        <strong>{fmtMm(reading.referenceMm)}</strong>
      </div>
    </div>
  );
}

export function RecordDetail({
  record,
  records,
  engines,
  inspectors,
  instruments,
  onClose,
  onPersist,
}: RecordDetailProps) {
  const [releaseInspectorId, setReleaseInspectorId] = useState("");
  const [engineeringBasis, setEngineeringBasis] = useState("");
  const [releaseErrors, setReleaseErrors] = useState<string[]>([]);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenErrors, setReopenErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [reopen, setReopen] = useState({
    defectLengthMm: String(record.reading.defectLengthMm),
    defectDepthMm: String(record.reading.defectDepthMm),
    referenceMm: String(record.reading.referenceMm),
    inspectorId: record.inspectorId,
    instrumentId: record.instrumentId,
    inspectedAt: record.inspectedAt,
    todoNote: record.todoNote ?? "",
    operatorId: "",
    reason: "",
  });

  // 切换记录或记录状态变化（放行/更正）后重置签署区
  useEffect(() => {
    setReleaseInspectorId("");
    setEngineeringBasis("");
    setReleaseErrors([]);
    setReopenOpen(false);
    setReopenErrors([]);
    setReopen({
      defectLengthMm: String(record.reading.defectLengthMm),
      defectDepthMm: String(record.reading.defectDepthMm),
      referenceMm: String(record.reading.referenceMm),
      inspectorId: record.inspectorId,
      instrumentId: record.instrumentId,
      inspectedAt: record.inspectedAt,
      todoNote: record.todoNote ?? "",
      operatorId: "",
      reason: "",
    });
  }, [record.id, record.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const engine = engines.find((e) => e.id === record.engineId);
  const inspector = inspectors.find((i) => i.id === record.inspectorId);
  const instrument = instruments.find((i) => i.id === record.instrumentId);
  const releasePerson = inspectors.find((i) => i.id === record.releaseInspectorId);

  const evaluation = useMemo(
    () => evaluate(record, records, inspectors, instruments),
    [record, records, inspectors, instruments]
  );

  const handleRelease = async () => {
    setBusy(true);
    setReleaseErrors([]);
    try {
      const result = releaseRecord(
        record,
        inspectors,
        { releaseInspectorId, engineeringBasis },
        today()
      );
      if (!result.ok) {
        setReleaseErrors(result.errors ?? ["放行校验未通过。"]);
        return;
      }
      await onPersist(result.record!);
    } finally {
      setBusy(false);
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    setReopenErrors([]);
    try {
      const operator = inspectors.find((i) => i.id === reopen.operatorId);
      const reading: Reading = {
        defectLengthMm: Number(reopen.defectLengthMm),
        defectDepthMm: Number(reopen.defectDepthMm),
        referenceMm: Number(reopen.referenceMm),
      };
      const result = reopenWithAmendment(record, {
        operator: operator!,
        reason: reopen.reason,
        reading,
        inspectorId: reopen.inspectorId,
        instrumentId: reopen.instrumentId,
        inspectedAt: reopen.inspectedAt,
        todoNote: reopen.todoNote,
      });
      if (!result.ok) {
        setReopenErrors(result.errors ?? ["更正校验未通过。"]);
        return;
      }
      await onPersist(result.record!);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <p className="eyebrow">
              {engine?.serial ?? record.engineId} · {record.station}
            </p>
            <h2>叶片 {record.bladeNo}</h2>
            <div className="drawer-meta">
              <StatusBadge status={record.status} />
              <span>检查日期 {record.inspectedAt}</span>
              <span>检查人 {inspector?.name ?? "—"}</span>
              <span>
                仪器 {instrument?.name ?? "—"}（校准至 {instrument?.calibrationExpiry ?? "—"}）
              </span>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="关闭">
            ×
          </button>
        </header>

        <div className="drawer-body">
          <section className="detail-section">
            <h3>本次读数（照片参照登记）</h3>
            <ReadingGrid reading={record.reading} />
            {evaluation.comparison && (
              <div className="compare-box">
                <p>
                  {evaluation.comparison.fromAmendmentVersion !== null
                    ? `与本记录上一版已放行读数（V${evaluation.comparison.fromAmendmentVersion}，${evaluation.comparison.previousInspectedAt}）对比：`
                    : `与上次检查（${evaluation.comparison.previousInspectedAt}，${
                        STATUS_LABEL[evaluation.comparison.previous!.status]
                      }）对比：`}
                </p>
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>项目</th>
                      <th>上次</th>
                      <th>本次</th>
                      <th>变化</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>缺陷长度</td>
                      <td>{fmtMm(evaluation.comparison.previousReading.defectLengthMm)}</td>
                      <td>{fmtMm(record.reading.defectLengthMm)}</td>
                      <td
                        className={
                          evaluation.comparison.growthOverLimit ? "delta-danger" : "delta-ok"
                        }
                      >
                        {evaluation.comparison.lengthDelta >= 0 ? "+" : ""}
                        {evaluation.comparison.lengthDelta.toFixed(2)} mm
                      </td>
                    </tr>
                    <tr>
                      <td>缺陷深度</td>
                      <td>{fmtMm(evaluation.comparison.previousReading.defectDepthMm)}</td>
                      <td>{fmtMm(record.reading.defectDepthMm)}</td>
                      <td>
                        {evaluation.comparison.depthDelta >= 0 ? "+" : ""}
                        {evaluation.comparison.depthDelta.toFixed(2)} mm
                      </td>
                    </tr>
                    <tr>
                      <td>参照尺寸</td>
                      <td>{fmtMm(evaluation.comparison.previousReading.referenceMm)}</td>
                      <td>{fmtMm(record.reading.referenceMm)}</td>
                      <td>
                        {evaluation.comparison.referenceDelta >= 0 ? "+" : ""}
                        {evaluation.comparison.referenceDelta.toFixed(2)} mm
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            {!evaluation.comparison && <p className="muted-note">该叶片此前无登记读数，本次为基线。</p>}
          </section>

          <section className="detail-section">
            <h3>判定结果</h3>
            {evaluation.blockers.length === 0 ? (
              <p className="blocker-ok">无硬阻断，可由另一名放行人员签署放行。</p>
            ) : (
              <>
                <p className="blocker-heading">
                  {evaluation.blockers.length} 项阻断 —— 记录只能停在「待评估」，放行人员须在工程依据中逐条覆盖：
                </p>
                <ul className="blocker-list">
                  {evaluation.blockers.map((b) => (
                    <li key={b.code}>{b.message}</li>
                  ))}
                </ul>
              </>
            )}
          </section>

          {record.status === "pending" && (
            <section className="detail-section release-section">
              <h3>放行签署（须由另一名放行人员填写工程依据）</h3>
              {evaluation.blockers.length > 0 && (
                <p className="override-note">
                  当前存在阻断项：工程依据须注明超限/过期/资质失效的处理结论或工程偏离批准编号，否则不得签署。
                </p>
              )}
              <label>
                <span>放行人员（不得与检查人相同）</span>
                <select
                  value={releaseInspectorId}
                  onChange={(e) => setReleaseInspectorId(e.target.value)}
                >
                  <option value="">请选择放行人员</option>
                  {inspectors
                    .filter((i) => i.canRelease)
                    .map((i) => (
                      <option key={i.id} value={i.id} disabled={i.id === record.inspectorId}>
                        {i.name}（资质至 {i.qualificationExpiry}
                        {isValidOn(i.qualificationExpiry) ? "" : "·已失效"}
                        {i.id === record.inspectorId ? "·即检查人本人" : ""}）
                      </option>
                    ))}
                </select>
              </label>
              <label>
                <span>工程依据 *（限长数据 / AMM 或 CMM 条款 / 工程偏离批准编号）</span>
                <textarea
                  rows={3}
                  value={engineeringBasis}
                  onChange={(e) => setEngineeringBasis(e.target.value)}
                  placeholder="如：CMM 72-00-00 限长 3.0mm；本次 3.5mm 超出限长，依据工程偏离 EO-2026-0912 批准更换 B14 叶片后复查。"
                />
              </label>
              {releaseErrors.length > 0 && (
                <ul className="blocker-list">
                  {releaseErrors.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              )}
              <button className="primary-action" disabled={busy} onClick={handleRelease}>
                {busy ? "签署中…" : "复核无误，签署放行"}
              </button>
            </section>
          )}

          {record.status === "released" && (
            <section className="detail-section released-section">
              <h3>放行信息（读数已锁定）</h3>
              <div className="lock-note">
                放行时间 {record.releasedAt} · 放行人员 {releasePerson?.name ?? "—"}。
                读数不可直接覆盖，如需更正须在下方发起「更正另存」。
              </div>
              <p className="engineering-basis">{record.engineeringBasis}</p>
            </section>
          )}

          {record.status === "released" && (
            <section className="detail-section">
              <button className="ghost-btn" onClick={() => setReopenOpen((v) => !v)}>
                {reopenOpen ? "收起更正单" : "发起更正（旧值另存版本，记录回到待评估）"}
              </button>
              {reopenOpen && (
                <div className="reopen-form">
                  <div className="field-grid">
                    <label className="mm-field">
                      <span>更正后长度 (mm)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={reopen.defectLengthMm}
                        onChange={(e) => setReopen({ ...reopen, defectLengthMm: e.target.value })}
                      />
                    </label>
                    <label className="mm-field">
                      <span>更正后深度 (mm)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={reopen.defectDepthMm}
                        onChange={(e) => setReopen({ ...reopen, defectDepthMm: e.target.value })}
                      />
                    </label>
                    <label className="mm-field">
                      <span>更正后参照尺寸 (mm)</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={reopen.referenceMm}
                        onChange={(e) => setReopen({ ...reopen, referenceMm: e.target.value })}
                      />
                    </label>
                    <label>
                      <span>更正后检查人</span>
                      <select
                        value={reopen.inspectorId}
                        onChange={(e) => setReopen({ ...reopen, inspectorId: e.target.value })}
                      >
                        {inspectors
                          .filter((i) => i.canInspect)
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      <span>更正后仪器</span>
                      <select
                        value={reopen.instrumentId}
                        onChange={(e) => setReopen({ ...reopen, instrumentId: e.target.value })}
                      >
                        {instruments.map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>更正后检查日期</span>
                      <input
                        type="date"
                        value={reopen.inspectedAt}
                        onChange={(e) => setReopen({ ...reopen, inspectedAt: e.target.value })}
                      />
                    </label>
                    <label className="span-2">
                      <span>待办事项</span>
                      <input
                        value={reopen.todoNote}
                        onChange={(e) => setReopen({ ...reopen, todoNote: e.target.value })}
                      />
                    </label>
                    <label className="span-2">
                      <span>更正原因 *（随旧值一起进入版本记录）</span>
                      <textarea
                        rows={2}
                        value={reopen.reason}
                        onChange={(e) => setReopen({ ...reopen, reason: e.target.value })}
                        placeholder="如：复核照片发现参照尺寸误录，经双人复核后更正。"
                      />
                    </label>
                    <label className="span-2">
                      <span>发起更正的放行人员 *</span>
                      <select
                        value={reopen.operatorId}
                        onChange={(e) => setReopen({ ...reopen, operatorId: e.target.value })}
                      >
                        <option value="">请选择放行人员</option>
                        {inspectors
                          .filter((i) => i.canRelease)
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}（资质至 {i.qualificationExpiry}
                              {isValidOn(i.qualificationExpiry) ? "" : "·已失效"}）
                            </option>
                          ))}
                      </select>
                    </label>
                  </div>
                  {reopenErrors.length > 0 && (
                    <ul className="blocker-list">
                      {reopenErrors.map((m, idx) => (
                        <li key={idx}>{m}</li>
                      ))}
                    </ul>
                  )}
                  <button className="primary-action" disabled={busy} onClick={handleReopen}>
                    {busy ? "提交中…" : "确认更正并另存版本"}
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="detail-section">
            <h3>版本记录（旧值保留）</h3>
            {record.amendments.length === 0 ? (
              <p className="muted-note">无更正，当前为初版（V1，{record.inspectedAt} 登记）。</p>
            ) : (
              <ol className="version-list">
                {[...record.amendments].reverse().map((a, revIndex) => {
                  const idx = record.amendments.indexOf(a);
                  const next = record.amendments[idx + 1];
                  const newReading = next ? next.oldReading : record.reading;
                  const newInspectorId = next ? next.oldInspectorId : record.inspectorId;
                  const newInstrumentId = next ? next.oldInstrumentId : record.instrumentId;
                  const newInspectedAt = next ? next.oldInspectedAt : record.inspectedAt;
                  const operator = inspectors.find((i) => i.id === a.operatorId);
                  return (
                    <li key={a.id} className="version-card">
                      <div className="version-head">
                        <strong>
                          V{a.versionNo + 1}（更正自 V{a.versionNo}）
                        </strong>
                        <span>{fmtDateTime(a.at)}</span>
                        <span>发起人 {operator?.name ?? a.operatorId}</span>
                        {revIndex === 0 && <span className="pill pill-ok">当前生效</span>}
                      </div>
                      <p className="version-reason">原因：{a.reason}</p>
                      <table className="version-table">
                        <thead>
                          <tr>
                            <th>字段</th>
                            <th>旧值（保留）</th>
                            <th>更正后</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>长度</td>
                            <td>{fmtMm(a.oldReading.defectLengthMm)}</td>
                            <td>{fmtMm(newReading.defectLengthMm)}</td>
                          </tr>
                          <tr>
                            <td>深度</td>
                            <td>{fmtMm(a.oldReading.defectDepthMm)}</td>
                            <td>{fmtMm(newReading.defectDepthMm)}</td>
                          </tr>
                          <tr>
                            <td>参照尺寸</td>
                            <td>{fmtMm(a.oldReading.referenceMm)}</td>
                            <td>{fmtMm(newReading.referenceMm)}</td>
                          </tr>
                          <tr>
                            <td>检查人</td>
                            <td>{inspectors.find((i) => i.id === a.oldInspectorId)?.name ?? a.oldInspectorId}</td>
                            <td>{inspectors.find((i) => i.id === newInspectorId)?.name ?? newInspectorId}</td>
                          </tr>
                          <tr>
                            <td>仪器</td>
                            <td>{instruments.find((i) => i.id === a.oldInstrumentId)?.name ?? a.oldInstrumentId}</td>
                            <td>{instruments.find((i) => i.id === newInstrumentId)?.name ?? newInstrumentId}</td>
                          </tr>
                          <tr>
                            <td>检查日期</td>
                            <td>{a.oldInspectedAt}</td>
                            <td>{newInspectedAt}</td>
                          </tr>
                        </tbody>
                      </table>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {record.todoNote && (
            <section className="detail-section">
              <h3>待办</h3>
              <p className="todo-note">{record.todoNote}</p>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
}
