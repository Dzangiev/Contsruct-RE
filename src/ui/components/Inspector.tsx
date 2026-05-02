import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Hash, Type, ToggleLeft, Plus, Trash2, Package, ChevronDown, ChevronRight } from 'lucide-react';

import { BehaviorsDialog } from './BehaviorsDialog';

export const Inspector: React.FC = () => {
  const { 
    project, editorState, updateInstance, updateLayer, updateObjectType, addInstanceVariable, removeInstanceVariable,
    addBehavior, removeBehavior, updateBehavior, updateLayout, updateProjectSettings
  } = useEditorStore();

  const { selectedInstanceIds, selectedObjectTypeId, activeLayoutId, activeLayerId } = editorState;
  const activeLayout = project.layouts.find(l => l.id === activeLayoutId);

  const [showBehaviorsDialog, setShowBehaviorsDialog] = React.useState(false);

  // 1. Inspect Selected Instance
  if (selectedInstanceIds.length === 1) {
    const instanceId = selectedInstanceIds[0]!;
    const instance = activeLayout?.instances.find(inst => inst.id === instanceId);
    if (instance) {
      const objectType = project.objectTypes?.find(ot => ot.id === instance.objectTypeId);
      return (
        <div className="inspector" style={inspectorStyle}>
          <div style={panelHeaderStyle}>Properties: {objectType?.name || 'Instance'}</div>
          
          <Category label="Common">
            <PropertyRow label="Name" value={objectType?.name || ''} readOnly icon={<Type size={12}/>} />
            <PropertyRow label="Plugin" value={objectType?.kind || ''} readOnly />
            <PropertyRow label="Layer" value={activeLayout?.layers.find(l => l.id === instance.layerId)?.name || ''} readOnly />
            <div style={{ padding: '8px 10px' }}>
              <button onClick={() => setShowBehaviorsDialog(true)} style={linkButtonStyle}>Behaviors ({objectType?.behaviors?.length || 0})</button>
            </div>
          </Category>

          <Category label="Position">
            <PropertyRow label="X" value={instance.x} onChange={v => updateInstance(activeLayoutId!, instanceId, { x: Number(v) })} type="number" icon={<Hash size={12}/>} />
            <PropertyRow label="Y" value={instance.y} onChange={v => updateInstance(activeLayoutId!, instanceId, { y: Number(v) })} type="number" icon={<Hash size={12}/>} />
          </Category>

          <Category label="Size">
            <PropertyRow label="Width" value={instance.width} onChange={v => updateInstance(activeLayoutId!, instanceId, { width: Number(v) })} type="number" icon={<Hash size={12}/>} />
            <PropertyRow label="Height" value={instance.height} onChange={v => updateInstance(activeLayoutId!, instanceId, { height: Number(v) })} type="number" icon={<Hash size={12}/>} />
          </Category>

          <Category label="Appearance">
            <PropertyRow label="Angle" value={instance.angle} onChange={v => updateInstance(activeLayoutId!, instanceId, { angle: Number(v) })} type="number" icon={<Hash size={12}/>} />
            <PropertyRow label="Opacity" value={instance.opacity} onChange={v => updateInstance(activeLayoutId!, instanceId, { opacity: Number(v) })} type="number" step={0.1} icon={<Hash size={12}/>} />
            <PropertyRow label="Visible" value={instance.visible ? 'Yes' : 'No'} onChange={v => updateInstance(activeLayoutId!, instanceId, { visible: v === 'Yes' })} type="select" options={['Yes', 'No']} icon={<ToggleLeft size={12}/>} />
          </Category>

          {objectType?.behaviors?.map(b => (
            <Category key={b.id} label={b.name}>
              {Object.keys(b.properties || {}).map(prop => (
                <PropertyRow 
                  key={prop} 
                  label={prop} 
                  value={b.properties?.[prop]} 
                  onChange={val => updateBehavior(objectType.id, b.id, { properties: { ...(b.properties || {}), [prop]: val } })} 
                />
              ))}
              <PropertyRow label="Enabled" value={!b.disabled ? 'Yes' : 'No'} onChange={v => updateBehavior(objectType.id, b.id, { disabled: v === 'No' })} type="select" options={['Yes', 'No']} />
            </Category>
          ))}
          
          <Category 
            label="Instance Variables" 
            action={<button onClick={() => { if (objectType) { const name = prompt('Variable name?'); if (name) addInstanceVariable(objectType.id, name, 'number', 0); } }} style={miniButtonStyle}><Plus size={12} /></button>}
          >
            {objectType?.instanceVariables?.map(v => (
              <PropertyRow 
                key={v.id} 
                label={v.name} 
                value={instance.properties?.[v.name] ?? v.initialValue} 
                onChange={val => updateInstance(activeLayoutId!, instanceId, { properties: { ...(instance.properties || {}), [v.name]: val } })} 
                icon={<Type size={12}/>}
              />
            ))}
            {(!objectType?.instanceVariables || objectType.instanceVariables.length === 0) && (
              <div style={{ padding: '10px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No instance variables.</div>
            )}
          </Category>

          {showBehaviorsDialog && objectType && (
            <BehaviorsDialog 
              objectType={objectType}
              onAdd={(type, name, defaults) => addBehavior(objectType.id, type, name, defaults)}
              onRemove={id => removeBehavior(objectType.id, id)}
              onClose={() => setShowBehaviorsDialog(false)}
            />
          )}
        </div>
      );
    }
  }

  // 2. Inspect Selected Object Type
  if (selectedObjectTypeId) {
    const objectType = project.objectTypes?.find(ot => ot.id === selectedObjectTypeId);
    if (objectType) {
      return (
        <div className="inspector" style={inspectorStyle}>
          <div style={panelHeaderStyle}>Object Type: {objectType.name}</div>
          
          <Category label="General">
            <PropertyRow label="Name" value={objectType.name} onChange={v => updateObjectType(objectType.id, { name: String(v) })} icon={<Package size={12}/>} />
            <PropertyRow label="Kind" value={objectType.kind} readOnly />
            <div style={{ padding: '8px 10px' }}>
              <button onClick={() => setShowBehaviorsDialog(true)} style={linkButtonStyle}>Behaviors ({objectType.behaviors?.length || 0})</button>
            </div>
          </Category>
          
          {objectType.behaviors?.map(b => (
            <Category key={b.id} label={b.name}>
              {Object.keys(b.properties || {}).map(prop => (
                <PropertyRow 
                  key={prop} 
                  label={prop} 
                  value={b.properties?.[prop]} 
                  onChange={val => updateBehavior(objectType.id, b.id, { properties: { ...(b.properties || {}), [prop]: val } })} 
                />
              ))}
            </Category>
          ))}

          <Category 
            label="Instance Variables" 
            action={<button onClick={() => { const name = prompt('Variable name?'); if (name) addInstanceVariable(objectType.id, name, 'number', 0); }} style={miniButtonStyle}><Plus size={12} /></button>}
          >
            {objectType.instanceVariables?.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                <PropertyRow 
                  label={v.name} 
                  value={v.initialValue} 
                  onChange={val => {
                    const next = (objectType.instanceVariables || []).map(iv => iv.id === v.id ? { ...iv, initialValue: val } : iv);
                    updateObjectType(objectType.id, { instanceVariables: next });
                  }} 
                  icon={<Type size={12}/>}
                />
                <button onClick={() => removeInstanceVariable(objectType.id, v.id)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: '0 4px' }}><Trash2 size={12} /></button>
              </div>
            ))}
            {(objectType.instanceVariables?.length === 0 || !objectType.instanceVariables) && (
              <div style={{ padding: '10px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No instance variables.</div>
            )}
          </Category>

          {showBehaviorsDialog && (
            <BehaviorsDialog 
              objectType={objectType}
              onAdd={(type, name, defaults) => addBehavior(objectType.id, type, name, defaults)}
              onRemove={id => removeBehavior(objectType.id, id)}
              onClose={() => setShowBehaviorsDialog(false)}
            />
          )}
        </div>
      );
    }
  }

  // 3. Combined Layout/Layer/Project View (Default if nothing specific is selected)
  const layer = activeLayout?.layers.find(l => l.id === activeLayerId);
  
  return (
    <div className="inspector" style={inspectorStyle}>
      <div style={panelHeaderStyle}>Properties: {activeLayout?.name || 'Project'}</div>
      
      {layer && (
        <Category label="Active Layer">
          <PropertyRow label="Name" value={layer.name} onChange={v => updateLayer(activeLayout!.id, layer.id, { name: String(v) })} />
          <PropertyRow label="Opacity" value={layer.opacity} onChange={v => updateLayer(activeLayout!.id, layer.id, { opacity: Number(v) })} type="number" step={0.1} />
          <PropertyRow label="Visible" value={layer.visible ? 'Yes' : 'No'} onChange={v => updateLayer(activeLayout!.id, layer.id, { visible: v === 'Yes' })} type="select" options={['Yes', 'No']} />
          <PropertyRow label="Locked" value={layer.locked ? 'Yes' : 'No'} onChange={v => updateLayer(activeLayout!.id, layer.id, { locked: v === 'Yes' })} type="select" options={['Yes', 'No']} />
        </Category>
      )}

      {activeLayout && (
        <Category label="Layout Settings">
          <PropertyRow label="Name" value={activeLayout.name} onChange={v => updateLayout(activeLayout.id, { name: String(v) })} />
          <PropertyRow label="Width" value={activeLayout.width} onChange={v => updateLayout(activeLayout.id, { width: Number(v) })} type="number" icon={<Hash size={12}/>} />
          <PropertyRow label="Height" value={activeLayout.height} onChange={v => updateLayout(activeLayout.id, { height: Number(v) })} type="number" icon={<Hash size={12}/>} />
          <PropertyRow label="Event Sheet" value={project.eventSheets.find(es => es.id === activeLayout.eventSheetId)?.name || 'None'} readOnly />
        </Category>
      )}

      <Category label="Project Settings">
        <PropertyRow label="Name" value={project.settings.name} onChange={v => updateProjectSettings({ name: String(v) })} />
        <PropertyRow label="Author" value={project.settings.author} onChange={v => updateProjectSettings({ author: String(v) })} />
        <PropertyRow label="Viewport Width" value={project.settings.viewportWidth} onChange={v => updateProjectSettings({ viewportWidth: Number(v) })} type="number" icon={<Hash size={12}/>} />
        <PropertyRow label="Viewport Height" value={project.settings.viewportHeight} onChange={v => updateProjectSettings({ viewportHeight: Number(v) })} type="number" icon={<Hash size={12}/>} />
      </Category>

      <div style={{ padding: '20px', fontSize: '11px', color: '#666', textAlign: 'center', borderTop: '1px solid #2d2d2d', marginTop: 'auto' }}>
        v{project.settings.version}
      </div>
    </div>
  );
};

const Category: React.FC<{ label: string, children: React.ReactNode, action?: React.ReactNode }> = ({ label, children, action }) => {
  const [expanded, setExpanded] = React.useState(true);
  return (
    <div style={{ borderBottom: '1px solid #2d2d2d' }}>
      <div 
        style={{ 
          display: 'flex', alignItems: 'center', padding: '6px 8px', backgroundColor: '#252526', cursor: 'pointer',
          fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', color: '#aaa'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown size={12} style={{ marginRight: '6px' }} /> : <ChevronRight size={12} style={{ marginRight: '6px' }} />}
        <span style={{ flex: 1 }}>{label}</span>
        {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
      </div>
      {expanded && <div style={{ padding: '4px 0' }}>{children}</div>}
    </div>
  );
};

const PropertyRow: React.FC<{ 
  label: string, value: any, onChange?: (v: any) => void, type?: string, step?: number, readOnly?: boolean, options?: string[], icon?: React.ReactNode 
}> = ({ label, value, onChange, type = 'text', step, readOnly, options, icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', padding: '2px 10px', gap: '8px', minHeight: '24px' }}>
    <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#555' }}>{icon}</div>
    <label style={{ width: '90px', color: '#888', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</label>
    {readOnly ? (
      <div style={{ flex: 1, fontSize: '12px', color: '#666', padding: '2px 4px' }}>{value}</div>
    ) : type === 'select' && options ? (
      <select 
        value={value} 
        onChange={e => onChange?.(e.target.value)} 
        style={{ ...inputStyle, appearance: 'none' }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    ) : (
      <input 
        type={type === 'number' ? 'number' : 'text'} 
        value={value ?? ''} 
        step={step}
        onChange={e => {
          const val = e.target.value;
          onChange?.(type === 'number' ? Number(val) : val);
        }} 
        style={inputStyle} 
      />
    )}
  </div>
);

const inspectorStyle: React.CSSProperties = { 
  width: '260px', height: '100%', backgroundColor: '#1e1e1e', borderLeft: '1px solid #333', 
  display: 'flex', flexDirection: 'column', color: '#d4d4d4', overflowY: 'auto', userSelect: 'none' 
};

const panelHeaderStyle: React.CSSProperties = { 
  padding: '10px 12px', borderBottom: '1px solid #333', fontSize: '12px', fontWeight: 'bold', 
  backgroundColor: '#252526', color: '#fff' 
};

const inputStyle: React.CSSProperties = { 
  flex: 1, backgroundColor: '#2d2d2d', border: '1px solid transparent', color: '#fff', 
  fontSize: '12px', padding: '2px 6px', borderRadius: '3px', outline: 'none',
  transition: 'border-color 0.2s'
};

const miniButtonStyle: React.CSSProperties = { 
  backgroundColor: 'transparent', color: '#888', border: 'none', padding: '2px', 
  borderRadius: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center' 
};

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#007acc',
  fontSize: '11px',
  cursor: 'pointer',
  padding: 0,
  textDecoration: 'underline',
  textAlign: 'left'
};
