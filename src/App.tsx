import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import EvaluationForm from './views/EvaluationForm';
import UserManagement from './views/UserManagement';
import EmployeeProfiles from './views/EmployeeProfiles';
import HRSettings from './views/HRSettings';
import CriteriaManagement from './views/CriteriaManagement';
import SelfEvalCriteriaManagement from './views/SelfEvalCriteriaManagement';
import AuditLogs from './views/AuditLogs';
import DataManagement from './views/DataManagement';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="evaluation" element={<EvaluationForm />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="employees" element={<EmployeeProfiles />} />
              <Route path="hr-settings" element={<HRSettings />} />
              <Route path="settings" element={<CriteriaManagement />} />
              <Route path="self-eval-settings" element={<SelfEvalCriteriaManagement />} />
              <Route path="audit-logs" element={<AuditLogs />} />
              <Route path="data-management" element={<DataManagement />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

