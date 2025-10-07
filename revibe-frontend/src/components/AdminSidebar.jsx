import React, { useState } from "react";
import { Nav } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import {
  FaHome,
  FaUsers,
  FaListAlt,
  FaBars,
  FaTags, // icon danh mục
} from "react-icons/fa";

const logoUrl =
  "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg"; // Placeholder logo

// Item dùng lại để tránh lặp code
function SidebarItem({ to, icon: Icon, label, collapsed }) {
  return (
    <Nav.Link
      as={NavLink}
      to={to}
      end
      className={({ isActive }) =>
        `d-flex align-items-center py-2 px-2 rounded gap-2 sidebar-nav-item ${
          isActive ? "active" : ""
        }`
      }
      style={({ isActive }) => ({
        fontWeight: 500,
        fontSize: 16,
        color: "#fff",
        transition: "background .2s, color .2s",
        ...(isActive && {
          background: "rgba(255,255,255,0.13)",
          color: "#fff",
        }),
      })}
      // Khi collapsed, hiển thị tooltip qua title
      title={collapsed ? label : undefined}
      aria-label={label}
    >
      <span
        className="d-flex align-items-center justify-content-center"
        style={{ width: 28 }}
      >
        <Icon />
      </span>
      <span style={{ opacity: collapsed ? 0 : 1, transition: "opacity .2s" }}>
        {label}
      </span>
    </Nav.Link>
  );
}

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`d-flex flex-column align-items-center p-0 shadow-lg position-fixed ${
        collapsed ? "collapsed" : ""
      }`}
      style={{
        top: 0,
        left: 0,
        minHeight: "100vh",
        width: collapsed ? 64 : 240,
        transition: "width .25s cubic-bezier(.4,0,.2,1)",
        background: collapsed
          ? "linear-gradient(180deg, #2196f3 80%, #42a5f5 100%)"
          : "linear-gradient(180deg, #1976d2 0%, #2196f3 100%)",
        borderTopRightRadius: 18,
        borderBottomRightRadius: 18,
        boxShadow: "0 4px 24px 0 rgba(30,41,59,0.10)",
        zIndex: 100,
      }}
    >
      {/* Logo & Collapse Button */}
      <div
        className="w-100 d-flex flex-column align-items-center pt-3 pb-2"
        style={{ minHeight: 80 }}
      >
        <div
          className="d-flex align-items-center w-100 px-3 mb-2"
          style={{
            gap: 12,
            opacity: collapsed ? 0 : 1,
            transition: "opacity .2s",
          }}
        >
          <img
            src={logoUrl}
            alt="Logo"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "#fff",
            }}
          />
          {!collapsed && (
            <span
              className="fw-bold fs-5 text-white"
              style={{ letterSpacing: 1 }}
            >
              Vibin Admin
            </span>
          )}
        </div>

        <div
          className="d-flex justify-content-center align-items-center w-100"
          style={{ height: 40 }}
        >
          <button
            className="btn btn-link text-white p-0"
            style={{
              fontSize: 24,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 40,
              height: 40,
            }}
            onClick={() => {
              const newCollapsed = !collapsed;
              setCollapsed(newCollapsed);
              // Thông báo cho layout khác biết trạng thái sidebar
              window.dispatchEvent(
                new CustomEvent("sidebarToggle", {
                  detail: { collapsed: newCollapsed },
                })
              );
            }}
            aria-label="Thu gọn/thả rộng thanh bên"
          >
            <FaBars />
          </button>
        </div>

        <div
          className="w-100"
          style={{ borderBottom: "1px solid #ffffff22", margin: "12px 0 0 0" }}
        />
      </div>

      {/* Nav Items */}
      <Nav className="flex-column gap-2 w-100 align-items-stretch px-2 mt-2">
        <SidebarItem
          to="/admin/dashboard"
          icon={FaHome}
          label="Trang chủ"
          collapsed={collapsed}
        />
        <SidebarItem
          to="/admin/users"
          icon={FaUsers}
          label="Người dùng"
          collapsed={collapsed}
        />
        <SidebarItem
          to="/admin/listing-queue"
          icon={FaListAlt}
          label="Duyệt sản phẩm"
          collapsed={collapsed}
        />
        <SidebarItem
          to="/admin/category"
          icon={FaTags} // đổi icon đúng với "Danh mục"
          label="Danh mục"
          collapsed={collapsed}
        />
      </Nav>

      <style>{`
        .sidebar-nav-item:hover {
          background: rgba(255,255,255,0.18) !important;
          color: #fff !important;
        }
        .sidebar-nav-item.active {
          background: rgba(255,255,255,0.13) !important;
          color: #fff !important;
        }
      `}</style>
    </aside>
  );
}
