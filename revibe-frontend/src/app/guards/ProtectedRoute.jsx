import { Navigate, Outlet } from "react-router-dom";
export default function ProtectedRoute(){
  const u = JSON.parse(localStorage.getItem("revibe_auth") || "null");
  if(!u) return <Navigate to="/auth/login" replace />;
  return <Outlet />;
}
