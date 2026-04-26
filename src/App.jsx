import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Inscricao } from './pages/public/Inscricao'
import { Ficha } from './pages/public/Ficha'
import { Checkin } from './pages/public/Checkin'
import { Login } from './pages/admin/Login'
import { SeletorEncontro } from './pages/admin/SeletorEncontro'
import { CRM } from './pages/admin/CRM'
import { EncontristaDetalhe } from './pages/admin/EncontristaDetalhe'
import { Grupos } from './pages/admin/Grupos'
import { CheckinAdmin } from './pages/admin/CheckinAdmin'
import { Configuracoes } from './pages/admin/Configuracoes'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/inscricao/:encontroId" element={<Inscricao />} />
        <Route path="/ficha/:token" element={<Ficha />} />
        <Route path="/checkin/:token" element={<Checkin />} />

        {/* Admin */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<ProtectedRoute><SeletorEncontro /></ProtectedRoute>} />
        <Route path="/admin/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/admin/crm/:id" element={<ProtectedRoute><EncontristaDetalhe /></ProtectedRoute>} />
        <Route path="/admin/grupos" element={<ProtectedRoute><Grupos /></ProtectedRoute>} />
        <Route path="/admin/checkin" element={<ProtectedRoute><CheckinAdmin /></ProtectedRoute>} />
        <Route path="/admin/configuracoes" element={<ProtectedRoute><Configuracoes /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
