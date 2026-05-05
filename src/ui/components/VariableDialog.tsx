import React from 'react';
import { Variable, X } from 'lucide-react';
import { InstanceVariable, GlobalVariable } from '../../model/project';
import { sanitizeName, isValidName } from '../../utils/naming';
import { useEditorStore } from '../../store/useEditorStore';
import { getTranslation } from '../../i18n';

interface VariableDialogProps {
  title: string;
  variable?: Partial<InstanceVariable | GlobalVariable>;
  existingNames: string[];
  onSave: (updates: any) => void;
  onCancel: () => void;
  showStaticConstant?: boolean;
}

export const VariableDialog: React.FC<VariableDialogProps> = ({ 
  title, variable, existingNames, onSave, onCancel, showStaticConstant = false
}) => {
  const { editorState } = useEditorStore();
  const t = getTranslation(editorState.language);

  const getDefaultName = () => {
    let i = 1;
    while (existingNames.includes(`${t.VARIABLE}${i}`)) i++;
    return `${t.VARIABLE}${i}`;
  };

  const [name, setName] = React.useState(variable?.name || getDefaultName());
  const [type, setType] = React.useState(variable?.type || 'number');
  const [initialValue, setInitialValue] = React.useState(variable?.initialValue ?? 0);
  const [description, setDescription] = React.useState(variable?.description || '');
  const [isStatic, setIsStatic] = React.useState(variable?.isStatic || false);
  const [isConstant, setIsConstant] = React.useState(variable?.isConstant || false);
  const [error, setError] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return setError(t.NAME_CANNOT_EMPTY);
    if (!isValidName(name)) return setError(t.INVALID_NAME_FORMAT);
    
    // Check for uniqueness (excluding current name if editing)
    if (name !== variable?.name && existingNames.includes(name)) {
      return setError(t.VARIABLE_ALREADY_EXISTS);
    }

    onSave({ name, type, initialValue, description, isStatic, isConstant });
  };

  const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#888', width: '130px', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '20px' };
  const inputBaseStyle: React.CSSProperties = { backgroundColor: '#181818', border: '1px solid #333', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none', flex: 1, transition: 'border-color 0.2s' };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...modalStyle, width: '500px', padding: '0', overflow: 'hidden', backgroundColor: '#252526', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid #444' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#3498db', padding: '6px', borderRadius: '6px' }}><Variable size={18} color="#fff" /></div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{title}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{t.CONFIGURE_VARIABLE}</div>
          </div>
          <button onClick={onCancel} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><X size={20} /></button>
        </div>

        <div style={{ padding: '32px 40px 24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={rowStyle}>
              <label style={labelStyle}>{t.NAME}</label>
              <input 
                ref={inputRef}
                autoFocus 
                value={name} 
                onChange={e => { setName(e.target.value); setError(null); }} 
                style={{ ...inputBaseStyle, borderColor: error ? '#f44336' : '#333' }} 
              />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>{t.TYPE}</label>
              <select value={type} onChange={e => setType(e.target.value as any)} style={inputBaseStyle}>
                <option value="number">{t.TYPE_NUMBER || 'Number'}</option>
                <option value="string">{t.TYPE_STRING || 'String'}</option>
                <option value="boolean">{t.TYPE_BOOLEAN || 'Boolean'}</option>
              </select>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>{t.INITIAL_VALUE}</label>
              {type === 'boolean' ? (
                <select value={String(initialValue)} onChange={e => setInitialValue(e.target.value === 'true')} style={inputBaseStyle}>
                  <option value="true">{t.TRUE}</option>
                  <option value="false">{t.FALSE}</option>
                </select>
              ) : (
                <input 
                  type={type === 'number' ? 'number' : 'text'}
                  value={initialValue} 
                  onChange={e => setInitialValue(type === 'number' ? Number(e.target.value) : e.target.value)} 
                  style={inputBaseStyle} 
                />
              )}
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>{t.DESCRIPTION}</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder={t.OPTIONAL_DESCRIPTION} style={inputBaseStyle} />
            </div>

            {showStaticConstant && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '150px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setIsStatic(!isStatic)}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: isStatic ? '#007acc' : '#1e1e1e', border: '1px solid #444', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isStatic && <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '1px' }} />}
                  </div>
                  <span style={{ fontSize: '13px', color: isStatic ? '#fff' : '#888', fontWeight: isStatic ? 600 : 400 }}>{t.STATIC}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setIsConstant(!isConstant)}>
                  <div style={{ width: '16px', height: '16px', backgroundColor: isConstant ? '#007acc' : '#1e1e1e', border: '1px solid #444', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isConstant && <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '1px' }} />}
                  </div>
                  <span style={{ fontSize: '13px', color: isConstant ? '#fff' : '#888', fontWeight: isConstant ? 600 : 400 }}>{t.CONSTANT}</span>
                </div>
              </div>
            )}

            {error && <div style={{ fontSize: '12px', color: '#f44336', paddingLeft: '150px', marginTop: '-10px' }}>{error}</div>}
          </form>
        </div>

        <div style={{ padding: '16px 24px', backgroundColor: '#2d2d2d', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button onClick={onCancel} style={cancelButtonStyle}>{t.CANCEL}</button>
          <button onClick={() => handleSubmit()} style={saveButtonStyle}>{t.OK}</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 5000,
  backdropFilter: 'blur(4px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #333',
  overflow: 'hidden'
};

const cancelButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#aaa',
  border: '1px solid #444',
  padding: '8px 20px',
  borderRadius: '4px',
  fontSize: '13px',
  cursor: 'pointer'
};

const saveButtonStyle: React.CSSProperties = {
  backgroundColor: '#007acc',
  color: '#fff',
  border: 'none',
  padding: '8px 24px',
  borderRadius: '4px',
  fontSize: '13px',
  fontWeight: 'bold',
  cursor: 'pointer'
};
