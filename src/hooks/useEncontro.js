import { useState, useCallback } from 'react'

const STORAGE_KEY = 'ejc_encontro_ativo'

export function useEncontro() {
  const [encontroId, setEncontroIdState] = useState(
    () => localStorage.getItem(STORAGE_KEY)
  )

  const setEncontroId = useCallback((id) => {
    if (id) {
      localStorage.setItem(STORAGE_KEY, id)
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
    setEncontroIdState(id)
  }, [])

  return { encontroId, setEncontroId }
}
