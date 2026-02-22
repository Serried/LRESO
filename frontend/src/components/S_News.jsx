import { useState, useEffect } from "react";
import NavBar from "./NavBar";
import AnnouncementCard from "./AnnouncementCard";

const API = "http://localhost:3000";

function S_News() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  const serverNow = serverTime && clientTimeAtFetch
    ? new Date(serverTime.getTime() + (clientTime.getTime() - clientTimeAtFetch.getTime()))
    : null;

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API}/api/me/student/news`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setAnnouncements(data.data || []);
        } else {
          setError(data.message || "เกิดข้อผิดพลาด");
        }
      } catch (e) {
        setError("ไม่สามารถโหลดประกาศได้");
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
    fetchServerTime();
    const interval = setInterval(fetchServerTime, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const tick = setInterval(() => setClientTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  return (
    <>
      <NavBar />

      <div className="min-h-[calc(100vh-80px)] bg-slate-100 flex justify-center py-6">
        <div className="w-full max-w-3xl px-4">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            ข่าวสาร / ประชาสัมพันธ์
          </h1>

          {loading ? (
            <p className="text-gray-500 text-center py-12">กำลังโหลด...</p>
          ) : error ? (
            <p className="text-red-500 text-center py-12">{error}</p>
          ) : announcements.length === 0 ? (
            <p className="text-gray-500 text-center py-12">
              ขณะนี้ยังไม่มีประกาศ/ประชาสัมพันธ์ใด ๆ
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {announcements.map((a) => (
                <AnnouncementCard
                  key={a.announceID ?? a.announcementID}
                  title={a.title}
                  content={a.content}
                  category={a.category}
                  isPinned={!!a.isPinned}
                  createdAt={a.createdAt}
                  authorName={`${a.thai_first_name || ""} ${a.thai_last_name || ""}`.trim()}
                  authorRole={a.role === "TEACHER" ? "ครูผู้สอน" : "ผู้ดูแลระบบ"}
                  avatar={a.avatar}
                  serverNow={serverNow}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default S_News;
