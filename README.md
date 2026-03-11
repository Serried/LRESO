# Classora Project

Classora คือเว็บแอปพลิเคชันสำหรับระบบจัดการข้อมูลต่าง ๆ ภายในโรงเรียน

## Tech Stack
- **Frontend**: React (Vite), TailwindCSS, daisyUI, React Router
- **Backend**: Node.js, Express.js, JWT สำหรับ Authentication
- **Database**: SQLite (ผ่าน `better-sqlite3`) และรองรับการเชื่อมต่อกับ AWS RDS 

---

##  Installations

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (เวอร์ชัน 18 ขึ้นไป)
- Git

### 2. การตั้งค่า Environment Variables
**สร้างไฟล์ `.env`** ในโฟลเดอร์ `backend` และตั้งค่าการเชื่อมต่อฐานข้อมูลตามนี้:

```env
JWT_SECRET= your_secret_key
```

---

### 3. Quick Start
โปรเจกต์นี้เตรียมสคริปต์สำหรับการติดตั้งและรันทั้ง Backend และ Frontend ในคำสั่งเดียว 

**สำหรับ Windows:**  
เปิด Terminal แล้วรันคำสั่ง (หรือ Double click ที่ไฟล์)
```cmd
.\run.bat
```

**สำหรับ Mac / Linux:**  
```bash
chmod +x run.sh
./run.sh
```
สคริปต์จะทำการ:
1. สร้างไฟล์ `.env` ค่าเริ่มต้นให้ (ถ้ายังไม่มี)
2. ติดตั้ง Dependencies (`npm install`) ทั้งในฝั่ง backend และ frontend
3. รัน Backend ด้วย nodemon 
4. รัน Frontend ด้วยโหมด Dev
5. เปิดเบราว์เซอร์อัตโนมัติที่ `http://localhost:5173`

---

### 4. Manual Setup

หากไม่ได้ใช้ `run.bat` หรือ `run.sh` สามารถรันแยกทีละส่วนได้ดังนี้:

**รัน Backend:**
```bash
cd backend
npm install
npm start
```
*(Server จะคอยรับ API Request จาก Frontend)*

**รัน Frontend:**
```bash
cd frontend
npm install
npm run dev
```
*(เข้าถึงหน้าเว็บได้จากลิงก์ที่ Vite แสดงใน Terminal เช่น `http://localhost:5173`)*
