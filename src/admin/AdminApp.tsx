import { Routes, Route, Navigate } from "react-router-dom";
import { AdminAuthProvider } from "./AdminAuthContext";
import PrivateRoute from "./components/PrivateRoute";
import AdminLayout from "./components/AdminLayout";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSettings from "./pages/AdminSettings";
import AdminUsers from "./pages/AdminUsers";
import AdminAds from "./pages/AdminAds";
import AdminLogs from "./pages/AdminLogs";
import AdminCategories from "./pages/AdminCategories";

export default function AdminApp({ basePath = "/admin" }: { basePath?: string }) {
  return (
    <AdminAuthProvider basePath={basePath}>
      <Routes>
        <Route path="login" element={<AdminLogin />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <AdminLayout />
            </PrivateRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="ads" element={<AdminAds />} />
          <Route path="logs" element={<AdminLogs />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}