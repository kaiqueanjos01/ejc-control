import { useState, useEffect } from 'react'
import { obterAdminAtual } from '../services/adminUsers'

export function useAdminRole() {
  const [adminUser, setAdminUser] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregarRole() {
      try {
        const user = await obterAdminAtual()
        setAdminUser(user)
        setRole(user?.role || null)
      } catch (error) {
        console.error('Erro ao carregar role:', error)
      } finally {
        setLoading(false)
      }
    }

    carregarRole()
  }, [])

  return { adminUser, role, loading }
}
