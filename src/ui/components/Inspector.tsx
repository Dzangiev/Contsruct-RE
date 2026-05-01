import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Plus, Trash2, Tag, Database, Settings } from 'lucide-react';

export const Inspector: React.FC = () => {
  const { 
    project, editorState, updateInstance, updateLayer, updateObjectType, addInstanceVariable, removeInstanceVariable 
  } = useEditorStore();

  const { selectedInstanceIds, selectedObjectTypeId, activeLayoutId, activeLayerId } = editorState;
  const activeLayout = project.layouts.find(l => l.id === activeLayoutId);

  // 1. Inspect Selected Instance
  if (selectedInstanceIds.length === 1) {
    const instanceId = selectedInstanceIds[0]!;
    const instance = activeLayout?.instances.find(inst => inst.id === instanceId);
    if (instance) {
      const objectType = project.objectTypes.find(ot => ot.id === instance.objectTypeId);
      return (
        <div className="inspector" style={inspectorStyle}>
          <h3 style={headerStyle}>Instance Properties</h3>
          <PropertyRow label="X" value={instance.x} onChange={v => updateInstance(activeLayoutId!, instanceId, { x: Number(v) })} type="number" />
          <PropertyRow label="Y" value={instance.y} onChange={v => updateInstance(activeLayoutId!, instanceId, { y: Number(v) })} type="number" />
          <PropertyRow label="Width" value={instance.width} onChange={v => updateInstance(activeLayoutId!, instanceId, { width: Number(v) })} type="number" />
          <PropertyRow label="Height" value={instance.height} onChange={v => updateInstance(activeLayoutId!, instanceId, { height: Number(v) })} type="number" />
          
          <h3 style={headerStyle}>Instance Variables</h3>
          <div style={{ padding: '0 10px' }}>
            {objectType?.instanceVariables.map(v => (
              <PropertyRow key={v.id} label={v.name} value={instance.properties[v.name] ?? v.initialValue} onChange={val => updateInstance(activeLayoutId!, instanceId, { properties: { ...instance.properties, [v.name]: val } })} />
            ))}
            {(!objectType?.instanceVariables || objectType.instanceVariables.length === 0) && (
              <div style={{ padding: '10px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No instance variables.</div>
            )}
          </div>
        </div>
      );
    }
  }

  // 2. Inspect Selected Object Type
  if (selectedObjectTypeId) {
    const objectType = project.objectTypes.find(ot => ot.id === selectedObjectTypeId);
    if (objectType) {
      return (
        <div className="inspector" style={inspectorStyle}>
          <h3 style={headerStyle}>Object Type: {objectType.name}</h3>
          <PropertyRow label="Name" value={objectType.name} onChange={v => updateObjectType(objectType.id, { name: String(v) })} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderTop: '1px solid #333', marginTop: '10px' }}>
            <h3 style={{ ...headerStyle, borderBottom: 'none', padding: 0 }}>Variables</h3>
            <button onClick={() => { const name = prompt('Variable name?'); if (name) addInstanceVariable(objectType.id, name, 'number', 0); }} style={miniButtonStyle}><Plus size={12} /></button>
          </div>
          <div style={{ padding: '0 10px' }}>
            {objectType.instanceVariables.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <PropertyRow label={v.name} value={v.initialValue} onChange={val => {
                  const next = objectType.instanceVariables.map(iv => iv.id === v.id ? { ...iv, initialValue: val } : iv);
                  updateObjectType(objectType.id, { instanceVariables: next });
                }} />
                <button onClick={() => removeInstanceVariable(objectType.id, v.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // 3. Layer
  if (activeLayout && activeLayerId) {
    const layer = activeLayout.layers.find(l => l.id === activeLayerId);
    if (layer) {
      return (
        <div className="inspector" style={inspectorStyle}>
          <h3 style={headerStyle}>Layer: {layer.name}</h3>
          <PropertyRow label="Name" value={layer.name} onChange={v => updateLayer(activeLayout.id, layer.id, { name: String(v) })} />
          <PropertyRow label="Opacity" value={layer.opacity} onChange={v => updateLayer(activeLayout.id, layer.id, { opacity: Number(v) })} type="number" step={0.1} />
        </div>
      );
    }
  }

  return <div className="inspector" style={inspectorStyle}><div style={{ padding: '20px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>Nothing selected</div></div>;
};

const PropertyRow: React.FC<{ label: string, value: any, onChange: (v: any) => void, type?: string, step?: number }> = ({ label, value, onChange, type = 'text', step }) => (
  <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', gap: '10px' }}>
    <label style={{ width: '80px', color: '#888', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</label>
    <input type={type === 'number' ? 'text' : 'text'} value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
  </div>
);

const inspectorStyle: React.CSSProperties = { width: '250px', height: '100%', backgroundColor: '#1e1e1e', borderLeft: '1px solid #333', display: 'flex', flexDirection: 'column', color: '#d4d4d4', overflowY: 'auto' };
const headerStyle: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #333', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#aaa', margin: 0 };
const inputStyle: React.CSSProperties = { flex: 1, backgroundColor: '#2d2d2d', border: '1px solid #444', color: '#fff', fontSize: '12px', padding: '2px 4px', borderRadius: '3px', outline: 'none' };
const miniButtonStyle: React.CSSProperties = { backgroundColor: '#333', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center' };
