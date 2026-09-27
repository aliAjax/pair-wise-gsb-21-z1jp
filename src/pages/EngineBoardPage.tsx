import { useMemo, useState } from "react";
import type { BorescopeRecord, Engine, Inspector, Instrument } from "../data/types";
import { compareWithPrevious, evaluate } from "../rules/evaluation";
import { BlockerPill, EmptyState, StatusBadge } from "../components/ui";

interface EngineBoardPageProps {
  db: {
    engines: Engine[];
    inspectors: Inspector[];
    instruments: Instrument[];
    records: BorescopeRecord[];
  };
  onOpenRecord: (record: BorescopeRecord) => void;
}

interface Group {
  station: string;
  bladeNo: string;
  latest: BorescopeRecord;
}

export function EngineBoardPage({ db, onOpenRecord }: EngineBoardPageProps) {
  const [selectedEngineId, setSelectedEngineId] = useState<string>(db.engines[0]?.id ?? "");
  const engine = db.engines.find((e) => e.id === selectedEngineId);

  const engineStats = useMemo(() => {
    return db.engines.map((e) => {
      const mine = db.records.filter((r) => r.engineId === e.id);
      const pending = mine.filter((r) => r.status === "pending");
      const blocked = pending.filter(
        (r) => evaluate(r, db.records, db.inspectors, db.instruments).blockers.length > 0
      );
      const amendments = mine.reduce((sum, r) => sum + r.amendments.length, 0);
      return {
        engine: e,
        total: mine.length,
        pendingCount: pending.length,
        blockedCount: blocked.length,
        releasedCount: mine.length - pending.length,
        amendments,
      };
    });
  }, [db]);

  const engineRecords = useMemo(
    () =>
      db.records
        .filter((r) => r.engineId === selectedEngineId)
        .sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt) || b.createdAt.localeCompare(a.createdAt)),
    [db.records, selectedEngineId]
  );

  const todos = engineRecords.filter((r) => r.status === "pending");

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, BorescopeRecord>();
    for (const r of engineRecords) {
      const key = `${r.station}__${r.bladeNo}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, r);
        continue;
      }
      const newer =
        r.inspectedAt > existing.inspectedAt ||
        (r.inspectedAt === existing.inspectedAt && r.createdAt > existing.createdAt);
      if (newer) map.set(key, r);
    }
    return [...map.entries()]
      .map(([key, latest]) => {
        const [station, bladeNo] = key.split("__");
        return { station, bladeNo, latest };
      })
      .sort((a, b) => a.station.localeCompare(b.station) || a.bladeNo.localeCompare(b.bladeNo));
  }, [engineRecords]);

  const inspectorName = (id: string) => db.inspectors.find((i) => i.id === id)?.name ?? id;

  return (
    <div className="board">
      <div className="engine-cards">
        {engineStats.map(({ engine: e, total, pendingCount, blockedCount, releasedCount, amendments }) => (
          <button
            key={e.id}
            className={`engine-card ${e.id === selectedEngineId ? "engine-card-on" : ""}`}
            onClick={() => setSelectedEngineId(e.id)}
          >
            <div className="engine-card-head">
              <strong>{e.serial}</strong>
              <span>{e.model}</span>
            </div>
            <p className="engine-aircraft">装机 {e.aircraft}</p>
            <div className="engine-stat-row">
              <span>
                <b className={blockedCount > 0 ? "num-danger" : ""}>{pendingCount}</b> 待评估
              </span>
              <span>
                <b>{releasedCount}</b> 已放行
              </span>
              <span>
                <b>{total}</b> 总读数
              </span>
            </div>
            <div className="engine-card-foot">
              <BlockerPill count={blockedCount} />
              {amendments > 0 && <span className="pill pill-warn">{amendments} 次更正</span>}
            </div>
          </button>
        ))}
      </div>

      {engine && (
        <>
          <section className="panel">
            <div className="section-heading">
              <div>
                <p>{engine.serial} · 待办</p>
                <h2>待评估事项</h2>
              </div>
            </div>
            {todos.length === 0 ? (
              <EmptyState>该发动机没有待评估记录。</EmptyState>
            ) : (
              <div className="todo-list">
                {todos.map((r) => {
                  const ev = evaluate(r, db.records, db.inspectors, db.instruments);
                  return (
                    <article
                      key={r.id}
                      className={`todo-item ${ev.blockers.length > 0 ? "todo-danger" : ""}`}
                      onClick={() => onOpenRecord(r)}
                    >
                      <div className="todo-main">
                        <strong>
                          {r.station} · 叶片 {r.bladeNo}
                        </strong>
                        <span>
                          {r.inspectedAt} · {inspectorName(r.inspectorId)} · 长度{" "}
                          {r.reading.defectLengthMm.toFixed(2)}mm
                        </span>
                        {r.todoNote && <p>{r.todoNote}</p>}
                        {ev.blockers.length > 0 && (
                          <ul className="mini-blockers">
                            {ev.blockers.map((b) => (
                              <li key={b.code}>{b.message}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <div className="todo-side">
                        <BlockerPill count={ev.blockers.length} />
                        <span className="open-hint">打开签署 →</span>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="section-heading">
              <div>
                <p>{engine.serial} · 前后对比</p>
                <h2>各站位叶片本次 vs 上次（已放行）读数</h2>
              </div>
              <span className="muted-note">增长超过 1mm 以红色标出</span>
            </div>
            {groups.length === 0 ? (
              <EmptyState>该发动机还没有孔探记录。</EmptyState>
            ) : (
              <div className="table-wrap">
                <table className="record-table">
                  <thead>
                    <tr>
                      <th>站位</th>
                      <th>叶片</th>
                      <th>上次长度</th>
                      <th>本次长度</th>
                      <th>长度变化</th>
                      <th>本次深度</th>
                      <th>参照尺寸</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map(({ station, bladeNo, latest }) => {
                      const cmp = compareWithPrevious(db.records, latest);
                      return (
                        <tr
                          key={`${station}-${bladeNo}`}
                          className="clickable-row"
                          onClick={() => onOpenRecord(latest)}
                        >
                          <td>{station}</td>
                          <td>
                            <strong>{bladeNo}</strong>
                          </td>
                          <td>{cmp ? cmp.previousReading.defectLengthMm.toFixed(2) : "—"}</td>
                          <td>{latest.reading.defectLengthMm.toFixed(2)}</td>
                          <td className={cmp?.growthOverLimit ? "delta-danger" : "delta-ok"}>
                            {cmp
                              ? `${cmp.lengthDelta >= 0 ? "+" : ""}${cmp.lengthDelta.toFixed(2)} mm`
                              : "基线"}
                          </td>
                          <td>{latest.reading.defectDepthMm.toFixed(2)}</td>
                          <td>{latest.reading.referenceMm.toFixed(2)}</td>
                          <td>
                            <StatusBadge status={latest.status} />
                            {latest.amendments.length > 0 && (
                              <span className="pill pill-warn">V{latest.amendments.length + 1}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
