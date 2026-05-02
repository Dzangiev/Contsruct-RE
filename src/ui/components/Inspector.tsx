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
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '8px', minHeight: '30px', borderBottom: '1px solid #222' }}>
                <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#555' }}><Type size={12}/></div>
                <div 
                  style={{ 
                    width: '80px', 
                    fontSize: '11px', 
                    color: '#aaa', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    fontWeight: 500
                  }} 
                  title={v.name}
                >
                  {v.name}
                </div>
                <input 
                  type="text" 
                  value={v.initialValue ?? ''} 
                  onChange={e => {
                    const val = Number(e.target.value) || 0;
                    const next = (objectType.instanceVariables || []).map(iv => iv.id === v.id ? { ...iv, initialValue: val } : iv);
                    updateObjectType(objectType.id, { instanceVariables: next });
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = '#007acc';
                    e.currentTarget.style.backgroundColor = '#161617';
                    e.currentTarget.style.boxShadow = '0 0 4px rgba(0, 122, 204, 0.4)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = '#444';
                    e.currentTarget.style.backgroundColor = '#262627';
                    e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.4)';
                  }}
                  style={{ ...inputStyle, height: '22px' }}
                />
                <button 
                  onClick={() => removeInstanceVariable(objectType.id, v.id)} 
                  style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#444'}
                >
                  <Trash2 size={12} />
                </button>
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
      <style>{`
        .property-row-hover:hover { background-color: rgba(255,255,255,0.03); }
        .inspector select:hover, .inspector input:hover { border-color: #555; }
        .inspector select:focus, .inspector input:focus { border-color: #007acc; }
      `}</style>
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

      <div style={{ padding: '20px', fontSize: '11px', color: '#444', textAlign: 'center', borderTop: '1px solid #111', marginTop: 'auto', backgroundColor: '#1e1e1e' }}>
        v{project.settings.version}
      </div>
    </div>
  );
};

const Category: React.FC<{ label: string, children: React.ReactNode, action?: React.ReactNode }> = ({ label, children, action }) => {
  const [expanded, setExpanded] = React.useState(true);
  return (
    <div style={{ borderBottom: '1px solid #111' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ 
          padding: '6px 10px', 
          backgroundColor: '#383839', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {expanded ? <ChevronDown size={14} color="#888" /> : <ChevronRight size={14} color="#888" />}
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
        </div>
        {action}
      </div>
      {expanded && <div style={{ backgroundColor: '#1a1a1b', padding: '2px 0' }}>{children}</div>}
    </div>
  );
};

const PropertyRow: React.FC<{ 
  label: string, 
  value: any, 
  onChange?: (val: any) => void, 
  readOnly?: boolean, 
  type?: 'text' | 'number' | 'select' | 'color',
  options?: string[],
  step?: number,
  icon?: React.ReactNode
}> = ({ label, value, onChange, readOnly, type = 'text', options = [], step = 1, icon }) => {
  return (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '2px 10px', 
        gap: '8px', 
        minHeight: '22px',
        transition: 'background-color 0.1s',
        borderBottom: '1px solid #1e1e1e'
      }}
      className="property-row-hover"
    >
      <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#666' }}>{icon}</div>
      <label 
        style={{ 
          width: '90px', 
          color: '#aaa', 
          fontSize: '11px', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          cursor: 'default',
          fontWeight: 500
        }} 
        title={label}
      >
        {label}
      </label>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        {readOnly ? (
          <div style={{ fontSize: '11px', color: '#666', padding: '2px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</div>
        ) : type === 'select' ? (
          <select 
            value={value} 
            onChange={e => onChange?.(e.target.value)} 
            style={{ ...inputStyle, padding: '1px 4px' }}
          >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : type === 'color' ? (
          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
            <input 
              type="color" 
              value={value || '#ffffff'} 
              onChange={e => onChange?.(e.target.value)} 
              style={{ width: '20px', height: '18px', padding: 0, border: '1px solid #333', background: 'none', cursor: 'pointer', borderRadius: '2px' }}
            />
            <input 
              type="text" 
              value={value || ''} 
              onChange={e => onChange?.(e.target.value)} 
              style={inputStyle}
            />
          </div>
        ) : (
          <input 
            type={type === 'number' ? 'number' : 'text'} 
            value={value ?? ''} 
            step={step}
            onChange={e => onChange?.(type === 'number' ? Number(e.target.value) : e.target.value)} 
            onFocus={e => {
              e.currentTarget.style.borderColor = '#007acc';
              e.currentTarget.style.backgroundColor = '#161617';
              e.currentTarget.style.boxShadow = '0 0 4px rgba(0, 122, 204, 0.4)';
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = '#2b2b2b';
              e.currentTarget.style.backgroundColor = '#3c3c3c';
              e.currentTarget.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.2)';
            }}
            style={{ ...inputStyle, height: '18px' }}
          />
        )}
      </div>
    </div>
  );
};

const inspectorStyle: React.CSSProperties = {
  width: '280px',
  backgroundColor: '#2d2d2d',
  borderLeft: '1px solid #1a1a1a',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  color: '#aaa',
  userSelect: 'none',
  boxShadow: '-5px 0 15px rgba(0,0,0,0.1)'
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: '#383839',
  fontSize: '11px',
  fontWeight: 800,
  color: '#eee',
  borderBottom: '1px solid #1a1a1a',
  textTransform: 'uppercase',
  letterSpacing: '1px'
};

const inputStyle: React.CSSProperties = {
  backgroundColor: '#3c3c3c',
  border: '1px solid #2b2b2b',
  borderRadius: '3px',
  color: '#ccc',
  padding: '3px 8px',
  fontSize: '11px',
  width: '100%',
  outline: 'none',
  transition: 'all 0.1s ease',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
  margin: '1px 0'
};

const miniButtonStyle: React.CSSProperties = {
  background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 0.2s'
};

const linkButtonStyle: React.CSSProperties = {
  width: '100%', backgroundColor: '#333', border: '1px solid #444', color: '#ccc', padding: '6px', fontSize: '11px', cursor: 'pointer', borderRadius: '4px', transition: 'all 0.2s'
};
