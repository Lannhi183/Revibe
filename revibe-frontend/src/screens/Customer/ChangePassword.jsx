import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3000/api/v1";

export default function ChangePassword() {
  const { user, logout, getAuthHeader } = useAuth();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [showOtp, setShowOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!showOtp) {
      // Step 1: Verify current password & request OTP
      if (formData.newPassword !== formData.confirmPassword) {
        setError('Mật khẩu mới không khớp');
        setLoading(false);
        return;
      }

      if (formData.newPassword.length < 6) {
        setError('Mật khẩu mới phải có ít nhất 6 ký tự');
        setLoading(false);
        return;
      }

      try {
        const authHeaders = getAuthHeader();
        const requestUrl = `${API_URL}/auth/request-otp`;
        const payload = {
          email: user.email,
          purpose: 'change_password',
          currentPassword: formData.currentPassword
        };

        console.log('=== DEBUG REQUEST OTP ===');
        console.log('Request URL:', requestUrl);
        console.log('Auth headers:', authHeaders);
        console.log('Payload:', payload);
        console.log('User object:', user);

        // Request OTP for password change
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers));
        
        const data = await response.json();
        console.log('Response data:', data);
        
        if (response.ok) {
          setShowOtp(true);
          setSuccess('Mã OTP đã được gửi tới email của bạn');
        } else {
          setError(data.message || 'Mật khẩu hiện tại không đúng');
        }
      } catch (error) {
        setError('Có lỗi xảy ra, vui lòng thử lại');
      }
    } else {
      // Step 2: Change password with OTP
      if (!formData.otp) {
        setError('Vui lòng nhập mã OTP');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/change-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
            otp: formData.otp
          })
        });

        const data = await response.json();
        
        if (response.ok) {
          setSuccess('Đổi mật khẩu thành công! Vui lòng đăng nhập lại');
          setTimeout(() => {
            logout();
          }, 2000);
        } else {
          setError(data.message || 'Mã OTP không đúng hoặc đã hết hạn');
        }
      } catch (error) {
        setError('Có lỗi xảy ra, vui lòng thử lại');
      }
    }

    setLoading(false);
  };

  const resendOtp = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/request-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({
          email: user.email,
          purpose: 'change_password',
          currentPassword: formData.currentPassword
        })
      });

      if (response.ok) {
        setSuccess('Mã OTP mới đã được gửi');
      } else {
        setError('Không thể gửi lại OTP');
      }
    } catch (error) {
      setError('Có lỗi xảy ra');
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          style={styles.backBtn}
          onClick={() => window.history.back()}
        >
          ←
        </button>
        <h1 style={styles.title}>Đổi mật khẩu</h1>
        <div style={{ width: 40 }}></div>
      </div>

      {/* Security Warning */}
      <div style={styles.warning}>
        <span style={styles.warningIcon}>🔒</span>
        <div style={styles.warningContent}>
          <h3 style={styles.warningTitle}>Bảo mật tài khoản</h3>
          <p style={styles.warningText}>
            Để đảm bảo an toàn, chúng tôi sẽ gửi mã xác thực tới email của bạn
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Form */}
      <div style={styles.form}>
        <form onSubmit={handleSubmit}>
          {!showOtp ? (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Mật khẩu hiện tại</label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Nhập mật khẩu hiện tại"
                  required
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Mật khẩu mới</label>
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Nhập mật khẩu mới"
                  minLength="6"
                  required
                />
                <span style={styles.help}>Tối thiểu 6 ký tự</span>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>Xác nhận mật khẩu mới</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={styles.input}
                  placeholder="Nhập lại mật khẩu mới"
                  required
                />
              </div>
            </>
          ) : (
            <div style={styles.field}>
              <label style={styles.label}>Mã xác thực OTP</label>
              <input
                type="text"
                name="otp"
                value={formData.otp}
                onChange={handleChange}
                style={styles.input}
                placeholder="Nhập mã OTP từ email"
                maxLength="6"
                required
              />
              <div style={styles.otpActions}>
                <span style={styles.help}>
                  Kiểm tra email: {user?.email}
                </span>
                <button 
                  type="button" 
                  onClick={resendOtp}
                  style={styles.resendBtn}
                >
                  Gửi lại
                </button>
              </div>
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button 
              type="submit" 
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? '⏳ ' : showOtp ? '🔓 ' : '📧 '}
              {loading 
                ? 'Đang xử lý...' 
                : showOtp 
                  ? 'Xác nhận đổi mật khẩu' 
                  : 'Gửi mã xác thực'
              }
            </button>
            
            {showOtp && (
              <button 
                type="button"
                onClick={() => setShowOtp(false)}
                style={styles.backStepBtn}
              >
                ← Quay lại
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Security Tips */}
      <div style={styles.tips}>
        <h3 style={styles.tipsTitle}>💡 Mẹo bảo mật</h3>
        <ul style={styles.tipsList}>
          <li>Sử dụng mật khẩu mạnh với ít nhất 8 ký tự</li>
          <li>Kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt</li>
          <li>Không chia sẻ mật khẩu với bất kỳ ai</li>
          <li>Thay đổi mật khẩu định kỳ</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 20px",
    background: "rgba(255,255,255,0.95)",
    backdropFilter: "blur(10px)",
    borderBottom: "1px solid rgba(0,0,0,0.1)",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    background: "#f1f5f9",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
    color: "#1f2937",
  },
  
  warning: {
    margin: 16,
    padding: 16,
    background: "#fff3cd",
    border: "1px solid #ffeaa7",
    borderRadius: 12,
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
  },
  warningIcon: {
    fontSize: 24,
    marginTop: 2,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    margin: "0 0 4px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#856404",
  },
  warningText: {
    margin: 0,
    fontSize: 13,
    color: "#856404",
    lineHeight: 1.4,
  },
  
  error: {
    margin: "0 16px 16px",
    padding: 12,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    color: "#991b1b",
    fontSize: 14,
  },
  success: {
    margin: "0 16px 16px",
    padding: 12,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    color: "#166534",
    fontSize: 14,
  },
  
  form: {
    margin: 16,
    padding: 20,
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: "block",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    fontSize: 16,
    outline: "none",
    background: "#f8fafc",
    transition: "all 0.2s",
    boxSizing: "border-box",
  },
  help: {
    display: "block",
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  
  otpActions: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  resendBtn: {
    background: "none",
    border: "none",
    color: "#2563eb",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 6,
  },
  
  buttonGroup: {
    marginTop: 24,
  },
  submitBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "14px 20px",
    background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: 12,
  },
  backStepBtn: {
    width: "100%",
    padding: "12px 20px",
    background: "#f1f5f9",
    color: "#475569",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s",
  },
  
  tips: {
    margin: 16,
    padding: 16,
    background: "rgba(255,255,255,0.9)",
    borderRadius: 12,
    backdropFilter: "blur(10px)",
  },
  tipsTitle: {
    margin: "0 0 12px 0",
    fontSize: 14,
    fontWeight: 600,
    color: "#374151",
  },
  tipsList: {
    margin: 0,
    paddingLeft: 20,
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 1.6,
  },
};