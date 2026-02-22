import { useState, useEffect } from "react";
import NavBar from "./NavBar";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

// Score ranges → grade (0-4), min score inclusive
const SCORE_TO_GRADE = [
  { min: 80, grade: 4 },
  { min: 75, grade: 3.5 },
  { min: 70, grade: 3 },
  { min: 65, grade: 2.5 },
  { min: 60, grade: 2 },
  { min: 55, grade: 1.5 },
  { min: 50, grade: 1 },
  { min: 0, grade: 0 },
];

function scoreToGrade(score) {
  if (score == null || isNaN(score)) return null;
  const s = parseFloat(score);
  for (const r of SCORE_TO_GRADE) {
    if (s >= r.min) return r.grade;
  }
  return 0;
}

function computeStats(totals) {
  if (!totals?.length) return null;
  const n = totals.length;
  const mean = totals.reduce((a, b) => a + b, 0) / n;
  const variance = totals.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  return {
    min: Math.min(...totals),
    max: Math.max(...totals),
    mean,
    variance,
    sd,
    n,
  };
}

function computePercentile(totals, userScore) {
  if (!totals?.length || userScore == null || isNaN(userScore)) return null;
  const countBelow = totals.filter((t) => parseFloat(t) < userScore).length;
  return Math.round((countBelow / totals.length) * 100);
}

// Score distribution: 0-100, each bar = 5 points (0-4, 5-9, ..., 95-100)
function scoreDistributionBy5(totals) {
  const buckets = [];
  for (let i = 0; i < 20; i++) {
    const min = i * 5;
    const max = i === 19 ? 100 : min + 4;
    buckets.push({ min, max, label: `${min}-${max}`, count: 0 });
  }
  for (const t of totals || []) {
    const s = parseFloat(t);
    if (isNaN(s)) continue;
    const idx = s >= 100 ? 19 : Math.min(19, Math.floor(s / 5));
    buckets[idx].count++;
  }
  return buckets;
}

