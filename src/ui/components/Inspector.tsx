import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';

export const Inspector: React.FC = () => {
  const { 
    project, 
    editorState, 
    updateInstance, 
    updateLayer, 
    updateObjectType 
  } = useEditorStore();

  const { selectedInstanceIds, selectedObjectTypeId, activeLayoutId, activeLayerId } = editorState;
  const activeLayout = project.layouts.find(l => l.id === activeLayoutId);

  // 1. Inspect Selected Instance
  if (selectedInstanceIds.length === 1) {
    const instanceId = selectedInstanceIds[0]!;
    const instance = activeLayout?.instances.find(inst => inst.id === instanceId);

    if (instance) {
      const handleUpdate = (updates: any) => {
        if (activeLayoutId) updateInstance(activeLayoutId, instanceId, updates);
      };

      return (
        <div className="inspector" style={inspectorStyle}>
          <h3 style={headerStyle}>Instance Properties</h3>
          <PropertyRow label="X" value={instance.x} onChange={v => handleUpdate({ x: Number(v) })} type="number" />
          <PropertyRow label="Y" value={instance.y} onChange={v => handleUpdate({ y: Number(v) })} type="number" />
          <PropertyRow label="Width" value={instance.width} onChange={v => handleUpdate({ width: Number(v) })} type="number" />
          <PropertyRow label="Height" value={instance.height} onChange={v => handleUpdate({ height: Number(v) })} type="number" />
          <PropertyRow label="Angle" value={instance.angle} onChange={v => handleUpdate({ angle: Number(v) })} type="number" />
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
          <PropertyRow 
            label="Name" 
            value={objectType.name} 
            onChange={v => updateObjectType(objectType.id, { name: String(v) })} 
          />
          <PropertyRow 
            label="Def. Width" 
            value={objectType.defaultWidth} 
            onChange={v => updateObjectType(objectType.id, { defaultWidth: Number(v) })} 
            type="number" 
          />
          <PropertyRow 
            label="Def. Height" 
            value={objectType.defaultHeight} 
            onChange={v => updateObjectType(objectType.id, { defaultHeight: Number(v) })} 
            type="number" 
          />

          <div style={{ padding: '10px', marginTop: '10px', borderTop: '1px solid #333' }}>
            <button
              onClick={() => {
                const activeLayout = project.layouts.find(l => l.id === activeLayoutId);
                const esId = activeLayout?.eventSheetId || project.eventSheets[0]?.id;
                if (esId) {
                  const { addKeyboardMovementTemplate } = useEditorStore.getState();
                  addKeyboardMovementTemplate(esId, objectType.id);
                }
              }}
              style={{
                width: '100%',
                backgroundColor: '#007acc',
                color: '#fff',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
            >
              Add Keyboard Movement Template
            </button>
          </div>
        </div>
      );
    }
  }

  // 3. Inspect Active Layer
  if (activeLayout && activeLayerId) {
    const layer = activeLayout.layers.find(l => l.id === activeLayerId);
    if (layer) {
      return (
        <div className="inspector" style={inspectorStyle}>
          <h3 style={headerStyle}>Layer: {layer.name}</h3>
          <PropertyRow 
            label="Name" 
            value={layer.name} 
            onChange={v => updateLayer(activeLayout.id, layer.id, { name: String(v) })} 
          />
          <PropertyRow 
            label="Opacity" 
            value={layer.opacity} 
            onChange={v => updateLayer(activeLayout.id, layer.id, { opacity: Math.max(0, Math.min(1, Number(v))) })} 
            type="number" 
            step={0.1}
          />
          <PropertyRow 
            label="Visible" 
            value={layer.visible} 
            onChange={v => updateLayer(activeLayout.id, layer.id, { visible: Boolean(v) })} 
            type="checkbox" 
          />
          <PropertyRow 
            label="Locked" 
            value={layer.locked} 
            onChange={v => updateLayer(activeLayout.id, layer.id, { locked: Boolean(v) })} 
            type="checkbox" 
          />
        </div>
      );
    }
  }

  return (
    <div className="inspector" style={inspectorStyle}>
      <div style={{ padding: '20px', color: '#666', fontStyle: 'italic', textAlign: 'center' }}>
        Nothing selected
      </div>
    </div>
  );
};

const PropertyRow: React.FC<{ label: string, value: any, onChange: (v: any) => void, type?: string, step?: number }> = ({ 
  label, value, onChange, type = 'text', step 
}) => (
  <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px', gap: '10px' }}>
    <label style={{ width: '80px', color: '#888', fontSize: '11px' }}>{label}</label>
    <input 
      type={type === 'checkbox' ? 'checkbox' : 'text'}
      value={type === 'checkbox' ? undefined : value}
      checked={type === 'checkbox' ? value : undefined}
      onChange={e => onChange(type === 'checkbox' ? e.target.checked : e.target.value)}
      step={step}
      style={{
        flex: 1,
        backgroundColor: type === 'checkbox' ? 'transparent' : '#2d2d2d',
        border: type === 'checkbox' ? 'none' : '1px solid #444',
        color: '#fff',
        fontSize: '12px',
        padding: '2px 4px',
        borderRadius: '3px'
      }}
    />
  </div>
);

const inspectorStyle: React.CSSProperties = {
  width: '250px',
  height: '100%',
  backgroundColor: '#1e1e1e',
  borderLeft: '1px solid #333',
  display: 'flex',
  flexDirection: 'column',
  color: '#d4d4d4'
};

const headerStyle: React.CSSProperties = {
  padding: '10px',
  borderBottom: '1px solid #333',
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase',
  color: '#aaa',
  margin: 0
};
