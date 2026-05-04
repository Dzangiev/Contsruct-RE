import React from 'react';
import { createPortal } from 'react-dom';
import { X, Folder } from 'lucide-react';

interface GroupDialogProps {
  isOpen: boolean;
  initialName?: string;
  initialDescription?: string;
  initialActiveOnStart?: boolean;
  onSave: (name: string, description: string, activeOnStart: boolean) => void;
  onCancel: () => void;
}

export const GroupDialog: React.FC<GroupDialogProps> = ({
  isOpen,
  initialName = 'Group',
  initialDescription = '',
  initialActiveOnStart = true,
  onSave,
  onCancel
}) => {
  const [name, setName] = React.useState(initialName);
  const [description, setDescription] = React.useState(initialDescription);
  const [activeOnStart, setActiveOnStart] = React.useState(initialActiveOnStart);

  if (!isOpen) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave(name, description, activeOnStart);
  };

  const modal = (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ backgroundColor: '#007acc', padding: '4px', borderRadius: '4px' }}>
              <Folder size={16} color="#fff" />
            </div>
            <span style={{ fontWeight: 600 }}>Group properties</span>
          </div>
          <button onClick={onCancel} style={closeButtonStyle}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} style={contentStyle}>
          <div style={rowStyle}>
            <label style={labelStyle}>Name</label>
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ ...inputStyle, resize: 'none', height: '80px' }}
            />
          </div>

          <div style={{ ...rowStyle, justifyContent: 'flex-start' }}>
            <label style={labelStyle}>Active on start</label>
            <input 
              type="checkbox"
              checked={activeOnStart}
              onChange={(e) => setActiveOnStart(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#007acc' }}
            />
          </div>
        </form>

        <div style={footerStyle}>
          <button onClick={onCancel} style={cancelButtonStyle}>Cancel</button>
          <button onClick={() => handleSubmit()} style={saveButtonStyle}>OK</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#2d2d2d',
  borderRadius: '6px',
  width: '450px',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #444',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#252526',
  borderBottom: '1px solid #333',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '13px',
  color: '#fff'
};

const contentStyle: React.CSSProperties = {
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '130px 1fr',
  alignItems: 'center',
  gap: '16px'
};

const labelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#aaa',
  textAlign: 'right'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#1e1e1e',
  border: '1px solid #444',
  color: '#fff',
  padding: '6px 10px',
  borderRadius: '4px',
  fontSize: '12px',
  outline: 'none'
};

const footerStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#252526',
  borderTop: '1px solid #333',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '8px'
};

const cancelButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#ccc',
  border: '1px solid #555',
  padding: '6px 20px',
  borderRadius: '4px',
  fontSize: '12px',
  cursor: 'pointer'
};

const saveButtonStyle: React.CSSProperties = {
  backgroundColor: '#007acc',
  color: '#fff',
  border: 'none',
  padding: '6px 24px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: 'bold',
  cursor: 'pointer'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};
