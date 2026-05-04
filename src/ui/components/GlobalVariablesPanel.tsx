import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Variable, Plus, Edit2, Trash2, Search, Settings2 } from 'lucide-react';
import { VariableDialog } from './VariableDialog';

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  backgroundColor: '#1e1e1e',
  color: '#ccc',
  fontSize: '12px',
  borderLeft: '1px solid #1a1a1a'
};

const headerStyle: React.CSSProperties = {
  padding: '8px 12px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#252526',
  borderBottom: '1px solid #1a1a1a',
  fontWeight: 700,
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#888'
};

const itemStyle: React.CSSProperties = {
  padding: '10px 12px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  borderBottom: '1px solid #1a1a1a',
  cursor: 'default',
  transition: 'background 0.1s'
};

const miniIconButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '5px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
  transition: 'all 0.1s'
};

export const GlobalVariablesPanel: React.FC = () => {
  const { project, addGlobalVariable, updateGlobalVariable, removeGlobalVariable } = useEditorStore();
  const [filter, setFilter] = React.useState('');
  const [dialogState, setDialogState] = React.useState<{ variableId: string } | null>(null);

  const filteredVariables = project.globalVariables.filter(v => 
    v.name.toLowerCase().includes(filter.toLowerCase())
  );

  const editingVar = dialogState
    ? project.globalVariables.find(v => v.id === dialogState.variableId) 
    : undefined;

  return (
    <div style={panelStyle}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Variable size={14} />
          Global Variables
        </div>
      </div>

      <div style={{ padding: '8px', borderBottom: '1px solid #1a1a1a', display: 'flex', gap: '6px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input 
            type="text" 
            placeholder="Search variables..." 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#181818',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#ccc',
              fontSize: '11px',
              padding: '6px 8px 6px 26px',
              outline: 'none'
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredVariables.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ color: '#444' }}><Variable size={48} /></div>
            <div style={{ color: '#555', fontStyle: 'italic', fontSize: '11px' }}>
              {filter ? 'No matching variables found' : 'No global variables defined in this project'}
            </div>
          </div>
        ) : (
          filteredVariables.map(v => (
            <div 
              key={v.id} 
              style={itemStyle} 
              className="var-item-hover"
            >
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, color: '#eee', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</span>
                  {v.isConstant && <span style={{ fontSize: '9px', backgroundColor: '#444', padding: '1px 4px', borderRadius: '2px', color: '#aaa' }}>CONST</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                  <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase' }}>{v.type}</span>
                  <span style={{ color: '#444' }}>•</span>
                  <span style={{ fontSize: '11px', color: v.type === 'number' ? '#569cd6' : '#ce9178', fontWeight: 500 }}>
                    {JSON.stringify(v.initialValue)}
                  </span>
                </div>
                {v.description && <div style={{ fontSize: '10px', color: '#555', marginTop: '4px', fontStyle: 'italic' }}>{v.description}</div>}
              </div>
              
              <div style={{ display: 'flex', gap: '2px' }}>
                <button 
                  style={miniIconButtonStyle}
                  onClick={() => setDialogState({ variableId: v.id })}
                  title="Configure Variable"
                >
                  <Settings2 size={14} />
                </button>
                <button 
                  style={{ ...miniIconButtonStyle, color: '#e74c3c' }}
                  onClick={() => {
                    if (confirm(`Delete global variable "${v.name}"?`)) {
                      removeGlobalVariable(v.id);
                    }
                  }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ padding: '8px 12px', borderTop: '1px solid #1a1a1a', backgroundColor: '#252526', fontSize: '10px', color: '#666' }}>
        Total: {project.globalVariables.length} variables
      </div>

      {dialogState && editingVar && (
        <VariableDialog 
          title="Edit Global Variable"
          variable={editingVar}
          existingNames={project.globalVariables.filter(v => v.id !== dialogState.variableId).map(v => v.name)}
          onSave={(updates) => {
            if (dialogState.variableId) {
              updateGlobalVariable(dialogState.variableId, updates);
            }
            setDialogState(null);
          }}
          onCancel={() => setDialogState(null)}
          showStaticConstant={true}
        />
      )}
      
      <style>{`
        .var-item-hover:hover {
          background-color: #2a2d2e;
        }
        .var-item-hover:hover button {
          color: #ccc;
        }
      `}</style>
    </div>
  );
};
