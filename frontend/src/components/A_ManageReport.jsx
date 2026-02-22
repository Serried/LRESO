import { useState, useEffect } from "react";
import NavBar from "./NavBar";

const API = "http://localhost:3000";

const STATUS_OPTIONS = [
  { value: "", label: "คำร้องทั้งหมด" },
  { value: "OPEN", label: "ส่งแล้ว" },
  { value: "IN_PROGRESS", label: "กำลังดำเนินการ" },
  { value: "CLOSED", label: "ปิด" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

const PAGE_SIZE = 8;

function A_ManageReport() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [pendingClose, setPendingClose] = useState(null);
  const [closeComment, setCloseComment] = useState("");
  const [toast, setToast] = useState(null);
  const [serverTime, setServerTime] = useState(null);
  const [clientTimeAtFetch, setClientTimeAtFetch] = useState(null);
  const [clientTime, setClientTime] = useState(() => new Date());

  const fetchServerTime = async () => {
    const clientNow = new Date();
    try {
      const res = await fetch(`${API}/api/time`);
      const data = await res.json();
      if (data.serverTime) {
        setServerTime(new Date(data.serverTime));
        setClientTimeAtFetch(clientNow);
      }
    } catch (e) {}
  };

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/admin/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setTickets(data.data || []);
    } catch (e) {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setClientTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const now = serverTime && clientTimeAtFetch
    ? new Date(serverTime.getTime() + (clientTime.getTime() - clientTimeAtFetch.getTime()))
    : new Date();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateStatus = async (ticketId, newStatus, comment = null) => {
    setUpdatingId(ticketId);
    try {
      const token = localStorage.getItem("token");
      const body = { status: newStatus };
      if (newStatus === "CLOSED" && comment) body.comment = comment;
      const res = await fetch(`${API}/api/admin/tickets/${ticketId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        showToast("อัปเดตสถานะสำเร็จ");
        setPendingClose(null);
        setCloseComment("");
        setSelectedTicket(null);
        fetchTickets();
      } else {
        showToast(data.message || "เกิดข้อผิดพลาด", "error");
      }
    } catch (e) {
      showToast("เกิดข้อผิดพลาด", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    if (/Z$|[+-]\d{2}:?\d{2}$/.test(String(dateStr))) return new Date(dateStr);
    return new Date(String(dateStr).replace(" ", "T") + "Z");
  };

  const formatDate = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return "—";
    return `เมื่อ: ${d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", hour12: false })}`;
  };

  const timeElapsed = (dateStr) => {
    const d = parseDate(dateStr);
    if (!d) return "";
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "เมื่อสักครู่";
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`;
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`;
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`;
    return formatDate(dateStr);
  };

  const submitterName = (r) => {
    if (r.thai_first_name || r.thai_last_name) {
      return `${r.thai_first_name || ""} ${r.thai_last_name || ""}`.trim();
    }
    if (r.submitterName) return r.submitterName;
    if (r.username) return r.username;
    return "ไม่ระบุชื่อ";
  };

  const submitterDisplay = (r) => {
    const name = submitterName(r);
    const prefix = r.gender === "M" ? "นาย" : r.gender === "F" ? "นางสาว" : "";
    return prefix ? `${prefix} ${name}` : name;
  };

  const filtered = tickets.filter((r) => {
    const matchFilter = !filter || (filter === "CANCELLED" ? r.status == null : r.status === filter);
    const topicOrTitle = r.topic || r.title || "";
    const matchSearch =
      !search ||
      topicOrTitle.toLowerCase().includes(search.toLowerCase()) ||
      (r.content || "").toLowerCase().includes(search.toLowerCase()) ||
      (r.type || "").toLowerCase().includes(search.toLowerCase()) ||
      submitterDisplay(r).toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <>
      <NavBar />

      <div className="min-h-[calc(100vh-80px)] bg-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            จัดการคำร้อง
          </h1>

          {/* filter + search */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="select select-bordered w-full sm:w-48 bg-white"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex-1 relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้แจ้ง/หัวข้อ"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="input input-bordered w-full pl-10 bg-white"
              />
            </div>
          </div>

          {/* list คำร้อง */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-500">
                กำลังโหลด...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                ไม่พบคำร้อง
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {paginated.map((r) => (
                  <li
                    key={r.ticketID}
                    onClick={() => setSelectedTicket(r)}
                    className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="shrink-0 w-14 h-14 rounded-full bg-sky-200 flex items-center justify-center text-sky-600 font-bold text-lg overflow-hidden">
                      {r.avatar ? (
                        <img
                          src={`${API}/uploads/${r.avatar}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        submitterName(r).charAt(0) || "?"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {r.topic || r.title || "ไม่มีหัวข้อ"}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {r.content || "-"}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        โดย {submitterDisplay(r)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <select
                        value={r.status ?? ""}
                        onChange={(e) => {
                          e.stopPropagation();
                          const val = e.target.value;
                          if (!val) return; // cancelled, no API change
                          if (val === "CLOSED") {
                            setPendingClose({ id: r.ticketID, topic: r.topic || r.title });
                            setCloseComment("");
                          } else {
                            updateStatus(r.ticketID, val);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        disabled={updatingId === r.ticketID}
                        className={`select select-sm font-medium min-w-[140px] text-white border-0 ${
                          r.status == null
                            ? "bg-gray-300"
                            : r.status === "OPEN" || r.status === "IN_PROGRESS"
                            ? "bg-yellow-500"
                            : "bg-gray-400"
                        }`}
                      >
                        <option value="">ยกเลิก</option>
                        <option value="OPEN">ส่งแล้ว</option>
                        <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                        <option value="CLOSED">ปิด</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-2">
                        {timeElapsed(r.createdAt)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn btn-ghost btn-sm"
              >
                ←
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`btn btn-sm ${
                      page === p
                        ? "bg-[#FF842C] text-white border-[#FF842C]"
                        : "btn-ghost"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn btn-ghost btn-sm"
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* modal เพิ่ม comment ตอนจะปิดคำร้อง */}
      {pendingClose && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPendingClose(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-2">ปิดคำร้อง</h3>
            <p className="text-sm text-gray-500 mb-4">กรุณาใส่ความเห็นสำหรับผู้ส่ง</p>
            <textarea
              value={closeComment}
              onChange={(e) => setCloseComment(e.target.value)}
              placeholder="ความเห็นเมื่อปิดคำร้อง..."
              className="textarea textarea-bordered w-full mb-4"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setPendingClose(null); setCloseComment(""); }} className="btn btn-ghost">
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  if (!closeComment.trim()) {
                    showToast("กรุณาใส่ความเห็น", "error");
                    return;
                  }
                  updateStatus(pendingClose.id, "CLOSED", closeComment.trim());
                }}
                disabled={updatingId === pendingClose.id || !closeComment.trim()}
                className="btn bg-[#FF842C] text-white"
              >
                {updatingId === pendingClose.id ? "กำลังบันทึก..." : "ปิดคำร้อง"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* modal รายละเอียดคำร้อง */}
      {selectedTicket && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedTicket(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">รายละเอียดคำร้อง</h2>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="btn btn-ghost btn-sm"
                >
                  ✕
                </button>
              </div>
              <p className="font-semibold text-gray-800 mb-2">
                {selectedTicket.topic || selectedTicket.title}
              </p>
              <p className="text-gray-600 text-sm whitespace-pre-wrap mb-4">
                {selectedTicket.content || "—"}
              </p>
              {selectedTicket.attachment && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-600 mb-2">รูปแนบ</p>
                  <a
                    href={`${API}/uploads/${selectedTicket.attachment}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <img
                      src={`${API}/uploads/${selectedTicket.attachment}`}
                      alt="รูปแนบ"
                      className="max-w-full max-h-64 object-contain rounded-lg border"
                    />
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                {selectedTicket.avatar ? (
                  <img
                    src={`${API}/uploads/${selectedTicket.avatar}`}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sky-200 flex items-center justify-center text-sky-600 font-bold">
                    {submitterName(selectedTicket).charAt(0) || "?"}
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">
                    โดย {submitterDisplay(selectedTicket)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatDate(selectedTicket.createdAt)}
                    {(() => {
                      const elapsed = timeElapsed(selectedTicket.createdAt);
                      if (elapsed && elapsed !== formatDate(selectedTicket.createdAt)) {
                        return <> • {elapsed}</>;
                      }
                      return null;
                    })()}
                  </p>
                </div>
              </div>
              {selectedTicket.status === "CLOSED" && selectedTicket.closeComment && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm font-medium text-gray-600 mb-1">ความเห็นเมื่อปิด</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selectedTicket.closeComment}</p>
                </div>
              )}
              <div>
                <label className="label">
                  <span className="label-text">สถานะ</span>
                </label>
                <select
                  value={selectedTicket.status ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    if (val === "CLOSED") {
                      setPendingClose({ id: selectedTicket.ticketID, topic: selectedTicket.topic || selectedTicket.title });
                      setCloseComment(selectedTicket.closeComment || "");
                      setSelectedTicket(null);
                    } else {
                      updateStatus(selectedTicket.ticketID, val);
                      setSelectedTicket((prev) => prev ? { ...prev, status: val } : null);
                    }
                  }}
                  disabled={updatingId === selectedTicket.ticketID}
                  className={`select select-bordered w-full font-medium ${
                    selectedTicket.status == null
                      ? "bg-gray-100 border-gray-300"
                      : selectedTicket.status === "OPEN" ||
                        selectedTicket.status === "IN_PROGRESS"
                      ? "bg-yellow-50 border-yellow-300"
                      : "bg-gray-100 border-gray-400"
                  }`}
                >
                  <option value="">ยกเลิก</option>
                  <option value="OPEN">ส่งแล้ว</option>
                  <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                  <option value="CLOSED">ปิด</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast toast-top toast-end">
          <div
            className={`alert ${
              toast.type === "error" ? "alert-error" : "alert-success"
            }`}
          >
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default A_ManageReport;
