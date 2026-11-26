import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import NQL from './pages/NQL'
import Display from './pages/Display'
import Input from './pages/Input'
import UpdateBanner from './components/UpdateBanner'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <UpdateBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/nql" element={<NQL />} />
        <Route path="/display" element={<Display />} />
        <Route path="/input" element={<Input />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
