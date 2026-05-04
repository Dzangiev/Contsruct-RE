import React from 'react';
import { Zap, Trash2 } from 'lucide-react';
import { EventBlock } from '../../../model/project';

interface FunctionEditorProps {
  block: EventBlock;
  onSave: (data: any) => void;
  onCancel: () => void;
}

export const FunctionEditor: React.FC<FunctionEditorProps> = ({ block, onSave, onCancel }) => {
  const [name, setName] = React.useState(block.functionName || '');
  const [description, setDescription] = React.useState(block.functionDescription || '');
  const [returnType, setReturnType] = React.useState(block.functionReturnType || 'none');
  const [passPicking, setPassPicking] = React.useState(block.functionPassPicking || false);
  const [params, setParams] = React.useState(block.functionParams || []);

  const addParam = () => {
    setParams([...params, { name: 'Param' + params.length, type: 'any', defaultValue: '0' }]);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, data: any) => {
    setParams(params.map((p, i) => i === index ? { ...p, ...data } : p));
  };

  const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 };
  const modalStyle: React.CSSProperties = { backgroundColor: '#2d2d2d', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #444', color: '#d4d4d4', overflow: 'hidden' };
  const modalHeaderStyle: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #444' };
  const modalFooterStyle: React.CSSProperties = { padding: '12px 16px', borderTop: '1px solid #444', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
  const paramInputStyle: React.CSSProperties = { backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '13px', outline: 'none' };
  const saveButtonStyle: React.CSSProperties = { backgroundColor: '#007acc', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
  const cancelButtonStyle: React.CSSProperties = { backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
  const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' };
  const addLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#007acc', fontSize: '12px', cursor: 'pointer', padding: '4px 0', textAlign: 'left' };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...modalStyle, width: '600px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#9b59b6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} color="#fff" /></div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Function Properties</h3>
          </div>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. OnPlayerDied" style={paramInputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this function do?" style={{ ...paramInputStyle, minHeight: '60px', resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Return Type</label>
            <select value={returnType} onChange={e => setReturnType(e.target.value as any)} style={paramInputStyle}>
              <option value="none">None</option>
              <option value="number">Number</option>
              <option value="string">String</option>
              <option value="any">Any</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#1e1e1e', borderRadius: '6px', border: '1px solid #333' }}>
            <input type="checkbox" checked={passPicking} onChange={e => setPassPicking(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Pass Picking</div>
              <div style={{ fontSize: '11px', color: '#666' }}>If enabled, the function inherits picked objects from the caller.</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Parameters</label>
              <button onClick={addParam} style={{ ...addLinkStyle, color: '#9b59b6', fontWeight: 'bold' }}>+ Add Parameter</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {params.length === 0 && <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', padding: '10px', backgroundColor: '#1e1e1e', borderRadius: '4px', textAlign: 'center' }}>No parameters defined.</div>}
              {params.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}>
                  <input value={p.name} onChange={e => updateParam(i, { name: e.target.value })} placeholder="Name" style={{ ...paramInputStyle, flex: 2, padding: '4px 8px', fontSize: '12px' }} />
                  <select value={p.type} onChange={e => updateParam(i, { type: e.target.value })} style={{ ...paramInputStyle, flex: 1, padding: '4px 8px', fontSize: '12px' }}>
                    <option value="number">Number</option>
                    <option value="string">String</option>
                    <option value="any">Any</option>
                  </select>
                  <input value={p.defaultValue} onChange={e => updateParam(i, { defaultValue: e.target.value })} placeholder="Default" style={{ ...paramInputStyle, flex: 1, padding: '4px 8px', fontSize: '12px' }} />
                  <button onClick={() => removeParam(i)} style={{ ...iconButtonStyle, color: '#e74c3c' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={modalFooterStyle}>
          <button onClick={() => onSave({ functionName: name, functionDescription: description, functionReturnType: returnType, functionParams: params, functionPassPicking: passPicking })} style={{ ...saveButtonStyle, backgroundColor: '#9b59b6' }}>Save Changes</button>
          <button onClick={onCancel} style={cancelButtonStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
