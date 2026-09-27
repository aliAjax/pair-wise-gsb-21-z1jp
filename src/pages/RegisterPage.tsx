import { useState } from "react";
import type { BorescopeRecord, Engine, Instrument, Person, Reading, RegisterInput } from "../domain/judgment";

interface RegisterPageProps {
  engines: Engine[];
  stations: string[];
  inspectors: Person[];
  instruments: Instrument[];
  today: string;
  onRegister: (input: RegisterInput) => BorescopeRecord;
}

function emptyForm(today: string) {
  return {
    engineId: "",
    station: "",
    bladeNo: "",
    defectLengthMm: "",
    depthMm: "",
    referenceMm: "",
    inspectorId: "",
    instrumentId: "",
    inspectedAt: today,
  };
}

function RegisterPage({
  engines,
  stations,
  inspectors,
  instruments,
  today,
  onRegister,
}: RegisterPageProps) {
  const [form, setForm] = useState(emptyForm(today));
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<BorescopeRecord | null>(null);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(null);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const reading: Reading = {
      defectLengthMm: Number(form.defectLengthMm),
      depthMm: Number(form.depthMm),
      referenceMm: Number(form.referenceMm),
    };

    if (!form.engineId || !form.station || !form.bladeNo.trim()) {
      setError("请选择发动机、站位并填写叶片编号");
      return;
    }
    if (!form.inspectorId || !form.instrumentId || !form.inspectedAt) {
      setError("请选择检查人、孔探仪和检查日期");
      return;
    }
    if (
      !Number.isFinite(reading.defectLengthMm) ||
      !Number.isFinite(reading.depthMm) ||
      !Number.isFinite(reading.referenceMm) ||
      reading.defectLengthMm < 0 ||
      reading.depthMm < 0 ||
      reading.referenceMm <= 0
    ) {
      setError("请填写有效的长度、深度（≥0）和参照尺寸（>0），单位 mm");
      return;
    }

    setError("");
    const record = onRegister({
      engineId: form.engineId,
      station: form.station,
      bladeNo: form.bladeNo.trim().toUpperCase(),
      inspectorId: form.inspectorId,
      instrumentId: form.instrumentId,
      inspectedAt: form.inspectedAt,
      reading,
    });
    setSaved(record);
    setForm((prev) => ({
      ...emptyForm(today),
      engineId: prev.engineId,
      station: prev.station,
      inspectorId: prev.inspectorId,
      instrumentId: prev.instrumentId,
    }));
  };

  return (
    <section className="panel register-panel">
      <div className="section-heading">
        <div>
          <p>孔探读数登记</p>
          <h2>按发动机和站位记录叶片检查结果</h2>
        </div>
      </div>

      <form onSubmit={submit} className="register-form">
        <label>
          <span>发动机</span>
          <select value={form.engineId} onChange={(e) => update("engineId", e.target.value)}>
            <option value="">选择发动机</option>
            {engines.map((engine) => (
              <option key={engine.id} value={engine.id}>
                {engine.model} · {engine.serial}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>检查站位</span>
          <select value={form.station} onChange={(e) => update("station", e.target.value)}>
            <option value="">选择站位</option>
            {stations.map((station) => (
              <option key={station} value={station}>
                {station}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>叶片编号</span>
          <input
            placeholder="例如 B-12"
            value={form.bladeNo}
            onChange={(e) => update("bladeNo", e.target.value)}
          />
        </label>

        <label>
          <span>检查日期</span>
          <input
            type="date"
            value={form.inspectedAt}
            onChange={(e) => update("inspectedAt", e.target.value)}
          />
        </label>

        <label>
          <span>缺陷长度 (mm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={form.defectLengthMm}
            onChange={(e) => update("defectLengthMm", e.target.value)}
          />
        </label>

        <label>
          <span>缺陷深度 (mm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="0.0"
            value={form.depthMm}
            onChange={(e) => update("depthMm", e.target.value)}
          />
        </label>

        <label>
          <span>参照尺寸 (mm)</span>
          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="叶片特征尺寸"
            value={form.referenceMm}
            onChange={(e) => update("referenceMm", e.target.value)}
          />
        </label>

        <label>
          <span>检查人</span>
          <select value={form.inspectorId} onChange={(e) => update("inspectorId", e.target.value)}>
            <option value="">选择检查人</option>
            {inspectors.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}（资质至 {person.qualificationDue}）
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>孔探仪 / 校准有效期至</span>
          <select value={form.instrumentId} onChange={(e) => update("instrumentId", e.target.value)}>
            <option value="">选择孔探仪</option>
            {instruments.map((instrument) => (
              <option key={instrument.id} value={instrument.id}>
                {instrument.name}（校准至 {instrument.calibrationDue}）
              </option>
            ))}
          </select>
        </label>

        <div className="form-actions">
          <button type="submit" className="primary-action">
            提交判定
          </button>
          {error && <span className="form-error">{error}</span>}
        </div>
      </form>

      {saved && (
        <div className={saved.status === "待评估" ? "alert alert-hold" : "alert alert-ok"}>
          <strong>
            记录 {saved.id} 已保存，状态：{saved.status}
          </strong>
          {saved.status === "已放行" ? (
            <p>无保留项，读数已锁定。如需更改须按更正另存新版本，旧值保留。</p>
          ) : (
            <ul>
              {saved.holdReasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
              <li>已停在待评估，须由另一名放行人员在复核台填写工程依据后放行。</li>
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default RegisterPage;