function S_ViewScore() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [scoreData, setScoreData] = useState(null);
  const [scoreStats, setScoreStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chartModalOpen, setChartModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API}/api/me/student/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSubjects(res.data || []);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setScoreData(null);
      setScoreStats(null);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/api/me/student/scores?subjectID=${selectedSubject}`, { headers }).then((r) => r.json()),
      fetch(`${API}/api/me/student/score-stats?subjectID=${selectedSubject}`, { headers }).then((r) => r.json()),
    ]).then(([scoresRes, statsRes]) => {
      if (scoresRes.success) setScoreData(scoresRes.data);
      else setScoreData(null);
      if (statsRes.success) setScoreStats(statsRes.data);
      else setScoreStats(null);
    }).catch(() => {
      setScoreData(null);
      setScoreStats(null);
    }).finally(() => setLoading(false));
  }, [selectedSubject]);

  let total = null;
  if (scoreData?.components?.length && scoreData?.scores) {
    let weightedSum = 0;
    let totalWeight = 0;
    for (const c of scoreData.components) {
      const val = scoreData.scores[c.id];
      if (val != null && !isNaN(parseFloat(val))) {
        weightedSum += parseFloat(val) * (c.weight / 100);
        totalWeight += c.weight;
      }
    }
    total = totalWeight > 0 ? weightedSum : null;
  }
  const grade = total != null ? scoreToGrade(total) : null;
  const stats = scoreStats?.totals?.length ? computeStats(scoreStats.totals) : null;
  const percentile = total != null && scoreStats?.totals?.length ? computePercentile(scoreStats.totals, total) : null;
  const distributionBy5 = scoreStats?.totals?.length ? scoreDistributionBy5(scoreStats.totals) : [];
  const maxCountBy5 = distributionBy5.length ? Math.max(...distributionBy5.map((d) => d.count), 1) : 1;
  const userBucketIdx = total != null ? (total >= 100 ? 19 : Math.min(19, Math.floor(total / 5))) : null;

  return (
    <>
      <NavBar />
      <div className="min-h-[calc(100vh-80px)] bg-gray-100 p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            ข้อมูลผลการเรียน - {user.gender === 'M' ? "นาย" : "นางสาว"}{user.thai_first_name} {user.thai_last_name}
          </h1>

          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex-1 bg-white rounded-xl shadow-sm border p-6">
              <label className="block text-sm font-medium text-gray-600 mb-2">
                เลือกรายวิชา
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="select select-bordered w-full"
              >
                <option value="">-- เลือกรายวิชา --</option>
                {subjects.map((s) => (
                  <option key={s.subjectID} value={s.subjectID}>
                    {s.subjectName}
                    {s.className ? ` (${s.className})` : ""}
                  </option>
                ))}
              </select>
              {stats && (
                <div>
                    <h3 className="mt-5">สถิติคะแนนตามรายวิชา</h3>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded p-1.5">
                      <span className="text-gray-500 block">ต่ำสุด</span>
                      <span className="font-medium">{stats.min.toFixed(1)}</span>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <span className="text-gray-500 block">สูงสุด</span>
                      <span className="font-medium">{stats.max.toFixed(1)}</span>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <span className="text-gray-500 block">ค่าเฉลี่ย</span>
                      <span className="font-medium">{stats.mean.toFixed(1)}</span>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <span className="text-gray-500 block">ส่วนเบี่ยงเบนมาตรฐาน</span>
                      <span className="font-medium">{stats.sd.toFixed(1)}</span>
                    </div>
                    <div className="bg-gray-50 rounded p-1.5">
                      <span className="text-gray-500 block">ความแปรปรวน</span>
                      <span className="font-medium">{stats.variance.toFixed(1)}</span>
                    </div>
                    {percentile != null && (
                      <div className="bg-[#FF842C]/10 rounded p-1.5 border border-[#FF842C]/30">
                        <span className="text-gray-500 block">เปอร์เซ็นไทล์ของคุณ</span>
                        <span className="font-medium text-[#FF842C]">P{percentile}</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setChartModalOpen(true)}
                    className="btn btn-sm btn-outline mt-3 w-full border-[#FF842C] text-[#FF842C] hover:bg-[#FF842C]/10"
                  >
                    ดูกราฟแจกแจงคะแนน
                  </button>
                </div>
              )}
            </div>
            <div className="shrink-0 bg-white rounded-xl shadow-sm border p-6 overflow-x-auto">
              <p className="text-sm font-medium text-gray-600 mb-2">เกณฑ์การตัดเกรด</p>
              <table className="table table-sm">
                <thead>
                  <tr className="bg-[#FF842C]/10">
                    <th>ช่วงคะแนน</th>
                    <th>เกรด</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {SCORE_TO_GRADE.map((r, i) => {
                    const next = SCORE_TO_GRADE[i - 1];
                    const max = next ? next.min - 1 : 100;
                    return (
                      <tr key={r.min}>
                        <td className="text-center">{r.min}-{max}</td>
                        <td className="text-center">{r.grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <span className="loading loading-spinner loading-lg text-[#FF842C]" />
            </div>
          ) : scoreData && selectedSubject ? (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
              <div className="p-4 border-b bg-gray-50 flex justify-between items-start gap-4">
                <div>
                  <h2 className="font-bold text-lg">
                    {scoreData.subjectName}
                    {scoreData.className && ` - ${scoreData.className}`}
                  </h2>
                  <p className="text-sm text-gray-500">
                    ปีการศึกษา {scoreData.term}/{scoreData.year}
                  </p>
                  {(scoreData.teacherName && scoreData.teacherName.trim()) && (
                    <p className="text-sm text-gray-600 mt-1">
                      ครูผู้รับผิดชอบ: {scoreData.teacherName.trim()}
                    </p>
                  )}
                </div>
                {grade != null && (
                  <span className="text-2xl font-bold text-[#FF842C] shrink-0">เกรดของคุณ: {grade}</span>
                )}
              </div>

              {!scoreData.components?.length ? (
                <div className="p-12 text-center text-gray-500">
                  ยังไม่มีข้อมูลคะแนนสำหรับรายวิชานี้
                </div>
              ) : (
                <div className="overflow-x-auto pt-2 pb-6 px-4">
                  <table className="table">
                    <thead>
                      <tr className="bg-[#FF842C]/10">
                        <th>ส่วนประกอบของคะแนน</th>
                        <th className="text-center w-24">น้ำหนักคะแนน (%)</th>
                        <th className="text-center w-24">ได้ (%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scoreData.components.map((c) => (
                        <tr key={c.id}>
                          <td>{c.name}</td>
                          <td className="text-center">{c.weight}%</td>
                          <td className="text-center">
                            {scoreData.scores[c.id] != null
                              ? Number(scoreData.scores[c.id])
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold bg-gray-50">
                        <td colSpan={2} className="text-right">
                          รวม
                        </td>
                        <td className="text-center">
                          {total != null ? total.toFixed(1) : "—"}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ) : selectedSubject ? null : (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
              เลือกรายวิชาเพื่อดูผลการเรียน
            </div>
          )}

          {/* Chart modal */}
          {chartModalOpen && (
            <dialog open className="modal modal-open">
              <div className="modal-box max-w-4xl max-h-[90vh] overflow-y-auto">
                <h3 className="font-bold text-lg mb-4">จำนวนนักเรียนต่อช่วงคะแนน 0-100</h3>
                {stats && (
                  <p className="text-sm text-gray-500 mb-4">จากนักเรียนทั้งหมด {stats.n} คน</p>
                )}
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-0.5 min-h-[220px] pb-10" style={{ minWidth: "640px" }}>
                    {distributionBy5.map((d, idx) => {
                      const isUserBar = userBucketIdx === idx;
                      return (
                        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-[28px]">
                          <div
                            className={`w-full rounded-t transition-colors cursor-default ${isUserBar ? "bg-blue-600 ring-2 ring-blue-400 ring-offset-1" : "bg-[#FF842C]/80 hover:bg-[#FF842C]"}`}
                            style={{ height: `${(d.count / maxCountBy5) * 160}px`, minHeight: d.count > 0 ? "4px" : 0 }}
                            title={isUserBar ? `${d.label}: ${d.count} คน (ตำแหน่งของคุณ)` : `${d.label}: ${d.count} คน`}
                          />
                          <span className={`text-[10px] font-medium ${isUserBar ? "text-blue-600" : "text-gray-600"}`}>
                            {d.count}{isUserBar ? " (คุณ)" : ""}
                          </span>
                          <span className="text-[9px] text-gray-500">{d.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {userBucketIdx != null && (
                  <p className="text-sm text-blue-600 mt-2">
                    แถบสีน้ำเงิน = ตำแหน่งคะแนนของคุณ ({distributionBy5[userBucketIdx]?.label})
                  </p>
                )}
                <div className="modal-action">
                  <button type="button" className="btn" onClick={() => setChartModalOpen(false)}>
                    ปิด
                  </button>
                </div>
              </div>
              <form method="dialog" className="modal-backdrop">
                <button type="button" onClick={() => setChartModalOpen(false)}>ปิด</button>
              </form>
            </dialog>
          )}
        </div>
      </div>
    </>
  );
}

export default S_ViewScore;
