import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import Footer from './components/Footer';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import LoadingScreen from './components/LoadingScreen';
import SessionWarning from './components/SessionWarning';
import StudentAdmission from './components/StudentAdmission';
import StudentProfile from './components/StudentProfile';
import ViewStudents from './components/ViewStudents';
import StudentRoster from './components/StudentRoster';
import PasswordChangeForm from './components/PasswordChangeForm';
import FirstPasswordChange from './components/FirstPasswordChange';
import AdminUserManagement from './components/AdminUserManagement';
import ClassDashboard from './components/ClassDashboard';
import MyClasses from './components/MyClasses';
import AttendanceTracker from './components/AttendanceTracker';
import AttendanceDetailView from './components/AttendanceDetailView';
import AttendanceMenu from './components/AttendanceMenu';
import Communication from './components/Communication';
import TokenTestPage from './components/TokenTestPage';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import ParentPortal from './components/ParentPortal';
import ParentChangePassword from './components/ParentChangePassword';
// Note: These components will be created next
// import AttendanceDashboard from './components/AttendanceDashboard';
// import AttendanceReports from './components/AttendanceReports';
// import AttendanceAnalytics from './components/AttendanceAnalytics';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route component (redirects to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

// Root redirect component
const RootRedirect = () => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  // Changed: Now redirect to landing page instead of login
  return <Navigate to={isAuthenticated ? "/dashboard" : "/"} replace />;
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
        <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Session Warning Component */}
          <SessionWarning />
          
          <div style={{ flex: '1' }}>
          <Routes>
            {/* Landing Page - Public */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Public Routes */}
            <Route 
              path="/login"
              element={
                <PublicRoute>
                  <Login initialMode="teacher" />
                </PublicRoute>
              } 
            />
            
            <Route 
              path="/register" 
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } 
            />

            {/* Parent / Guardian Routes (Admission No + Password) */}
            <Route
              path="/parent/login"
              element={
                <PublicRoute>
                  <Login initialMode="parent" />
                </PublicRoute>
              }
            />
            <Route path="/parent/portal" element={<ParentPortal />} />
            <Route path="/parent/change-password" element={<ParentChangePassword />} />
            
            {/* Password Change Route - Special case, doesn't need authentication */}
            <Route 
              path="/change-password" 
              element={
                <PasswordChangeForm 
                  onSuccess={() => {
                    // After successful password change, redirect to login
                    window.location.href = '/login';
                  }}
                />
              } 
            />
            
            {/* First Time Password Change Route - Special case for users with temporary passwords */}
            <Route 
              path="/first-time-password-change" 
              element={<FirstPasswordChange />} 
            />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin Dashboard Route */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Admin User Management Route */}
            <Route 
              path="/admin/users" 
              element={
                <ProtectedRoute>
                  <AdminUserManagement />
                </ProtectedRoute>
              } 
            />
            
            <Route
              path="/students/admission" 
              element={
                <ProtectedRoute>
                  <StudentAdmission />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/students/view" 
              element={
                <ProtectedRoute>
                  <ViewStudents />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/students/profile/:id" 
              element={
                <ProtectedRoute>
                  <StudentProfile />
                </ProtectedRoute>
              } 
            />
            
            {/* Class Management Routes */}
            <Route 
              path="/classes" 
              element={
                <ProtectedRoute>
                  <MyClasses />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/classes/:classId/dashboard" 
              element={
                <ProtectedRoute>
                  <ClassDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/classes/:classId/roster" 
              element={
                <ProtectedRoute>
                  <StudentRoster />
                </ProtectedRoute>
              } 
            />
            
            {/* Attendance Management Routes */}
            <Route 
              path="/attendance" 
              element={
                <ProtectedRoute>
                  <AttendanceMenu />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/attendance/detail/:classId/:date" 
              element={
                <ProtectedRoute>
                  <AttendanceDetailView />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/classes/:classId/attendance" 
              element={
                <ProtectedRoute>
                  <AttendanceTracker />
                </ProtectedRoute>
              } 
            />
            
            {/* Note: Uncomment these routes as components are created
            <Route 
              path="/classes/:classId/attendance/dashboard" 
              element={
                <ProtectedRoute>
                  <AttendanceDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/classes/:classId/attendance/reports" 
              element={
                <ProtectedRoute>
                  <AttendanceReports />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/classes/:classId/attendance/analytics" 
              element={
                <ProtectedRoute>
                  <AttendanceAnalytics />
                </ProtectedRoute>
              } 
            />
            */}
            
            {/* Communication Routes */}
            <Route 
              path="/communication" 
              element={
                <ProtectedRoute>
                  <Communication />
                </ProtectedRoute>
              } 
            />
            
            {/* Token Test Page (Development Only) */}
            <Route 
              path="/token-test" 
              element={
                <ProtectedRoute>
                  <TokenTestPage />
                </ProtectedRoute>
              } 
            />
            
            {/* Default redirect - redirect to login if not authenticated */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Catch all - redirect to login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
          </div>
          
          {/* Toast notifications */}
          <ToastContainer
            position="top-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
          />
          
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  </LanguageProvider>
  );
}

export default App;
