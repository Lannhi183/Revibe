import { createBrowserRouter, Navigate } from "react-router-dom";

// Layout
import CustomerLayout from "../layouts/CustomerLayout.jsx";

// Guards
import AdminRoute from "./guards/AdminRoute.jsx";

// Customer screens
import Home from "../screens/Customer/Home.jsx";
import ListingNew from "../screens/Customer/ListingNew.jsx";
import ForYou from "../screens/Customer/ForYou.jsx";
import TopSellers from "../screens/Customer/TopSellers.jsx";
import Categories from "../screens/Customer/Categories.jsx";
import ProductDetail from "../screens/Customer/ProductDetail.jsx";
import SearchResult from "../screens/Customer/SearchResult.jsx";
import FAQ from "../screens/Customer/FAQ.jsx";
import ListingMine from "../screens/Customer/ListingMine.jsx";
import Profile from "../screens/Customer/Profile.jsx";
import Settings from "../screens/Customer/Settings.jsx";
import EditProfile from "../screens/Customer/EditProfile.jsx";
import ChangePassword from "../screens/Customer/ChangePassword.jsx";
import UploadProduct from "../screens/Customer/UploadProduct.jsx";
import ListNotification from "../screens/Customer/ListNotification.jsx";
import Cart from "../screens/Customer/Cart.jsx";
import Address from "../screens/Customer/Address.jsx";
import Checkout from "../screens/Customer/Checkout.jsx";
import MessagesRedirect from "../screens/Customer/MessagesRedirect.jsx";
import Orders from "../screens/Customer/Orders.jsx"; // ✅ thêm Orders

// Auth
import Login from "../screens/Auth/Login.jsx";
import Register from "../screens/Auth/Register.jsx";
import ForgotPassword from "../screens/Auth/ForgotPassword.jsx";
import ResetPassword from "../screens/Auth/ResetPassword.jsx";

// Debug/Demo components
import RoleBasedLoginDemo from "../components/RoleBasedLoginDemo.jsx";

// Admin screens
import AdminDashboard from "../screens/Admin/Dashboard.jsx";
import AdminUsers from "../screens/Admin/Users.jsx";
import ListingQueue from "../screens/Admin/ListingQueue.jsx";
import Category from "../screens/Admin/Categories.jsx";

// Chat screens (full screen, đặt ngoài layout để ẩn BottomTab)
import ChatList from "../screens/Customer/ChatList.jsx";
import ChatScreen from "../screens/Customer/ChatScreen.jsx";
import Payment from "../screens/Customer/Payment.jsx";

// Order detail (hiển thị trong layout để có BottomTab nếu muốn)
import OrderDetail from "../screens/Customer/OrderDetail.jsx";
import VerifyEmail from "../screens/Auth/VerifyEmail.jsx";

const NotFound = () => <div style={{ padding: 24 }}>404 — Not found</div>;

const router = createBrowserRouter([
  // Mặc định vào Login
  { path: "/", element: <Navigate to="/auth/login" replace /> },

  // Auth (public)
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/register", element: <Register /> },
  { path: "/auth/forgot", element: <ForgotPassword /> },
  { path: "/auth/reset-password", element: <ResetPassword /> },
  { path: "/auth/verify-email", element: <VerifyEmail /> },

  // Debug/Demo routes (remove in production)
  { path: "/debug/login-demo", element: <RoleBasedLoginDemo /> },

  // Full-screen (ngoài layout) — ẩn BottomTab
  { path: "/customer/messages", element: <ChatList /> },
  { path: "/customer/chat", element: <ChatScreen /> },
  // ✅ Alias cho nút Chat ở Profile
  { path: "/chat-list", element: <ChatList /> },

  // Admin dashboard (no CustomerLayout) - Protected routes
  { 
    path: "/admin/dashboard", 
    element: (
      <AdminRoute>
        <AdminDashboard />
      </AdminRoute>
    ) 
  },
  { 
    path: "/admin/users", 
    element: (
      <AdminRoute>
        <AdminUsers />
      </AdminRoute>
    ) 
  },
  { 
    path: "/admin/listing-queue", 
    element: (
      <AdminRoute>
        <ListingQueue />
      </AdminRoute>
    ) 
  },
  { 
    path: "/admin/category", 
    element: (
      <AdminRoute>
        <Category />
      </AdminRoute>
    ) 
  },

  // Payment (full-screen)
  { path: "/payment", element: <Payment /> },

  // App (customer) — qua layout (có BottomTab)
  {
    path: "/",
    element: <CustomerLayout />,
    errorElement: <NotFound />,
    children: [
      { path: "home", element: <Home /> },
      { path: "for-you", element: <ForYou /> },
      { path: "top-sellers", element: <TopSellers /> },
      { path: "new-items", element: <ListingNew /> },
      { path: "categories", element: <Categories /> },
      { path: "product/:id", element: <ProductDetail /> },
      { path: "search", element: <SearchResult /> },
      { path: "faq", element: <FAQ /> },
      { path: "mylist", element: <ListingMine /> },
      { path: "address", element: <Address /> },
      { path: "checkout", element: <Checkout /> },
      { path: "orders", element: <Orders /> },          // ✅ thêm route Orders
      { path: "order/:id", element: <OrderDetail /> },  // xem chi tiết đơn
      { path: "settings", element: <Settings /> },
      { path: "settings/edit-profile", element: <EditProfile /> },
      { path: "settings/change-password", element: <ChangePassword /> },

      // Chat integration within layout (có BottomTab)
      { path: "messages", element: <MessagesRedirect /> },

      // placeholders
      { path: "notifications", element: <ListNotification /> },
      { path: "sell/new", element: <UploadProduct /> },
      { path: "cart", element: <Cart /> },
      { path: "profile", element: <Profile /> },
    ],
  },

  // Fallback
  { path: "*", element: <NotFound /> },
]);

export default router;
export { router };
