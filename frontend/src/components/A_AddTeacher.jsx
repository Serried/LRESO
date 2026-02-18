import React, { useState, useEffect } from 'react'
import NavBar from './NavBar'
import DatePicker from './DatePicker';

const API_BASE = 'http://localhost:3000';

function A_AddTeacher() {

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [thaiFirstName, setThaiFirstName] = useState('');
  const [thaiLastName, setThaiLastName] = useState('');
  const [gender, setGender] = useState('M');
  const [department, setDepartment] = useState('');
  const [groupNames, setGroupNames] = useState([]);
  const [birthDate, setBirthDate] = useState(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState("/avatar-placeholder.jpg");
  const [errorMessage, setErrorMessage] = useState({ text: '', isError: false });

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE}/api/subjects/group-names`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(result => {
        if (result.success && Array.isArray(result.data)) setGroupNames(result.data);
      })
      .catch(() => {});
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage({ text: '', isError: false });

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErrorMessage({ text: 'กรุณากรอกชื่อ-นามสกุล (English) และอีเมล', isError: true });
      return;
    }
    if (!avatarFile) {
      setErrorMessage({ text: 'กรุณาอัพโหลดรูปโปรไฟล์', isError: true });
      return;
    }

    const formData = new FormData();
    formData.append('first_name', firstName.trim());
    formData.append('last_name', lastName.trim());
    if (thaiFirstName.trim()) formData.append('thai_first_name', thaiFirstName.trim());
    if (thaiLastName.trim()) formData.append('thai_last_name', thaiLastName.trim());
    formData.append('gender', gender);
    formData.append('tel', phone);
    formData.append('email', email.trim());
    formData.append('department', department);
    if (birthDate) {
      formData.append('dob', birthDate.toISOString().split('T')[0]);
    }
    formData.append('avatar', avatarFile);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/teachers`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage({ text: data.message || "เกิดข้อผิดพลาด", isError: true });
        return;
      }
      setErrorMessage({ text: data.message || "เพิ่มครูสำเร็จ!", isError: false });
      console.log(data);
    } catch (err) {
      console.error(err);
      setErrorMessage({ text: "เกิดข้อผิดพลาด", isError: true });
    }
  };

  return (
    <>
      <NavBar />

      <div className='m-15'>
        <h1 className='text-2xl font-bold mb-5'>เพิ่มบัญชีผู้ใช้ - ครูผู้สอน</h1>

        <div className='border border-[#ddd] rounded-lg p-6 shadow'>

          {errorMessage.text && (
            <div className={`mb-4 p-3 rounded ${errorMessage.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {errorMessage.text}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* ชื่อ-นามสกุล (thai) */}
            <div className="flex items-center gap-6 mb-4">
              <span className="text-lg font-semibold w-32">ชื่อ-นามสกุล (ไทย)</span>
              <input
                value={thaiFirstName}
                onChange={(e) => setThaiFirstName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder="ชื่อภาษาไทย"
              />
              <input
                value={thaiLastName}
                onChange={(e) => setThaiLastName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder="นามสกุลภาษาไทย"
              />
            </div>

            {/* ชื่อ-นามสกุล (eng) */}
            <div className="flex items-center gap-6 mb-6">
              <span className="text-lg font-semibold w-32">ชื่อ-นามสกุล (อังกฤษ)</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder='ชื่อภาษาอังกฤษ'
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder='นามสกุลภาษาอังกฤษ'
              />
            </div>

            {/* Avatar + Form */}
            <div className="flex gap-16 mt-5 items-start">

              {/* LEFT : Avatar */}
              <div className="flex flex-col items-center w-48">
                <label htmlFor="avatar" className="cursor-pointer">
                  <img
                    src={preview}
                    className="w-40 h-40 rounded-full object-cover bg-blue-400"
                  />
                </label>

                <input
                  type="file"
                  id="avatar"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />

                <p className="text-lg mt-2">อัปโหลดรูป</p>
              </div>

              {/* RIGHT : FORM */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-1">

                {/* เพศ */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-24">เพศ</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="border px-4 py-2 w-40 shadow"
                  >
                    <option value='M'>ชาย</option>
                    <option value='F'>หญิง</option>
                  </select>
                </div>

                {/* อีเมล */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-32">อีเมล</label>
                  <input
                    type="email"
                    value={email}
                    placeholder='เช่น 67070061@kmitl.ac.th'
                    onChange={(e) => setEmail(e.target.value)}
                    className="border px-4 py-2 flex-1 shadow"
                  />
                </div>

                {/* เบอร์ */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-32">เบอร์ติดต่อ</label>
                  <input
                    type="tel"
                    value={phone}
                    placeholder='เช่น 0901234567'
                    onChange={(e) => setPhone(e.target.value)}
                    className="border px-4 py-2 flex-1 shadow"
                  />
                </div>

                {/* แผนก (จาก group_name ใน Subject) */}
                {/* ถ้าเข้าใจถูก group_name น่าจะเป็นแผนกที่วิชานั้นอยู่นะ */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-24">แผนก</label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="border px-4 py-2 w-40 shadow"
                  >
                    <option value="">-- เลือก --</option>
                    {groupNames.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* วันเกิด */}
                <div className="flex items-center gap-4 col-span-2">
                  <label className="text-lg font-semibold w-40">
                    วัน/เดือน/ปี เกิด
                  </label>

                  <DatePicker
                    value={birthDate}
                    onChange={setBirthDate}
                  />
                </div>

              </div>

            </div>

            <div className="flex justify-center mt-8">
              <button
                type="submit"
                className="bg-orange-500 text-white px-10 py-3 text-lg rounded hover:bg-orange-600"
              >
                เพิ่มบัญชีครูผู้สอน
              </button>
            </div>

          </form>

        </div>
      </div>
    </>
  )
}

export default A_AddTeacher
