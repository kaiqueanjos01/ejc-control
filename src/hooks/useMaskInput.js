import { useState } from 'react'
import { applyMask, stripMask } from '../utils/masks'

/**
 * Hook for masked text inputs with local state.
 * - inputValue: formatted string for <input value={...}>
 * - handleChange: onChange handler
 * - rawValue: digits-only string to save to the database
 * - reset: clears the input
 */
export function useMaskInput(type, initialValue = '') {
  const [rawValue, setRawValue] = useState(stripMask(String(initialValue || '')))

  function handleChange(e) {
    setRawValue(stripMask(e.target.value))
  }

  function reset() {
    setRawValue('')
  }

  return {
    inputValue: applyMask(rawValue, type),
    handleChange,
    rawValue,
    reset,
  }
}
