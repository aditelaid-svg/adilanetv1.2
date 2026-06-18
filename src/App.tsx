import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './AppContext';
import { ToastProvider } from './components/Toast';
import PwaInstallPrompt from './components/PwaInstallPrompt';

import UserLayout from './components/UserLayout';
import AdminLayout from './components/AdminLayout';

import Login from './pages/Login';
import Register from './pages/Register';
import PublicBuy from './pages/PublicBuy';

import UserHome from './pages/user/UserHome';
import UserPackages from './pages/user/UserPackages';
import UserBuy from './pages/user/UserBuy';
import UserHistory from './pages/user/UserHistory';
import UserProfile from './pages/user/UserProfile';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminRouters from './pages/admin/AdminRouters';
import AdminPackages from './pages/admin/AdminPackages';
import AdminTransactions from './pages/admin/AdminTransactions';
import AdminVouchers from './pages/admin/AdminVouchers';
import AdminSettings from './pages/admin/AdminSettings';
import AdminUsers from './pages/admin/AdminUsers';

function AppRoutes() {
  const { currentUser } = useAppContext();

  return (
    <Routes>
      <Route path="/checkout/:packageId" element={<PublicBuy />} />
      <Route path="/login" element={!currentUser ? <Login /> : <Navigate to={currentUser.role !== 'user' ? '/admin' : '/user'} replace />} />
      <Route path="/register" element={!currentUser ? <Register /> : <Navigate to={currentUser.role !== 'user' ? '/admin' : '/user'} replace />} />

      {currentUser && currentUser.role !== 'user' && (
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="routers" element={<AdminRouters />} />
          <Route path="packages" element={<AdminPackages />} />
          <Route path="transactions" element={<AdminTransactions />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="vouchers" element={<AdminVouchers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      )}

      {currentUser?.role === 'user' && (
        <Route path="/user" element={<UserLayout />}>
          <Route index element={<UserHome />} />
          <Route path="packages" element={<UserPackages />} />
          <Route path="buy" element={<UserBuy />} />
          <Route path="history" element={<UserHistory />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="*" element={<Navigate to="/user" replace />} />
        </Route>
      )}

      <Route path="/" element={<Navigate to={!currentUser ? '/login' : currentUser.role !== 'user' ? '/admin' : '/user'} replace />} />
      <Route path="*" element={<Navigate to={!currentUser ? '/login' : currentUser.role !== 'user' ? '/admin' : '/user'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
          <PwaInstallPrompt />
        </BrowserRouter>
      </ToastProvider>
    </AppProvider>
  );
}
