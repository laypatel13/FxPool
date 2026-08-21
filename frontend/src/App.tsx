import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { RequireRole } from "./components/RouteGuards";

import Landing from "./pages/public/Landing";
import HowItWorks from "./pages/public/HowItWorks";
import Regulatory from "./pages/public/Regulatory";
import Pricing from "./pages/public/Pricing";
import Contact from "./pages/public/Contact";

import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import VerifyEmail from "./pages/auth/VerifyEmail";
import OtpVerification from "./pages/auth/OtpVerification";
import ForgotPassword from "./pages/auth/ForgotPassword";
import ResetPassword from "./pages/auth/ResetPassword";

import Overview from "./pages/app/Overview";
import Invoices from "./pages/app/Invoices";
import InvoiceDetail from "./pages/app/InvoiceDetail";
import Pools from "./pages/app/Pools";
import HedgeDetail from "./pages/app/HedgeDetail";
import Settlements from "./pages/app/Settlements";
import History from "./pages/app/History";
import Profile from "./pages/app/Profile";

import AdminOverview from "./pages/admin/AdminOverview";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminInvoices from "./pages/admin/AdminInvoices";
import AdminPools from "./pages/admin/AdminPools";
import AdminPoolDetail from "./pages/admin/AdminPoolDetail";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSettings from "./pages/admin/AdminSettings";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public marketing site */}
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/regulatory" element={<Regulatory />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/contact" element={<Contact />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/verify-otp" element={<OtpVerification />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Exporter dashboard */}
          <Route
            path="/app"
            element={
              <RequireRole role="exporter">
                <Overview />
              </RequireRole>
            }
          />
          <Route
            path="/app/invoices"
            element={
              <RequireRole role="exporter">
                <Invoices />
              </RequireRole>
            }
          />
          <Route
            path="/app/invoices/:id"
            element={
              <RequireRole role="exporter">
                <InvoiceDetail />
              </RequireRole>
            }
          />
          <Route
            path="/app/pools"
            element={
              <RequireRole role="exporter">
                <Pools />
              </RequireRole>
            }
          />
          <Route
            path="/app/pools/:id"
            element={
              <RequireRole role="exporter">
                <HedgeDetail />
              </RequireRole>
            }
          />
          <Route
            path="/app/settlements"
            element={
              <RequireRole role="exporter">
                <Settlements />
              </RequireRole>
            }
          />
          <Route
            path="/app/history"
            element={
              <RequireRole role="exporter">
                <History />
              </RequireRole>
            }
          />
          <Route
            path="/app/profile"
            element={
              <RequireRole role="exporter">
                <Profile />
              </RequireRole>
            }
          />

          {/* Admin console */}
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminOverview />
              </RequireRole>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireRole role="admin">
                <AdminUsers />
              </RequireRole>
            }
          />
          <Route
            path="/admin/invoices"
            element={
              <RequireRole role="admin">
                <AdminInvoices />
              </RequireRole>
            }
          />
          <Route
            path="/admin/pools"
            element={
              <RequireRole role="admin">
                <AdminPools />
              </RequireRole>
            }
          />
          <Route
            path="/admin/pools/:id"
            element={
              <RequireRole role="admin">
                <AdminPoolDetail />
              </RequireRole>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <RequireRole role="admin">
                <AdminAnalytics />
              </RequireRole>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireRole role="admin">
                <AdminSettings />
              </RequireRole>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
