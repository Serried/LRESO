import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';

const API_BASE = "http://localhost:3000";

function S_News() {

  

  const [newsData, setNewsData] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {

    const fetchNews = async () => {
  
      const token = localStorage.getItem("token");
  
      const res = await fetch(`${API_BASE}/api/me/student/news`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
  
      const data = await res.json();
      console.log(data);

      if (data.success) {
        setNewsData(data.data);
      }
  
    };
  
    fetchNews();
  
  }, []);
  

  const roleColor = (role) => {
    switch (role) {
      case "ฝ่ายสารวัตรนักเรียน":
        return "bg-orange-500 text-white";
      case "ครูผู้สอน":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-300";
    }
  };

  const getFullName = (news) => {
    let prefix = "";
  
    if (news.gender === "M") prefix = "นาย";
    else if (news.gender === "F") prefix = "นางสาว";
  
    return `${prefix}${news.thai_first_name} ${news.thai_last_name}`;
  };
  

  const formatThaiDateTime = (date) =>
    new Date(date).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short"
    });

  const timeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000);
    if (diff < 60) return `${diff} วินาทีที่แล้ว`;
    if (diff < 3600) return `${Math.floor(diff/60)} นาทีที่แล้ว`;
    if (diff < 86400) return `${Math.floor(diff/3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diff/86400)} วันที่แล้ว`;
  };

  const filteredNews = newsData.filter(n =>
    (filter === 'ALL' || n.category === filter) &&
    n.title.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedNews = filteredNews.filter(n => n.isPinned);
  const normalNews = filteredNews.filter(n => !n.isPinned);

  return (
    <>
      <NavBar />

      <div className="min-h-[calc(100vh-80px)] bg-gray-100 flex justify-center py-6">
        <div className="w-full max-w-4xl flex flex-col gap-4">

          <h2 className="text-2xl font-bold text-gray-800">
            ประกาศข่าวสาร
          </h2>

          <div className="flex gap-3">
            <input
              placeholder="ค้นหาประกาศ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 border px-4 py-2 rounded-lg shadow-sm"
            />

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border px-4 py-2 rounded-lg shadow-sm"
            >
              <option value="ALL">ทั้งหมด</option>
              <option value="ACADEMIC">วิชาการ</option>
              <option value="EVENT">กิจกรรม</option>
              <option value="GENERAL">ทั่วไป</option>
              <option value="URGENT">ด่วน</option>
            </select>
          </div>

          {/* PINNED */}
          {pinnedNews.map(news => (
            <div
              key={news.announcementID}
              className="bg-yellow-50 border border-yellow-300 p-5 rounded-xl shadow-sm relative"
            >
              <span className="absolute top-3 right-3 text-xs bg-yellow-500 text-white px-2 py-1 rounded">
                PINNED
              </span>

              <div className="flex items-center gap-3 mb-2">
                <img
                  src={`${API_BASE}/uploads/${news.avatar}`}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div>
                  <p className="font-semibold text-sm">
                    {getFullName(news)}
                  </p>

                  <span className={`text-xs px-2 py-0.5 rounded ${roleColor(news.role === "TEACHER" ? "ครูผู้สอน" : "ฝ่ายสารวัตรนักเรียน")}`}>
                    {news.role}
                  </span>

                  <p className="text-xs text-gray-500 mt-1">
                    {formatThaiDateTime(news.createdAt)} • {timeAgo(news.createdAt)}
                  </p>
                </div>
              </div>

              <p className="font-medium mb-1">{news.title}</p>
              <p className="text-sm text-gray-600">{news.content}</p>
            </div>
          ))}

          
          {/* NORMAL */}
          {normalNews.map(news => (
            <div
              key={news.announceID}
              className="bg-white border border-[#ddd] p-5 rounded-xl shadow-sm"
            >
              <div className="flex items-center gap-3 mb-2">
                <img
                  src={`${API_BASE}/uploads/${news.avatar}`}
                  className="w-10 h-10 rounded-full object-cover"
                />

                <div>
                  <p className="text-xs text-gray-500 mb-1">
                    {formatThaiDateTime(news.createdAt)} • {timeAgo(news.createdAt)}
                  </p>
                  <p className="font-semibold text-sm">
                    {getFullName(news)}
                  </p>

                  <span className={`text-xs px-2 py-0.5 rounded ${roleColor(news.role === "TEACHER" ? "ครูผู้สอน" : "ฝ่ายสารวัตรนักเรียน")}`}>
                    {news.role === "TEACHER" ? "ครูผู้สอน" : "ฝ่ายสารวัตรนักเรียน"}
                  </span>

                </div>
              </div>

              <p className="font-medium mb-1">เรื่อง: {news.title}</p>
              <p className="text-sm text-gray-600">{news.content}</p>
            </div>
          ))}

        </div>
      </div>
    </>
  );
}

export default S_News;
