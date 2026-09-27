import { useMemo, useState } from "react";
import "./styles.css";
import { RegistrationPage } from "./pages/RegistrationPage";
import { EngineBoardPage } from "./pages/EngineBoardPage";
import { ReferencePage } from "./pages/ReferencePage";
import { RecordDetail } from "./components/RecordDetail";
import { useDatabase } from "./storage/useDatabase";
import { evaluate } from "./rules/evaluation";
import type { BorescopeRecord } from "./data/types";

type Tab = "board" | "register" | "reference";

const PROJECT = {
  id: "hxwl-07",
  port: 5107,
  title: "发动机孔探复核台",
  subtitle: "按发动机与站位登记叶片读数：超差增长、仪器过期、资质失效一律停在待评估，由另一名放行人员填写工程依据后放行。",
};

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint: string;
  tone: "ok" | "warn" | "danger" | "plain";
}) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

function App() {
  const {
    db,
    loading,
    error,
    persistRecord,
    persistEngine,
    persistInspector,
    persistInstrument,
  } = useDatabase();
  const [tab, setTab] = useState<Tab>("board");
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);

  const metrics = useMemo(() => {
    if (!db) return null;
    const pending = db.records.filter((r) => r.status === "pending");
    const blocked = pending.filter(
      (r) => evaluate(r, db.records, db.inspectors, db.instruments).blockers.length > 0
    );
    const released = db.records.length - pending.length;
    const todos = pending.filter((r) => (r.todoNote ?? "").trim().length > 0);
    return {
      pendingCount: pending.length,
      blockedCount: blocked.length,
      releasedCount: released,
      todoCount: todos.length,
    };
  }, [db]);

  const activeRecord = useMemo(
    () => (db && activeRecordId ? db.records.find((r) => r.id === activeRecordId) ?? null : null),
    [db, activeRecordId]
  );

  const openRecord = (record: BorescopeRecord) => setActiveRecordId(record.id);

  const handlePersistFromDrawer = async (record: BorescopeRecord) => {
    await persistRecord(record);
  };

  if (loading) {
    return (
      <main className="app-shell">
        <p className="loading-line">正在打开本机孔探资料库…</p>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{PROJECT.id} · port {PROJECT.port}</p>
          <h1>{PROJECT.title}</h1>
          <p className="subtitle">{PROJECT.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>分层维护</span>
          <strong>资料（data）/ 判定（rules）/ 本机保存（storage）/ 页面（pages）</strong>
          <span className="muted-note">数据保存在浏览器 IndexedDB，重开不丢失。</span>
        </div>
      </section>

      {error && <p className="field-error">{error}</p>}

      {metrics && (
        <section className="metrics-grid">
          <MetricCard
            label="待评估"
            value={metrics.pendingCount}
            hint="等待放行人员复核签署"
            tone={metrics.blockedCount > 0 ? "danger" : "warn"}
          />
          <MetricCard
            label="硬阻断待处理"
            value={metrics.blockedCount}
            hint="增长超 1mm / 仪器过期 / 资质失效"
            tone="danger"
          />
          <MetricCard
            label="已放行（读数锁定）"
            value={metrics.releasedCount}
            hint="更正须另存版本并保留旧值"
            tone="ok"
          />
          <MetricCard
            label="待办事项"
            value={metrics.todoCount}
            hint="挂在待评估记录上的后续工作"
            tone="plain"
          />
        </section>
      )}

      <nav className="tabs">
        <button className={tab === "board" ? "tab-on" : ""} onClick={() => setTab("board")}>
          按发动机复核
        </button>
        <button className={tab === "register" ? "tab-on" : ""} onClick={() => setTab("register")}>
          孔探登记
        </button>
        <button className={tab === "reference" ? "tab-on" : ""} onClick={() => setTab("reference")}>
          资料维护
        </button>
      </nav>

      {db && tab === "board" && <EngineBoardPage db={db} onOpenRecord={openRecord} />}
      {db && tab === "register" && (
        <RegistrationPage db={db} onPersist={persistRecord} onOpenRecord={openRecord} />
      )}
      {db && tab === "reference" && (
        <ReferencePage
          db={db}
          onPersistEngine={persistEngine}
          onPersistInspector={persistInspector}
          onPersistInstrument={persistInstrument}
        />
      )}

      {db && activeRecord && (
        <RecordDetail
          record={activeRecord}
          records={db.records}
          engines={db.engines}
          inspectors={db.inspectors}
          instruments={db.instruments}
          onClose={() => setActiveRecordId(null)}
          onPersist={handlePersistFromDrawer}
        />
      )}
    </main>
  );
}

export default App;
