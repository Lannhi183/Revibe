import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function MessagesRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to full-screen chat list
    navigate("/customer/messages", { replace: true });
  }, [navigate]);

  // Loading state while redirecting
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "60vh",
      padding: "40px",
      textAlign: "center",
    }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>💬</div>
      <div style={{ fontSize: "16px", fontWeight: "600", color: "#1f2937" }}>
        Đang chuyển đến tin nhắn...
      </div>
    </div>
  );
}