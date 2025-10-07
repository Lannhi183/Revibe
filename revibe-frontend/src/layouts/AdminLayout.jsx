import React, { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";

export default function AdminLayout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleSidebarToggle = (event) => {
      setSidebarCollapsed(event.detail.collapsed);
    };

    window.addEventListener('sidebarToggle', handleSidebarToggle);
    return () => window.removeEventListener('sidebarToggle', handleSidebarToggle);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fb" }}>
      <AdminSidebar />
      <main
        className="p-4"
        style={{
          marginLeft: sidebarCollapsed ? 64 : 240,
          minHeight: "100vh",
          transition: "margin-left .25s cubic-bezier(.4,0,.2,1)",
          minWidth: 0
        }}
      >
        {children}
      </main>
    </div>
  );
}
