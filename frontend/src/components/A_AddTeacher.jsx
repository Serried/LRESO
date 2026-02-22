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
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [birthDate, setBirthDate] = useState(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState("/avatar-placeholder.jpg");
  const [errorMessage, setErrorMessage] = useState({ text: '', isError: false });
  const [csvSuccessAccounts, setCsvSuccessAccounts] = useState(null);

  const openEditModal = (t) => {
    setSelectedTeacher(t);
    setEditForm({
      ...t,
      dob: t.dob ? String(t.dob).split('T')[0] : ''
    });
  };

  const closeEditModal = () => {
    setSelectedTeacher(null);
    setEditForm(null);
  };

  const handleCSV = async (e) => {
    
    const file = e.target.files[0];
    if(!file) {
      return;
    }

    const formData = new FormData();
    formData.append('csv', file);


    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/teachers/csv`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.account) && data.account.length > 0) {
        setCsvSuccessAccounts(data.account);
        fetchTeachers();
      } else if (!res.ok) {
        setErrorMessage({ text: data.message || 'เกิดข้อผิดพลาด', isError: true });
      } else {
        setErrorMessage({ text: data.message || 'อัปโหลดสำเร็จ (ไม่มีบัญชีใหม่)', isError: false });
      }
    } catch (e) {
      console.error(e);
      setErrorMessage({ text: 'เกิดข้อผิดพลาด', isError: true });
    }
    e.target.value = '';
  };

  const downloadCsvAccounts = () => {
    if (!csvSuccessAccounts || csvSuccessAccounts.length === 0) return;
    const escape = (s) => (s == null ? '' : `"${String(s).replace(/"/g, '""')}"`);
    const header = 'username,password\n';
    const rows = csvSuccessAccounts.map((a) => `${escape(a.username)},${escape(a.password)}`).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `teacher-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm || !selectedTeacher) return;
    setErrorMessage({ text: '', isError: false });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/admin/teachers/${selectedTeacher.teacherID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          thai_first_name: editForm.thai_first_name || null,
          thai_last_name: editForm.thai_last_name || null,
          gender: editForm.gender || null,
          dob: editForm.dob || null,
          tel: editForm.tel || null,
          email: editForm.email || null,
          department: editForm.department || null,
          status: editForm.status || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage({ text: data.message || 'เกิดข้อผิดพลาด', isError: true });
        return;
      }
      setErrorMessage({ text: data.message || 'อัปเดตสำเร็จ', isError: false });
      fetchTeachers();
      closeEditModal();
    } catch (err) {
      console.error(err);
      setErrorMessage({ text: 'เกิดข้อผิดพลาด', isError: true });
    }
  };

  const fetchTeachers = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`${API_BASE}/api/admin/get-teachers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(result => { if (result.success && Array.isArray(result.data)) setTeachers(result.data); })
      .catch(() => {});
  };

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

  useEffect(() => { fetchTeachers(); }, []);

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

            <div className="flex justify-center mt-8 p-5">
              <button
                type="submit"
                className="bg-orange-500 text-white px-10 py-3 text-lg rounded hover:bg-orange-600"
              >
                เพิ่มบัญชีครูผู้สอน
              </button >
              {/* ทำไมไม่ขึ้นไม่รู้ */}
              <div className='divider lg:divider-horizontal'>หรือ</div>
              <label className='bg-orange-500 text-white px-10 py-3 text-lg rounded hover:bg-orange-600 cursor-pointer inline-block'>
                อัพโหลดไฟล์ค่าที่คั่นด้วยจุลภาค
                <input type='file' id='csv-upload' accept='.csv' className='hidden' onChange={handleCSV} />
              </label>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent('\uFEFFfirst_name,last_name,thai_first_name,thai_last_name,gender,dob,tel,email,department\nTanakrit,Incham,ธนกฤต,อินทร์ฉ่ำ,M,2549-02-12,0123456789,67070061@kmitl.ac.th,คณิตศาสตร์')}`}
                download="teacher-import-template.csv"
                className="text-blue-600 hover:underline"
              >
                ดาวน์โหลดตัวอย่าง CSV
              </a>
            </p>

          </form>

        </div>
      </div>
      <div className='divider'></div>
      <div className='m-15'>
        <h1 className='text-2xl font-bold mb-5'>ข้อมูลครูผู้สอนทั้งหมด</h1>
        <div className="border border-[#ddd] rounded-lg overflow-hidden shadow">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 border-b">ลำดับที่</th>
                <th className="text-left p-3 border-b">ชื่อ-นามสกุล</th>
                <th className="text-left p-3 border-b">เพศ</th>
                <th className="text-left p-3 border-b">แผนก</th>
                <th className="text-left p-3 border-b">อีเมล</th>
                <th className="text-left p-3 border-b">เบอร์โทร</th>
                <th className="text-left p-3 border-b">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500 border-b">
                    ไม่พบข้อมูลครูผู้สอน
                  </td>
                </tr>
              ) : (
                teachers.map((t, i) => (
                  <tr
                    key={t.teacherID}
                    className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => openEditModal(t)}
                  >
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3">
                      {(t.thai_first_name || t.thai_last_name)
                        ? `${t.thai_first_name || ''} ${t.thai_last_name || ''}`.trim()
                        : 'ไม่มีข้อมูล'}
                    </td>
                    <td className="p-3">{t.gender === 'M' ? 'ชาย' : t.gender === 'F' ? 'หญิง' : t.gender || 'ไม่มีข้อมูล'}</td>
                    <td className="p-3">{t.department || 'ไม่มีข้อมูล'}</td>
                    <td className="p-3">{t.email || 'ไม่มีข้อมูล'}</td>
                    <td className="p-3">{t.tel || 'ไม่มีข้อมูล'}</td>
                    <td className="p-3">{t.status === 'ACTIVE' ? 'ปฏิบัติงาน' : t.status === 'RESIGNED' ? 'ลาออก' : t.status || '-' || 'ไม่มีข้อมูล'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal แก้ข้อมูลครู */}
      {editForm && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">แก้ไขข้อมูลครู</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล (ไทย)</label>
                  <div className="flex gap-2">
                    <input type="text" className="border px-3 py-2 flex-1 rounded" placeholder="ชื่อ" value={editForm.thai_first_name || ''} onChange={e => setEditForm(f => ({ ...f, thai_first_name: e.target.value }))} />
                    <input type="text" className="border px-3 py-2 flex-1 rounded" placeholder="นามสกุล" value={editForm.thai_last_name || ''} onChange={e => setEditForm(f => ({ ...f, thai_last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล (English)</label>
                  <div className="flex gap-2">
                    <input type="text" className="border px-3 py-2 flex-1 rounded" placeholder="First name" value={editForm.first_name || ''} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} />
                    <input type="text" className="border px-3 py-2 flex-1 rounded" placeholder="Last name" value={editForm.last_name || ''} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                  <select className="border px-3 py-2 w-full rounded" value={editForm.gender || ''} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">-- เลือก --</option>
                    <option value="M">ชาย</option>
                    <option value="F">หญิง</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด</label>
                  <input type="date" className="border px-3 py-2 w-full rounded" value={editForm.dob || ''} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                  <input type="tel" className="border px-3 py-2 w-full rounded" value={editForm.tel || ''} onChange={e => setEditForm(f => ({ ...f, tel: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                  <input type="email" className="border px-3 py-2 w-full rounded" value={editForm.email || ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">แผนก</label>
                  <select className="border px-3 py-2 w-full rounded" value={editForm.department || ''} onChange={e => setEditForm(f => ({ ...f, department: e.target.value }))}>
                    <option value="">-- เลือก --</option>
                    {groupNames.map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
                  <select className="border px-3 py-2 w-full rounded" value={editForm.status || ''} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ACTIVE">ปฏิบัติงาน</option>
                    <option value="RESIGNED">ลาออก</option>
                  </select>
                </div>
                <div className="modal-action">
                  <button type="submit" className="btn bg-orange-500 text-white border-none hover:bg-orange-600">บันทึก</button>
                  <button type="button" className="btn btn-ghost" onClick={closeEditModal}>ยกเลิก</button>
                </div>
              </form>
          </div>
          <div className="modal-backdrop" onClick={closeEditModal} aria-hidden />
        </div>
      )}

      {/* ยืนยัน CSV */}
      {csvSuccessAccounts && csvSuccessAccounts.length > 0 && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-success">อัปโหลดสำเร็จ</h2>
            <p className="text-base-content/70 mt-1">สร้างบัญชีครูผู้สอนแล้ว {csvSuccessAccounts.length} บัญชี</p>
            <div className="overflow-y-auto flex-1 my-4">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>ชื่อผู้ใช้</th>
                    <th>รหัสผ่าน</th>
                  </tr>
                </thead>
                <tbody>
                  {csvSuccessAccounts.map((a, i) => (
                    <tr key={i}>
                      <td className="font-mono">{a.username}</td>
                      <td className="font-mono">{a.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="modal-action">
              <button type="button" className="btn bg-orange-500 text-white border-none hover:bg-orange-600" onClick={downloadCsvAccounts}>
                ดาวน์โหลด
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setCsvSuccessAccounts(null)}>
                ปิด
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setCsvSuccessAccounts(null)} aria-hidden />
        </div>
      )}
    </>
  )
}

export default A_AddTeacher
