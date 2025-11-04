// src/main.tsx
import React from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import SignupPage from './pages/SignupPage'
import VerifyPage from './pages/VerifyPage'
import LoginPage from './pages/LoginPage'
import TasksPage from './pages/TasksPage'
import { AuthProvider } from './lib/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import './styles.css'

const qc = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/tasks" />} />
            <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
            <Route path="/verify" element={<PublicRoute><VerifyPage /></PublicRoute>} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
