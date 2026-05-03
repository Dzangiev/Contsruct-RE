import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { X, Check, Search, Package } from 'lucide-react';
import { Family } from '../../model/project';

interface FamilyMembersDialogProps {
  family: Family;
  onClose: () => void;
}

export const FamilyMembersDialog: React.FC<FamilyMembersDialogProps> = ({ family, onClose }) => {
  const { project, addFamilyObjectType, removeFamilyObjectType } = useEditorStore();
  const [searchTerm, setSearchTerm] = React.useState('');

  const members = project.objectTypes.filter(ot => family.objectTypeIds.includes(ot.id));
  const nonMembers = project.objectTypes.filter(ot => !family.objectTypeIds.includes(ot.id));

  const filteredNonMembers = nonMembers.filter(ot => 
    ot.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={overlayStyle}>
      <div style={dialogStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 'bold' }}>Manage Family: {family.name}</span>
          <button onClick={onClose} style={closeButtonStyle}><X size={18} /></button>
        </div>

        <div style={contentStyle}>
          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Family Members</div>
            <div style={listStyle}>
              {members.map(ot => (
                <div key={ot.id} style={itemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <Package size={14} color="#666" />
                    <span>{ot.name}</span>
                  </div>
                  <button 
                    onClick={() => removeFamilyObjectType(family.id, ot.id)}
                    style={removeButtonStyle}
                  >
                    Remove
                  </button>
                </div>
              ))}
              {members.length === 0 && <div style={emptyStyle}>No members in this family.</div>}
            </div>
          </div>

          <div style={dividerStyle} />

          <div style={sectionStyle}>
            <div style={sectionHeaderStyle}>Available Object Types</div>
            <div style={searchContainerStyle}>
              <Search size={14} color="#666" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={searchInputStyle}
              />
            </div>
            <div style={listStyle}>
              {filteredNonMembers.map(ot => (
                <div key={ot.id} style={itemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                    <Package size={14} color="#666" />
                    <span>{ot.name}</span>
                  </div>
                  <button 
                    onClick={() => addFamilyObjectType(family.id, ot.id)}
                    style={addButtonStyle}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={footerStyle}>
          <button onClick={onClose} style={doneButtonStyle}>Done</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000,
  backdropFilter: 'blur(2px)'
};

const dialogStyle: React.CSSProperties = {
  width: '500px',
  backgroundColor: '#2d2d2d',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
  border: '1px solid #444',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  padding: '16px',
  borderBottom: '1px solid #444',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#383839'
};

const contentStyle: React.CSSProperties = {
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  maxHeight: '60vh',
  overflowY: 'auto'
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 800,
  textTransform: 'uppercase',
  color: '#888',
  letterSpacing: '0.5px'
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  backgroundColor: '#1e1e1e',
  borderRadius: '4px',
  padding: '4px',
  minHeight: '100px'
};

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 12px',
  backgroundColor: '#2d2d2d',
  borderRadius: '3px',
  fontSize: '13px',
  color: '#ccc'
};

const searchContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  backgroundColor: '#1e1e1e',
  borderRadius: '4px',
  border: '1px solid #444'
};

const searchInputStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
  fontSize: '13px',
  outline: 'none',
  width: '100%'
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: '#444'
};

const emptyStyle: React.CSSProperties = {
  padding: '20px',
  textAlign: 'center',
  color: '#555',
  fontSize: '13px',
  fontStyle: 'italic'
};

const footerStyle: React.CSSProperties = {
  padding: '16px',
  borderTop: '1px solid #444',
  display: 'flex',
  justifyContent: 'flex-end',
  backgroundColor: '#383839'
};

const doneButtonStyle: React.CSSProperties = {
  padding: '8px 24px',
  backgroundColor: '#007acc',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 600,
  fontSize: '13px'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  padding: '4px'
};

const addButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#27ae60',
  color: '#fff',
  border: 'none',
  borderRadius: '3px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer'
};

const removeButtonStyle: React.CSSProperties = {
  padding: '4px 12px',
  backgroundColor: '#c0392b',
  color: '#fff',
  border: 'none',
  borderRadius: '3px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer'
};
