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
import { Formulario } from './pages/admin/Formulario'
import { Equipe } from './pages/admin/Equipe'
import { AceitarConvite } from './pages/admin/AceitarConvite'
import { Financeiro } from './pages/admin/Financeiro'

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
        <Route path="/admin/convite/:token" element={<AceitarConvite />} />
        <Route path="/admin" element={<ProtectedRoute><SeletorEncontro /></ProtectedRoute>} />
        <Route path="/admin/crm" element={<ProtectedRoute requiredPermission="canViewCRM"><CRM /></ProtectedRoute>} />
        <Route path="/admin/crm/:id" element={<ProtectedRoute requiredPermission="canViewCRM"><EncontristaDetalhe /></ProtectedRoute>} />
        <Route path="/admin/grupos" element={<ProtectedRoute requiredPermission="canViewGrupos"><Grupos /></ProtectedRoute>} />
        <Route path="/admin/checkin" element={<ProtectedRoute requiredPermission="canViewCheckin"><CheckinAdmin /></ProtectedRoute>} />
        <Route path="/admin/formulario" element={<ProtectedRoute requiredPermission="canViewFormulario"><Formulario /></ProtectedRoute>} />
        <Route path="/admin/equipe" element={<ProtectedRoute requiredPermission="canViewEquipe"><Equipe /></ProtectedRoute>} />
        <Route path="/admin/configuracoes" element={<ProtectedRoute requiredPermission="canViewFormulario"><Configuracoes /></ProtectedRoute>} />
        <Route path="/admin/financeiro" element={<ProtectedRoute requiredPermission="canViewFinanceiro"><Financeiro /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
