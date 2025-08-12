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
  FiCheck,
  FiBook
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
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [editingSubject, setEditingSubject] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const navigate = useNavigate();

  // Attendance states
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceType, setAttendanceType] = useState(''); // 'students' | 'teachers'
  const [attendanceForm, setAttendanceForm] = useState({
    classId: '',
    subjectId: '',
    date: '', // YYYY-MM-DD
    time: '', // HH:mm
    teacherName: '',
    period: 'single', // 'single' | 'double'
    teacherId: '',
    status: 'P' // for teacher attendance only
  });
  const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: 'P' | 'A' }
  const [attendanceRecords, setAttendanceRecords] = useState([]); // For displaying attendance records

  // Prefill student attendance when selecting date/time/class/subject
  useEffect(() => {
    if (attendanceType === 'students' && attendanceForm.classId && attendanceForm.subjectId && attendanceForm.date && attendanceForm.time) {
      const path = `attendance/students/${attendanceForm.date}/${attendanceForm.classId}/${attendanceForm.subjectId}/${attendanceForm.time}`;
      const r = ref(database, path);
      return onValue(r, (snap) => {
        const data = snap.val() || {};
        setAttendanceMap(data);
      });
    }
    return undefined;
  }, [attendanceType, attendanceForm.classId, attendanceForm.subjectId, attendanceForm.date, attendanceForm.time]);

  // Prefill teacher attendance
  useEffect(() => {
    if (attendanceType === 'teachers' && attendanceForm.teacherId && attendanceForm.classId && attendanceForm.subjectId && attendanceForm.date && attendanceForm.time) {
      const path = `attendance/teachers/${attendanceForm.date}/${attendanceForm.classId}/${attendanceForm.subjectId}/${attendanceForm.time}/${attendanceForm.teacherId}`;
      const r = ref(database, path);
      return onValue(r, (snap) => {
        const data = snap.val();
        if (data === 'P' || data === 'A') {
          setAttendanceForm(prev => ({ ...prev, status: data }));
        }
      });
    }
    return undefined;
  }, [attendanceType, attendanceForm.teacherId, attendanceForm.classId, attendanceForm.subjectId, attendanceForm.date, attendanceForm.time]);

  // Load attendance records for display
  useEffect(() => {
    const recordsRef = ref(database, 'attendance');
    return onValue(recordsRef, (snap) => {
      const data = snap.val();
      if (data) {
        const records = [];
        // Process students attendance
        if (data.students) {
          Object.entries(data.students).forEach(([date, classData]) => {
            Object.entries(classData).forEach(([classId, subjectData]) => {
              Object.entries(subjectData).forEach(([subjectId, timeData]) => {
                Object.entries(timeData).forEach(([time, studentData]) => {
                  const classItem = classes.find(c => c.id === classId);
                  const subjectItem = subjects.find(s => s.id === subjectId);
                  const presentCount = Object.values(studentData).filter(status => status === 'P').length;
                  const totalCount = Object.keys(studentData).length;
                  
                  records.push({
                    id: `${date}-${classId}-${subjectId}-${time}`,
                    type: 'students',
                    date,
                    className: classItem ? classItem.className : classId,
                    subjectName: subjectItem ? subjectItem.subjectName : subjectId,
                    time,
                    presentCount,
                    totalCount,
                    attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
                  });
                });
              });
            });
          });
        }
        
        // Process teachers attendance
        if (data.teachers) {
          Object.entries(data.teachers).forEach(([date, classData]) => {
            Object.entries(classData).forEach(([classId, subjectData]) => {
              Object.entries(subjectData).forEach(([subjectId, timeData]) => {
                Object.entries(timeData).forEach(([time, teacherData]) => {
                  const classItem = classes.find(c => c.id === classId);
                  const subjectItem = subjects.find(s => s.id === subjectId);
                  const presentCount = Object.values(teacherData).filter(status => status === 'P').length;
                  const totalCount = Object.keys(teacherData).length;
                  
                  records.push({
                    id: `${date}-${classId}-${subjectId}-${time}-teachers`,
                    type: 'teachers',
                    date,
                    className: classItem ? classItem.className : classId,
                    subjectName: subjectItem ? subjectItem.subjectName : subjectId,
                    time,
                    presentCount,
                    totalCount,
                    attendanceRate: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
                  });
                });
              });
            });
          });
        }
        
        setAttendanceRecords(records.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } else {
        setAttendanceRecords([]);
      }
    });
  }, [classes, subjects]);

  const openAttendance = () => {
    setAttendanceType('');
    setAttendanceForm({ 
      classId: '', 
      subjectId: '', 
      date: '', 
      time: '', 
      teacherName: '', 
      period: 'single',
      teacherId: '', 
      status: 'P' 
    });
    setAttendanceMap({});
    setShowAttendanceModal(true);
  };

  const saveStudentsAttendance = async () => {
    const { classId, subjectId, date, time, teacherName, period } = attendanceForm;
    if (!classId || !subjectId || !date || !time || !teacherName) {
      alert('Please complete all required fields');
      return;
    }
    const updates = {};
    Object.entries(attendanceMap).forEach(([studentId, status]) => {
      if (status === 'P' || status === 'A') {
        updates[`attendance/students/${date}/${classId}/${subjectId}/${time}/${studentId}`] = status;
      }
    });
    
    // Save attendance metadata
    updates[`attendance/students/${date}/${classId}/${subjectId}/${time}/_metadata`] = {
      teacherName,
      period,
      timestamp: new Date().toISOString()
    };
    
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
    const { teacherId, classId, subjectId, date, time, status } = attendanceForm;
    if (!teacherId || !classId || !subjectId || !date || !time || !status) {
      alert('Please complete all fields');
      return;
    }
    try {
      await set(ref(database, `attendance/teachers/${date}/${classId}/${subjectId}/${time}/${teacherId}`), status);
      showSuccess('Teacher attendance saved');
      setShowAttendanceModal(false);
    } catch (e) {
      console.error('Save teacher attendance failed:', e);
    }
  };

  // Reports state
  const [reportType, setReportType] = useState('');
  const [reportClass, setReportClass] = useState('');
  const [reportSubject, setReportSubject] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [reportStudentData, setReportStudentData] = useState({}); // { classId: { subjectId: { time: { studentId: 'P'|'A' } } } }
  const [reportTeacherData, setReportTeacherData] = useState({}); // { classId: { subjectId: { time: { teacherId: 'P'|'A' } } } }

  useEffect(() => {
    if (!reportType || !reportClass || !reportSubject || !reportDate) return;
    
    if (reportType === 'students') {
      const stdRef = ref(database, `attendance/students/${reportDate}/${reportClass}/${reportSubject}`);
      return onValue(stdRef, (snap) => {
        setReportStudentData(snap.val() || {});
      });
    } else if (reportType === 'teachers') {
      const tchRef = ref(database, `attendance/teachers/${reportDate}/${reportClass}/${reportSubject}`);
      return onValue(tchRef, (snap) => {
        setReportTeacherData(snap.val() || {});
      });
    }
    return undefined;
  }, [reportType, reportClass, reportSubject, reportDate]);

  // Helpers for reports
  const getTimesFromClassBucket = (bucket) => {
    if (!bucket) return [];
    return Object.keys(bucket).filter(key => key !== '_metadata').sort();
  };

  const calculateMinutes = (marks, period = 'single') => {
    // marks: array of 'P' | 'A'
    const minutesPerMark = period === 'double' ? 100 : 50;
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
    // bucket: { classId: { subjectId: { time: { entityId: 'P'|'A' } } } }
    let presentCount = 0;
    let absentCount = 0;
    Object.values(bucket || {}).forEach(subjectBucket => {
      Object.values(subjectBucket || {}).forEach(timeBucket => {
        if (timeBucket && typeof timeBucket === 'object' && !timeBucket._metadata) {
          Object.values(timeBucket).forEach(mark => {
            if (mark === 'P') presentCount += 1; else if (mark === 'A') absentCount += 1;
          });
        }
      });
    });
    const minutesPerMark = 50; // Default to single period
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

  // Form states for subject
  const [subjectForm, setSubjectForm] = useState({
    subjectName: '',
    abbreviation: '',
    classId: ''
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
    const subjectsRef = ref(database, 'subjects');

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

    const offSubjects = onValue(subjectsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data
        ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
        : [];
      setSubjects(list);
    });

    return () => {
      offClasses();
      offStudents();
      offTeachers();
      offSubjects();
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

  const handleAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({ subjectName: '', abbreviation: '', classId: '' });
    setShowAddSubjectModal(true);
  };

  const handleEditSubject = (subject) => {
    setEditingSubject(subject);
    setSubjectForm({ 
      subjectName: subject.subjectName, 
      abbreviation: subject.abbreviation,
      classId: subject.classId || ''
    });
    setShowAddSubjectModal(true);
  };

  const handleDeleteSubject = async (subjectId) => {
    if (window.confirm('Are you sure you want to delete this subject?')) {
      try {
        await remove(ref(database, `subjects/${subjectId}`));
        showSuccess('Subject deleted successfully');
      } catch (e) {
        console.error('Delete subject failed:', e);
      }
    }
  };

  const handleSaveSubject = async () => {
    if (!subjectForm.subjectName || !subjectForm.abbreviation || !subjectForm.classId) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingSubject) {
        await update(ref(database, `subjects/${editingSubject.id}`), {
          ...subjectForm,
          updatedAt: new Date().toISOString()
        });
        showSuccess('Subject updated successfully');
      } else {
        const newRef = push(ref(database, 'subjects'));
        await set(newRef, {
          ...subjectForm,
          id: newRef.key,
          createdAt: new Date().toISOString()
        });
        showSuccess('Subject created successfully');
      }

      setShowAddSubjectModal(false);
      setSubjectForm({ subjectName: '', abbreviation: '', classId: '' });
      setEditingSubject(null);
    } catch (e) {
      console.error('Save subject failed:', e);
    }
  };

  const getClassName = (classId) => {
    const classItem = classes.find(c => c.id === classId);
    return classItem ? classItem.className : 'Unknown Class';
  };

  const getSubjectClassName = (subjectId) => {
    const subjectItem = subjects.find(s => s.id === subjectId);
    if (!subjectItem || !subjectItem.classId) return 'No Class';
    const classItem = classes.find(c => c.id === subjectItem.classId);
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
    setShowPrintPreview(true);
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
    setTimeout(() => setShowPrintPreview(false), 1000);
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
                <h3>Total Subjects</h3>
                <p className="stat-number">{subjects.length}</p>
              </div>
              <div className="stat-card">
                <h3>Total Teachers</h3>
                <p className="stat-number">{teachers.length}</p>
              </div>
              <div className="stat-card">
                <h3>Total Attendance Records</h3>
                <p className="stat-number">{attendanceRecords.length}</p>
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
              </div>
            </div>

            {classes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                <p>No classes available. Please add classes first to register students.</p>
              </div>
            ) : (
              <>
                {showPrintPreview ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                    <p>Printing class list...</p>
                  </div>
                ) : (
                  classes.sort((a, b) => a.className.localeCompare(b.className)).map(classItem => {
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
                  })
                )}
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
      case 'subjects':
        return (
          <div className="content-section">
            <div className="students-header">
              <h2>Class & Subjects Management</h2>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <button className="add-student-btn" onClick={handleAddClass}>
                  <FiPlus /> Add Class
                </button>
                <button className="add-student-btn" onClick={handleAddSubject}>
                  <FiPlus /> Add Subject
                </button>
              </div>
            </div>

            {/* Classes Section */}
            <div style={{ marginBottom: '40px' }}>
              <h3 style={{ marginBottom: '20px', color: '#1e3a8a', borderBottom: '2px solid #e1e5e9', paddingBottom: '10px' }}>
                Classes
              </h3>
              {classes.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No classes added yet.</p>
              ) : (
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Class Name</th>
                      <th>Abbreviation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classes.map((c, index) => (
                      <tr key={c.id}>
                        <td>{index + 1}</td>
                        <td>{c.className}</td>
                        <td>{c.abbreviation}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn" onClick={() => handleEditClass(c)}>
                              <FiEdit2 />
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteClass(c.id)}>
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

            {/* Subjects Section */}
            <div>
              <h3 style={{ marginBottom: '20px', color: '#1e3a8a', borderBottom: '2px solid #e1e5e9', paddingBottom: '10px' }}>
                Subjects
              </h3>
              {subjects.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No subjects added yet.</p>
              ) : (
                <table className="students-table">
                  <thead>
                    <tr>
                      <th>S/N</th>
                      <th>Subject Name</th>
                      <th>Abbreviation</th>
                      <th>Class</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((s, index) => (
                      <tr key={s.id}>
                        <td>{index + 1}</td>
                        <td>{s.subjectName}</td>
                        <td>{s.abbreviation}</td>
                        <td>{getSubjectClassName(s.id)}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn" onClick={() => handleEditSubject(s)}>
                              <FiEdit2 />
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteSubject(s.id)}>
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
              <button className="delete-btn" onClick={handleDeleteAllAttendance}>
                <FiTrash2 /> Delete All
              </button>
            </div>
            
            {/* Attendance Records Table */}
            <div style={{ marginTop: '30px' }}>
              <h3 style={{ marginBottom: '20px', color: '#1e3a8a' }}>Attendance Records</h3>
              {attendanceRecords.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No attendance records found. Take attendance to see records here.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="students-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Class</th>
                        <th>Subject</th>
                        <th>Time</th>
                        <th>Present</th>
                        <th>Total</th>
                        <th>Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((record) => (
                        <tr key={record.id}>
                          <td>{formatDate(record.date)}</td>
                          <td>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              backgroundColor: record.type === 'students' ? '#dbeafe' : '#fef3c7',
                              color: record.type === 'students' ? '#1e40af' : '#d97706'
                            }}>
                              {record.type === 'students' ? 'Students' : 'Teachers'}
                            </span>
                          </td>
                          <td>{record.className}</td>
                          <td>{record.subjectName}</td>
                          <td>{record.time}</td>
                          <td>{record.presentCount}</td>
                          <td>{record.totalCount}</td>
                          <td>
                            <span style={{ 
                              fontWeight: '600',
                              color: record.attendanceRate >= 80 ? '#16a34a' : 
                                     record.attendanceRate >= 60 ? '#d97706' : '#dc2626'
                            }}>
                              {record.attendanceRate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="content-section">
            <h2>Reports</h2>
            <div className="students-header" style={{ marginBottom: 20 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
                <label style={{ fontWeight:600 }}>Select Report Type</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  <option value="">Select report type</option>
                  <option value="students">Students Attendance</option>
                  <option value="teachers">Teachers Attendance</option>
                </select>
                {reportType === 'students' && (
                  <>
                    <label style={{ fontWeight:600 }}>Select Class</label>
                    <select value={reportClass} onChange={(e) => setReportClass(e.target.value)}>
                      <option value="">Select class</option>
                      {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                        <option key={c.id} value={c.id}>{c.className} ({c.abbreviation})</option>
                      ))}
                    </select>
                    <label style={{ fontWeight:600 }}>Select Subject</label>
                    <select value={reportSubject} onChange={(e) => setReportSubject(e.target.value)}>
                      <option value="">Select subject</option>
                      {subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)).map(s => (
                        <option key={s.id} value={s.id}>{s.subjectName}</option>
                      ))}
                    </select>
                  </>
                )}
                {reportType === 'teachers' && (
                  <>
                    <label style={{ fontWeight:600 }}>Select Class</label>
                    <select value={reportClass} onChange={(e) => setReportClass(e.target.value)}>
                      <option value="">Select class</option>
                      {classes.sort((a, b) => a.className.localeCompare(b.className)).map(c => (
                        <option key={c.id} value={c.id}>{c.className} ({c.abbreviation})</option>
                      ))}
                    </select>
                    <label style={{ fontWeight:600 }}>Select Subject</label>
                    <select value={reportSubject} onChange={(e) => setReportSubject(e.target.value)}>
                      <option value="">Select subject</option>
                      {subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)).map(s => (
                        <option key={s.id} value={s.id}>{s.subjectName}</option>
                      ))}
                    </select>
                  </>
                )}
                {reportType && reportClass && reportSubject && (
                  <label style={{ fontWeight:600 }}>Select Date</label>
                )}
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
                      Object.entries(reportStudentData).map(([classId, subjectBucket]) => {
                        const classItem = classes.find(c => c.id === classId);
                        const subjectItem = subjects.find(s => s.id === Object.keys(subjectBucket)[0]); // Get the first subject for the class
                        const times = getTimesFromClassBucket(Object.values(subjectBucket)[0]); // Get times for the first subject
                        const classStudents = students.filter(s => s.classId === classId);
                        return (
                          <div key={classId} style={{ marginBottom: 24 }}>
                            <div className="class-list-header">
                              <h2>{classItem ? classItem.className : classId} - {subjectItem ? subjectItem.subjectName : Object.keys(subjectBucket)[0]}</h2>
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
                                    const marks = times.map(t => (Object.values(subjectBucket)?.[0]?.[t]?.[st.id] || ''));
                                    const { presentMinutes, absentMinutes } = calculateMinutes(marks);
                                    return (
                                      <tr key={st.id}>
                                        <td>{st.fullName}</td>
                                        {times.map(t => (
                                          <td key={t} style={{ fontWeight:600, color: (Object.values(subjectBucket)?.[0]?.[t]?.[st.id] === 'P') ? '#16a34a' : (Object.values(subjectBucket)?.[0]?.[t]?.[st.id] === 'A') ? '#dc2626' : '#64748b' }}>
                                            {Object.values(subjectBucket)?.[0]?.[t]?.[st.id] || '-'}
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
                      Object.entries(reportTeacherData).map(([classId, subjectBucket]) => {
                        const classItem = classes.find(c => c.id === classId);
                        const subjectItem = subjects.find(s => s.id === Object.keys(subjectBucket)[0]); // Get the first subject for the class
                        const times = getTimesFromClassBucket(Object.values(subjectBucket)[0]); // Get times for the first subject
                        const teacherIdsSet = new Set();
                        times.forEach(t => Object.keys(Object.values(subjectBucket)?.[0]?.[t] || {}).forEach(id => teacherIdsSet.add(id)));
                        const teacherIds = Array.from(teacherIdsSet);
                        return (
                          <div key={classId} style={{ marginBottom: 24 }}>
                            <div className="class-list-header">
                              <h2>{classItem ? classItem.className : classId} - {subjectItem ? subjectItem.subjectName : Object.keys(subjectBucket)[0]}</h2>
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
                                    const marks = times.map(t => (Object.values(subjectBucket)?.[0]?.[t]?.[tid] || '')); 
                                    const { presentMinutes, absentMinutes } = calculateMinutes(marks);
                                    return (
                                      <tr key={tid}>
                                        <td>{tch ? tch.name : tid}</td>
                                        {times.map(t => (
                                          <td key={t} style={{ fontWeight:600, color: (Object.values(subjectBucket)?.[0]?.[t]?.[tid] === 'P') ? '#16a34a' : (Object.values(subjectBucket)?.[0]?.[t]?.[tid] === 'A') ? '#dc2626' : '#64748b' }}>
                                            {Object.values(subjectBucket)?.[0]?.[t]?.[tid] || '-'}
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
      return Object.entries(reportStudentData).map(([time, studentData]) => {
        const classItem = classes.find(c => c.id === reportClass);
        const subjectItem = subjects.find(s => s.id === reportSubject);
        const metadata = studentData._metadata || {};
        const header = ['Student', 'Status', 'Minutes'];
        const rows = Object.entries(studentData).filter(([key]) => key !== '_metadata').map(([studentId, status]) => {
          const student = students.find(s => s.id === studentId);
          const minutes = status === 'P' ? (metadata.period === 'double' ? 100 : 50) : 0;
          return `<tr><td style="padding:6px;border:1px solid #ddd;">${student ? student.fullName : studentId}</td><td style="padding:6px;border:1px solid #ddd;">${status}</td><td style="padding:6px;border:1px solid #ddd;">${minutes}</td></tr>`;
        }).join('');
        
        return `
          <div style="margin: 16px 0;">
            <div style="padding:10px 12px;background:#1e3a8a;color:#fff;border-radius:8px;display:flex;justify-content:space-between;">
              <strong>${classItem ? classItem.className : reportClass} - ${subjectItem ? subjectItem.subjectName : reportSubject}</strong>
              <span>Time: ${time}</span>
            </div>
            <div style="padding:8px;background:#f8fafc;border-radius:4px;margin:8px 0;">
              <strong>Teacher:</strong> ${metadata.teacherName || 'N/A'} | <strong>Period:</strong> ${metadata.period === 'double' ? 'Double (100 mins)' : 'Single (50 mins)'}
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;margin-top:8px;">
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
      return Object.entries(reportTeacherData).map(([time, teacherData]) => {
        const classItem = classes.find(c => c.id === reportClass);
        const subjectItem = subjects.find(s => s.id === reportSubject);
        const header = ['Teacher', 'Status', 'Minutes'];
        const rows = Object.entries(teacherData).map(([teacherId, status]) => {
          const teacher = teachers.find(t => t.id === teacherId);
          const minutes = status === 'P' ? 50 : 0; // Teachers default to single period
          return `<tr><td style="padding:6px;border:1px solid #ddd;">${teacher ? teacher.name : teacherId}</td><td style="padding:6px;border:1px solid #ddd;">${status}</td><td style="padding:6px;border:1px solid #ddd;">${minutes}</td></tr>`;
        }).join('');
        
        return `
          <div style="margin: 16px 0;">
            <div style="padding:10px 12px;background:#1e3a8a;color:#fff;border-radius:8px;display:flex;justify-content:space-between;">
              <strong>${classItem ? classItem.className : reportClass} - ${subjectItem ? subjectItem.subjectName : reportSubject}</strong>
              <span>Time: ${time}</span>
            </div>
            <div style="overflow-x:auto;">
              <table style="width:100%;border-collapse:collapse;margin-top:8px;">
                <thead><tr>${header.map(h => `<th style="background:#f8fafc;text-align:left;padding:8px;border:1px solid #e5e7eb;">${h}</th>`).join('')}</tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        `;
      }).join('');
    };

    const classItem = classes.find(c => c.id === reportClass);
    const subjectItem = subjects.find(s => s.id === reportSubject);
    const reportTitle = `${reportType === 'students' ? 'Students' : 'Teachers'} Attendance Report`;
    const subtitle = `${classItem ? classItem.className : reportClass} - ${subjectItem ? subjectItem.subjectName : reportSubject} - ${date}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${reportTitle} - ${date}</title>
          <style>
            body { font-family: Segoe UI, Tahoma, Geneva, Verdana, sans-serif; padding: 20px; }
            .header { text-align:center; margin-bottom: 10px; }
            .header img { width: 60px; height: 60px; object-fit: cover; border-radius: 8px; }
            .title { color: #1e3a8a; margin: 10px 0 0 0; }
            .subtitle { color: #64748b; margin: 5px 0 20px 0; font-size: 1.1rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${Logo}" />
            <h2 class="title">MPASAT ${reportTitle}</h2>
            <p class="subtitle">${subtitle}</p>
          </div>
          ${reportType === 'students' ? formatTable('Students', renderStudentsGrid()) : formatTable('Teachers', renderTeachersGrid())}
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
            className={`nav-item ${activeMenu === 'subjects' ? 'active' : ''}`}
            onClick={() => handleMenuClick('subjects')}
          >
            <FiBook className="nav-icon" />
            Class & Subjects
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

      {/* Add/Edit Subject Modal */}
      {showAddSubjectModal && (
        <div className="modal-overlay" onClick={() => setShowAddSubjectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h3>
              <button className="close-btn" onClick={() => setShowAddSubjectModal(false)}>
                <FiX />
              </button>
            </div>
            
            <form className="modal-form" onSubmit={(e) => { e.preventDefault(); handleSaveSubject(); }}>
              <div className="form-group">
                <label>Subject Name</label>
                <input
                  type="text"
                  value={subjectForm.subjectName}
                  onChange={(e) => setSubjectForm({...subjectForm, subjectName: e.target.value})}
                  placeholder="Enter subject name"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Abbreviation</label>
                <input
                  type="text"
                  value={subjectForm.abbreviation}
                  onChange={(e) => setSubjectForm({...subjectForm, abbreviation: e.target.value})}
                  placeholder="Enter abbreviation"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Class</label>
                <select
                  value={subjectForm.classId}
                  onChange={(e) => setSubjectForm({...subjectForm, classId: e.target.value})}
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
                <button type="button" className="cancel-btn" onClick={() => setShowAddSubjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="save-btn">
                  {editingSubject ? 'Update Subject' : 'Add Subject'}
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
                <select value={attendanceType} onChange={(e)=> { setAttendanceType(e.target.value); setAttendanceForm({ 
                  classId: '', 
                  subjectId: '', 
                  date: '', 
                  time: '', 
                  teacherName: '', 
                  period: 'single',
                  teacherId: '', 
                  status: 'P' 
                }); setAttendanceMap({}); }}>
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
                  {/* Subject */}
                  <div className="form-group">
                    <label>Subject</label>
                    <select value={attendanceForm.subjectId} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, subjectId: e.target.value }))}>
                      <option value="">Select subject</option>
                      {subjects.sort((a,b)=>a.subjectName.localeCompare(b.subjectName)).map(s => (
                        <option key={s.id} value={s.id}>{s.subjectName}</option>
                      ))}
                    </select>
                  </div>
                  {/* Teacher Name */}
                  <div className="form-group">
                    <label>Teacher Name</label>
                    <input
                      type="text"
                      value={attendanceForm.teacherName}
                      onChange={(e) => setAttendanceForm(prev => ({ ...prev, teacherName: e.target.value }))}
                      placeholder="Enter teacher name"
                      required
                    />
                  </div>
                  {/* Period */}
                  <div className="form-group">
                    <label>Period</label>
                    <select value={attendanceForm.period} onChange={(e) => setAttendanceForm(prev => ({ ...prev, period: e.target.value }))}>
                      <option value="single">Single (50 minutes)</option>
                      <option value="double">Double (100 minutes)</option>
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
                  {attendanceForm.classId && attendanceForm.subjectId && attendanceForm.date && attendanceForm.time && (
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
                    <button className="save-btn" onClick={saveStudentsAttendance} disabled={!(attendanceForm.classId && attendanceForm.subjectId && attendanceForm.teacherName && attendanceForm.date && attendanceForm.time)}>Save Attendance</button>
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
                  {/* Subject */}
                  <div className="form-group">
                    <label>Subject</label>
                    <select value={attendanceForm.subjectId} onChange={(e)=> setAttendanceForm(prev => ({ ...prev, subjectId: e.target.value }))}>
                      <option value="">Select subject</option>
                      {subjects.sort((a,b)=>a.subjectName.localeCompare(b.subjectName)).map(s => (
                        <option key={s.id} value={s.id}>{s.subjectName}</option>
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
                    <button className="save-btn" onClick={saveTeacherAttendance} disabled={!(attendanceForm.teacherId && attendanceForm.classId && attendanceForm.subjectId && attendanceForm.date && attendanceForm.time)}>Save Attendance</button>
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