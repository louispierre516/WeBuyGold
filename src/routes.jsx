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
import ProtectedRoute from "./ProtectedRoute";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* App Layout Wrapper */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={
              <Transactions/>}/>
          <Route path="categories" element={<Categories />} />
          <Route path="reports" element={<Reports />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="stores" element={<Stores />} />
          <Route path="users" element={<Users />} />
          <Route path="reconciliation" element={
              <Reconciliation />}/>
          <Route path="confirmations" element={<Confirmations />} />
          <Route
            path="/audit"
            element={
                <Audit />
            }
          />
        </Route>

        {/* Catch All */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
            // <ProtectedRoute allowedRoles={["confirmer", "admin"]}>
            // </ProtectedRoute>} />