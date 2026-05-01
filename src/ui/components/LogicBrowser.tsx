import React from 'react';
import { Project, ObjectType } from '../../model/project';
import { LogicDefinition, CONDITIONS, ACTIONS } from '../../model/definitions';
import { Search, ChevronRight } from 'lucide-react';

interface LogicBrowserProps {
  project: Project;
  mode: 'condition' | 'action';
  onSelect: (targetObjectTypeId: string | undefined, type: string, params: any[]) => void;
  onClose: () => void;
}

export const LogicBrowser: React.FC<LogicBrowserProps> = ({ project, mode, onSelect, onClose }) => {
  const [step, setStep] = React.useState<'object' | 'logic'>('object');
  const [selectedObjectType, setSelectedObjectType] = React.useState<ObjectType | undefined>(undefined);
  const [searchTerm, setSearchTerm] = React.useState('');

  const items = mode === 'condition' ? CONDITIONS : ACTIONS;
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleObjectSelect = (ot: ObjectType | undefined) => {
    setSelectedObjectType(ot);
    setStep('logic');
    setSearchTerm('');
  };

  const handleLogicSelect = (def: LogicDefinition) => {
    const defaultParams = def.params.map(p => p.defaultValue);
    onSelect(selectedObjectType?.id, def.type, defaultParams);
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3 style={{ margin: 0, fontSize: '14px' }}>
            {step === 'object' ? 'Select Object' : `Select ${mode === 'condition' ? 'Condition' : 'Action'} for ${selectedObjectType?.name || 'System'}`}
          </h3>
          <button onClick={onClose} style={closeButtonStyle}>×</button>
        </div>

        <div style={searchContainerStyle}>
          <Search size={14} style={{ position: 'absolute', left: '10px', color: '#666' }} />
          <input 
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            style={inputStyle}
          />
        </div>

        <div style={contentStyle}>
          {step === 'object' ? (
            <div style={listStyle}>
              <div 
                style={itemStyle} 
                onClick={() => handleObjectSelect(undefined)}
              >
                <div style={iconPlaceholder}>S</div>
                <span>System</span>
                <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#555' }} />
              </div>
              {project.objectTypes.filter(ot => ot.name.toLowerCase().includes(searchTerm.toLowerCase())).map(ot => (
                <div 
                  key={ot.id} 
                  style={itemStyle} 
                  onClick={() => handleObjectSelect(ot)}
                >
                  <div style={iconPlaceholder}>{ot.name[0]}</div>
                  <span>{ot.name}</span>
                  <ChevronRight size={14} style={{ marginLeft: 'auto', color: '#555' }} />
                </div>
              ))}
            </div>
          ) : (
            <div style={listStyle}>
              {/* Group by category */}
              {Array.from(new Set(filteredItems.map(i => i.category))).map(cat => (
                <div key={cat}>
                  <div style={categoryHeaderStyle}>{cat}</div>
                  {filteredItems.filter(i => i.category === cat).map(def => (
                    <div 
                      key={def.type} 
                      style={itemStyle} 
                      onClick={() => handleLogicSelect(def)}
                      title={def.description}
                    >
                      <span>{def.name}</span>
                    </div>
                  ))}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>No results found.</div>
              )}
            </div>
          )}
        </div>

        <div style={footerStyle}>
          {step === 'logic' && (
            <button onClick={() => setStep('object')} style={backButtonStyle}>Back</button>
          )}
          <button onClick={onClose} style={cancelButtonStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 2000
};

const modalStyle: React.CSSProperties = {
  width: '500px',
  maxHeight: '80vh',
  backgroundColor: '#2d2d2d',
  borderRadius: '8px',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  border: '1px solid #444',
  color: '#d4d4d4'
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #444',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#888',
  fontSize: '20px',
  cursor: 'pointer'
};

const searchContainerStyle: React.CSSProperties = {
  padding: '12px 16px',
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  backgroundColor: '#1e1e1e',
  border: '1px solid #444',
  borderRadius: '4px',
  padding: '6px 12px 6px 30px',
  color: '#fff',
  fontSize: '13px',
  outline: 'none'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '0 16px'
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column'
};

const itemStyle: React.CSSProperties = {
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  cursor: 'pointer',
  borderRadius: '4px',
  fontSize: '13px',
  transition: 'background-color 0.1s'
};

const iconPlaceholder: React.CSSProperties = {
  width: '24px',
  height: '24px',
  backgroundColor: '#444',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  fontWeight: 'bold'
};

const categoryHeaderStyle: React.CSSProperties = {
  padding: '15px 0 5px 0',
  fontSize: '10px',
  fontWeight: 'bold',
  color: '#666',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const footerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderTop: '1px solid #444',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px'
};

const backButtonStyle: React.CSSProperties = {
  backgroundColor: '#444',
  color: '#fff',
  border: 'none',
  padding: '6px 16px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px'
};

const cancelButtonStyle: React.CSSProperties = {
  backgroundColor: 'transparent',
  color: '#aaa',
  border: '1px solid #444',
  padding: '6px 16px',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px'
};
