import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import NavBar from "./NavBar";

const API = "http://localhost:3000";

const STATUS_LABEL = {
  OPEN: "ส่งแล้ว",
  IN_PROGRESS: "กำลังดำเนินการ",
  CLOSED: "ปิด",
  null: "ยกเลิก",
};

const STATUS_BADGE = {
  OPEN: "badge-info",
  IN_PROGRESS: "badge-warning",
  CLOSED: "badge-success",
  null: "badge-ghost",
};

// ประเภทคำร้อง
const REPORT_TYPE_OPTIONS = [
  { value: "", label: "-- เลือกประเภท --" },
  { value: "INFO", label: "แก้ไขข้อมูลส่วนตัว" },
  { value: "DOCS", label: "เอกสารทางการศึกษา" },
  { value: "STATUS", label: "สถานภาพนักเรียน" },
  { value: "REGIS", label: "การลงทะเบียนเรียน" },
  { value: "OTHER", label: "อื่นๆ" },
];

const TYPE_LABEL = Object.fromEntries(REPORT_TYPE_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]));

function BugReport() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [topic, setTopic] = useState("");
  const [reportType, setReportType] = useState("");
  const [myTickets, setMyTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [content, setContent] = useState("");
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorModal, setErrorModal] = useState({ show: false, message: "" });
  const [confirmClose, setConfirmClose] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("topic", topic.trim());
      if (reportType) formData.append("type", reportType);
      formData.append("content", content.trim());
      if (attachmentFile) formData.append("attachment", attachmentFile);

      const res = await fetch(`${API}/api/ticket`, {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTopic("");
        setReportType("");
        setContent("");
        setAttachmentFile(null);
        if (user.id) fetchMyTickets();
      } else {
        setErrorModal({ show: true, message: data.message || "เกิดข้อผิดพลาด" });
      }
    } catch (e) {
      setErrorModal({ show: true, message: "ไม่สามารถส่งรายงานได้" });
    } finally {
      setSubmitting(false);
    }
  };

  const fetchMyTickets = async () => {
    if (!user.id) return;
    setLoadingTickets(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/me/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setMyTickets(data.data || []);
    } catch (e) {
      setMyTickets([]);
    } finally {
      setLoadingTickets(false);
    }
  };

  const handleClose = (ticketId) => {
    setConfirmClose(ticketId);
  };

  const doCloseTicket = async () => {
    if (!confirmClose) return;
    const ticketId = confirmClose;
    setConfirmClose(null);
    setClosingId(ticketId);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/me/tickets/${ticketId}/close`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        fetchMyTickets();
      } else {
        setErrorModal({ show: true, message: data.message || "เกิดข้อผิดพลาด" });
      }
    } catch (e) {
      setErrorModal({ show: true, message: "ไม่สามารถยกเลิกคำร้องได้" });
    } finally {
      setClosingId(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  };

  useEffect(() => {
    if (user.id) fetchMyTickets();
  }, [user.id]);

  return (
    <>
      <NavBar />

      <div className="min-h-[calc(100vh-80px)] bg-gray-100 flex justify-center py-8">
        <div className="w-full max-w-xl px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            แจ้งปัญหา
          </h1>
          <p className="text-gray-600 mb-6">
            ติดต่อฝ่ายทะเบียน
          </p>

          {success ? (
            <div className="bg-white rounded-xl p-6 shadow border text-center">
              <p className="text-green-600 font-medium mb-4">
                ส่งคำร้องเรียบร้อยแล้ว
              </p>
              <p className="text-gray-600 text-sm mb-4">
                ฝ่ายจะดำเนินการตรวจสอบและแก้ไขในเร็วๆ นี้
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="btn bg-[#FF842C] text-white"
              >
                ส่งคำร้องใหม่
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-xl p-6 shadow border space-y-4"
            >
              <div>
                <label className="label">
                  <span className="label-text">ประเภทคำร้อง</span>
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="select select-bordered w-full"
                >
                  {REPORT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">
                  <span className="label-text">หัวข้อ *</span>
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="ระบุหัวข้อคำร้อง"
                  className="input input-bordered w-full"
                  required
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">รายละเอียด</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="อธิบายปัญหาหรือข้อเสนอแนะ"
                  className="textarea textarea-bordered w-full"
                  rows={4}
                />
              </div>
              <div>
                <label className="label">
                  <span className="label-text">แนบรูปภาพ (ไม่บังคับ)</span>
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                  className="file-input file-input-bordered w-full"
                />
                {attachmentFile && (
                  <p className="text-sm text-gray-500 mt-1">เลือกแล้ว: {attachmentFile.name}</p>
                )}
              </div>
              {(user.thai_first_name || user.first_name || user.email) && (
                <div className="text-sm text-gray-500">
                  ผู้ส่ง: {[user.thai_first_name || user.first_name, user.thai_last_name || user.last_name].filter(Boolean).join(" ").trim() || user.username || "—"}
                  {user.email && ` (${user.email})`}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting || !topic.trim()}
                  className="btn bg-[#FF842C] text-white flex-1"
                >
                  {submitting ? "กำลังส่ง..." : "ส่งคำร้อง"}
                </button>
                <Link to="/" className="btn btn-ghost">
                  กลับ
                </Link>
              </div>
            </form>
          )}

          {/* คำร้องที่ส่ง */}
          {user.id && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-gray-800 mb-4">คำร้องที่ส่งของคุณ</h2>
              {loadingTickets ? (
                <p className="text-gray-500">กำลังโหลด...</p>
              ) : myTickets.length === 0 ? (
                <p className="text-gray-500">ยังไม่มีคำร้องที่ส่ง</p>
              ) : (
                <div className="space-y-3">
                  {myTickets.map((t) => (
                    <div
                      key={t.ticketID}
                      className="bg-white rounded-xl p-4 shadow border flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 truncate">{t.topic}</p>
                        <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
                          {t.content || "—"}
                        </p>
                        {t.status === "CLOSED" && t.closeComment && (
                          <div className="mt-2 p-2 bg-slate-100 rounded text-sm text-gray-700">
                            <span className="font-medium text-gray-600">ความเห็นจากผู้ดูแล: </span>
                            <span className="whitespace-pre-wrap">{t.closeComment}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-2">
                          {t.type && TYPE_LABEL[t.type] && (
                            <span>{TYPE_LABEL[t.type]}</span>
                          )}
                          <span>ส่งเมื่อ {formatDate(t.createdAt)}</span>
                          <span className={`badge badge-sm ${STATUS_BADGE[t.status] ?? STATUS_BADGE.null}`}>
                            {STATUS_LABEL[t.status] ?? STATUS_LABEL.null}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={() => handleClose(t.ticketID)}
                        disabled={closingId === t.ticketID || t.status !== "OPEN"}
                        className="btn btn-outline btn-error btn-sm shrink-0"
                      >
                        {closingId === t.ticketID ? "กำลังยกเลิก..." : "ยกเลิกคำร้อง"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* error */}
      <dialog className={`modal ${errorModal.show ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">เกิดข้อผิดพลาด</h3>
          <p className="py-4">{errorModal.message}</p>
          <div className="modal-action">
            <button className="btn" onClick={() => setErrorModal({ show: false, message: "" })}>
              ปิด
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setErrorModal({ show: false, message: "" })}>close</button>
        </form>
      </dialog>

      {/* modal ยืนยันการยกเลิกคำร้อง */}
      <dialog className={`modal ${confirmClose ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg">ยืนยันการยกเลิกคำร้อง</h3>
          <p className="py-4">ยืนยันการยกเลิกคำร้องนี้?</p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setConfirmClose(null)}>
              ยกเลิก
            </button>
            <button className="btn btn-error" onClick={doCloseTicket}>
              ยกเลิกคำร้อง
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setConfirmClose(null)}>close</button>
        </form>
      </dialog>
    </>
  );
}

export default BugReport;
