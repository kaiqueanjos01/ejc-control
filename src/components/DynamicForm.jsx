export function DynamicForm({ campos, valores, onChange }) {
  function handleChange(chave, value) {
    onChange({ ...valores, [chave]: value })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {campos.map(campo => (
        <div key={campo.id}>
          <label style={{ display: 'block', fontSize: 12, color: '#aaa', marginBottom: 4 }}>
            {campo.label}{campo.obrigatorio && ' *'}
          </label>
          {campo.tipo === 'select' ? (
            <select
              value={valores[campo.chave] ?? ''}
              onChange={e => handleChange(campo.chave, e.target.value)}
              required={campo.obrigatorio}
              style={inputStyle}
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
              style={inputStyle}
            />
          )}
        </div>
      ))}
    </div>
  )
}

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #333',
  background: '#1a1a1a',
  color: '#e0e0e0',
  fontSize: 14,
}
