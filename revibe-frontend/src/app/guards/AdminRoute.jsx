// src/app/guards/AdminRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser, isAdminOrModerator } from '../../features/auth/services/authService';

/**
 * Component bảo vệ các route dành cho Admin/Moderator
 * Chuyển hướng về trang login nếu chưa đăng nhập
 * Chuyển hướng về trang home nếu không có quyền admin/moderator
 */
export default function AdminRoute({ children }) {
  const user = getCurrentUser();

  // Chưa đăng nhập -> chuyển về login
  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  // Không có quyền admin/moderator -> chuyển về home
  if (!isAdminOrModerator()) {
    return <Navigate to="/home" replace />;
  }

  // Có quyền -> render component con
  return children;
}