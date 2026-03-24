import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const AdminProtectedRoute = () => {
  const isAdminAuthenticated = localStorage.getItem("isAdminAuthenticated") === "true";

  return isAdminAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default AdminProtectedRoute;
