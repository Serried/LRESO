const API = "http://localhost:3000";

const categoryColor = (cat) => {
  switch (cat) {
    case "ACADEMIC":
      return "bg-blue-500 text-white";
    case "EVENT":
      return "bg-purple-500 text-white";
    case "URGENT":
      return "bg-red-500 text-white";
    case "SCHOLARSHIP":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-400 text-white";
  }
};

const categoryLabel = (cat) => {
  const map = {
    GENERAL: "ทั่วไป",
    ACADEMIC: "วิชาการ",
    EVENT: "กิจกรรม",
    URGENT: "ด่วน",
    SCHOLARSHIP: "ทุนการศึกษา",
  };
  return map[cat] || cat;
};

const roleLabel = (role) => {
  const map = {
    ADMIN: "ผู้ดูแลระบบ",
    TEACHER: "ครูผู้สอน",
    STUDENT: "นักเรียน",
  };
  return map[role] || role;
};

// Parse date from server (ISO or SQLite "YYYY-MM-DD HH:MM:SS" UTC)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (/Z$|[+-]\d{2}:?\d{2}$/.test(String(dateStr))) return new Date(dateStr);
  return new Date(String(dateStr).replace(" ", "T") + "Z");
};

const formatTime = (dateStr, now) => {
  if (!dateStr) return "เมื่อสักครู่";
  const d = parseDate(dateStr);
  if (!d) return "เมื่อสักครู่";
  const refNow = now || new Date();
  const diff = refNow.getTime() - d.getTime();
  if (diff < 60000) return "เมื่อสักครู่";
  if (diff < 3600000) return `เมื่อ ${Math.floor(diff / 60000)} นาทีที่แล้ว`;
  if (diff < 86400000) return `เมื่อ ${Math.floor(diff / 3600000)} ชั่วโมงที่แล้ว`;
  if (diff < 604800000) return `เมื่อ ${Math.floor(diff / 86400000)} วันที่แล้ว`;
  return d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short", hour12: false });
};

function AnnouncementCard({
  title,
  content,
  category,
  isPinned,
  createdAt,
  authorName,
  authorRole,
  avatar,
  isPreview = false,
  serverNow = null,
}) {
  const avatarUrl = avatar
    ? `${API}/uploads/${avatar}`
    : "https://placehold.co/48";

  return (
    <div
      className={`
        flex flex-col gap-3 p-5 rounded-xl border shadow-sm
        ${isPinned ? "bg-yellow-50 border-yellow-400" : "bg-white border-gray-200"}
      `}
    >
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <img
            src={avatarUrl}
            alt=""
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-gray-800">
              {authorName || "ผู้ดูแลระบบ"}
            </p>
            <span className="text-xs px-2 py-0.5 rounded bg-orange-500 text-white">
              {roleLabel(authorRole) || "ผู้ดูแลระบบ"}
            </span>
            <p className="text-sm text-gray-500 mt-1">
              {isPreview
                ? `${(serverNow || new Date()).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", hour12: false })} • เมื่อสักครู่`
                : formatTime(createdAt, serverNow)}
            </p>
          </div>
        </div>
        {isPinned && (
          <span className="text-xs bg-yellow-500 text-white px-3 py-1 rounded-lg">
            ปักหมุด
          </span>
        )}
      </div>

      {/* CATEGORY + TITLE */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-xs px-2 py-0.5 rounded ${categoryColor(category)}`}
        >
          {categoryLabel(category)}
        </span>
        <p className="font-semibold text-gray-800">
          {title || "หัวข้อประกาศ"}
        </p>
      </div>

      {/* CONTENT */}
      <p className="text-sm text-gray-600 whitespace-pre-wrap">
        {content || "รายละเอียดประกาศจะแสดงที่นี่"}
      </p>
    </div>
  );
}

export default AnnouncementCard;
