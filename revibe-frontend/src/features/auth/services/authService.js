// src/features/auth/services/authService.js

/**
 * Chuyển hướng người dùng dựa trên role sau khi đăng nhập thành công
 * @param {Object} user - Thông tin user từ response login
 * @param {Function} navigate - React Router navigate function  
 */
export const redirectByRole = (user, navigate) => {
  if (!user || !user.role) {
    // Fallback nếu không có role, chuyển về home
    navigate('/home', { replace: true });
    return;
  }

  switch (user.role) {
    case 'admin':
      navigate('/admin/dashboard', { replace: true });
      break;
    case 'moderator':
      // Moderator cũng có thể vào admin dashboard hoặc trang riêng
      navigate('/admin/dashboard', { replace: true });
      break;
    case 'user':
    default:
      navigate('/home', { replace: true });
      break;
  }
};

/**
 * Kiểm tra quyền truy cập dựa trên role
 * @param {string} userRole - Role của user hiện tại
 * @param {string[]} allowedRoles - Danh sách các role được phép
 * @returns {boolean}
 */
export const hasPermission = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};

/**
 * Lấy thông tin user từ localStorage
 * @returns {Object|null} - User object hoặc null nếu chưa đăng nhập
 */
export const getCurrentUser = () => {
  try {
    const authData = localStorage.getItem('revibe_auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.user || null;
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }
  return null;
};

/**
 * Kiểm tra xem user hiện tại có phải admin không
 * @returns {boolean}
 */
export const isAdmin = () => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

/**
 * Kiểm tra xem user hiện tại có phải moderator không
 * @returns {boolean}
 */
export const isModerator = () => {
  const user = getCurrentUser();
  return user?.role === 'moderator';
};

/**
 * Kiểm tra xem user có quyền admin hoặc moderator không
 * @returns {boolean}
 */
export const isAdminOrModerator = () => {
  const user = getCurrentUser();
  return user?.role === 'admin' || user?.role === 'moderator';
};
