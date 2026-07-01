import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import ForgotPasswordPage from "../pages/ForgotPasswordPage";
import HomePage from "../pages/HomePage";
import ProfilePage from '../pages/ProfilePage';
import TestAPI from '../pages/TestAPI';
import PostDetailPage from '../pages/PostDetailPage';
import ChatPage from '../pages/ChatPage';
import NotificationPage from '../pages/NotificationPage';
import HashtagPage from '../pages/HashtagPage';
import ExplorePage from '../pages/ExplorePage';
import OnboardingPage from '../pages/OnboardingPage';

// Admin
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboard from '../pages/admin/AdminDashboard';
import UserManagement from '../pages/admin/UserManagement';
import PostManagement from '../pages/admin/PostManagement';
import ReportManagement from '../pages/admin/ReportManagement';

function AppRoutes() {
  const isAuthenticated = () => localStorage.getItem('token') !== null;

  const isAdmin = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user?.role === 'admin';
    } catch { return false; }
  };

  const AdminGuard = ({ children }) =>
    isAuthenticated() && isAdmin() ? children : <Navigate to="/home" />;

  return (
    <Routes>
      <Route
        path="/"
        element={isAuthenticated() ? <Navigate to="/home" /> : <Navigate to="/login" />}
      />

      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/onboarding" element={isAuthenticated() ? <OnboardingPage /> : <Navigate to="/login" />} />

      <Route path="/home"               element={<HomePage />} />
      <Route path="/messages"           element={<ChatPage />} />
      <Route path="/notifications"      element={<NotificationPage />} />
      <Route path="/post/:postId"        element={<PostDetailPage />} />
      <Route path="/profile/:username"  element={<ProfilePage />} />
      <Route path="/hashtag/:hashtagName" element={<HashtagPage />} />
      <Route path="/explore"            element={<ExplorePage />} />
      <Route path="/explore/:tag"       element={<ExplorePage />} />
      <Route path="/test-api"           element={<TestAPI />} />

      {/* ── Admin nested routes ── */}
      <Route
        path="/admin"
        element={<AdminGuard><AdminLayout /></AdminGuard>}
      >
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<AdminDashboard />} />
        <Route path="users"         element={<UserManagement />} />
        <Route path="posts"         element={<PostManagement />} />
        <Route path="reports"       element={<ReportManagement />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" />} />
    </Routes>
  );
}

export default AppRoutes;
