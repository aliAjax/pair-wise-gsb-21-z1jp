import { useMemo, useState } from "react";
import {
  currentReading,
  growthSince,
  round1,
  validateRelease,
  type BorescopeRecord,
  type Engine,
  type Person,
  type Reading,
} from "../domain/judgment";
import { engineLabel, inspectorName, instrumentName } from "../data/reference";

interface EnginePageProps {
  records: BorescopeRecord[];
  engines: Engine[];
  personnel: Person[];
  onRelease: (recordId: string, releaserId: string, engineeringBasis: string) => void;
  onCorrect: (
    recordId: string,
    reading: Reading,
    reason: string,
    savedBy: string
  ) => void;
}

function StatusBadge({ status }: { status: BorescopeRecord["status"] }) {
  return (
    <span className={status === "已放行" ? "badge badge-released" : "badge badge-hold"}>
      {status}
    </span>
  );
}

function ReadingText({ reading }: { reading: Reading }) {
  return (
    <span className="reading-text">
      长 {reading.defectLengthMm} / 深 {reading.depthMm} / 参照 {reading.referenceMm} mm
    </span>
  );
}

function ReleaseForm({
  record,
  releasers,
  onRelease,
}: {
  record: BorescopeRecord;
  releasers: Person[];
  onRelease: EnginePageProps["onRelease"];
}) {
  const [releaserId, setReleaserId] = useState("");
  const [basis, setBasis] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const releaser = releasers.find((person) => person.id === releaserId);
    const message = validateRelease(record, releaser, basis);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    onRelease(record.id, releaserId, basis.trim());
    setReleaserId("");
    setBasis("");
  };

  return (
    <form className="release-form" onSubmit={submit}>
      <label>
        <span>放行人员（须与检查人不同）</span>
        <select value={releaserId} onChange={(e) => setReleaserId(e.target.value)}>
          <option value="">选择放行人员</option>
          {releasers.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}（放行资质至 {person.qualificationDue}）
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>工程依据（手册条款 / 工程指令 / 让步接收依据）</span>
        <textarea
          rows={2}
          placeholder="例如：依据 AMM 72-31-11 判据，缺陷在可用限制内……"
          value={basis}
          onChange={(e) => setBasis(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary-action">
          复核放行
        </button>
        {error && <span className="form-error">{error}</span>}
      </div>
    </form>
  );
}

function CorrectionForm({
  record,
  personnel,
  onCorrect,
}: {
  record: BorescopeRecord;
  personnel: Person[];
  onCorrect: EnginePageProps["onCorrect"];
}) {
  const latest = currentReading(record);
  const [open, setOpen] = useState(false);
  const [defectLengthMm, setLength] = useState(String(latest.defectLengthMm));
  const [depthMm, setDepth] = useState(String(latest.depthMm));
  const [referenceMm, setReference] = useState(String(latest.referenceMm));
  const [reason, setReason] = useState("");
  const [savedBy, setSavedBy] = useState(record.inspectorId);
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const reading: Reading = {
      defectLengthMm: Number(defectLengthMm),
      depthMm: Number(depthMm),
      referenceMm: Number(referenceMm),
    };
    if (
      !Number.isFinite(reading.defectLengthMm) ||
      !Number.isFinite(reading.depthMm) ||
      !Number.isFinite(reading.referenceMm) ||
      reading.referenceMm <= 0
    ) {
      setError("请填写有效的长度、深度和参照尺寸");
      return;
    }
    if (reason.trim().length < 5) {
      setError("请填写更正原因（不少于 5 个字），旧值将随版本保留");
      return;
    }
    const person = personnel.find((item) => item.id === savedBy);
    setError("");
    onCorrect(record.id, reading, reason.trim(), person?.name ?? savedBy);
    setOpen(false);
    setReason("");
  };

  if (!open) {
    return (
      <button className="ghost-action" onClick={() => setOpen(true)}>
        更正读数（另存版本，保留旧值）
      </button>
    );
  }

  return (
    <form className="correction-form" onSubmit={submit}>
      <p className="correction-hint">
        原读数已锁定，提交后生成 v{record.versions.length + 1}，旧值仍可在版本记录中查看。
      </p>
      <div className="correction-grid">
        <label>
          <span>缺陷长度 (mm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={defectLengthMm}
            onChange={(e) => setLength(e.target.value)}
          />
        </label>
        <label>
          <span>缺陷深度 (mm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={depthMm}
            onChange={(e) => setDepth(e.target.value)}
          />
        </label>
        <label>
          <span>参照尺寸 (mm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={referenceMm}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        <label>
          <span>更正人</span>
          <select value={savedBy} onChange={(e) => setSavedBy(e.target.value)}>
            {personnel.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        <span>更正原因</span>
        <textarea
          rows={2}
          placeholder="例如：复测校焦后修正读数……"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <div className="form-actions">
        <button type="submit" className="primary-action">
          提交新版本
        </button>
        <button type="button" onClick={() => setOpen(false)}>
          取消
        </button>
        {error && <span className="form-error">{error}</span>}
      </div>
    </form>
  );
}

function RecordCard({
  record,
  personnel,
  releasers,
  onRelease,
  onCorrect,
}: {
  record: BorescopeRecord;
  personnel: Person[];
  releasers: Person[];
} & Pick<EnginePageProps, "onRelease" | "onCorrect">) {
  return (
    <article className="record-detail">
      <header className="record-detail-head">
        <div>
          <h3>
            {record.station} · 叶片 {record.bladeNo}
          </h3>
          <p className="record-meta">
            {record.id} · 检查日期 {record.inspectedAt} · 检查人 {inspectorName(record.inspectorId)} ·{" "}
            {instrumentName(record.instrumentId)}
          </p>
        </div>
        <StatusBadge status={record.status} />
      </header>

      {record.holdReasons.length > 0 && (
        <ul className="hold-list">
          {record.holdReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      {record.status === "待评估" && (
        <ReleaseForm record={record} releasers={releasers} onRelease={onRelease} />
      )}

      {record.status === "已放行" && record.release && (
        <div className="release-info">
          <span>放行信息</span>
          <p>
            {record.release.releaserName} 于 {record.release.releasedAt} 放行：
            {record.release.engineeringBasis}
          </p>
        </div>
      )}

      <div className="version-list">
        <span>版本记录（当前 v{record.versions.length}）</span>
        {record.versions.map((version) => (
          <div key={version.version} className="version-row">
            <em>v{version.version}</em>
            <ReadingText reading={version} />
            <p>
              {version.savedBy} · {version.savedAt} · {version.reason}
            </p>
          </div>
        ))}
      </div>

      <CorrectionForm record={record} personnel={personnel} onCorrect={onCorrect} />
    </article>
  );
}

function EnginePage({
  records,
  engines,
  personnel,
  onRelease,
  onCorrect,
}: EnginePageProps) {
  const [engineId, setEngineId] = useState(engines[0]?.id ?? "");
  const releasers = useMemo(() => personnel.filter((person) => person.roles.includes("放行")), [personnel]);

  const engineRecords = useMemo(
    () =>
      records
        .filter((record) => record.engineId === engineId)
        .sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt)),
    [records, engineId]
  );

  const todos = engineRecords.filter((record) => record.status === "待评估");

  // 同一站位+叶片编号取最近两次记录做前后对比
  const comparisons = useMemo(() => {
    const groups = new Map<string, BorescopeRecord[]>();
    for (const record of engineRecords) {
      const key = `${record.station}|${record.bladeNo}`;
      groups.set(key, [...(groups.get(key) ?? []), record]);
    }
    return [...groups.entries()]
      .map(([key, list]) => {
        const sorted = [...list].sort((a, b) => a.inspectedAt.localeCompare(b.inspectedAt));
        const current = sorted[sorted.length - 1];
        const previous = sorted.length > 1 ? sorted[sorted.length - 2] : undefined;
        return { key, current, previous };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [engineRecords]);

  return (
    <div className="engine-page">
      <div className="engine-tabs chips">
        {engines.map((engine) => (
          <button
            key={engine.id}
            className={engine.id === engineId ? "chip-active" : ""}
            onClick={() => setEngineId(engine.id)}
          >
            {engineLabel(engine.id)}
          </button>
        ))}
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>前后对比</p>
            <h2>{engineLabel(engineId)} · 同站位同叶片历次读数</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>站位</th>
                <th>叶片</th>
                <th>上次读数（长/深/参照）</th>
                <th>本次读数</th>
                <th>长度增长</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map(({ key, current, previous }) => {
                const curReading = currentReading(current);
                const prevReading = previous ? currentReading(previous) : undefined;
                const growth = growthSince(curReading, prevReading);
                return (
                  <tr key={key}>
                    <td>{current.station}</td>
                    <td>{current.bladeNo}</td>
                    <td>
                      {prevReading ? (
                        <>
                          <ReadingText reading={prevReading} />
                          <small>{previous!.inspectedAt}</small>
                        </>
                      ) : (
                        <span className="muted">首次检查</span>
                      )}
                    </td>
                    <td>
                      <ReadingText reading={curReading} />
                      <small>{current.inspectedAt}</small>
                    </td>
                    <td>
                      {growth === undefined ? (
                        <span className="muted">—</span>
                      ) : (
                        <span className={growth > 1 ? "delta-danger" : growth > 0 ? "delta-watch" : "delta-flat"}>
                          {growth > 0 ? "+" : ""}
                          {round1(growth)} mm
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={current.status} />
                    </td>
                  </tr>
                );
              })}
              {comparisons.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted table-empty">
                    该发动机暂无孔探记录，请先在「登记读数」页录入。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>待办</p>
            <h2>待评估叶片 · {todos.length} 项</h2>
          </div>
        </div>
        {todos.length === 0 ? (
          <p className="muted">本发动机暂无待办，所有记录均已放行锁定。</p>
        ) : (
          <div className="todo-list">
            {todos.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                personnel={personnel}
                releasers={releasers}
                onRelease={onRelease}
                onCorrect={onCorrect}
              />
            ))}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>全部记录</p>
            <h2>版本留痕与更正</h2>
          </div>
        </div>
        <div className="todo-list">
          {engineRecords.map((record) => (
            <RecordCard
              key={record.id}
              record={record}
              personnel={personnel}
              releasers={releasers}
              onRelease={onRelease}
              onCorrect={onCorrect}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

export default EnginePage;
