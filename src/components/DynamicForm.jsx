export function DynamicForm({ campos, valores, onChange }) {
  function handleChange(chave, value) {
    onChange({ ...valores, [chave]: value })
  }

  return (
    <div className="dynamic-form">
      {campos.map(campo => (
        <div key={campo.id} className="form-group">
          <label className={`form-label ${campo.obrigatorio ? 'required' : ''}`}>
            {campo.label}
          </label>
          {campo.tipo === 'select' ? (
            <select
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value)}
              required={campo.obrigatorio}
              className="form-select"
            >
              <option value="">Selecionar...</option>
              {(campo.opcoes ?? []).map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          ) : (
            <input
              type={campo.tipo === 'date' ? 'date' : campo.tipo === 'number' ? 'number' : 'text'}
              inputMode={campo.tipo === 'phone' ? 'tel' : undefined}
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value)}
              required={campo.obrigatorio}
              className="form-input"
            />
          )}
        </div>
      ))}
    </div>
  )
}
