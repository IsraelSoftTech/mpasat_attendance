import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth, database } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { 
  FiBarChart, 
  FiUsers, 
  FiUserCheck, 
  FiCheckSquare, 
  FiTrendingUp,
  FiLogOut,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiMenu,
  FiPrinter,
  FiCheck
} from 'react-icons/fi';
import { ref, push, set, update, remove, onValue } from 'firebase/database';
import Logo from '../assets/logo.png';
import './Dashboard.css';

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [userEmail, setUserEmail] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  // Attendance states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceType, setAttendanceType] = useState(''); // 'students' | 'teachers'
  const [attendanceForm, setAttendanceForm] = useState({
    classId: '',
    date: '', // YYYY-MM-DD
    time: '', // HH:mm
    teacherId: '',
    status: 'P' // for teacher attendance only
  });
  const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: 'P' | 'A' }

  // Prefill student attendance when selecting date/time/class
  useEffect(() => {
    if (attendanceType === 'students' && attendanceForm.classId && attendanceForm.date && attendanceForm.time) {
      const path = `attendance/students/${attendanceForm.date}/${attendanceForm.classId}/${attendanceForm.time}`;
      const r = ref(database, path);
      return onValue(r, (snap) => {
        const data = snap.val() || {};
        setAttendanceMap(data);
      });
    }
    return undefined;
  }, [attendanceType, attendanceForm.classId, attendanceForm.date, attendanceForm.time]);

  // Prefill teacher attendance
  useEffect(() => {
    if (attendanceType === 'teachers' && attendanceForm.teacherId && attendanceForm.classId && attendanceForm.date && attendanceForm.time) {
      const path = `attendance/teachers/${attendanceForm.date}/${attendanceForm.classId}/${attendanceForm.time}/${attendanceForm.teacherId}`;
      const r = ref(database, path);
      return onValue(r, (snap) => {
        const data = snap.val();
        if (data === 'P' || data === 'A') {
          setAttendanceForm(prev => ({ ...prev, status: data }));
        }
      });
    }
    return undefined;
  }, [attendanceType, attendanceForm.teacherId, attendanceForm.classId, attendanceForm.date, attendanceForm.time]);

  const openAttendance = () => {
    setAttendanceType('');
    setAttendanceForm({ classId: '', date: '', time: '', teacherId: '', status: 'P' });
    setAttendanceMap({});
    setShowAttendanceModal(true);
  };

  const saveStudentsAttendance = async () => {
    const { classId, date, time } = attendanceForm;
    if (!classId || !date || !time) {
      alert('Please select class, date and time');
      return;
    }
    const updates = {};
    Object.entries(attendanceMap).forEach(([studentId, status]) => {
      if (status === 'P' || status === 'A') {
        updates[`attendance/students/${date}/${classId}/${time}/${studentId}`] = status;
      }
    });
    if (Object.keys(updates).length === 0) {
      alert('No attendance marked');
      return;
    }
    try {
      await update(ref(database), updates);
      showSuccess('Students attendance saved');
      setShowAttendanceModal(false);
    } catch (e) {
      console.error('Save students attendance failed:', e);
    }
  };

  const saveTeacherAttendance = async () => {
    const { teacherId, classId, date, time, status } = attendanceForm;
    if (!teacherId || !classId || !date || !time || !status) {
      alert('Please complete all fields');
      return;
    }
    try {
      await set(ref(database, `attendance/teachers/${date}/${classId}/${time}/${teacherId}`), status);
      showSuccess('Teacher attendance saved');
      setShowAttendanceModal(false);
    } catch (e) {
      console.error('Save teacher attendance failed:', e);
    }
  };

  // Reports state
  const [reportDate, setReportDate] = useState('');
  const [reportStudentData, setReportStudentData] = useState({}); // { classId: { time: { studentId: 'P'|'A' } } }
  const [reportTeacherData, setReportTeacherData] = useState({}); // { classId: { time: { teacherId: 'P'|'A' } } }

  useEffect(() => {
    if (!reportDate) return;
    const stdRef = ref(database, `attendance/students/${reportDate}`);
    const tchRef = ref(database, `attendance/teachers/${reportDate}`);

    const offStd = onValue(stdRef, (snap) => {
      setReportStudentData(snap.val() || {});
    });
    const offTch = onValue(tchRef, (snap) => {
      setReportTeacherData(snap.val() || {});
    });
    return () => { offStd(); offTch(); };
  }, [reportDate]);

  // Helpers for reports
  const getTimesFromClassBucket = (bucket) => {
    if (!bucket) return [];
    return Object.keys(bucket).sort();
  };

  const calculateMinutes = (marks) => {
    // marks: array of 'P' | 'A'
    const minutesPerMark = 50;
    let presentCount = 0;
    let absentCount = 0;
    marks.forEach(m => {
      if (m === 'P') presentCount += 1; else if (m === 'A') absentCount += 1;
    });
    return {
      presentMinutes: presentCount * minutesPerMark,
      absentMinutes: absentCount * minutesPerMark,
      presentCount,
      absentCount
    };
  };

  const calculateTotalsForBucket = (bucket) => {
    // bucket: { classId: { time: { entityId: 'P'|'A' } } }
    let presentCount = 0;
    let absentCount = 0;
    Object.values(bucket || {}).forEach(timeBucket => {
      Object.values(timeBucket || {}).forEach(entityMap => {
        Object.values(entityMap || {}).forEach(mark => {
          if (mark === 'P') presentCount += 1; else if (mark === 'A') absentCount += 1;
        });
      });
    });
    const minutesPerMark = 50;
    return {
      presentCount,
      absentCount,
      presentMinutes: presentCount * minutesPerMark,
      absentMinutes: absentCount * minutesPerMark,
      totalSessions: presentCount + absentCount
    };
  };

  // Form states for student
  const [studentForm, setStudentForm] = useState({
    fullName: '',
    sex: '',
    dateOfBirth: '',
    placeOfBirth: '',
    classId: ''
  });

  // Form states for class
  const [classForm, setClassForm] = useState({
    className: '',
    abbreviation: ''
  });

  // Form states for teacher
  const [teacherForm, setTeacherForm] = useState({
    name: '',
    sex: '',
    contact: '',
    classesTaught: []
  });

  useEffect(() => {
    // Get user email from localStorage
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    }
  }, []);

  useEffect(() => {
    // Subscribe to classes and students and teachers
    const classesRef = ref(database, 'classes');
    const studentsRef = ref(database, 'students');
    const teachersRef = ref(database, 'teachers');

    const offClasses = onValue(classesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
        : [];
      setClasses(list);
    });

    const offStudents = onValue(studentsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
        : [];
      setStudents(list);
    });

    const offTeachers = onValue(teachersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
        : [];
      setTeachers(list);
    });

    return () => {
      offClasses();
      offStudents();
      offTeachers();
    };
  }, []);

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 2500);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('userEmail');
      navigate('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDeleteAllAttendance = async () => {
    const confirmed = window.confirm('Are you sure you want to delete ALL attendance records? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await remove(ref(database, 'attendance'));
      showSuccess('All attendance records deleted');
    } catch (e) {
      console.error('Delete all attendance failed:', e);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMenuClick = (menu) => {
    setActiveMenu(menu);
    setSidebarOpen(false); // Close sidebar on mobile after menu selection
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({
      fullName: '',
      sex: '',
      dateOfBirth: '',
      placeOfBirth: '',
      classId: ''
    });
    setShowAddStudentModal(true);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setStudentForm({
      fullName: student.fullName,
      sex: student.sex,
      dateOfBirth: student.dateOfBirth,
      placeOfBirth: student.placeOfBirth,
      classId: student.classId
    });
    setShowAddStudentModal(true);
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await remove(ref(database, `students/${studentId}`));
        showSuccess('Student deleted successfully');
      } catch (e) {
        console.error('Delete student failed:', e);
      }
    }
  };

  const handleSaveStudent = async () => {
    if (!studentForm.fullName || !studentForm.sex || !studentForm.dateOfBirth || !studentForm.placeOfBirth || !studentForm.classId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingStudent) {
        await update(ref(database, `students/${editingStudent.id}`), {
          ...studentForm,
          updatedAt: new Date().toISOString()
        });
        showSuccess('Student updated successfully');
      } else {
        const newRef = push(ref(database, 'students'));
        await set(newRef, {
          ...studentForm,
          id: newRef.key,
          createdAt: new Date().toISOString()
        });
        showSuccess('Student created successfully');
      }

      setShowAddStudentModal(false);
      setStudentForm({
        fullName: '',
        sex: '',
        dateOfBirth: '',
        placeOfBirth: '',
        classId: ''
      });
      setEditingStudent(null);
    } catch (e) {
      console.error('Save student failed:', e);
    }
  };

  const handleAddClass = () => {
    setEditingClass(null);
    setClassForm({
      className: '',
      abbreviation: ''
    });
    setShowAddClassModal(true);
  };

  const handleEditClass = (classItem) => {
    setEditingClass(classItem);
    setClassForm({
      className: classItem.className,
      abbreviation: classItem.abbreviation
    });
    setShowAddClassModal(true);
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        await remove(ref(database, `classes/${classId}`));
        showSuccess('Class deleted successfully');
      } catch (e) {
        console.error('Delete class failed:', e);
      }
    }
  };

  const handleSaveClass = async () => {
    if (!classForm.className || !classForm.abbreviation) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingClass) {
        await update(ref(database, `classes/${editingClass.id}`), {
          ...classForm,
          updatedAt: new Date().toISOString()
        });
        showSuccess('Class updated successfully');
      } else {
        const newRef = push(ref(database, 'classes'));
        await set(newRef, {
          ...classForm,
          id: newRef.key,
          createdAt: new Date().toISOString()
        });
        showSuccess('Class created successfully');
      }

      setShowAddClassModal(false);
      setClassForm({
        className: '',
        abbreviation: ''
      });
      setEditingClass(null);
    } catch (e) {
      console.error('Save class failed:', e);
    }
  };

  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setTeacherForm({ name: '', sex: '', contact: '', classesTaught: [] });
    setShowAddTeacherModal(true);
  };

  const handleEditTeacher = (teacher) => {
    setEditingTeacher(teacher);
    setTeacherForm({
      name: teacher.name,
      sex: teacher.sex,
      contact: teacher.contact,
      classesTaught: Array.isArray(teacher.classesTaught) ? teacher.classesTaught : []
    });
    setShowAddTeacherModal(true);
  };

  const handleDeleteTeacher = async (teacherId) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await remove(ref(database, `teachers/${teacherId}`));
        showSuccess('Teacher deleted successfully');
      } catch (e) {
        console.error('Delete teacher failed:', e);
      }
    }
  };

  const handleSaveTeacher = async () => {
    if (!teacherForm.name || !teacherForm.sex || !teacherForm.contact) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      if (editingTeacher) {
        await update(ref(database, `teachers/${editingTeacher.id}`), {
          ...teacherForm,
          updatedAt: new Date().toISOString()
        });
        showSuccess('Teacher updated successfully');
      } else {
        const newRef = push(ref(database, 'teachers'));
        await set(newRef, {
          ...teacherForm,
          id: newRef.key,
          createdAt: new Date().toISOString()
        });
        showSuccess('Teacher created successfully');
      }

      setShowAddTeacherModal(false);
      setEditingTeacher(null);
      setTeacherForm({ name: '', sex: '', contact: '', classesTaught: [] });
    } catch (e) {
      console.error('Save teacher failed:', e);
    }
  };

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.className : 'Unknown Class';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrintClass = (classItem, classStudents) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = classStudents.map((student, index) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${index + 1}</td>
        <td style="padding:8px;border:1px solid #ddd;">${student.fullName}</td>
        <td style="padding:8px;border:1px solid #ddd;">${student.sex}</td>
        <td style="padding:8px;border:1px solid #ddd;">${formatDate(student.dateOfBirth)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Class List - ${classItem.className}</title>
          <style>
            body { font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            .header { text-align:center; margin-bottom: 20px; }
            .header img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
            .title { color: #1e3a8a; margin: 10px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background:#1e3a8a; color:#fff; padding:10px; border:1px solid #1e3a8a; text-align:left; }
            td { padding:8px; border:1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${Logo}" />
            <h2 class="title">MPASAT CLASS LIST FOR ${classItem.className.toUpperCase()} - 2025/2026 ACADEMIC YEAR</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Full Names</th>
                <th>Sex</th>
                <th>Date of Birth</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 300); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintTeachers = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = teachers.map((t, index) => {
      const classNames = (t.classesTaught || []).map(id => {
        const c = classes.find(cc => cc.id === id);
        return c ? c.className : id;
      }).join(', ');
      return `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;">${index + 1}</td>
          <td style="padding:8px;border:1px solid #ddd;">${t.name}</td>
          <td style="padding:8px;border:1px solid #ddd;">${t.sex}</td>
          <td style="padding:8px;border:1px solid #ddd;">${t.contact || ''}</td>
          <td style="padding:8px;border:1px solid #ddd;">${classNames}</td>
        </tr>
      `;
    }).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Teachers List</title>
          <style>
            body { font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            .header { text-align:center; margin-bottom: 20px; }
            .header img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
            .title { color: #1e3a8a; margin: 10px 0 0 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background:#1e3a8a; color:#fff; padding:10px; border:1px solid #1e3a8a; text-align:left; }
            td { padding:8px; border:1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${Logo}" />
            <h2 class="title">MPASAT TEACHERS LIST - 2025/2026 ACADEMIC YEAR</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Teacher Name</th>
                <th>Sex</th>
                <th>Contact</th>
                <th>Classes Taught</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 300); };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <div className="content-section">
            <h2>Dashboard</h2>
            <p>Welcome to MPASAT Attendance Management System</p>
            <div className="dashboard-stats">
              <div className="stat-card">
                <h3>Total Students</h3>
                <p className="stat-number">{students.length}</p>
              </div>
              <div className="stat-card">
                <h3>Total Classes</h3>
                <p className="stat-number">{classes.length}</p>
              </div>
              <div className="stat-card">
                <h3>Today's Attendance</h3>
                <p className="stat-number">0%</p>
              </div>
            </div>
          </div>
        );
      case 'students':
        return (
          <div className="content-section">
            <div className="students-header">
              <h2>Students Management</h2>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <button className="add-student-btn" onClick={handleAddStudent}>
                  <FiPlus /> Add Student
                </button>
                <button className="add-student-btn" onClick={handleAddClass}>
                  <FiPlus /> Add Class
                </button>
              </div>
            </div>

            {classes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No classes available. Please add classes first to register students.</p>
                <button className="add-student-btn" onClick={handleAddClass} style={{ marginTop: '20px' }}>
                  <FiPlus /> Add Class
                </button>
              </div>
            ) : (
              <>
                {classes.sort((a, b) => a.className.localeCompare(b.className)).map(classItem => {
                  const classStudents = students.filter(student => student.classId === classItem.id);
                  
                  return (
                    <div key={classItem.id} style={{ marginBottom: '40px' }}>
                      <div className="class-list-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'15px', flexWrap:'wrap' }}>
                        <div>
                          <h2>MPASAT CLASS LIST FOR {classItem.className.toUpperCase()}</h2>
                          <p>2025/2026 ACADEMIC YEAR</p>
                        </div>
                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                          <button className="print-btn" onClick={() => handlePrintClass(classItem, classStudents)}>
                            <FiPrinter /> Print Class List
                          </button>
                          <button className="edit-btn" onClick={() => handleEditClass(classItem)}>
                            <FiEdit2 />
                          </button>
                          <button className="delete-btn" onClick={() => handleDeleteClass(classItem.id)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                      
                      {classStudents.length === 0 ? (
                        <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                          No students registered in this class yet.
                        </p>
                      ) : (
                        <table className="students-table">
                          <thead>
                            <tr>
                              <th>S/N</th>
                              <th>Full Names</th>
                              <th>Sex</th>
                              <th>Date of Birth</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classStudents.map((student, index) => (
                              <tr key={student.id}>
                                <td>{index + 1}</td>
                                <td>{student.fullName}</td>
                                <td>{student.sex}</td>
                                <td>{formatDate(student.dateOfBirth)}</td>
                                <td>
                                  <div className="action-buttons">
                                    <button 
                                      className="edit-btn" 
                                      onClick={() => handleEditStudent(student)}
                                    >
                                      <FiEdit2 />
                                    </button>
                                    <button 
                                      className="delete-btn" 
                                      onClick={() => handleDeleteStudent(student.id)}
                                    >
                                      <FiTrash2 />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      case 'teachers':
        return (
          <div className="content-section">
            <div className="students-header">
              <h2>Teachers Management</h2>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <button className="add-student-btn" onClick={handleAddTeacher}>
                  <FiPlus /> Add Teacher
                </button>
                <button className="print-btn" onClick={handlePrintTeachers}>
                  <FiPrinter /> Print Teachers
                </button>
              </div>
            </div>

            {teachers.length === 0 ? (
              <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No teachers added yet.</p>
            ) : (
              <table className="students-table">
                <thead>
                  <tr>
                    <th>S/N</th>
                    <th>Teacher Name</th>
                    <th>Sex</th>
                    <th>Contact</th>
                    <th>Classes Taught</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t, index) => (
                    <tr key={t.id}>
                      <td>{index + 1}</td>
                      <td>{t.name}</td>
                      <td>{t.sex}</td>
                      <td>{t.contact}</td>
                      <td>{(t.classesTaught || []).map(getClassName).join(', ')}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="edit-btn" onClick={() => handleEditTeacher(t)}>
                            <FiEdit2 />
                          </button>
                          <button className="delete-btn" onClick={() => handleDeleteTeacher(t.id)}>
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      case 'attendance':
        return (
          <div className="content-section">
            <h2>Attendance</h2>
            <p>Record attendance for students and teachers.</p>
            <div style={{ display:'flex', gap: '10px', flexWrap:'wrap' }}>
              <button className="add-student-btn" onClick={openAttendance}>
                <FiPlus /> Take Attendance
              </button>
              <button className="print-btn" onClick={() => handlePrintReport(new Date().toISOString().slice(0,10))}>
                <FiPrinter /> Print Today's Report
              </button>
              <button className="delete-btn" onClick={handleDeleteAllAttendance}>
                <FiTrash2 /> Delete All
              </button>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="content-section">
            <h2>Reports</h2>
            <div className="students-header" style={{ marginBottom: 20 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <label style={{ fontWeight:600 }}>Select Date</label>
                <input type="date" value={reportDate} onChange={(e)=> setReportDate(e.target.value)} />
                {reportDate && (
                  <button className="print-btn" onClick={() => handlePrintReport(reportDate)}>
                    <FiPrinter /> Print Report
                  </button>
                )}
              </div>
            </div>

            {!reportDate ? (
              <p style={{ color:'#64748b' }}>Choose a date to view attendance summary.</p>
            ) : (
              <>
                {/* Overall stats */}
                <div className="dashboard-stats" style={{ marginTop: 0 }}>
                  {(() => { const t = calculateTotalsForBucket(reportStudentData); return (
                    <div className="stat-card">
                      <h3>Students Present (mins)</h3>
                      <p className="stat-number">{t.presentMinutes}</p>
                    </div>
                  ); })()}
                  {(() => { const t = calculateTotalsForBucket(reportStudentData); return (
                    <div className="stat-card">
                      <h3>Students Absent (mins)</h3>
                      <p className="stat-number">{t.absentMinutes}</p>
                    </div>
                  ); })()}
                  {(() => { const t = calculateTotalsForBucket(reportTeacherData); return (
                    <div className="stat-card">
                      <h3>Teachers Present (mins)</h3>
                      <p className="stat-number">{t.presentMinutes}</p>
                    </div>
                  ); })()}
                  {(() => { const t = calculateTotalsForBucket(reportTeacherData); return (
                    <div className="stat-card">
                      <h3>Teachers Absent (mins)</h3>
                      <p className="stat-number">{t.absentMinutes}</p>
                    </div>
                  ); })()}
                </div>

                <div style={{ display:'grid', gap: 24, marginTop: 24 }}>
                  {/* Students Report */}
                  <div>
                    <h3 style={{ marginBottom:10, color:'#1e3a8a' }}>Students Attendance - {reportDate}</h3>
                    {Object.keys(reportStudentData).length === 0 ? (
                      <p style={{ color:'#64748b' }}>No student attendance recorded for this date.</p>
                    ) : (
                      Object.entries(reportStudentData).map(([classId, timeBucket]) => {
                        const classItem = classes.find(c => c.id === classId);
                        const times = getTimesFromClassBucket(timeBucket);
                        const classStudents = students.filter(s => s.classId === classId);
                        return (
                          <div key={classId} style={{ marginBottom: 24 }}>
                            <div className="class-list-header">
                              <h2>{classItem ? classItem.className : classId}</h2>
                              <p>Attendance matrix across times</p>
                            </div>
                            <div style={{ overflowX:'auto' }}>
                              <table className="students-table" style={{ minWidth: 700 }}>
                                <thead>
                                  <tr>
                                    <th>Student</th>
                                    {times.map(t => (<th key={t}>{t}</th>))}
                                    <th>Present (mins)</th>
                                    <th>Absent (mins)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {classStudents.map(st => {
                                    const marks = times.map(t => (timeBucket?.[t]?.[st.id] || ''));
                                    const { presentMinutes, absentMinutes } = calculateMinutes(marks);
                                    return (
                                      <tr key={st.id}>
                                        <td>{st.fullName}</td>
                                        {times.map(t => (
                                          <td key={t} style={{ fontWeight:600, color: (timeBucket?.[t]?.[st.id] === 'P') ? '#16a34a' : (timeBucket?.[t]?.[st.id] === 'A') ? '#dc2626' : '#64748b' }}>
                                            {timeBucket?.[t]?.[st.id] || '-'}
                                          </td>
                                        ))}
                                        <td>{presentMinutes}</td>
                                        <td>{absentMinutes}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Teachers Report */}
                  <div>
                    <h3 style={{ marginBottom:10, color:'#1e3a8a' }}>Teachers Attendance - {reportDate}</h3>
                    {Object.keys(reportTeacherData).length === 0 ? (
                      <p style={{ color:'#64748b' }}>No teacher attendance recorded for this date.</p>
                    ) : (
                      Object.entries(reportTeacherData).map(([classId, timeBucket]) => {
                        const classItem = classes.find(c => c.id === classId);
                        const times = getTimesFromClassBucket(timeBucket);
                        const teacherIdsSet = new Set();
                        times.forEach(t => Object.keys(timeBucket?.[t] || {}).forEach(id => teacherIdsSet.add(id)));
                        const teacherIds = Array.from(teacherIdsSet);
                        return (
                          <div key={classId} style={{ marginBottom: 24 }}>
                            <div className="class-list-header">
                              <h2>{classItem ? classItem.className : classId}</h2>
                              <p>Teachers attendance across times</p>
                            </div>
                            <div style={{ overflowX:'auto' }}>
                              <table className="students-table" style={{ minWidth: 700 }}>
                                <thead>
                                  <tr>
                                    <th>Teacher</th>
                                    {times.map(t => (<th key={t}>{t}</th>))}
                                    <th>Present (mins)</th>
                                    <th>Absent (mins)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {teacherIds.map(tid => {
                                    const tch = teachers.find(tt => tt.id === tid);
                                    const marks = times.map(t => (timeBucket?.[t]?.[tid] || '')); 
                                    const { presentMinutes, absentMinutes } = calculateMinutes(marks);
                                    return (
                                      <tr key={tid}>
                                        <td>{tch ? tch.name : tid}</td>
                                        {times.map(t => (
                                          <td key={t} style={{ fontWeight:600, color: (timeBucket?.[t]?.[tid] === 'P') ? '#16a34a' : (timeBucket?.[t]?.[tid] === 'A') ? '#dc2626' : '#64748b' }}>
                                            {timeBucket?.[t]?.[tid] || '-'}
                                          </td>
                                        ))}
                                        <td>{presentMinutes}</td>
                                        <td>{absentMinutes}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  const handlePrintReport = (date) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formatTable = (title, grid) => {
      return `
        <h3 class="title">${title}</h3>
        ${grid}
      `;
    };

    // Students grid per class
    const renderStudentsGrid = () => {
      if (!reportStudentData || Object.keys(reportStudentData).length === 0) return '<p>No student attendance.</p>';
      return Object.entries(reportStudentData).map(([classId, timeBucket]) => {
        const classItem = classes.find(c => c.id === classId);
        const times = Object.keys(timeBucket || {}).sort();
        const classStudents = students.filter(s => s.classId === classId);
        const header = ['Student', ...times, 'Present (mins)', 'Absent (mins)'];
        const rows = classStudents.map(st => {
          const marks = times.map(t => (timeBucket?.[t]?.[st.id] || ''));
          const { presentMinutes, absentMinutes } = calculateMinutes(marks);
          const cells = [st.fullName, ...marks.map(m => m || '-'), String(presentMinutes), String(absentMinutes)];
          return `<tr>${cells.map(c => `<td style="padding:6px;border:1px solid #ddd;">${c}</td>`).join('')}</tr>`;
        }).join('');
        return `
          <div style="margin: 16px 0;">
            <div style="padding:10px 12px;background:#1e3a8a;color:#fff;border-radius:8px;display:flex;justify-content:space-between;">
              <strong>${classItem ? classItem.className : classId}</strong>
              <span>Students</span>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;margin-top:8px;min-width:700px;">
                <thead><tr>${header.map(h => `<th style="background:#f8fafc;text-align:left;padding:8px;border:1px solid #e5e7eb;">${h}</th>`).join('')}</tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        `;
      }).join('');
    };

    // Teachers grid per class
    const renderTeachersGrid = () => {
      if (!reportTeacherData || Object.keys(reportTeacherData).length === 0) return '<p>No teacher attendance.</p>';
      return Object.entries(reportTeacherData).map(([classId, timeBucket]) => {
        const classItem = classes.find(c => c.id === classId);
        const times = Object.keys(timeBucket || {}).sort();
        const teacherIdsSet = new Set();
        times.forEach(t => Object.keys(timeBucket?.[t] || {}).forEach(id => teacherIdsSet.add(id)));
        const teacherIds = Array.from(teacherIdsSet);
        const header = ['Teacher', ...times, 'Present (mins)', 'Absent (mins)'];
        const rows = teacherIds.map(tid => {
          const tch = teachers.find(tt => tt.id === tid);
          const marks = times.map(t => (timeBucket?.[t]?.[tid] || ''));
          const { presentMinutes, absentMinutes } = calculateMinutes(marks);
          const cells = [tch ? tch.name : tid, ...marks.map(m => m || '-'), String(presentMinutes), String(absentMinutes)];
          return `<tr>${cells.map(c => `<td style="padding:6px;border:1px solid #ddd;">${c}</td>`).join('')}</tr>`;
        }).join('');
        return `
          <div style="margin: 16px 0;">
            <div style="padding:10px 12px;background:#1e3a8a;color:#fff;border-radius:8px;display:flex;justify-content:space-between;">
              <strong>${classItem ? classItem.className : classId}</strong>
              <span>Teachers</span>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;margin-top:8px;min-width:700px;">
                <thead><tr>${header.map(h => `<th style="background:#f8fafc;text-align:left;padding:8px;border:1px solid #e5e7eb;">${h}</th>`).join('')}</tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        `;
      }).join('');
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${date}</title>
          <style>
            body { font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            .header { text-align:center; margin-bottom: 10px; }
            .header img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
            .title { color: #1e3a8a; margin: 10px 0 0 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${Logo}" />
            <h2 class="title">MPASAT Attendance Report - ${date}</h2>
          </div>
          ${formatTable('Students', renderStudentsGrid())}
          ${formatTable('Teachers', renderTeachersGrid())}
          <script>
            window.onload = function() { window.print(); setTimeout(() => window.close(), 300); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="dashboard-container">
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            <img 
              src={Logo} 
              alt="MPASAT Logo" 
              style={{ 
                width: '50px', 
                height: '50px', 
                marginRight: '10px',
                borderRadius: '8px',
                objectFit: 'cover'
              }} 
            />
            <h1>MPASAT</h1>
          </div>
          <p>Attendance System</p>
        </div>
        
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleMenuClick('dashboard')}
          >
            <FiBarChart className="nav-icon" />
            Dashboard
          </button>
          
          <button
            className={`nav-item ${activeMenu === 'students' ? 'active' : ''}`}
            onClick={() => handleMenuClick('students')}
          >
            <FiUsers className="nav-icon" />
            Students
          </button>
          
          <button
            className={`nav-item ${activeMenu === 'teachers' ? 'active' : ''}`}
            onClick={() => handleMenuClick('teachers')}
          >
            <FiUserCheck className="nav-icon" />
            Teachers
          </button>
          
          <button
            className={`nav-item ${activeMenu === 'attendance' ? 'active' : ''}`}
            onClick={() => handleMenuClick('attendance')}
          >
            <FiCheckSquare className="nav-icon" />
            Attendance
          </button>
          
          <button
            className={`nav-item ${activeMenu === 'reports' ? 'active' : ''}`}
            onClick={() => handleMenuClick('reports')}
          >
            <FiTrendingUp className="nav-icon" />
            Reports
          </button>
        </nav>
      </div>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={toggleSidebar}>
              <FiMenu />
            </button>
            <img 
              src={Logo} 
              alt="MPASAT Logo" 
              style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
            />
            <h2>{activeMenu.charAt(0).toUpperCase() + activeMenu.slice(1)}</h2>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-email">{userEmail}</span>
              <button className="signout-button" onClick={handleSignOut}>
                <FiLogOut /> Sign Out
              </button>
            </div>
          </div>
        </header>

        {successMessage && (
          <div className="success-banner">{successMessage}</div>
        )}

        <main className="content">
          {renderContent()}
        </main>
      </div>

      {/* Add/Edit Student Modal */}
      {showAddStudentModal && (
        <div className="modal-overlay" onClick={() => setShowAddStudentModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
              <button className="close-btn" onClick={() => setShowAddStudentModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleSaveStudent(); }}>
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={studentForm.fullName}
                  onChange={(e) => setStudentForm({...studentForm, fullName: e.target.value})}
                  placeholder="Enter full name"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Sex</label>
                  <select
                    value={studentForm.sex}
                    onChange={(e) => setStudentForm({...studentForm, sex: e.target.value})}
                    required
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={studentForm.dateOfBirth}
                    onChange={(e) => setStudentForm({...studentForm, dateOfBirth: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Place of Birth</label>
                <input
                  type="text"
                  value={studentForm.placeOfBirth}
                  onChange={(e) => setStudentForm({...studentForm, placeOfBirth: e.target.value})}
                  placeholder="Enter place of birth"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Class</label>
                <select
                  value={studentForm.classId}
                  onChange={(e) => setStudentForm({...studentForm, classId: e.target.value})}
                  required
                >
                  <option value="">Select class</option>
                  {classes.sort((a, b) => a.className.localeCompare(b.className)).map(classItem => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.className} ({classItem.abbreviation})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddStudentModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingStudent ? 'Update Student' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Class Modal */}
      {showAddClassModal && (
        <div className="modal-overlay" onClick={() => setShowAddClassModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingClass ? 'Edit Class' : 'Add New Class'}</h3>
              <button className="close-btn" onClick={() => setShowAddClassModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleSaveClass(); }}>
              <div className="form-group">
                <label>Class Name</label>
                <input
                  type="text"
                  value={classForm.className}
                  onChange={(e) => setClassForm({...classForm, className: e.target.value})}
                  placeholder="Enter class name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Abbreviation</label>
                <input
                  type="text"
                  value={classForm.abbreviation}
                  onChange={(e) => setClassForm({...classForm, abbreviation: e.target.value})}
                  placeholder="Enter abbreviation"
                  required
                />
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddClassModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingClass ? 'Update Class' : 'Add Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Teacher Modal */}
      {showAddTeacherModal && (
        <div className="modal-overlay" onClick={() => setShowAddTeacherModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</h3>
              <button className="close-btn" onClick={() => setShowAddTeacherModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleSaveTeacher(); }}>
              <div className="form-group">
                <label>Teacher Name</label>
                <input
                  type="text"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  placeholder="Enter teacher name"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Sex</label>
                  <select
                    value={teacherForm.sex}
                    onChange={(e) => setTeacherForm({ ...teacherForm, sex: e.target.value })}
                    required
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Contact</label>
                  <input
                    type="tel"
                    value={teacherForm.contact}
                    onChange={(e) => setTeacherForm({ ...teacherForm, contact: e.target.value })}
                    placeholder="Enter contact"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Class(es) taught</label>
                <div className="checkbox-list">
                  {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                    <label key={c.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={teacherForm.classesTaught.includes(c.id)}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setTeacherForm(prev => {
                            const current = new Set(prev.classesTaught);
                            if (checked) {
                              current.add(c.id);
                            } else {
                              current.delete(c.id);
                            }
                            return { ...prev, classesTaught: Array.from(current) };
                          });
                        }}
                      />
                      <span>{c.className} ({c.abbreviation})</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowAddTeacherModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="modal-overlay" onClick={() => setShowAttendanceModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Take Attendance</h3>
              <button className="close-btn" onClick={() => setShowAttendanceModal(false)}>
                <FiX />
              </button>
            </div>

            <div className="modal-form" style={{ gap: 16 }}>
              {/* Step 1: Type */}
              <div className="form-group">
                <label>Attendance Type</label>
                <select value={attendanceType} onChange={(e)=> { setAttendanceType(e.target.value); setAttendanceForm({ classId:'', date:'', time:'', teacherId:'', status:'P' }); setAttendanceMap({}); }}>
                  <option value="">Select type</option>
                  <option value="students">Students</option>
                  <option value="teachers">Teachers</option>
                </select>
              </div>

              {attendanceType === 'students' && (
                <>
                  {/* Class */}
                  <div className="form-group">
                    <label>Class</label>
                    <select value={attendanceForm.classId} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, classId: e.target.value }))}>
                      <option value="">Select class</option>
                      {classes.sort((a,b)=>a.className.localeCompare(b.className)).map(c => (
                        <option key={c.id} value={c.id}>{c.className} ({c.abbreviation})</option>
                      ))}
                    </select>
                  </div>
                  {/* Date & Time */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date</label>
                      <input type="date" value={attendanceForm.date} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Time</label>
                      <input type="time" value={attendanceForm.time} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, time: e.target.value }))} />
                    </div>
                  </div>

                  {/* Students sheet */}
                  {attendanceForm.classId && attendanceForm.date && attendanceForm.time && (
                    <div>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 10 }}>
                        <strong>Mark Attendance</strong>
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="cancel-btn" onClick={() => {
                            const list = students.filter(s => s.classId === attendanceForm.classId);
                            const next = {};
                            list.forEach(s => next[s.id] = 'P');
                            setAttendanceMap(next);
                          }}>Mark All Present</button>
                          <button className="cancel-btn" onClick={() => {
                            const list = students.filter(s => s.classId === attendanceForm.classId);
                            const next = {};
                            list.forEach(s => next[s.id] = 'A');
                            setAttendanceMap(next);
                          }}>Mark All Absent</button>
                        </div>
                      </div>
                      <table className="students-table">
                        <thead>
                          <tr>
                            <th>S/N</th>
                            <th>Names</th>
                            <th>Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.filter(s => s.classId === attendanceForm.classId).map((st, idx) => {
                            const mark = attendanceMap[st.id] || '';
                            return (
                              <tr key={st.id}>
                                <td>{idx + 1}</td>
                                <td>{st.fullName}</td>
                                <td>
                                  <div style={{ display:'flex', gap:8 }}>
                                    <button className="edit-btn" onClick={() => setAttendanceMap(prev => ({ ...prev, [st.id]: 'P' }))} title="Present">
                                      <FiCheck />
                                    </button>
                                    <button className="delete-btn" onClick={() => setAttendanceMap(prev => ({ ...prev, [st.id]: 'A' }))} title="Absent">
                                      <FiX />
                                    </button>
                                    <span style={{ fontWeight:600, color: mark === 'P' ? '#16a34a' : mark === 'A' ? '#dc2626' : '#64748b' }}>{mark || '-'}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setShowAttendanceModal(false)}>Cancel</button>
                    <button className="save-btn" onClick={saveStudentsAttendance} disabled={!(attendanceForm.classId && attendanceForm.date && attendanceForm.time)}>Save Attendance</button>
                  </div>
                </>
              )}

              {attendanceType === 'teachers' && (
                <>
                  {/* Teacher */}
                  <div className="form-group">
                    <label>Teacher</label>
                    <select value={attendanceForm.teacherId} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, teacherId: e.target.value }))}>
                      <option value="">Select teacher</option>
                      {teachers.sort((a,b)=>a.name.localeCompare(b.name)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  {/* Class */}
                  <div className="form-group">
                    <label>Class</label>
                    <select value={attendanceForm.classId} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, classId: e.target.value }))}>
                      <option value="">Select class</option>
                      {classes.sort((a,b)=>a.className.localeCompare(b.className)).map(c => (
                        <option key={c.id} value={c.id}>{c.className} ({c.abbreviation})</option>
                      ))}
                    </select>
                  </div>
                  {/* Date & Time */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date</label>
                      <input type="date" value={attendanceForm.date} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label>Time</label>
                      <input type="time" value={attendanceForm.time} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, time: e.target.value }))} />
                    </div>
                  </div>
                  {/* Status */}
                  <div className="form-group">
                    <label>Status</label>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className={`edit-btn`} onClick={() => setAttendanceForm(prev => ({ ...prev, status: 'P' }))}><FiCheck /> Present</button>
                      <button className={`delete-btn`} onClick={() => setAttendanceForm(prev => ({ ...prev, status: 'A' }))}><FiX /> Absent</button>
                      <span style={{ fontWeight:700, marginLeft: 8, color: attendanceForm.status === 'P' ? '#16a34a' : '#dc2626' }}>{attendanceForm.status}</span>
                    </div>
                  </div>

                  <div className="modal-actions">
                    <button className="cancel-btn" onClick={() => setShowAttendanceModal(false)}>Cancel</button>
                    <button className="save-btn" onClick={saveTeacherAttendance} disabled={!(attendanceForm.teacherId && attendanceForm.classId && attendanceForm.date && attendanceForm.time)}>Save Attendance</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard; 