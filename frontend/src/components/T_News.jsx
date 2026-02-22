import { useState, useEffect } from "react";
import NavBar from "./NavBar";
import AnnouncementCard from "./AnnouncementCard";

const API = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function T_News() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [announcements, setAnnouncements] = useState([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [modalAnnouncement, setModalAnnouncement] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [expireAt, setExpireAt] = useState("");
  const [isPinned, setIsPinned] = useState(false);

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

  const serverNow =
    serverTime && clientTimeAtFetch
      ? new Date(
          serverTime.getTime() + (clientTime.getTime() - clientTimeAtFetch.getTime())
        )
      : null;

  const categories = [
    { label: "ทั่วไป", value: "GENERAL" },
    { label: "วิชาการ", value: "ACADEMIC" },
    { label: "กิจกรรม", value: "EVENT" },
    { label: "ด่วน", value: "URGENT" },
    { label: "ทุนการศึกษา", value: "SCHOLARSHIP" },
  ];

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/me/teacher/news`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAnnouncements(data.data || []);
    } catch (e) {
      setAnnouncements([]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setClientTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isOwnAnnouncement = (a) =>
    String(a.createdBy) === String(user.id) && a.targetRole === "STUDENT";

  const handleDelete = async () => {
    if (!modalAnnouncement) return;
    if (!confirm("ยืนยันการลบประกาศนี้?")) return;
    if (!isOwnAnnouncement(modalAnnouncement)) return;
    const token = localStorage.getItem("token");
    const id =
      modalAnnouncement.announceID ??
      modalAnnouncement.announcementID ??
      modalAnnouncement.id;
    const res = await fetch(`${API}/api/me/teacher/announcement/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      showToast("ลบประกาศสำเร็จ");
      setModalAnnouncement(null);
      setEditForm(null);
      fetchAnnouncements();
    } else {
      showToast(data.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  const handleEditSubmit = async () => {
    if (!modalAnnouncement || !editForm) return;
    if (!editForm.title || !editForm.content)
      return showToast("กรอกข้อมูลให้ครบ", "error");
    if (!isOwnAnnouncement(modalAnnouncement)) return;
    const token = localStorage.getItem("token");
    const id =
      modalAnnouncement.announceID ??
      modalAnnouncement.announcementID ??
      modalAnnouncement.id;
    const res = await fetch(`${API}/api/me/teacher/announcement/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}` },
      body: JSON.stringify(editForm),
    });
    const data = await res.json();
    if (data.success) {
      showToast("แก้ไขประกาศสำเร็จ");
      setModalAnnouncement(null);
      setEditForm(null);
      fetchAnnouncements();
    } else {
      showToast(data.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  const handleSubmit = async () => {
    if (!title || !content) return showToast("กรอกข้อมูลให้ครบ", "error");
    const token = localStorage.getItem("token");
    const res = await fetch(`${API}/api/me/teacher/announcement`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        content,
        category,
        expireAt: expireAt || null,
        isPinned,
      }),
    });
    const data = await res.json();
    if (data.success) {
      showToast("สร้างประกาศสำเร็จ");
      setTitle("");
      setContent("");
      setExpireAt("");
      setIsPinned(false);
      fetchAnnouncements();
    } else {
      showToast(data.message || "เกิดข้อผิดพลาด", "error");
    }
  };

  return (
    <>
      <NavBar />

      <div className="min-h-[calc(100vh-80px)] bg-gray-100 flex justify-center py-6">
        <div className="w-full max-w-5xl flex flex-col gap-6 px-4">
          <h1 className="text-2xl font-bold text-gray-800">
            ข่าวสาร / ประชาสัมพันธ์
          </h1>

          <div className="flex flex-col gap-6">
            {/* form */}
            <div className="bg-white border rounded-xl p-5 shadow">
              <h2 className="font-semibold mb-3">ส่งประกาศถึงนักเรียน</h2>

              <input
                placeholder="หัวข้อ"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input input-bordered w-full mb-3"
              />

              <textarea
                placeholder="รายละเอียด..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="textarea textarea-bordered w-full mb-3"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="select select-bordered w-full mb-3"
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="mb-3">
                <label className="block text-sm text-gray-600 mb-1">
                  หมดอายุเมื่อ (ไม่บังคับ)
                </label>
                {serverNow && (
                  <p className="text-xs text-gray-500 mb-1">
                    เวลาของเซิร์ฟเวอร์:{" "}
                    {serverNow.toLocaleString("th-TH", {
                      dateStyle: "short",
                      timeStyle: "short",
                      hour12: false,
                    })}
                  </p>
                )}
                <input
                  type="datetime-local"
                  value={expireAt}
                  onChange={(e) => setExpireAt(e.target.value)}
                  min={
                    serverNow
                      ? (() => {
                          const p = (n) => String(n).padStart(2, "0");
                          return `${serverNow.getFullYear()}-${p(serverNow.getMonth() + 1)}-${p(serverNow.getDate())}T${p(serverNow.getHours())}:${p(serverNow.getMinutes())}`;
                        })()
                      : undefined
                  }
                  className="input input-bordered w-full"
                />
              </div>

              <label className="flex items-center gap-2 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={() => setIsPinned(!isPinned)}
                  className="checkbox checkbox-warning"
                />
                ปักหมุดประกาศ
              </label>

              <button
                onClick={handleSubmit}
                className="btn bg-[#FF842C] text-white w-full"
              >
                เผยแพร่ประกาศ (ถึงนักเรียน)
              </button>
            </div>

            {/* preview */}
            <div className="bg-white border rounded-xl p-5 shadow">
              <h2 className="font-semibold mb-3">ตัวอย่างการแสดงผล</h2>
              <AnnouncementCard
                title={title}
                content={content}
                category={category}
                isPinned={isPinned}
                authorName={`${user.thai_first_name || ""} ${user.thai_last_name || ""}`.trim() || "ครูผู้สอน"}
                authorRole="TEACHER"
                avatar={user.avatar}
                isPreview={true}
                serverNow={serverNow}
              />
            </div>

            {/* announcement list */}
            <div className="bg-white border rounded-xl p-5 shadow">
              <h2 className="font-semibold mb-4">ประกาศทั้งหมด</h2>
              {loadingAnnouncements ? (
                <p className="text-gray-500 text-sm">กำลังโหลด...</p>
              ) : announcements.length === 0 ? (
                <p className="text-gray-500 text-sm">ยังไม่มีประกาศ</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {announcements.map((a) => (
                    <div
                      key={a.announceID ?? a.announcementID ?? a.id ?? a.createdAt}
                      onClick={() => {
                        setModalAnnouncement(a);
                        if (isOwnAnnouncement(a)) {
                          let expireAtVal = "";
                          if (a.expireAt) {
                            const raw = String(a.expireAt);
                            const d = /Z$|[+-]\d{2}:?\d{2}$/.test(raw)
                              ? new Date(raw)
                              : new Date(raw.replace(" ", "T") + "Z");
                            const pad = (n) => String(n).padStart(2, "0");
                            expireAtVal = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
                          }
                          setEditForm({
                            title: a.title,
                            content: a.content,
                            category: a.category,
                            expireAt: expireAtVal,
                            isPinned: !!a.isPinned,
                          });
                        } else {
                          setEditForm(null);
                        }
                      }}
                      className="cursor-pointer hover:opacity-90 transition-opacity"
                    >
                      <AnnouncementCard
                        title={a.title}
                        content={a.content}
                        category={a.category}
                        isPinned={!!a.isPinned}
                        createdAt={a.createdAt}
                        authorName={`${a.thai_first_name || ""} ${a.thai_last_name || ""}`.trim() || "ผู้ดูแลระบบ"}
                        authorRole={a.role}
                        avatar={a.avatar}
                        serverNow={serverNow}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* modal */}
      {modalAnnouncement && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setModalAnnouncement(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">
                  {isOwnAnnouncement(modalAnnouncement)
                    ? "แก้ไขประกาศ"
                    : "รายละเอียดประกาศ"}
                </h2>
                <button
                  onClick={() => {
                    setModalAnnouncement(null);
                    setEditForm(null);
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  ✕
                </button>
              </div>

              {isOwnAnnouncement(modalAnnouncement) && editForm ? (
                <div className="space-y-3">
                  <input
                    placeholder="หัวข้อ"
                    value={editForm.title}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, title: e.target.value }))
                    }
                    className="input input-bordered w-full"
                  />
                  <textarea
                    placeholder="รายละเอียด..."
                    value={editForm.content}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, content: e.target.value }))
                    }
                    className="textarea textarea-bordered w-full"
                  />
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, category: e.target.value }))
                    }
                    className="select select-bordered w-full"
                  >
                    {categories.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div>
                    {serverNow && (
                      <p className="text-xs text-gray-500 mb-1">
                        เวลาของเซิร์ฟเวอร์:{" "}
                        {serverNow.toLocaleString("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                          hour12: false,
                        })}
                      </p>
                    )}
                    <input
                      type="datetime-local"
                      value={editForm.expireAt}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, expireAt: e.target.value }))
                      }
                      className="input input-bordered w-full"
                    />
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.isPinned}
                      onChange={() =>
                        setEditForm((f) => ({ ...f, isPinned: !f.isPinned }))
                      }
                      className="checkbox checkbox-warning"
                    />
                    ปักหมุดประกาศ
                  </label>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleEditSubmit}
                      className="btn bg-[#FF842C] text-white"
                    >
                      บันทึก
                    </button>
                    <button
                      onClick={() => {
                        setModalAnnouncement(null);
                        setEditForm(null);
                      }}
                      className="btn btn-ghost"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              ) : (
                <AnnouncementCard
                  title={modalAnnouncement.title}
                  content={modalAnnouncement.content}
                  category={modalAnnouncement.category}
                  isPinned={!!modalAnnouncement.isPinned}
                  createdAt={modalAnnouncement.createdAt}
                  authorName={`${modalAnnouncement.thai_first_name || ""} ${modalAnnouncement.thai_last_name || ""}`.trim() || "ผู้ดูแลระบบ"}
                  authorRole={modalAnnouncement.role}
                  avatar={modalAnnouncement.avatar}
                  serverNow={serverNow}
                />
              )}

              {isOwnAnnouncement(modalAnnouncement) && (
                <div className="mt-6 pt-4 border-t">
                  <button
                    onClick={handleDelete}
                    className="btn btn-error btn-outline btn-sm"
                  >
                    ลบประกาศ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* toast */}
      {toast && (
        <div className="toast toast-top toast-end">
          <div
            className={`alert ${toast.type === "error" ? "alert-error" : "alert-success"}`}
          >
            <span>{toast.msg}</span>
          </div>
        </div>
      )}
    </>
  );
}

export default T_News;
