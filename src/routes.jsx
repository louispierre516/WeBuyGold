import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Categories from "./pages/Categories";
import Reports from "./pages/Reports";
import PaymentMethods from "./pages/PaymentMethods";
import Confirmations from "./pages/Confirmations";
import Users from "./pages/Users";
import AppLayout from "./layout/AppLayout";
import Reconciliation from "./pages/Reconciliation";
import Audit from "./pages/Audit";
import Stores from "./pages/Stores";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/useAuth";

export default function AppRoutes() {
  const { user, role } = useAuth();  

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/" />} />

        {/* App Layout Wrapper */}

        <Route path="/" element={
          <AppLayout />
        }>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={
            <ProtectedRoute allowedRoles={["admin", "buyer"]}>
              <Transactions />
            </ProtectedRoute>
          } />
          <Route path="categories" element={<Categories />} />
          <Route path="reports" element={<Reports />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="stores" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Stores />
            </ProtectedRoute>
          } />
          <Route path="users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="reconciliation" element={
            <ProtectedRoute allowedRoles={["admin", "cashier"]}>
              <Reconciliation />
            </ProtectedRoute>
          } />
          <Route path="confirmations" element={<Confirmations />} />
          <Route
            path="/audit"
            element={
              <ProtectedRoute allowedRoles={['admin']}><Audit /></ProtectedRoute>
            }
          />
        </Route>


        {/* Catch All */}
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
// <ProtectedRoute allowedRoles={["confirmer", "admin"]}>
// </ProtectedRoute>} />