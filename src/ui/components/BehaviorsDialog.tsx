import React from 'react';
import { BEHAVIOR_DEFINITIONS, BehaviorDefinition } from '../../model/definitions';
import { X, Plus, Search, Settings, Shield } from 'lucide-react';
import { ObjectType, Behavior } from '../../model/project';

interface BehaviorsDialogProps {
  objectType: ObjectType;
  onAdd: (type: string, name: string, defaults: any) => void;
  onRemove: (behaviorId: string) => void;
  onClose: () => void;
}

export const BehaviorsDialog: React.FC<BehaviorsDialogProps> = ({ objectType, onAdd, onRemove, onClose }) => {
  const [showAddList, setShowAddList] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredBehaviors = BEHAVIOR_DEFINITIONS.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} color="#007acc" />
            Behaviors: {objectType.name}
          </h3>
          <button onClick={onClose} style={closeButtonStyle}><X size={20} /></button>
        </div>

        <div style={contentStyle}>
          {showAddList ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '15px', borderBottom: '1px solid #333', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <Search size={14} color="#666" />
                <input 
                  autoFocus
                  placeholder="Search behaviors..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={searchInputStyle}
                />
                <button onClick={() => setShowAddList(false)} style={textButtonStyle}>Back</button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                {filteredBehaviors.map(b => (
                  <div 
                    key={b.type} 
                    onClick={() => { onAdd(b.type, b.name, b.defaultProperties); setShowAddList(false); }}
                    style={behaviorCardStyle}
                  >
                    <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px' }}>{b.name}</div>
                    <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{b.description}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                {objectType.behaviors.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {objectType.behaviors.map(b => (
                      <div key={b.id} style={activeBehaviorRowStyle}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', color: '#fff' }}>{b.name}</div>
                          <div style={{ fontSize: '11px', color: '#666' }}>{b.type}</div>
                        </div>
                        <button onClick={() => onRemove(b.id)} style={removeButtonStyle}>Remove</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={emptyStateStyle}>
                    <Shield size={48} style={{ opacity: 0.1, marginBottom: '15px' }} />
                    <div style={{ color: '#666' }}>No behaviors added to this object type.</div>
                  </div>
                )}
              </div>
              <div style={footerStyle}>
                <button onClick={() => setShowAddList(true)} style={addButtonStyle}>
                  <Plus size={14} /> Add new behavior
                </button>
              </div>
            </div>
          )}
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
  zIndex: 4000
};

const modalStyle: React.CSSProperties = {
  width: '500px',
  height: '400px',
  backgroundColor: '#1e1e1e',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #333',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '15px 20px',
  borderBottom: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#252526',
  color: '#fff'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden'
};

const footerStyle: React.CSSProperties = {
  padding: '15px 20px',
  borderTop: '1px solid #333',
  display: 'flex',
  justifyContent: 'flex-end'
};

const behaviorCardStyle: React.CSSProperties = {
  padding: '12px 15px',
  border: '1px solid #333',
  borderRadius: '6px',
  marginBottom: '10px',
  cursor: 'pointer',
  transition: 'border-color 0.2s',
  backgroundColor: '#252526'
};

const activeBehaviorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '10px 15px',
  backgroundColor: '#252526',
  border: '1px solid #333',
  borderRadius: '6px'
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#2d2d2d',
  border: '1px solid #444',
  borderRadius: '4px',
  padding: '6px 10px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none'
};

const addButtonStyle: React.CSSProperties = {
  backgroundColor: '#007acc',
  color: '#fff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '4px',
  fontWeight: 'bold',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '13px'
};

const removeButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#e74c3c',
  border: 'none',
  fontSize: '12px',
  cursor: 'pointer',
  padding: '5px'
};

const textButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#007acc',
  cursor: 'pointer',
  fontSize: '13px'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer'
};

const emptyStateStyle: React.CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center'
};
