import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { RequireRole } from "./components/RouteGuards";

import Landing from "./features/public/pages/Landing";
import HowItWorks from "./features/public/pages/HowItWorks";
import Regulatory from "./features/public/pages/Regulatory";
import Pricing from "./features/public/pages/Pricing";
import Contact from "./features/public/pages/Contact";

import Login from "./features/auth/pages/Login";
import SignUp from "./features/auth/pages/SignUp";
import VerifyEmail from "./features/auth/pages/VerifyEmail";
import OtpVerification from "./features/auth/pages/OtpVerification";
import ForgotPassword from "./features/auth/pages/ForgotPassword";
import ResetPassword from "./features/auth/pages/ResetPassword";

import Overview from "./features/exporter/pages/Overview";
import Invoices from "./features/exporter/pages/Invoices";
import InvoiceDetail from "./features/exporter/pages/InvoiceDetail";
import Pools from "./features/exporter/pages/Pools";
import HedgeDetail from "./features/exporter/pages/HedgeDetail";
import Settlements from "./features/exporter/pages/Settlements";
import History from "./features/exporter/pages/History";
import Profile from "./features/exporter/pages/Profile";

import AdminOverview from "./features/admin/pages/AdminOverview";
import AdminUsers from "./features/admin/pages/AdminUsers";
import AdminInvoices from "./features/admin/pages/AdminInvoices";
import AdminPools from "./features/admin/pages/AdminPools";
import AdminPoolDetail from "./features/admin/pages/AdminPoolDetail";
import AdminAnalytics from "./features/admin/pages/AdminAnalytics";
import AdminSettings from "./features/admin/pages/AdminSettings";
import AdminBanks from "./features/admin/pages/AdminBanks";

// Bank
import BankPools from "./features/bank/pages/BankPools";
import BankPoolDetail from "./features/bank/pages/BankPoolDetail";

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
          <Route
            path="/admin/banks"
            element={
              <RequireRole role="admin">
                <AdminBanks />
              </RequireRole>
            }
          />
          
          {/* Bank console */}
          <Route
            path="/bank/pools"
            element={
              <RequireRole role="bank">
                <BankPools />
              </RequireRole>
            }
          />
          <Route
            path="/bank/pools/:id"
            element={
              <RequireRole role="bank">
                <BankPoolDetail />
              </RequireRole>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
