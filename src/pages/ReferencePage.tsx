import { useState } from "react";
import type { Engine, Inspector, Instrument } from "../data/types";
import { isValidOn, today, uid } from "../lib/util";
import { ExpiryTag } from "../components/ui";

interface ReferencePageProps {
  db: {
    engines: Engine[];
    inspectors: Inspector[];
    instruments: Instrument[];
  };
  onPersistEngine: (engine: Engine) => Promise<void>;
  onPersistInspector: (inspector: Inspector) => Promise<void>;
  onPersistInstrument: (instrument: Instrument) => Promise<void>;
}

function emptyEngine(): Engine {
  return { id: uid("eng"), serial: "", model: "", aircraft: "", stations: ["S1-风扇叶片"] };
}

export function ReferencePage({
  db,
  onPersistEngine,
  onPersistInspector,
  onPersistInstrument,
}: ReferencePageProps) {
  const [engineDraft, setEngineDraft] = useState<Engine | null>(null);
  const [stationsText, setStationsText] = useState("");
  const [inspectorDraft, setInspectorDraft] = useState<Inspector | null>(null);
  const [instrumentDraft, setInstrumentDraft] = useState<Instrument | null>(null);

  const editEngine = (e: Engine) => {
    setEngineDraft({ ...e });
    setStationsText(e.stations.join("\n"));
  };

  const saveEngine = async () => {
    if (!engineDraft) return;
    const stations = stationsText
      .split(/[\n,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const next: Engine = { ...engineDraft, serial: engineDraft.serial.trim(), stations };
    if (!next.serial || !next.model.trim() || stations.length === 0) return;
    await onPersistEngine(next);
    setEngineDraft(null);
  };

  const saveInspector = async () => {
    if (!inspectorDraft) return;
    if (!inspectorDraft.name.trim() || !inspectorDraft.qualificationExpiry) return;
    await onPersistInspector({ ...inspectorDraft, name: inspectorDraft.name.trim() });
    setInspectorDraft(null);
  };

  const saveInstrument = async () => {
    if (!instrumentDraft) return;
    if (!instrumentDraft.name.trim() || !instrumentDraft.calibrationExpiry) return;
    await onPersistInstrument({ ...instrumentDraft, name: instrumentDraft.name.trim() });
    setInstrumentDraft(null);
  };

  return (
    <div className="page-grid">
      <section className="panel">
        <div className="section-heading">
          <div>
            <p>基础资料</p>
            <h2>发动机与站位</h2>
          </div>
          <button className="primary-action" onClick={() => editEngine(emptyEngine())}>
            新增发动机
          </button>
        </div>
        {engineDraft && (
          <div className="inline-form">
            <div className="field-grid">
              <label>
                <span>发动机序列号 ESN *</span>
                <input
                  value={engineDraft.serial}
                  onChange={(e) => setEngineDraft({ ...engineDraft, serial: e.target.value })}
                />
              </label>
              <label>
                <span>型号 *</span>
                <input
                  value={engineDraft.model}
                  onChange={(e) => setEngineDraft({ ...engineDraft, model: e.target.value })}
                />
              </label>
              <label>
                <span>装机机号</span>
                <input
                  value={engineDraft.aircraft}
                  onChange={(e) => setEngineDraft({ ...engineDraft, aircraft: e.target.value })}
                />
              </label>
              <label className="span-2">
                <span>孔探站位（每行一个，至少一个）</span>
                <textarea
                  rows={3}
                  value={stationsText}
                  onChange={(e) => setStationsText(e.target.value)}
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="primary-action" onClick={saveEngine}>
                保存发动机
              </button>
              <button onClick={() => setEngineDraft(null)}>取消</button>
            </div>
          </div>
        )}
        <div className="ref-list">
          {db.engines.map((e) => (
            <article key={e.id} className="ref-card">
              <div>
                <strong>{e.serial}</strong>
                <span>
                  {e.model} · {e.aircraft}
                </span>
                <p>{e.stations.join("、")}</p>
              </div>
              <button onClick={() => editEngine(e)}>编辑</button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>基础资料</p>
            <h2>检查人 / 放行人员与资质</h2>
          </div>
          <button
            className="primary-action"
            onClick={() =>
              setInspectorDraft({
                id: uid("ins"),
                name: "",
                canInspect: true,
                canRelease: false,
                qualificationExpiry: today(),
              })
            }
          >
            新增人员
          </button>
        </div>
        {inspectorDraft && (
          <div className="inline-form">
            <div className="field-grid">
              <label>
                <span>姓名 *</span>
                <input
                  value={inspectorDraft.name}
                  onChange={(e) => setInspectorDraft({ ...inspectorDraft, name: e.target.value })}
                />
              </label>
              <label>
                <span>资质有效期至 *</span>
                <input
                  type="date"
                  value={inspectorDraft.qualificationExpiry}
                  onChange={(e) =>
                    setInspectorDraft({ ...inspectorDraft, qualificationExpiry: e.target.value })
                  }
                />
              </label>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={inspectorDraft.canInspect}
                  onChange={(e) =>
                    setInspectorDraft({ ...inspectorDraft, canInspect: e.target.checked })
                  }
                />
                可担任孔探检查人
              </label>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={inspectorDraft.canRelease}
                  onChange={(e) =>
                    setInspectorDraft({ ...inspectorDraft, canRelease: e.target.checked })
                  }
                />
                可担任放行人员
              </label>
            </div>
            <div className="form-actions">
              <button className="primary-action" onClick={saveInspector}>
                保存人员
              </button>
              <button onClick={() => setInspectorDraft(null)}>取消</button>
            </div>
          </div>
        )}
        <div className="ref-list">
          {db.inspectors.map((i) => (
            <article key={i.id} className="ref-card">
              <div>
                <strong>{i.name}</strong>
                <span>
                  {i.canInspect ? "检查人" : ""}
                  {i.canInspect && i.canRelease ? " / " : ""}
                  {i.canRelease ? "放行人员" : ""}
                </span>
              </div>
              <div className="ref-side">
                <ExpiryTag
                  valid={isValidOn(i.qualificationExpiry)}
                  label={`资质至 ${i.qualificationExpiry}${
                    isValidOn(i.qualificationExpiry) ? "" : "·已失效"
                  }`}
                />
                <button onClick={() => setInspectorDraft({ ...i })}>编辑</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <p>基础资料</p>
            <h2>孔探仪器与校准期</h2>
          </div>
          <button
            className="primary-action"
            onClick={() =>
              setInstrumentDraft({
                id: uid("itm"),
                name: "",
                serial: "",
                calibrationExpiry: today(),
              })
            }
          >
            新增仪器
          </button>
        </div>
        {instrumentDraft && (
          <div className="inline-form">
            <div className="field-grid">
              <label>
                <span>仪器名称 *</span>
                <input
                  value={instrumentDraft.name}
                  onChange={(e) =>
                    setInstrumentDraft({ ...instrumentDraft, name: e.target.value })
                  }
                />
              </label>
              <label>
                <span>仪器序列号</span>
                <input
                  value={instrumentDraft.serial}
                  onChange={(e) =>
                    setInstrumentDraft({ ...instrumentDraft, serial: e.target.value })
                  }
                />
              </label>
              <label>
                <span>校准有效期至 *</span>
                <input
                  type="date"
                  value={instrumentDraft.calibrationExpiry}
                  onChange={(e) =>
                    setInstrumentDraft({ ...instrumentDraft, calibrationExpiry: e.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-actions">
              <button className="primary-action" onClick={saveInstrument}>
                保存仪器
              </button>
              <button onClick={() => setInstrumentDraft(null)}>取消</button>
            </div>
          </div>
        )}
        <div className="ref-list">
          {db.instruments.map((i) => (
            <article key={i.id} className="ref-card">
              <div>
                <strong>{i.name}</strong>
                <span>{i.serial}</span>
              </div>
              <div className="ref-side">
                <ExpiryTag
                  valid={isValidOn(i.calibrationExpiry)}
                  label={`校准至 ${i.calibrationExpiry}${
                    isValidOn(i.calibrationExpiry) ? "" : "·已过期"
                  }`}
                />
                <button onClick={() => setInstrumentDraft({ ...i })}>编辑</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
