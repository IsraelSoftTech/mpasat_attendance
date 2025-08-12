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
  FiPrinter
} from 'react-icons/fi';
import { ref, push, set, update, remove, onValue } from 'firebase/database';
import Logo from '../assets/logo.png';
import './Dashboard.css';

const Dashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [userEmail, setUserEmail] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

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

  useEffect(() => {
    // Get user email from localStorage
    const email = localStorage.getItem('userEmail');
    if (email) {
      setUserEmail(email);
    }
  }, []);

  useEffect(() => {
    // Subscribe to classes and students
    const classesRef = ref(database, 'classes');
    const studentsRef = ref(database, 'students');

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

    return () => {
      offClasses();
      offStudents();
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
                        <button className="print-btn" onClick={() => handlePrintClass(classItem, classStudents)}>
                          <FiPrinter /> Print Class List
                        </button>
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
            <h2>Teachers</h2>
            <p>yet to be added</p>
          </div>
        );
      case 'attendance':
        return (
          <div className="content-section">
            <h2>Attendance</h2>
            <p>yet to be added</p>
          </div>
        );
      case 'reports':
        return (
          <div className="content-section">
            <h2>Reports</h2>
            <p>yet to be added</p>
          </div>
        );
      default:
        return null;
    }
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
    </div>
  );
};

export default Dashboard; 