import React from 'react';
import { X } from 'lucide-react';

interface SimpleModalProps {
  title: string;
  message?: string;
  type: 'prompt' | 'confirm' | 'alert';
  defaultValue?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

export const SimpleModal: React.FC<SimpleModalProps> = ({ title, message, type, defaultValue, onConfirm, onCancel }) => {
  const [value, setValue] = React.useState(defaultValue || '');
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (type === 'prompt') {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 10);
    }
  }, [type]);

  const handleConfirm = () => {
    if (type === 'prompt') onConfirm(value);
    else onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleConfirm();
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700 }}>{title}</span>
          </div>
          <button onClick={onCancel} style={closeButtonStyle}><X size={16} /></button>
        </div>
        
        <div style={contentStyle}>
          {message && <div style={{ marginBottom: '16px', fontSize: '13px', color: '#ccc', lineHeight: 1.5 }}>{message}</div>}
          {type === 'prompt' && (
            <div style={{ position: 'relative' }}>
              <input 
                ref={inputRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                style={inputStyle}
                placeholder="Type here..."
              />
            </div>
          )}
        </div>
        
        <div style={footerStyle}>
          <button onClick={onCancel} style={cancelButtonStyle}>Cancel</button>
          <button onClick={handleConfirm} style={confirmButtonStyle}>OK</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(2px)'
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#2d2d2d',
  borderRadius: '8px',
  width: '400px',
  maxWidth: '90vw',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
  border: '1px solid #3e3e42',
  display: 'flex',
  flexDirection: 'column',
  animation: 'modalEnter 0.2s ease-out'
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #3e3e42',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '14px',
  color: '#fff'
};

const contentStyle: React.CSSProperties = {
  padding: '24px 16px',
  display: 'flex',
  flexDirection: 'column'
};

const footerStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#252526',
  borderTop: '1px solid #3e3e42',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px',
  borderBottomLeftRadius: '8px',
  borderBottomRightRadius: '8px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1e1e1e',
  border: '1px solid #3e3e42',
  borderRadius: '4px',
  padding: '8px 12px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '4px',
  borderRadius: '4px'
};

const confirmButtonStyle: React.CSSProperties = {
  backgroundColor: '#007acc',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 20px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
};

const cancelButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#ccc',
  border: '1px solid #444',
  borderRadius: '4px',
  padding: '6px 20px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
};
