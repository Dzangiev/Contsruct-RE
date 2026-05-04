import React from 'react';
import { State } from '../../model/project';
import { Plus, Trash2, X, Activity, Edit2 } from 'lucide-react';

interface StatesDialogProps {
  states: State[];
  initialStateId?: string | null;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: any) => void;
  onSetInitial: (id: string) => void;
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.8)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 10000,
  backdropFilter: 'blur(5px)'
};

const dialogStyle: React.CSSProperties = {
  width: '500px',
  maxHeight: '80vh',
  backgroundColor: '#1e1e1e',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
  border: '1px solid #333'
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const itemStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderBottom: '1px solid #252526',
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  backgroundColor: 'transparent'
};

export const StatesDialog: React.FC<StatesDialogProps> = ({ states, initialStateId, onAdd, onRemove, onUpdate, onSetInitial, onClose }) => {
  const [newName, setNewName] = React.useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(newName.trim());
      setNewName('');
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={dialogStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={16} color="#3498db" />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#fff' }}>State Machine</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={18} /></button>
        </div>

        <div style={{ padding: '16px', borderBottom: '1px solid #333', display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="New state name..." 
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            style={{ 
              flex: 1, 
              backgroundColor: '#252526', 
              border: '1px solid #444', 
              borderRadius: '4px', 
              color: '#fff', 
              padding: '6px 10px',
              fontSize: '12px'
            }}
          />
          <button 
            onClick={handleAdd}
            style={{ 
              backgroundColor: '#007acc', 
              color: '#fff', 
              border: 'none', 
              borderRadius: '4px', 
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            Add
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {states.map(state => (
            <div key={state.id} style={itemStyle}>
              <div 
                onClick={() => onSetInitial(state.id)}
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  borderRadius: '50%', 
                  border: '2px solid #3498db',
                  backgroundColor: initialStateId === state.id ? '#3498db' : 'transparent',
                  cursor: 'pointer'
                }} 
                title={initialStateId === state.id ? "Initial State" : "Set as Initial State"}
              />
              <input 
                type="text" 
                value={state.name}
                onChange={e => onUpdate(state.id, { name: e.target.value })}
                style={{ 
                  flex: 1, 
                  background: 'none', 
                  border: 'none', 
                  color: '#ccc', 
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
              <button 
                onClick={() => onRemove(state.id)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer' }}
                onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                onMouseLeave={e => e.currentTarget.style.color = '#555'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {states.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: '13px' }}>
              No states defined. Add a state to start the state machine.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
