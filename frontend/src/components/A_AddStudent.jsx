import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function A_AddStudent() {
    const [activeTab, setActiveTab] = useState('teacher');
    const [generatedPassword, setGeneratedPassword] = useState(null);
  
    // Teacher form
    const [teacherForm, setTeacherForm] = useState({
      first_name: '', last_name: '', gender: '', dob: '', tel: '', email: '', department: '',
      username: '', password: ''
    });
    const [teacherMessage, setTeacherMessage] = useState({ text: '', isError: false });
  
    // Student form (Thai + English names)
    const [studentForm, setStudentForm] = useState({
      first_name: '', last_name: '', thai_first_name: '', thai_last_name: '',
      gender: '', dob: '', tel: '', adress: '', username: '', password: ''
    });
    const [studentMessage, setStudentMessage] = useState({ text: '', isError: false });
  
    const handleCreateTeacher = async (e) => {
      e.preventDefault();
      setTeacherMessage({ text: '', isError: false });
      setGeneratedPassword(null);
      try {
        const formData = new FormData();
        Object.entries(teacherForm).forEach(([k, v]) => { if (v) formData.append(k, v); });
        const avatarFile = e.target.querySelector('input[name="avatar"]')?.files?.[0];
        if (avatarFile) formData.append('avatar', avatarFile);
  
        const res = await fetch('http://localhost:3000/api/admin/teachers', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          setTeacherMessage({ text: data.message, isError: false });
          setGeneratedPassword(data.password || null);
          setTeacherForm({ first_name: '', last_name: '', gender: '', dob: '', tel: '', email: '', department: '', username: '', password: '' });
        } else {
          setTeacherMessage({ text: data.message || 'Failed', isError: true });
        }
      } catch (err) {
        setTeacherMessage({ text: 'Network error', isError: true });
      }
    };
  
    const handleCreateStudent = async (e) => {
      e.preventDefault();
      setStudentMessage({ text: '', isError: false });
      setGeneratedPassword(null);
      try {
        const formData = new FormData();
        Object.entries(studentForm).forEach(([k, v]) => { if (v) formData.append(k, v); });
        const avatarFile = e.target.querySelector('input[name="avatar"]')?.files?.[0];
        if (avatarFile) formData.append('avatar', avatarFile);
  
        const res = await fetch('http://localhost:3000/api/admin/students', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok) {
          setStudentMessage({ text: data.message, isError: false });
          setStudentForm({ first_name: '', last_name: '', thai_first_name: '', thai_last_name: '', gender: '', dob: '', tel: '', adress: '', username: '', password: '' });
          setGeneratedPassword(data.password || null);
        } else {
          setStudentMessage({ text: data.message || 'Failed', isError: true });
        }
      } catch (err) {
        setStudentMessage({ text: 'Network error', isError: true });
      }
    };
  
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <div className="flex gap-2 mb-6">
          <button
            type="button"
            className={`btn ${activeTab === 'teacher' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('teacher')}
          >
            Create Teacher
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'student' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('student')}
          >
            Create Student
          </button>
        </div>
  
        {activeTab === 'teacher' && (
          <form onSubmit={handleCreateTeacher} className="space-y-4 border p-6 rounded-lg">
            <h2 className="text-lg font-semibold">Create Teacher</h2>
            {teacherMessage.text && (
              <div className={`p-3 rounded ${teacherMessage.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {teacherMessage.text}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First name" value={teacherForm.first_name} onChange={e => setTeacherForm(f => ({ ...f, first_name: e.target.value }))} className="input input-bordered w-full" required />
              <input type="text" placeholder="Last name" value={teacherForm.last_name} onChange={e => setTeacherForm(f => ({ ...f, last_name: e.target.value }))} className="input input-bordered w-full" required />
              <input type="text" placeholder="Gender (M, F)" value={teacherForm.gender} onChange={e => setTeacherForm(f => ({ ...f, gender: e.target.value }))} className="input input-bordered w-full" />
              <input type="date" placeholder="DOB" value={teacherForm.dob} onChange={e => setTeacherForm(f => ({ ...f, dob: e.target.value }))} className="input input-bordered w-full" />
              <input type="tel" placeholder="Phone" value={teacherForm.tel} onChange={e => setTeacherForm(f => ({ ...f, tel: e.target.value }))} className="input input-bordered w-full" />
              <input type="email" placeholder="Email" value={teacherForm.email} onChange={e => setTeacherForm(f => ({ ...f, email: e.target.value }))} className="input input-bordered w-full" required />
              <input type="text" placeholder="Department" value={teacherForm.department} onChange={e => setTeacherForm(f => ({ ...f, department: e.target.value }))} className="input input-bordered w-full" />
              <div className="col-span-2">
                <label>Avatar</label>
                <input type="file" name="avatar" accept="image/jpeg,image/png,image/gif,image/webp" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create Teacher</button>
          </form>
        )}
  
        {activeTab === 'student' && (
          <form onSubmit={handleCreateStudent} className="space-y-4 border p-6 rounded-lg">
            <h2 className="text-lg font-semibold">Create Student</h2>
            {studentMessage.text && (
              <div className={`p-3 rounded ${studentMessage.isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                {studentMessage.text}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 text-sm font-medium text-gray-600">ชื่อ-นามสกุล (ไทย)</div>
              <input type="text" placeholder="ชื่อ" value={studentForm.thai_first_name} onChange={e => setStudentForm(f => ({ ...f, thai_first_name: e.target.value }))} className="input input-bordered w-full" />
              <input type="text" placeholder="นามสกุล" value={studentForm.thai_last_name} onChange={e => setStudentForm(f => ({ ...f, thai_last_name: e.target.value }))} className="input input-bordered w-full" />
              <div className="col-span-2 text-sm font-medium text-gray-600 mt-2">ชื่อ-นามสกุล (English)</div>
              <input type="text" placeholder="First name" value={studentForm.first_name} onChange={e => setStudentForm(f => ({ ...f, first_name: e.target.value }))} className="input input-bordered w-full" required />
              <input type="text" placeholder="Last name" value={studentForm.last_name} onChange={e => setStudentForm(f => ({ ...f, last_name: e.target.value }))} className="input input-bordered w-full" required />
              <input type="text" placeholder="Gender (M, F)" value={studentForm.gender} onChange={e => setStudentForm(f => ({ ...f, gender: e.target.value }))} className="input input-bordered w-full" />
              <input type="date" placeholder="DOB" value={studentForm.dob} onChange={e => setStudentForm(f => ({ ...f, dob: e.target.value }))} className="input input-bordered w-full" />
              <input type="tel" placeholder="Phone" value={studentForm.tel} onChange={e => setStudentForm(f => ({ ...f, tel: e.target.value }))} className="input input-bordered w-full" />
              <input type="text" placeholder="Address" value={studentForm.adress} onChange={e => setStudentForm(f => ({ ...f, adress: e.target.value }))} className="input input-bordered w-full col-span-2" />
              <div className="col-span-2">
                <label>Avatar</label>
                <input type="file" name="avatar" accept="image/jpeg,image/png,image/gif,image/webp" required />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Create Student</button>
          </form>
        )}
  
        <Link to="/login" className="block mt-6 text-blue-600 hover:underline">Back to Login</Link>
      </div>
    );
}

export default A_AddStudent