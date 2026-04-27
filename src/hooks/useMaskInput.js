import { useState } from 'react'
import { applyMask, stripMask, MASKED_TYPES } from '../utils/masks'

/**
 * Hook for masked text inputs with local state.
 * - inputValue: formatted string for <input value={...}>
 * - handleChange: onChange handler
 * - rawValue: digits-only string to save to the database
 * - reset: clears the input
 * - setValue(raw): imperatively set rawValue (use when async data arrives after mount)
 *
 * IMPORTANT: initialValue is read once on mount. If the value comes from
 * async data, either gate rendering until data is ready (e.g. `if (!data) return null`)
 * or call setValue() once the data arrives.
 */
export function useMaskInput(type, initialValue = '') {
  const [rawValue, setRawValue] = useState(stripMask(String(initialValue || '')))

  if (process.env.NODE_ENV !== 'production' && type && !MASKED_TYPES.includes(type)) {
    console.warn(`useMaskInput: unknown mask type "${type}". Expected one of: ${MASKED_TYPES.join(', ')}`)
  }

  function handleChange(e) {
    setRawValue(stripMask(e.target.value))
  }

  function reset() {
    setRawValue('')
  }

  function setValue(val) {
    setRawValue(stripMask(String(val || '')))
  }

  return {
    inputValue: applyMask(rawValue, type),
    handleChange,
    rawValue,
    reset,
    setValue,
  }
}
