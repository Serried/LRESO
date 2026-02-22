import { useState, useEffect } from "react";
import NavBar from "./NavBar";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function T_ManageScore() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [scores, setScores] = useState({});
  const [components, setComponents] = useState([]);
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState(null);


  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch(`${API}/api/me/teacher/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setSubjects(res.data || []);
      })
      .catch(console.error);
  }, []);

  const year = new Date().getFullYear() + 543;
  const term = 1;
  const subjectsThisTerm = subjects.filter((s) => s.year === year && s.term === term);
  const uniqueSubjects = [...new Map(subjectsThisTerm.map((s) => [s.subjectID, { subjectID: s.subjectID, subjectName: s.subjectName }])).values()];
  const classesForSubject = subjectsThisTerm.filter((s) => String(s.subjectID) === String(selectedSubject));

  useEffect(() => {
    setSelectedClass("");
    setScoreData(null);
  }, [selectedSubject]);

  useEffect(() => {
    if (!selectedSubject || !selectedClass) {
      setScoreData(null);
      return;
    }
    const cls = classesForSubject.find((c) => String(c.classID) === String(selectedClass));
    if (!cls) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    fetch(
      `${API}/api/me/teacher/score-data?classID=${selectedClass}&subjectID=${selectedSubject}&year=${year}&term=${term}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setScoreData(res.data);
          setComponents(res.data.components || []);
          setScores(res.data.scores || {});
        } else {
          setToast({ msg: res.message || "เกิดข้อผิดพลาด", type: "error" });
        }
      })
      .catch(() => setToast({ msg: "เกิดข้อผิดพลาด", type: "error" }))
      .finally(() => setLoading(false));
  }, [selectedSubject, selectedClass]);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateScore = (studentID, componentID, value) => {
    const key = `${studentID}-${componentID}`;
    setScores((prev) => ({ ...prev, [key]: value }));
  };

  const saveScores = async () => {
    if (!scoreData) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/me/teacher/scores`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classID: selectedClass,
          subjectID: selectedSubject,
          year,
          term,
          scores,
        }),
      });
      const data = await res.json();
      if (data.success) showToast("บันทึกคะแนนแล้ว");
      else showToast(data.message || "เกิดข้อผิดพลาด", "error");
    } catch (e) {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSaving(false);
    }
  };

  const openComponentModal = () => {
    setEditingComponent(components.map((c) => ({ name: c.name, weight: c.weight })));
    setShowComponentModal(true);
  };

  const saveComponents = async () => {
    const total = editingComponent.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0);
    if (Math.abs(total - 100) > 0.01) {
      showToast("น้ำหนักรวมต้องเท่ากับ 100%", "error");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/me/teacher/score-components`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          classID: selectedClass,
          subjectID: selectedSubject,
          year,
          term,
          components: editingComponent.map((c) => ({ name: c.name, weight: c.weight })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("บันทึกส่วนประกอบคะแนนแล้ว (คะแนนที่กรอกไว้จะถูกล้าง)");
        setShowComponentModal(false);
        const refetch = await fetch(
          `${API}/api/me/teacher/score-data?classID=${selectedClass}&subjectID=${selectedSubject}&year=${year}&term=${term}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const refetchData = await refetch.json();
        if (refetchData.success) {
          setScoreData(refetchData.data);
          setComponents(refetchData.data.components || []);
          setScores(refetchData.data.scores || {});
        }
      } else {
        showToast(data.message || "เกิดข้อผิดพลาด", "error");
      }
    } catch (e) {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setSaving(false);
    }
  };

  const addComponent = () => {
    setEditingComponent((prev) => [...prev, { name: "คะแนนเพิ่ม", weight: 0 }]);
  };

  const removeComponent = (i) => {
    setEditingComponent((prev) => prev.filter((_, idx) => idx !== i));
  };

  const displayName = (s) => {
    const thai = [s?.thai_first_name, s?.thai_last_name].filter(Boolean).join(" ");
    if (thai) return thai;
    return [s?.first_name, s?.last_name].filter(Boolean).join(" ") || s?.studentCode || "—";
  };

  const escapeCsvCell = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const downloadCsvExample = () => {
    if (!scoreData?.students?.length || !components?.length) return;
    const headers = ["studentCode", "ชื่อ-นามสกุล", ...components.map((c) => c.name)];
    const rows = scoreData.students.map((s) => {
      const name = displayName(s);
      const scoreCells = components.map((c) => {
        const key = `${s.studentID}-${c.id}`;
        const val = scores[key] ?? scoreData.scores?.[key];
        return val !== "" && val != null ? val : "";
      });
      return [s.studentCode || "", name, ...scoreCells];
    });
    const lines = [headers.map(escapeCsvCell).join(","), ...rows.map((r) => r.map(escapeCsvCell).join(","))];
    const csv = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `คะแนน_${scoreData.className}_${scoreData.subjectName || "subject"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("ดาวน์โหลดไฟล์ CSV แล้ว");
  };

  const parseCsvRow = (line) => {
    const out = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (inQuotes) {
        cur += ch;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  };

  const normalizeStudentCode = (val) => {
    const s = String(val ?? "").trim();
    const num = parseInt(s, 10);
    return !isNaN(num) ? String(num) : s;
  };

  const parseScoreValue = (raw) => {
    const s = String(raw ?? "").trim().replace(/\s/g, "");
    if (!s) return NaN;
    const withDot = s.replace(",", ".");
    let n = parseFloat(withDot);
    if (!isNaN(n)) return n;
    n = parseFloat(s.replace(/,/g, ""));
    return isNaN(n) ? NaN : n;
  };

  const handleCsvImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          let text = ev.target?.result || "";
          if (text.startsWith("\uFEFF")) text = text.slice(1);
          const rawLines = text.split(/\r?\n/);
          const lines = rawLines.filter((l) => l.trim().length > 0);
          if (lines.length < 2) {
            showToast("ไฟล์ CSV ต้องมีหัวข้อและอย่างน้อย 1 แถว", "error");
            return;
          }
          const rawHeaders = parseCsvRow(lines[0]);
          const headers = rawHeaders.map((h) => h.replace(/\uFEFF/g, "").trim());
          const studentCodeIdx = headers.findIndex((h) => /studentCode|รหัส|รหัสนักเรียน/i.test(h));
          const codeCol = studentCodeIdx >= 0 ? studentCodeIdx : 0;
          const compColMap = components.map((c, ci) => {
            const idx = headers.findIndex((h) => h === c.name || h.replace(/\s+/g, " ").trim() === c.name);
            if (idx >= 0) return idx;
            return 2 + ci;
          });
          const studentByCode = {};
          for (const s of scoreData?.students || []) {
            const code = String(s.studentCode || "").trim();
            studentByCode[code] = s;
            const norm = normalizeStudentCode(code);
            if (norm !== code) studentByCode[norm] = s;
          }
          const updates = {};
          let rowCount = 0;
          for (let i = 1; i < lines.length; i++) {
            const cells = parseCsvRow(lines[i]);
            if (cells.length <= codeCol) continue;
            const code = normalizeStudentCode(cells[codeCol]);
            const student = studentByCode[code] ?? studentByCode[String(cells[codeCol] ?? "").trim()];
            if (!student) continue;
            rowCount++;
            for (let ci = 0; ci < components.length; ci++) {
              const c = components[ci];
              const colIdx = compColMap[ci];
              if (colIdx < 0 || colIdx >= cells.length) continue;
              const raw = cells[colIdx];
              const num = parseScoreValue(raw);
              if (!isNaN(num) && num >= 0 && num <= 100) {
                updates[`${student.studentID}-${c.id}`] = num;
              }
            }
          }
          const toApply = Object.fromEntries(
            Object.entries(updates).filter(([, v]) => v != null)
          );
          setScores((prev) => ({ ...prev, ...toApply }));
          showToast(`นำเข้าคะแนน ${Object.keys(toApply).length} ค่า จาก ${rowCount} แถว`);
        } catch (err) {
          showToast("ไม่สามารถอ่านไฟล์ CSV ได้", "error");
        }
      };
      reader.readAsText(file, "UTF-8");
    };
    input.click();
  };

  return (
    <>
      <NavBar />
      <div className="min-h-[calc(100vh-80px)] bg-gray-100 p-4 md:p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            จัดการคะแนนนักเรียน
          </h1>

          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  เลือกรายวิชา
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="select select-bordered w-full"
                >
                  <option value="">-- เลือกรายวิชา --</option>
                  {uniqueSubjects.map((s) => (
                    <option key={s.subjectID} value={s.subjectID}>
                      {s.subjectName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  เลือกห้องเรียน
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  disabled={!selectedSubject}
                  className="select select-bordered w-full"
                >
                  <option value="">-- เลือกห้อง --</option>
                  {classesForSubject.map((c) => (
                    <option key={c.classID} value={c.classID}>
                      {c.className}
                      {c.plan ? ` (${c.plan})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <span className="loading loading-spinner loading-lg text-[#FF842C]" />
            </div>
          ) : scoreData ? (
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg">
                    {scoreData.subjectName} - {scoreData.className}
                  </h2>
                  <p className="text-sm text-gray-500">
                    ปีการศึกษา {scoreData.term}/{scoreData.year}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={openComponentModal}
                    className="btn btn-outline btn-sm"
                  >
                    แก้ไขส่วนประกอบคะแนน
                  </button>
                  <button
                    onClick={downloadCsvExample}
                    className="btn btn-outline btn-sm"
                    title="ดาวน์โหลดไฟล์ CSV ที่มีรายชื่อนักเรียนทุกคนและคอลัมน์คะแนน (studentCode, ชื่อ-นามสกุล, และแต่ละส่วนประกอบ)"
                  >
                    ดาวน์โหลดตัวอย่าง CSV
                  </button>
                  <button
                    onClick={handleCsvImport}
                    className="btn btn-outline btn-sm"
                    title="นำเข้าคะแนนจากไฟล์ CSV (ต้องมีคอลัมน์ studentCode และชื่อส่วนประกอบคะแนน)"
                  >
                    นำเข้าจาก CSV
                  </button>
                  <button
                    onClick={saveScores}
                    disabled={saving}
                    className="btn bg-[#FF842C] text-white btn-sm"
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึกคะแนน"}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="table table-zebra">
                  <thead>
                    <tr className="bg-[#FF842C]/10">
                      <th className="w-12">ลำดับที่</th>
                      <th>รหัสนักเรียน</th>
                      <th>ชื่อ-นามสกุล</th>
                      {components.map((c) => (
                        <th key={c.id} className="text-center min-w-[100px]">
                          <div>{c.name}</div>
                          <div className="text-xs font-normal text-gray-500">
                            {c.weight}%
                          </div>
                        </th>
                      ))}
                      <th className="text-center bg-gray-100">รวม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scoreData.students.map((s, i) => {
                      let weightedSum = 0;
                      let totalWeight = 0;
                      const cells = components.map((c) => {
                        const key = `${s.studentID}-${c.id}`;
                        const val = scores[key] ?? scoreData.scores?.[key];
                        const num = val === "" || val == null ? null : parseFloat(val);
                        if (num != null && !isNaN(num)) {
                          weightedSum += num * (c.weight / 100);
                          totalWeight += c.weight;
                        }
                        return (
                          <td key={c.id} className="p-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={val ?? ""}
                              onChange={(e) =>
                                updateScore(s.studentID, c.id, e.target.value)
                              }
                              className="input input-bordered input-sm w-full text-center"
                            />
                          </td>
                        );
                      });
                      const total = totalWeight > 0 ? weightedSum : null;
                      return (
                        <tr key={s.studentID}>
                          <td>{i + 1}</td>
                          <td>{s.studentCode}</td>
                          <td>{displayName(s)}</td>
                          {cells}
                          <td className="text-center font-medium bg-gray-50">
                            {total != null ? total.toFixed(1) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedSubject && selectedClass ? null : (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
              เลือกรายวิชาและห้องเรียนเพื่อจัดการคะแนน
            </div>
          )}
        </div>
      </div>

      {/* ทodal แก้ไขส่วนประกอบคะแนน */}
      {showComponentModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowComponentModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg mb-4">แก้ไขส่วนประกอบคะแนน</h3>
            <p className="text-sm text-gray-500 mb-4">
              น้ำหนักรวมต้องเท่ากับ 100% (กลางภาค และ ปลายภาค เป็นค่าเริ่มต้น)
            </p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {editingComponent.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) =>
                      setEditingComponent((prev) =>
                        prev.map((p, j) =>
                          j === i ? { ...p, name: e.target.value } : p
                        )
                      )
                    }
                    className="input input-bordered input-sm flex-1"
                    placeholder="ชื่อส่วน"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={c.weight}
                    onChange={(e) =>
                      setEditingComponent((prev) =>
                        prev.map((p, j) =>
                          j === i
                            ? { ...p, weight: parseFloat(e.target.value) || 0 }
                            : p
                        )
                      )
                    }
                    className="input input-bordered input-sm w-20 text-right"
                  />
                  <span className="text-sm text-gray-500">%</span>
                  {editingComponent.length > 1 && (
                    <button
                      onClick={() => removeComponent(i)}
                      className="btn btn-ghost btn-xs text-error"
                    >
                      ลบ
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addComponent}
              className="btn btn-ghost btn-sm mt-2"
            >
              + เพิ่มส่วนคะแนน
            </button>
            <p className="text-sm text-gray-500 mt-2">
              รวม: {editingComponent.reduce((s, c) => s + (parseFloat(c.weight) || 0), 0).toFixed(1)}%
            </p>
            <div className="flex gap-2 mt-4 justify-end">
              <button
                onClick={() => setShowComponentModal(false)}
                className="btn btn-ghost"
              >
                ยกเลิก
              </button>
              <button
                onClick={saveComponents}
                disabled={saving}
                className="btn bg-[#FF842C] text-white"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast toast-top toast-end">
          <div className={`alert ${toast.type === "error" ? "alert-error" : "alert-success"}`}>
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default T_ManageScore;
