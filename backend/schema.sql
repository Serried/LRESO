-- db สำหรับ test
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS User (
  userID INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL,
  refID INTEGER,
  status TEXT DEFAULT 'ACTIVE',
  avatar TEXT,
  thai_first_name TEXT,
  thai_last_name TEXT,
  gender TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Teacher (
  teacherID INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  thai_first_name TEXT,
  thai_last_name TEXT,
  gender TEXT,
  dob TEXT,
  tel TEXT,
  email TEXT,
  department TEXT,
  status TEXT DEFAULT 'ACTIVE'
);

CREATE TABLE IF NOT EXISTS Student (
  studentID INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT,
  last_name TEXT,
  thai_first_name TEXT,
  thai_last_name TEXT,
  gender TEXT,
  dob TEXT,
  tel TEXT,
  address TEXT,
  email TEXT,
  status TEXT DEFAULT 'STUDYING'
);

CREATE TABLE IF NOT EXISTS Classroom (
  classID INTEGER PRIMARY KEY AUTOINCREMENT,
  className TEXT NOT NULL,
  plan TEXT,
  responsibleTeacherID INTEGER REFERENCES Teacher(teacherID)
);

CREATE TABLE IF NOT EXISTS Subject (
  subjectID INTEGER PRIMARY KEY AUTOINCREMENT,
  subjectName TEXT NOT NULL,
  group_name TEXT,
  credit REAL DEFAULT 1.0
);

CREATE TABLE IF NOT EXISTS StudentClass (
  studentID INTEGER NOT NULL REFERENCES Student(studentID),
  classID INTEGER NOT NULL REFERENCES Classroom(classID),
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  PRIMARY KEY (studentID, classID, year, term)
);

CREATE TABLE IF NOT EXISTS ClassroomSubject (
  classID INTEGER NOT NULL REFERENCES Classroom(classID),
  subjectID INTEGER NOT NULL REFERENCES Subject(subjectID),
  teacherID INTEGER REFERENCES Teacher(teacherID),
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  hours INTEGER DEFAULT 0,
  semester INTEGER,
  academicYear TEXT,
  isOpen INTEGER DEFAULT 1,
  maxStudent INTEGER,
  enrollStart TEXT,
  enrollEnd TEXT,
  PRIMARY KEY (classID, subjectID, year, term)
);

CREATE TABLE IF NOT EXISTS ClassSchedule (
  classID INTEGER NOT NULL REFERENCES Classroom(classID),
  subjectID INTEGER NOT NULL REFERENCES Subject(subjectID),
  teacherID INTEGER REFERENCES Teacher(teacherID),
  dayOfWeek INTEGER NOT NULL,
  period INTEGER NOT NULL,
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  PRIMARY KEY (classID, year, term, dayOfWeek, period)
);

CREATE TABLE IF NOT EXISTS Announcement (
  announceID INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  content TEXT,
  createdBy INTEGER REFERENCES User(userID),
  targetRole TEXT DEFAULT 'ALL',
  expireAt TEXT,
  category TEXT DEFAULT 'GENERAL',
  isPinned INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS Ticket (
  ticketID INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  topic TEXT NOT NULL,
  content TEXT,
  userID INTEGER REFERENCES User(userID),
  status TEXT DEFAULT 'OPEN',
  attachment TEXT,
  closeComment TEXT,
  createdAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ScoreComponent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  classID INTEGER NOT NULL REFERENCES Classroom(classID),
  subjectID INTEGER NOT NULL REFERENCES Subject(subjectID),
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  name TEXT NOT NULL,
  weight REAL NOT NULL,
  sortOrder INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Score (
  studentID INTEGER NOT NULL REFERENCES Student(studentID),
  classID INTEGER NOT NULL REFERENCES Classroom(classID),
  subjectID INTEGER NOT NULL REFERENCES Subject(subjectID),
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,
  componentID INTEGER NOT NULL REFERENCES ScoreComponent(id),
  score REAL,
  PRIMARY KEY (studentID, classID, subjectID, year, term, componentID)
);
