import { applyMask, stripMask, MASKED_TYPES } from '../utils/masks'

export function DynamicForm({ campos, valores, onChange }) {
  function handleChange(chave, eventValue, tipo) {
    let stored = eventValue
    // currency uses type="number" — preserve decimal, don't strip
    if (MASKED_TYPES.includes(tipo) && tipo !== 'currency') {
      stored = stripMask(eventValue)
    }
    onChange({ ...valores, [chave]: stored })
  }

  return (
    <div className="dynamic-form">
      {campos.map(campo => (
        <div key={campo.id} className={`form-group ${campo.tipo === 'checkbox' ? 'form-group--checkbox' : ''}`}>
          {campo.tipo !== 'checkbox' && (
            <label className={`form-label ${campo.obrigatorio ? 'required' : ''}`}>
              {campo.label}
            </label>
          )}

          {campo.tipo === 'select' ? (
            <select
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-select"
            >
              <option value="">Selecionar...</option>
              {(campo.opcoes ?? []).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>

          ) : campo.tipo === 'textarea' ? (
            <textarea
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
              rows={3}
            />

          ) : campo.tipo === 'checkbox' ? (
            <label className="config-checkbox-label">
              <input
                type="checkbox"
                checked={!!valores[campo.chave]}
                onChange={e => handleChange(campo.chave, e.target.checked, campo.tipo)}
              />
              {campo.label}
            </label>

          ) : campo.tipo === 'currency' ? (
            <input
              type="number"
              step="0.01"
              min="0"
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
              placeholder="0,00"
            />

          ) : MASKED_TYPES.includes(campo.tipo) ? (
            <input
              type="text"
              inputMode={campo.tipo === 'phone' ? 'tel' : 'numeric'}
              value={applyMask(valores[campo.chave] ?? '', campo.tipo)}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
            />

          ) : (
            <input
              type={campo.tipo === 'date' ? 'date' : campo.tipo === 'number' ? 'number' : 'text'}
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value, campo.tipo)}
              required={campo.obrigatorio}
              className="form-input"
            />
          )}
        </div>
      ))}
    </div>
  )
}
