import { useEffect, useMemo, useState } from "react";
import "./styles.css";
import {
  evaluateReading,
  findPreviousReading,
  reevaluateAfterCorrection,
  validateRelease,
  type BorescopeRecord,
  type Reading,
  type RegisterInput,
} from "./domain/judgment";
import { engines, instruments, personnel, seedRecords, stations } from "./data/reference";
import { loadRecords, resetStorage, saveRecords } from "./storage/local";
import RegisterPage from "./pages/RegisterPage";
import EnginePage from "./pages/EnginePage";

type Tab = "register" | "review";

const project = {
  id: "hxwl-07",
  port: 5107,
  title: "孔探复核台",
  subtitle: "按发动机和站位登记叶片孔探读数，超差、仪器过期、资质失效一律停在待评估，由另一名放行人员填写工程依据后放行",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [records, setRecords] = useState<BorescopeRecord[]>(() => loadRecords(seedRecords));
  const [tab, setTab] = useState<Tab>("register");
  const today = todayIso();

  // 本机保存：每次变化即落盘，重开页面记录仍在
  useEffect(() => {
    saveRecords(records);
  }, [records]);

  const inspectors = useMemo(() => personnel.filter((person) => person.roles.includes("检查")), []);

  const registerRecord = (input: RegisterInput): BorescopeRecord => {
    const inspector = personnel.find((person) => person.id === input.inspectorId)!;
    const instrument = instruments.find((item) => item.id === input.instrumentId)!;
    const previous = findPreviousReading(records, input);
    const holdReasons = evaluateReading({
      reading: input.reading,
      previous,
      instrument,
      inspector,
      inspectedAt: input.inspectedAt,
    });

    const record: BorescopeRecord = {
      id: `R-${input.inspectedAt.replace(/-/g, "")}-${Date.now().toString(36).toUpperCase().slice(-4)}`,
      engineId: input.engineId,
      station: input.station,
      bladeNo: input.bladeNo,
      inspectorId: input.inspectorId,
      instrumentId: input.instrumentId,
      inspectedAt: input.inspectedAt,
      status: holdReasons.length > 0 ? "待评估" : "已放行",
      holdReasons,
      versions: [
        {
          version: 1,
          ...input.reading,
          reason: "首次登记",
          savedBy: inspector.name,
          savedAt: input.inspectedAt,
        },
      ],
      // 无保留项的读数按正常流程登记即放行并锁定；有保留项必须走复核
      ...(holdReasons.length === 0
        ? {
            release: {
              releaserId: "SYSTEM",
              releaserName: "登记判定无保留项",
              engineeringBasis: "登记时判定无增长超差、仪器与资质均有效，按正常流程放行。",
              releasedAt: input.inspectedAt,
            },
          }
        : {}),
    };

    setRecords((prev) => [...prev, record]);
    return record;
  };

  const releaseRecord = (recordId: string, releaserId: string, engineeringBasis: string) => {
    const releaser = personnel.find((person) => person.id === releaserId);
    setRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;
        if (validateRelease(record, releaser, engineeringBasis)) return record;
        return {
          ...record,
          status: "已放行",
          release: {
            releaserId,
            releaserName: releaser!.name,
            engineeringBasis,
            releasedAt: today,
          },
        };
      })
    );
  };

  const correctRecord = (
    recordId: string,
    reading: Reading,
    reason: string,
    savedBy: string
  ) => {
    setRecords((prev) =>
      prev.map((record) => {
        if (record.id !== recordId) return record;
        const instrument = instruments.find((item) => item.id === record.instrumentId)!;
        const inspector = personnel.find((person) => person.id === record.inspectorId)!;
        const verdict = reevaluateAfterCorrection(prev, record, reading, instrument, inspector);
        return {
          ...record,
          ...verdict,
          versions: [
            ...record.versions,
            {
              version: record.versions.length + 1,
              ...reading,
              reason,
              savedBy,
              savedAt: today,
            },
          ],
        };
      })
    );
  };

  const restoreSeed = () => {
    resetStorage();
    setRecords(seedRecords);
  };

  const todoCount = records.filter((record) => record.status === "待评估").length;
  const releasedCount = records.length - todoCount;
  const expiredInstruments = new Set(
    instruments.filter((item) => item.calibrationDue < today).map((item) => item.id)
  );
  const expiredPeople = new Set(
    personnel.filter((person) => person.qualificationDue < today).map((person) => person.id)
  );
  const staleResourceCount =
    new Set(
      records
        .filter((record) => expiredInstruments.has(record.instrumentId) || expiredPeople.has(record.inspectorId))
        .map((record) => record.id)
    ).size;

  const metrics = [
    { label: "在册发动机", value: String(engines.length) },
    { label: "待评估待办", value: String(todoCount) },
    { label: "已放行记录", value: String(releasedCount) },
    { label: "涉过期资料记录", value: String(staleResourceCount) },
  ];

  const statusColors = ["status-ok", "status-danger", "status-watch", "status-danger"];

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>分层结构</span>
          <strong>资料 data · 判定 domain · 本机保存 storage · 页面 pages</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {metrics.map((metric, index) => (
          <article key={metric.label} className="metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <i className={statusColors[index]} />
          </article>
        ))}
      </section>

      <nav className="tabs">
        <button
          className={tab === "register" ? "tab tab-active" : "tab"}
          onClick={() => setTab("register")}
        >
          登记读数
        </button>
        <button
          className={tab === "review" ? "tab tab-active" : "tab"}
          onClick={() => setTab("review")}
        >
          发动机复核 {todoCount > 0 && <em className="tab-dot">{todoCount}</em>}
        </button>
        <button className="tab tab-reset" onClick={restoreSeed} title="清空本机数据并恢复示例">
          恢复示例数据
        </button>
      </nav>

      {tab === "register" ? (
        <RegisterPage
          engines={engines}
          stations={stations}
          inspectors={inspectors}
          instruments={instruments}
          today={today}
          onRegister={registerRecord}
        />
      ) : (
        <EnginePage
          records={records}
          engines={engines}
          personnel={personnel}
          onRelease={releaseRecord}
          onCorrect={correctRecord}
        />
      )}

      <footer className="page-foot">
        最近读数：{records.length} 条记录保存在本机浏览器；放行后读数锁定，更正另存版本并保留旧值。
      </footer>
    </main>
  );
}

export default App;
