import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Chats from "./pages/Chats";
import Funnel from "./pages/Funnel";
import Contacts from "./pages/Contacts";
import Tasks from "./pages/Tasks";
import Products from "./pages/Products";
import Invoices from "./pages/Invoices";
import Inventory from "./pages/Inventory";
import AvitoAccounts from "./pages/settings/AvitoAccounts";
import PipelineStages from "./pages/settings/PipelineStages";
import Templates from "./pages/settings/Templates";
import Users from "./pages/settings/Users";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Navigate to="/chats" replace />} />
      <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
      <Route path="/funnel" element={<ProtectedRoute><Funnel /></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><Contacts /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />

      <Route path="/settings/avito" element={<ProtectedRoute><AvitoAccounts /></ProtectedRoute>} />
      <Route path="/settings/pipeline" element={<ProtectedRoute><PipelineStages /></ProtectedRoute>} />
      <Route path="/settings/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
      <Route path="/settings/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/chats" replace />} />
    </Routes>
  );
}
