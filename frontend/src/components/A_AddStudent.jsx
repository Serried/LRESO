import React, { useState, useEffect } from 'react';
import NavBar from './NavBar';
import DatePicker from './DatePicker';
import CalendarModal from './CalendarModal';
import { isValidThaiName, isValidEnglishName } from '../utils/nameValidation';


function A_AddStudent() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [thaiFirstName, setThaiFirstName] = useState('');
  const [thaiLastName, setThaiLastName] = useState('');
  const [gender, setGender] = useState('M');
  const [birthDate, setBirthDate] = useState(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState('/avatar-placeholder.jpg');
  const [errorMessage, setErrorMessage] = useState({ text: '', isError: false });
  const [generatedPassword, setGeneratedPassword] = useState(null);
  const [csvSuccessAccounts, setCsvSuccessAccounts] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openEditModal = (s) => {
    setSelectedStudent(s);
    setEditForm({
      ...s,
      address: s.address || '',
      email: s.email || '',
      dob: s.dob ? String(s.dob).split('T')[0] : '',
    });
  };

  const closeEditModal = () => {
    setSelectedStudent(null);
    setEditForm(null);
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('csv', file);

    try {
      setErrorMessage({ text: '', isError: false });
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/students/csv`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (res.ok && Array.isArray(data.account) && data.account.length > 0) {
        setCsvSuccessAccounts(data.account);
        fetchStudents();
      } else if (!res.ok) {
        setErrorMessage({ text: data.message || 'เกิดข้อผิดพลาด', isError: true });
      } else {
        setErrorMessage({ text: data.message || 'อัปโหลดสำเร็จ (ไม่มีบัญชีใหม่)', isError: false });
      }
    } catch (err) {
      console.error(err);
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
    a.download = `student-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchStudents = () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch(`/api/admin/students`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((result) => {
        if (result.success && Array.isArray(result.data)) setStudents(result.data);
      })
      .catch(() => { });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleDeleteClick = (e, s) => {
    if (e) e.stopPropagation();
    setDeleteConfirm(s);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const s = deleteConfirm;
    setDeleteConfirm(null);
    setErrorMessage({ text: '', isError: false });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/students/${s.studentID}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage({ text: data.message || 'เกิดข้อผิดพลาด', isError: true });
        return;
      }
      setErrorMessage({ text: data.message || 'ลบสำเร็จ', isError: false });
      fetchStudents();
      if (selectedStudent?.studentID === s.studentID) closeEditModal();
    } catch (err) {
      console.error(err);
      setErrorMessage({ text: 'เกิดข้อผิดพลาด', isError: true });
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm || !selectedStudent) return;
    setErrorMessage({ text: '', isError: false });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/students/${selectedStudent.studentID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
          address: editForm.address || null,
          status: editForm.status || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage({ text: data.message || 'เกิดข้อผิดพลาด', isError: true });
        return;
      }
      setErrorMessage({ text: data.message || 'อัปเดตสำเร็จ', isError: false });
      fetchStudents();
      closeEditModal();
    } catch (err) {
      console.error(err);
      setErrorMessage({ text: 'เกิดข้อผิดพลาด', isError: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage({ text: '', isError: false });
    setGeneratedPassword(null);

    if (!thaiFirstName.trim() || !thaiLastName.trim()) {
      setErrorMessage({ text: 'กรุณากรอกชื่อ-นามสกุล (ไทย) ให้ครบ', isError: true });
      return;
    }
    if (!isValidThaiName(thaiFirstName)) {
      setErrorMessage({ text: 'ชื่อ (ไทย) ต้องเป็นภาษาไทยเท่านั้น', isError: true });
      return;
    }
    if (!isValidThaiName(thaiLastName)) {
      setErrorMessage({ text: 'นามสกุล (ไทย) ต้องเป็นภาษาไทยเท่านั้น', isError: true });
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMessage({ text: 'กรุณากรอกชื่อ-นามสกุล (ภาษาอังกฤษ) ให้ครบ', isError: true });
      return;
    }
    if (!isValidEnglishName(firstName)) {
      setErrorMessage({ text: 'ชื่อ (ภาษาอังกฤษ) ต้องเป็นภาษาอังกฤษเท่านั้น', isError: true });
      return;
    }
    if (!isValidEnglishName(lastName)) {
      setErrorMessage({ text: 'นามสกุล (ภาษาอังกฤษ) ต้องเป็นภาษาอังกฤษเท่านั้น', isError: true });
      return;
    }
    if (!email.trim()) {
      setErrorMessage({ text: 'กรุณากรอกอีเมล', isError: true });
      return;
    }
    if (!phone.trim()) {
      setErrorMessage({ text: 'กรุณากรอกเบอร์ติดต่อ', isError: true });
      return;
    }
    if (!address.trim()) {
      setErrorMessage({ text: 'กรุณากรอกที่อยู่', isError: true });
      return;
    }
    if (!birthDate) {
      setErrorMessage({ text: 'กรุณาเลือกวันเกิด', isError: true });
      return;
    }
    if (!avatarFile) {
      setErrorMessage({ text: 'กรุณาอัพโหลดรูปโปรไฟล์', isError: true });
      return;
    }

    const formData = new FormData();
    formData.append('first_name', firstName.trim());
    formData.append('last_name', lastName.trim());
    formData.append('thai_first_name', thaiFirstName.trim());
    formData.append('thai_last_name', thaiLastName.trim());
    formData.append('gender', gender);
    formData.append('tel', phone.trim());
    formData.append('email', email.trim());
    formData.append('adress', address.trim());
    formData.append('dob', birthDate.toISOString().split('T')[0]);
    formData.append('avatar', avatarFile);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/students`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage({ text: data.message || 'เกิดข้อผิดพลาด', isError: true });
        return;
      }
      setErrorMessage({ text: data.message || 'เพิ่มนักเรียนสำเร็จ!', isError: false });
      setGeneratedPassword(data.password || null);
      setFirstName('');
      setLastName('');
      setThaiFirstName('');
      setThaiLastName('');
      setGender('M');
      setBirthDate(null);
      setPhone('');
      setEmail('');
      setAddress('');
      setAvatarFile(null);
      setPreview('/avatar-placeholder.jpg');
      fetchStudents();
    } catch (err) {
      console.error(err);
      setErrorMessage({ text: 'เกิดข้อผิดพลาด', isError: true });
    }
  };

  return (
    <>
      <NavBar />

      <div className="m-15">
        <h1 className="text-2xl font-bold mb-5">เพิ่มบัญชีผู้ใช้ - นักเรียน</h1>

        <div className="border border-[#ddd] rounded-lg p-6 shadow">
          {errorMessage.text && (
            <div
              className={`mb-4 p-3 rounded ${errorMessage.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
            >
              {errorMessage.text}
              {generatedPassword && (
                <span className="block mt-1 font-mono text-sm">รหัสผ่าน: {generatedPassword}</span>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* ชื่อ-นามสกุล (thai) */}
            <div className="flex items-center gap-6 mb-4">
              <span className="text-lg font-semibold w-32">ชื่อ-นามสกุล (ไทย) <span className="text-red-500">*</span></span>
              <input
                value={thaiFirstName}
                onChange={(e) => setThaiFirstName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder="ชื่อภาษาไทย"
                required
              />
              <input
                value={thaiLastName}
                onChange={(e) => setThaiLastName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder="นามสกุลภาษาไทย"
                required
              />
            </div>

            {/* ชื่อ-นามสกุล (eng) */}
            <div className="flex items-center gap-6 mb-6">
              <span className="text-lg font-semibold w-32">ชื่อ-นามสกุล (อังกฤษ) <span className="text-red-500">*</span></span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder="ชื่อภาษาอังกฤษ"
                required
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="border px-4 py-2 flex-1 shadow"
                placeholder="นามสกุลภาษาอังกฤษ"
                required
              />
            </div>

            {/* avatar + form */}
            <div className="flex gap-16 mt-5 items-start">
              {/* avatar */}
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

              {/* form */}
              <div className="grid grid-cols-2 gap-x-12 gap-y-6 flex-1">
                {/* เพศ */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-24">เพศ</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="border px-4 py-2 w-40 shadow"
                  >
                    <option value="M">ชาย</option>
                    <option value="F">หญิง</option>
                  </select>
                </div>

                {/* อีเมล */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-32">อีเมล <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    value={email}
                    placeholder="เช่น example@email.com"
                    onChange={(e) => setEmail(e.target.value)}
                    className="border px-4 py-2 flex-1 shadow"
                    required
                  />
                </div>

                {/* เบอร์ */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-32">เบอร์ติดต่อ <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={phone}
                    placeholder="เช่น 0901234567"
                    onChange={(e) => setPhone(e.target.value)}
                    className="border px-4 py-2 flex-1 shadow"
                    required
                  />
                </div>

                {/* ที่อยู่ */}
                <div className="flex items-center gap-4">
                  <label className="text-lg font-semibold w-32">ที่อยู่ <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={address}
                    placeholder="ที่อยู่"
                    onChange={(e) => setAddress(e.target.value)}
                    className="border px-4 py-2 flex-1 shadow"
                    required
                  />
                </div>

                {/* วันเกิด */}
                <div className="flex items-center gap-4 col-span-2">
                  <div className="flex items-center gap-4 col-span-2">
                    <label className="text-lg font-semibold w-40">
                      วัน/เดือน/ปี เกิด <span className="text-red-500">*</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setShowCalendar(true)}
                      className="border px-4 py-2 w-60 text-left shadow rounded"
                    >
                      {birthDate
                        ? birthDate.toLocaleDateString('th-TH')
                        : 'เลือกวันเกิด'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8 p-5">
              <button
                type="submit"
                className="bg-orange-500 text-white px-10 py-3 text-lg rounded hover:bg-orange-600"
              >
                เพิ่มบัญชีนักเรียน
              </button>
              <div className="divider lg:divider-horizontal">หรือ</div>
              <label className="bg-orange-500 text-white px-10 py-3 text-lg rounded hover:bg-orange-600 cursor-pointer inline-block">
                อัพโหลดไฟล์ค่าที่คั่นด้วยจุลภาค
                <input type="file" id="csv-upload" accept=".csv" className="hidden" onChange={handleCSV} />
              </label>
            </div>
            <p className="text-center text-sm text-gray-500 mt-2">
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent('\uFEFFfirst_name,last_name,thai_first_name,thai_last_name,gender,dob,tel,email,address\nTanakrit,Incham,ธนกฤต,อินทร์ฉ่ำ,M,2549-02-12,0812345678,67070061@kmitl.ac.th,123 Example Rd')}`}
                download="student-import-template.csv"
                className="text-blue-600 hover:underline"
              >
                ดาวน์โหลดตัวอย่าง CSV
              </a>
            </p>
          </form>
        </div>
      </div>

      <div className="divider" />
      <div className="m-15">
        <h1 className="text-2xl font-bold mb-5">ข้อมูลนักเรียนทั้งหมด</h1>
        <div className="border border-[#ddd] rounded-lg overflow-hidden shadow">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-3 border-b">ลำดับที่</th>
                <th className="text-left p-3 border-b">รหัสนักเรียน</th>
                <th className="text-left p-3 border-b">ชื่อ-นามสกุล</th>
                <th className="text-left p-3 border-b">เพศ</th>
                <th className="text-left p-3 border-b">อีเมล</th>
                <th className="text-left p-3 border-b">เบอร์โทร</th>
                <th className="text-left p-3 border-b">ที่อยู่</th>
                <th className="text-left p-3 border-b">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500 border-b">
                    ไม่พบข้อมูลนักเรียน
                  </td>
                </tr>
              ) : (
                students.map((s, i) => (
                  <tr
                    key={s.studentID}
                    className="border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                    onClick={() => openEditModal(s)}
                  >
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3">{s.studentCode || '-'}</td>
                    <td className="p-3">
                      {(s.thai_first_name || s.thai_last_name)
                        ? `${s.thai_first_name || ''} ${s.thai_last_name || ''}`.trim()
                        : `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'ไม่มีข้อมูล'}
                    </td>
                    <td className="p-3">
                      {s.gender === 'M' ? 'ชาย' : s.gender === 'F' ? 'หญิง' : s.gender || '-'}
                    </td>
                    <td className="p-3 max-w-xs truncate" title={s.email}>{s.email || '-'}</td>
                    <td className="p-3">{s.tel || '-'}</td>
                    <td className="p-3 max-w-xs truncate" title={s.address}>
                      {s.address || '-'}
                    </td>
                    <td className="p-3">
                      {s.status === 'STUDYING' ? 'กำลังเรียน' : s.status === 'GRADUATED' ? 'จบการศึกษา' : s.status || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal แก้ข้อมูลนักเรียน */}
      {editForm && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">แก้ไขข้อมูลนักเรียน</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล (ไทย) <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                  required
                    type="text"
                    className="border px-3 py-2 flex-1 rounded"
                    placeholder="ชื่อ"
                    value={editForm.thai_first_name || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, thai_first_name: e.target.value }))}
                  />
                  <input
                  required
                    type="text"
                    className="border px-3 py-2 flex-1 rounded"
                    placeholder="นามสกุล"
                    value={editForm.thai_last_name || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, thai_last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ-นามสกุล (English) <span className="text-red-500">*</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    className="border px-3 py-2 flex-1 rounded"
                    placeholder="First name"
                    value={editForm.first_name || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                  />
                  <input
                  required
                    type="text"
                    className="border px-3 py-2 flex-1 rounded"
                    placeholder="Last name"
                    value={editForm.last_name || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เพศ <span className="text-red-500">*</span></label>
                <select
                required
                  className="border px-3 py-2 w-full rounded"
                  value={editForm.gender || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">-- เลือก --</option>
                  <option value="M">ชาย</option>
                  <option value="F">หญิง</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">วันเกิด <span className="text-red-500">*</span></label>
                <input
                required
                  type="date"
                  className="border px-3 py-2 w-full rounded"
                  value={editForm.dob || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, dob: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร <span className="text-red-500">*</span></label>
                <input
                required
                  type="tel"
                  className="border px-3 py-2 w-full rounded"
                  value={editForm.tel || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, tel: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล <span className="text-red-500">*</span></label>
                <input
                required
                  type="email"
                  className="border px-3 py-2 w-full rounded"
                  placeholder="เช่น example@email.com"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ที่อยู่ <span className="text-red-500">*</span></label>
                <input
                required
                  type="text"
                  className="border px-3 py-2 w-full rounded"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ <span className="text-red-500">*</span></label>
                <select
                required
                  className="border px-3 py-2 w-full rounded"
                  value={editForm.status || ''}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="STUDYING">กำลังเรียน</option>
                  <option value="GRADUATED">จบการศึกษา</option>
                </select>
              </div>
              <div className="modal-action">
                <button type="submit" className="btn bg-orange-500 text-white border-none hover:bg-orange-600">
                  บันทึก
                </button>
                <button type="button" className="btn btn-ghost" onClick={closeEditModal}>
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="btn btn-ghost text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => handleDeleteClick(null, selectedStudent)}
                >
                  ลบ
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={closeEditModal} aria-hidden />
        </div>
      )}

      {/* ยืนยัน CSV */}
      {csvSuccessAccounts && csvSuccessAccounts.length > 0 && (
        <div className="modal modal-open">
          <div className="modal-box max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-success">อัปโหลดสำเร็จ</h2>
            <p className="text-base-content/70 mt-1">สร้างบัญชีนักเรียนแล้ว {csvSuccessAccounts.length} บัญชี</p>
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
      {/* ยืนยันลบ */}
      {deleteConfirm && (
        <div className="modal modal-open">
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">ยืนยันการลบ</h3>
            <p className="py-4">
              ต้องการลบนักเรียน {(deleteConfirm.thai_first_name || deleteConfirm.thai_last_name) ? `${deleteConfirm.thai_first_name || ''} ${deleteConfirm.thai_last_name || ''}`.trim() : deleteConfirm.studentCode || deleteConfirm.studentID} ใช่หรือไม่?
            </p>
            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>ยกเลิก</button>
              <button type="button" className="btn btn-error text-white" onClick={handleDeleteConfirm}>ยืนยัน</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)} aria-hidden />
        </div>
      )}
      {showCalendar && (
        <CalendarModal
          value={birthDate}
          onClose={() => setShowCalendar(false)}
          onSelect={(date) => setBirthDate(date)}
        />
      )}
    </>
  );
}

export default A_AddStudent;
