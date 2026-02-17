import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function RandomBackgroundImg(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1)) + minCeiled; 
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [bg1, setBg1] = useState(RandomBackgroundImg(1,18));
const [bg2, setBg2] = useState(RandomBackgroundImg(1,18));
const [showSecond, setShowSecond] = useState(false);

useEffect(() => {
  const interval = setInterval(() => {

    const next = RandomBackgroundImg(1,18);

    if (showSecond) {
      setBg1(next);
    } else {
      setBg2(next);
    }

    setShowSecond(prev => !prev);

  }, 25000); // 25 sec

  return () => clearInterval(interval);
}, [showSecond]);




  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role === "TEACHER") {
        navigate("/me/teacher");
      } else if (data.user.role === "STUDENT") {
        navigate("/me/student");
      } else if (data.user.role === "ADMIN") {
        navigate("/me/admin");
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <div className="relative min-h-screen overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden -z-10" aria-hidden="true">
  
  {/* Bottom layer */}
  <div
    className="absolute inset-0 bg-no-repeat animate-bg-float"
    style={{
      backgroundImage: `url("login-background/${bg1}.jpg")`,
      backgroundSize: "120% auto",
      backgroundPosition: "0% center",
    }}
  />

  {/* Top layer (this one fades) */}
  <div
    className={`absolute inset-0 bg-no-repeat animate-bg-float transition-opacity duration-1000 ease-in-out ${
      showSecond ? "opacity-100" : "opacity-0"
    }`}
    style={{
      backgroundImage: `url("login-background/${bg2}.jpg")`,
      backgroundSize: "120% auto",
      backgroundPosition: "0% center",
    }}
  />

</div>

        <div className="absolute inset-0 bg-black/75" aria-hidden="true" />
        <div id="container" className="relative z-10 flex flex-row gap-5">
          <div
            id="login-box"
            className="p-5 bg-[#C2C2C2]/50 backdrop-blur-sm rounded-2xl"
          >
            <div id="login-content">
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-100 text-red-700 px-4 py-2 rounded">
                    {error}
                  </div>
                )}
                <p className="text-center text-white text-3xl font-bold">
                  เข้าสู่ระบบ
                </p>
                <label
                  htmlFor="username"
                  className="text-xl text-white text-shadow-xl text-shadow-black"
                >
                  <h1>รหัสนักเรียน</h1>
                </label>
                <input
                  type="text"
                  placeholder="ชื่อผู้ใช้"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input input-bordered w-full opacity-50 mt-3"
                  id="username"
                  required
                />
                <label
                  htmlFor="password"
                  className="text-xl text-white text-shadow-xl text-shadow-black"
                >
                  <h1>รหัสผ่าน</h1>
                </label>
                <input
                  type="password"
                  placeholder="รหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered w-full opacity-50 mt-3"
                  id="password"
                  required
                />

                <button
                  type="submit"
                  className="btn w-full text-white bg-[#FF842C] border-none"
                >
                  ดำเนินการต่อ
                </button>
              </form>
            </div>
          </div>
          <div
            id="news"
            className="p-5 bg-[#C2C2C2]/50 backdrop-blur-sm rounded-2xl"
          >
            <p className="text-3xl text-white text-center font-bold px-10">
              ข่าวสาร/ประชาสัมพันธ์
            </p>
            {/* hard coded เด้อ */}
            <p className="text-center mt-5 text-white">
              ขณะนี้ยังไม่มีประกาศ/ประชาสัมพันธ์ใด ๆ
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
