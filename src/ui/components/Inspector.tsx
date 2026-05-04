import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Hash, Type, ToggleLeft, Plus, Trash2, Package, ChevronDown, ChevronRight, Edit2, Users, Folder, CheckSquare, Square, Info, Layers as LayersIcon, List as ListIcon, FileText } from 'lucide-react';
import { BehaviorsDialog } from './BehaviorsDialog';
import { BEHAVIOR_DEFINITIONS, PLUGIN_DEFINITIONS } from '../../model/definitions';
import { VariableDialog } from './VariableDialog';
import { FamilyMembersDialog } from './FamilyMembersDialog';

export const Inspector: React.FC = () => {
  const { 
    project, editorState, updateInstance, updateLayer, updateObjectType, addInstanceVariable, updateInstanceVariable, removeInstanceVariable,
    addBehavior, removeBehavior, updateBehavior, updateLayout, updateProjectSettings, showDialog, openSpriteEditor,
    updateFamily, addFamilyObjectType, removeFamilyObjectType, addFamilyInstanceVariable, updateFamilyInstanceVariable, removeFamilyInstanceVariable,
    addFamilyBehavior, updateFamilyBehavior, removeFamilyBehavior,
    moveEntityToFolder
  } = useEditorStore();

  const { selectedInstanceIds, selectedObjectTypeId, activeLayoutId, activeLayerId } = editorState;
  const activeLayout = project.layouts.find(l => l.id === activeLayoutId);

  const [showBehaviorsDialog, setShowBehaviorsDialog] = React.useState(false);
  const [showFamilyMembersDialog, setShowFamilyMembersDialog] = React.useState(false);
  const [variableEditor, setVariableEditor] = React.useState<{ isOpen: boolean, variable?: any, objectTypeId?: string, familyId?: string } | null>(null);

  // 1. Inspect Selected Instance
  if (selectedInstanceIds.length === 1) {
    const instanceId = selectedInstanceIds[0]!;
    const instance = activeLayout?.instances.find(inst => inst.id === instanceId);
    if (instance) {
      const objectType = project.objectTypes?.find(ot => ot.id === instance.objectTypeId);
      if (!objectType) return null;
      const families = project.families.filter(f => f.objectTypeIds.includes(objectType.id));
      return (
        <div className="inspector" style={inspectorStyle}>
          <div style={panelHeaderStyle}>
            <Package size={14} style={{ color: '#007acc' }} />
            Properties: {objectType?.name || 'Instance'}
          </div>
          
          <Category label="Common" icon={<ListIcon size={12} />}>
            <PropertyRow label="Name" value={objectType?.name || ''} readOnly icon={<Type size={12}/>} />
            <PropertyRow label="Plugin" value={objectType?.kind || ''} readOnly icon={<Package size={12}/>} />
            <PropertyRow label="Layer" value={activeLayout?.layers.find(l => l.id === instance.layerId)?.name || ''} readOnly icon={<LayersIcon size={12}/>} />
            <div style={{ padding: '4px 10px 8px' }}>
              <button onClick={() => setShowBehaviorsDialog(true)} style={actionButtonStyle}>
                <Plus size={12} /> Behaviors ({objectType?.behaviors?.length || 0})
              </button>
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

          {(() => {
            const pluginDef = PLUGIN_DEFINITIONS.find(p => p.kind === objectType.kind);
            if (!pluginDef || pluginDef.propertyDefinitions.length === 0) return null;
            return (
              <Category label={`${pluginDef.name} Properties`}>
                {pluginDef.propertyDefinitions.map(pDef => {
                  const val = instance.properties[pDef.name] ?? pDef.defaultValue;
                  let type: any = 'text';
                  let options: string[] = [];

                  if (pDef.type === 'number') type = 'number';
                  else if (pDef.type === 'boolean') {
                    type = 'select';
                    options = ['Yes', 'No'];
                  } else if (pDef.type === 'enum') {
                    type = 'select';
                    options = pDef.options || [];
                  } else if (pDef.name.toLowerCase().includes('color')) {
                    type = 'color';
                  }

                  return (
                    <PropertyRow 
                      key={pDef.name} 
                      label={pDef.name} 
                      value={pDef.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                      type={type}
                      options={options}
                      onChange={val => {
                        let finalVal = val;
                        if (pDef.type === 'boolean') finalVal = val === 'Yes';
                        if (pDef.type === 'number') finalVal = Number(val);
                        updateInstance(activeLayoutId!, instanceId, { properties: { ...instance.properties, [pDef.name]: finalVal } });
                      }} 
                    />
                  );
                })}
              </Category>
            );
          })()}

          {objectType?.behaviors?.map(b => {
            const def = BEHAVIOR_DEFINITIONS.find(d => d.type === b.type);
            return (
              <Category key={b.id} label={b.name} action={<span style={{ fontSize: '9px', color: '#666', marginRight: '8px', fontWeight: 600 }}>OBJECT</span>}>
                {def?.propertyDefinitions.map(pDef => {
                  const val = b.properties?.[pDef.name] ?? pDef.defaultValue;
                  let type: any = 'text';
                  let options: string[] = [];
                  let icon = null;

                  if (pDef.type === 'number') {
                    type = 'number';
                    icon = <Hash size={12}/>;
                  } else if (pDef.type === 'boolean') {
                    type = 'select';
                    options = ['Yes', 'No'];
                    icon = val ? <CheckSquare size={12} color="#4caf50" /> : <Square size={12} />;
                  } else if (pDef.type === 'enum') {
                    type = 'select';
                    options = pDef.options || [];
                  }

                  return (
                    <PropertyRow 
                      key={pDef.name} 
                      label={pDef.name} 
                      value={pDef.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                      type={type}
                      options={options}
                      icon={icon}
                      onChange={val => {
                        let finalVal = val;
                        if (pDef.type === 'boolean') finalVal = val === 'Yes';
                        if (pDef.type === 'number') finalVal = Number(val);
                        updateBehavior(objectType.id, b.id, { properties: { ...(b.properties || {}), [pDef.name]: finalVal } });
                      }} 
                    />
                  );
                })}
                <PropertyRow label="Enabled" value={!b.disabled ? 'Yes' : 'No'} onChange={v => updateBehavior(objectType.id, b.id, { disabled: v === 'No' })} type="select" options={['Yes', 'No']} />
              </Category>
            );
          })}

          {families.map(family => family.behaviors.map(b => {
            const def = BEHAVIOR_DEFINITIONS.find(d => d.type === b.type);
            return (
              <Category key={b.id} label={b.name} action={<span style={{ fontSize: '9px', color: '#007acc', marginRight: '8px', fontWeight: 600 }}>FAMILY: {family.name.toUpperCase()}</span>}>
                {def?.propertyDefinitions.map(pDef => {
                  const val = b.properties?.[pDef.name] ?? pDef.defaultValue;
                  let type: any = 'text';
                  let options: string[] = [];

                  if (pDef.type === 'number') type = 'number';
                  else if (pDef.type === 'boolean') {
                    type = 'select';
                    options = ['Yes', 'No'];
                  } else if (pDef.type === 'enum') {
                    type = 'select';
                    options = pDef.options || [];
                  }

                  return (
                    <PropertyRow 
                      key={pDef.name} 
                      label={pDef.name} 
                      value={pDef.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                      type={type}
                      options={options}
                      onChange={val => {
                        let finalVal = val;
                        if (pDef.type === 'boolean') finalVal = val === 'Yes';
                        if (pDef.type === 'number') finalVal = Number(val);
                        updateFamilyBehavior(family.id, b.id, { properties: { ...(b.properties || {}), [pDef.name]: finalVal } });
                      }} 
                    />
                  );
                })}
                <PropertyRow label="Enabled" value={!b.disabled ? 'Yes' : 'No'} onChange={v => updateFamilyBehavior(family.id, b.id, { disabled: v === 'No' })} type="select" options={['Yes', 'No']} />
              </Category>
            );
          }))}
          
          <Category 
            label="Instance Variables" 
            action={<button onClick={() => { 
              if (objectType) { 
                setVariableEditor({ isOpen: true, objectTypeId: objectType.id });
              } 
            }} style={miniButtonStyle}><Plus size={12} /></button>}
          >
            <div style={{ padding: '6px 10px', backgroundColor: '#222' }}>
               <span style={{ fontSize: '9px', fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Object Variables</span>
            </div>
            {objectType?.instanceVariables?.map(v => {
              const isOverridden = instance.properties?.[v.name] !== undefined && instance.properties?.[v.name] !== v.initialValue;
              const val = instance.properties?.[v.name] ?? v.initialValue;
              
              let rowType: any = 'text';
              let rowOptions: string[] = [];
              if (v.type === 'number') rowType = 'number';
              else if (v.type === 'boolean') {
                rowType = 'select';
                rowOptions = ['Yes', 'No'];
              }

              return (
                <div key={v.id} style={{ position: 'relative' }}>
                  <PropertyRow 
                    label={v.name} 
                    value={v.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                    type={rowType}
                    options={rowOptions}
                    onChange={newVal => {
                      let finalVal = newVal;
                      if (v.type === 'boolean') finalVal = newVal === 'Yes';
                      if (v.type === 'number') finalVal = Number(newVal);
                      updateInstance(activeLayoutId!, instanceId, { properties: { ...(instance.properties || {}), [v.name]: finalVal } });
                    }} 
                    icon={<Type size={12} color={isOverridden ? '#3498db' : '#666'} />}
                  />
                  <div style={{ position: 'absolute', right: '4px', top: '2px', display: 'flex', gap: '2px', opacity: 0.3 }} className="var-actions-hover">
                    <button onClick={() => setVariableEditor({ isOpen: true, variable: v, objectTypeId: objectType.id })} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} title="Edit definition"><Edit2 size={10} /></button>
                  </div>
                </div>
              );
            })}
            {(!objectType?.instanceVariables || objectType.instanceVariables.length === 0) && (
              <div style={{ padding: '10px', fontSize: '11px', color: '#555', fontStyle: 'italic' }}>No object variables.</div>
            )}

            {families.map(family => (
              <React.Fragment key={family.id}>
                <div style={{ padding: '6px 10px', backgroundColor: '#222', marginTop: '2px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Family: {family.name}</span>
                </div>
                {family.instanceVariables.map(v => {
                  const isOverridden = instance.properties?.[v.name] !== undefined && instance.properties?.[v.name] !== v.initialValue;
                  const val = instance.properties?.[v.name] ?? v.initialValue;
                  
                  let rowType: any = 'text';
                  let rowOptions: string[] = [];
                  if (v.type === 'number') rowType = 'number';
                  else if (v.type === 'boolean') {
                    rowType = 'select';
                    rowOptions = ['Yes', 'No'];
                  }

                  return (
                    <div key={v.id} style={{ position: 'relative' }}>
                      <PropertyRow 
                        label={v.name} 
                        value={v.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                        type={rowType}
                        options={rowOptions}
                        onChange={newVal => {
                          let finalVal = newVal;
                          if (v.type === 'boolean') finalVal = newVal === 'Yes';
                          if (v.type === 'number') finalVal = Number(newVal);
                          updateInstance(activeLayoutId!, instanceId, { properties: { ...(instance.properties || {}), [v.name]: finalVal } });
                        }} 
                        icon={<Type size={12} color={isOverridden ? '#f1c40f' : '#666'} />}
                      />
                      <div style={{ position: 'absolute', right: '4px', top: '2px', display: 'flex', gap: '2px', opacity: 0.3 }} className="var-actions-hover">
                        <button onClick={() => setVariableEditor({ isOpen: true, variable: v, familyId: family.id })} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} title="Edit definition"><Edit2 size={10} /></button>
                      </div>
                    </div>
                  );
                })}
                {family.instanceVariables.length === 0 && (
                  <div style={{ padding: '10px', fontSize: '11px', color: '#555', fontStyle: 'italic' }}>No family variables.</div>
                )}
              </React.Fragment>
            ))}
          </Category>

          {showBehaviorsDialog && objectType && (
            <BehaviorsDialog 
              objectType={objectType}
              onAdd={(type, name, defaults) => addBehavior(objectType.id, type, name, defaults)}
              onRemove={id => removeBehavior(objectType.id, id)}
              onClose={() => setShowBehaviorsDialog(false)}
            />
          )}
          {variableEditor?.isOpen && (
            <VariableDialog 
              title={variableEditor.variable ? "Edit Instance Variable" : "New Instance Variable"}
              variable={variableEditor.variable}
              existingNames={project.objectTypes.find(ot => ot.id === variableEditor.objectTypeId as any)?.instanceVariables.map(v => v.name) || []}
              onSave={(updates) => {
                if (variableEditor.variable) {
                  updateInstanceVariable(variableEditor.objectTypeId as any, variableEditor.variable.id, updates);
                } else {
                  addInstanceVariable(variableEditor.objectTypeId as any, updates.name, updates.type, updates.initialValue);
                }
                setVariableEditor(null);
              }}
              onCancel={() => setVariableEditor(null)}
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
      const families = project.families.filter(f => f.objectTypeIds.includes(objectType.id));
      return (
        <div className="inspector" style={inspectorStyle}>
          <div style={panelHeaderStyle}>
            <Package size={14} style={{ color: '#007acc' }} />
            Object Type: {objectType.name}
          </div>
          
          <Category label="General" icon={<ListIcon size={12} />}>
            <PropertyRow label="Name" value={objectType.name} onChange={v => updateObjectType(objectType.id, { name: String(v) })} icon={<Type size={12}/>} />
            <PropertyRow label="Kind" value={objectType.kind} readOnly icon={<Package size={12}/>} />
            <PropertyRow 
              label="Folder" 
              value={objectType.folderId || ''} 
              type="select" 
              options={['', ...project.folders.filter(f => f.type === 'objectType').map(f => f.id)]}
              displayValues={['(None)', ...project.folders.filter(f => f.type === 'objectType').map(f => f.name)]}
              onChange={v => moveEntityToFolder('objectType', objectType.id, v === '' ? null : String(v))} 
              icon={<Folder size={12}/>}
            />
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => setShowBehaviorsDialog(true)} style={actionButtonStyle}>
                <Plus size={12} /> Behaviors ({objectType.behaviors?.length || 0})
              </button>
              {objectType.kind === 'sprite' && (
                <button onClick={() => openSpriteEditor(objectType.id)} style={actionButtonStyle}>
                  <Edit2 size={12} /> Edit Animations
                </button>
              )}
            </div>
          </Category>

          {(() => {
            const pluginDef = PLUGIN_DEFINITIONS.find(p => p.kind === objectType.kind);
            if (!pluginDef || pluginDef.propertyDefinitions.length === 0) return null;
            return (
              <Category label={`${pluginDef.name} Defaults`}>
                {pluginDef.propertyDefinitions.map(pDef => {
                  const val = objectType.properties[pDef.name] ?? pDef.defaultValue;
                  let type: any = 'text';
                  let options: string[] = [];

                  if (pDef.type === 'number') type = 'number';
                  else if (pDef.type === 'boolean') {
                    type = 'select';
                    options = ['Yes', 'No'];
                  } else if (pDef.type === 'enum') {
                    type = 'select';
                    options = pDef.options || [];
                  } else if (pDef.name.toLowerCase().includes('color')) {
                    type = 'color';
                  }

                  return (
                    <PropertyRow 
                      key={pDef.name} 
                      label={pDef.name} 
                      value={pDef.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                      type={type}
                      options={options}
                      onChange={val => {
                        let finalVal = val;
                        if (pDef.type === 'boolean') finalVal = val === 'Yes';
                        if (pDef.type === 'number') finalVal = Number(val);
                        updateObjectType(objectType.id, { properties: { ...objectType.properties, [pDef.name]: finalVal } });
                      }} 
                    />
                  );
                })}
              </Category>
            );
          })()}
          
          {objectType.behaviors?.map(b => {
            const def = BEHAVIOR_DEFINITIONS.find(d => d.type === b.type);
            return (
              <Category key={b.id} label={b.name} action={<span style={{ fontSize: '9px', color: '#555', marginRight: '8px' }}>Object</span>}>
                {def?.propertyDefinitions.map(pDef => {
                  const val = b.properties?.[pDef.name] ?? pDef.defaultValue;
                  let type: any = 'text';
                  let options: string[] = [];

                  if (pDef.type === 'number') type = 'number';
                  else if (pDef.type === 'boolean') {
                    type = 'select';
                    options = ['Yes', 'No'];
                  } else if (pDef.type === 'enum') {
                    type = 'select';
                    options = pDef.options || [];
                  }

                  return (
                    <PropertyRow 
                      key={pDef.name} 
                      label={pDef.name} 
                      value={pDef.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                      type={type}
                      options={options}
                      onChange={val => {
                        let finalVal = val;
                        if (pDef.type === 'boolean') finalVal = val === 'Yes';
                        if (pDef.type === 'number') finalVal = Number(val);
                        updateBehavior(objectType.id, b.id, { properties: { ...(b.properties || {}), [pDef.name]: finalVal } });
                      }} 
                    />
                  );
                })}
              </Category>
            );
          })}

          {families.map(family => family.behaviors.map(b => (
            <Category key={b.id} label={b.name} action={<span style={{ fontSize: '9px', color: '#555', marginRight: '8px' }}>Family: {family.name}</span>}>
              {Object.keys(b.properties || {}).map(prop => (
                <PropertyRow 
                  key={prop} 
                  label={prop} 
                  value={b.properties?.[prop]} 
                  onChange={val => updateFamilyBehavior(family.id, b.id, { properties: { ...(b.properties || {}), [prop]: val } })} 
                />
              ))}
            </Category>
          )))}

          <Category 
            label="Instance Variables" 
            action={<button onClick={() => { 
              setVariableEditor({ isOpen: true, objectTypeId: objectType.id });
            }} style={miniButtonStyle}><Plus size={12} /></button>}
          >
            <div style={{ padding: '4px 0', borderBottom: '1px solid #222' }}>
               <span style={{ padding: '0 10px', fontSize: '9px', fontWeight: 800, color: '#555', textTransform: 'uppercase' }}>Object Variables</span>
            </div>
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
                    const val = v.type === 'number' ? (Number(e.target.value) || 0) : e.target.value;
                    updateInstanceVariable(objectType.id, v.id, { initialValue: val });
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
                  onClick={() => setVariableEditor({ isOpen: true, variable: v, objectTypeId: objectType.id })} 
                  style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#007acc'}
                  onMouseLeave={e => e.currentTarget.style.color = '#444'}
                  title="Edit variable properties"
                >
                  <Edit2 size={12} />
                </button>
                <button 
                  onClick={() => removeInstanceVariable(objectType.id, v.id)} 
                  style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ff4444'}
                  onMouseLeave={e => e.currentTarget.style.color = '#444'}
                  title="Delete variable"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {(objectType.instanceVariables?.length === 0 || !objectType.instanceVariables) && (
              <div style={{ padding: '10px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No object variables.</div>
            )}

            {families.map(family => (
              <React.Fragment key={family.id}>
                <div style={{ padding: '4px 0', borderBottom: '1px solid #222', marginTop: '8px' }}>
                  <span style={{ padding: '0 10px', fontSize: '9px', fontWeight: 800, color: '#555', textTransform: 'uppercase' }}>Family: {family.name}</span>
                </div>
                {family.instanceVariables.map(v => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '8px', minHeight: '30px', borderBottom: '1px solid #222' }}>
                    <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#f1c40f' }}><Type size={12}/></div>
                    <div style={{ width: '80px', fontSize: '11px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={v.name}>
                      {v.name}
                    </div>
                    <input 
                      type="text" 
                      value={v.initialValue ?? ''} 
                      onChange={e => {
                        const val = v.type === 'number' ? (Number(e.target.value) || 0) : e.target.value;
                        updateFamilyInstanceVariable(family.id, v.id, { initialValue: val });
                      }}
                      style={{ ...inputStyle, height: '22px' }}
                    />
                    <button 
                      onClick={() => setVariableEditor({ isOpen: true, variable: v, familyId: family.id })} 
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      title="Edit family variable"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      onClick={() => removeFamilyInstanceVariable(family.id, v.id)} 
                      style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      title="Remove family variable"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {family.instanceVariables.length === 0 && (
                  <div style={{ padding: '10px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No family variables.</div>
                )}
              </React.Fragment>
            ))}
          </Category>

          {showBehaviorsDialog && (
            <BehaviorsDialog 
              objectType={objectType}
              onAdd={(type, name, defaults) => addBehavior(objectType.id, type, name, defaults)}
              onRemove={id => removeBehavior(objectType.id, id)}
              onClose={() => setShowBehaviorsDialog(false)}
            />
          )}
          {variableEditor?.isOpen && (
            <VariableDialog 
              title={variableEditor.variable ? "Edit Instance Variable" : "New Instance Variable"}
              variable={variableEditor.variable}
              existingNames={project.objectTypes.find(ot => ot.id === variableEditor.objectTypeId as any)?.instanceVariables.map(v => v.name) || []}
              onSave={(updates) => {
                if (variableEditor.variable) {
                  updateInstanceVariable(variableEditor.objectTypeId as any, variableEditor.variable.id, updates);
                } else {
                  addInstanceVariable(variableEditor.objectTypeId as any, updates.name, updates.type, updates.initialValue);
                }
                setVariableEditor(null);
              }}
              onCancel={() => setVariableEditor(null)}
            />
          )}
        </div>
      );
    }
  }

  // 2.5. Inspect Selected Family
  if (editorState.selectedFamilyId) {
    const family = project.families.find(f => f.id === editorState.selectedFamilyId);
    if (family) {
      return (
        <div className="inspector" style={inspectorStyle}>
          <div style={panelHeaderStyle}>
            <Users size={14} style={{ color: '#007acc' }} />
            Family: {family.name}
          </div>
          
          <Category label="General" icon={<ListIcon size={12} />}>
            <PropertyRow label="Name" value={family.name} onChange={v => updateFamily(family.id, { name: String(v) })} icon={<Users size={12}/>} />
            <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button onClick={() => setShowFamilyMembersDialog(true)} style={actionButtonStyle}>
                <Users size={12} /> Manage Members ({family.objectTypeIds.length})
              </button>
              <button onClick={() => setShowBehaviorsDialog(true)} style={actionButtonStyle}>
                <Plus size={12} /> Behaviors ({family.behaviors?.length || 0})
              </button>
            </div>
          </Category>

          {family.behaviors?.map(b => {
            const def = BEHAVIOR_DEFINITIONS.find(d => d.type === b.type);
            return (
              <Category key={b.id} label={b.name}>
                {def?.propertyDefinitions.map(pDef => {
                  const val = b.properties?.[pDef.name] ?? pDef.defaultValue;
                  let type: any = 'text';
                  let options: string[] = [];

                  if (pDef.type === 'number') type = 'number';
                  else if (pDef.type === 'boolean') {
                    type = 'select';
                    options = ['Yes', 'No'];
                  } else if (pDef.type === 'enum') {
                    type = 'select';
                    options = pDef.options || [];
                  }

                  return (
                    <PropertyRow 
                      key={pDef.name} 
                      label={pDef.name} 
                      value={pDef.type === 'boolean' ? (val ? 'Yes' : 'No') : val} 
                      type={type}
                      options={options}
                      onChange={val => {
                        let finalVal = val;
                        if (pDef.type === 'boolean') finalVal = val === 'Yes';
                        if (pDef.type === 'number') finalVal = Number(val);
                        updateFamilyBehavior(family.id, b.id, { properties: { ...(b.properties || {}), [pDef.name]: finalVal } });
                      }} 
                    />
                  );
                })}
                <PropertyRow label="Enabled" value={!b.disabled ? 'Yes' : 'No'} onChange={v => updateFamilyBehavior(family.id, b.id, { disabled: v === 'No' })} type="select" options={['Yes', 'No']} />
              </Category>
            );
          })}

          <Category 
            label="Family Variables" 
            action={<button onClick={() => setVariableEditor({ isOpen: true, familyId: family.id })} style={miniButtonStyle}><Plus size={12} /></button>}
          >
            {family.instanceVariables?.map(v => (
              <div key={v.id} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', gap: '8px', minHeight: '30px', borderBottom: '1px solid #222' }}>
                <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#555' }}><Type size={12}/></div>
                <div style={{ width: '80px', fontSize: '11px', color: '#aaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={v.name}>
                  {v.name}
                </div>
                <input 
                  type="text" 
                  value={v.initialValue ?? ''} 
                  onChange={e => {
                    const val = v.type === 'number' ? (Number(e.target.value) || 0) : e.target.value;
                    updateFamilyInstanceVariable(family.id, v.id, { initialValue: val });
                  }}
                  style={{ ...inputStyle, height: '22px' }}
                />
                <button onClick={() => setVariableEditor({ isOpen: true, variable: v, familyId: family.id })} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                  <Edit2 size={12} />
                </button>
                <button onClick={() => removeFamilyInstanceVariable(family.id, v.id)} style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {(family.instanceVariables?.length === 0 || !family.instanceVariables) && (
              <div style={{ padding: '10px', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>No family variables.</div>
            )}
          </Category>

          {showBehaviorsDialog && (
            <BehaviorsDialog 
              objectType={{ ...family, kind: 'plugin' } as any} // Mock object type
              onAdd={(type, name, defaults) => addFamilyBehavior(family.id, type, name, defaults)}
              onRemove={id => removeFamilyBehavior(family.id, id)}
              onClose={() => setShowBehaviorsDialog(false)}
            />
          )}
          {showFamilyMembersDialog && (
            <FamilyMembersDialog family={family} onClose={() => setShowFamilyMembersDialog(false)} />
          )}
          {variableEditor?.isOpen && (
            <VariableDialog 
              title={variableEditor.variable ? "Edit Family Variable" : "New Family Variable"}
              variable={variableEditor.variable}
              existingNames={family.instanceVariables.map(v => v.name)}
              onSave={(updates) => {
                if (variableEditor.variable) {
                  updateFamilyInstanceVariable(family.id, variableEditor.variable.id, updates);
                } else {
                  addFamilyInstanceVariable(family.id, updates.name, updates.type, updates.initialValue);
                }
                setVariableEditor(null);
              }}
              onCancel={() => setVariableEditor(null)}
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
        .inspector select:focus, .inspector input:focus { border-color: #007acc; outline: none; }
        .var-actions-hover:hover { opacity: 1 !important; }
        .action-button:hover { background-color: #444 !important; color: #fff !important; }
      `}</style>
      <div style={panelHeaderStyle}>
        <Info size={14} style={{ color: '#007acc' }} />
        Properties: {activeLayout?.name || 'Project'}
      </div>
      
      {layer && (
        <Category label="Active Layer" icon={<LayersIcon size={12} />}>
          <PropertyRow label="Name" value={layer.name} onChange={v => updateLayer(activeLayout!.id, layer.id, { name: String(v) })} icon={<Type size={12}/>} />
          <PropertyRow label="Opacity" value={layer.opacity} onChange={v => updateLayer(activeLayout!.id, layer.id, { opacity: Number(v) })} type="number" step={0.1} icon={<Hash size={12}/>} />
          <PropertyRow label="Visible" value={layer.visible ? 'Yes' : 'No'} onChange={v => updateLayer(activeLayout!.id, layer.id, { visible: v === 'Yes' })} type="select" options={['Yes', 'No']} icon={<ToggleLeft size={12}/>} />
          <PropertyRow label="Locked" value={layer.locked ? 'Yes' : 'No'} onChange={v => updateLayer(activeLayout!.id, layer.id, { locked: v === 'Yes' })} type="select" options={['Yes', 'No']} icon={<ToggleLeft size={12}/>} />
        </Category>
      )}

      {activeLayout && (
        <Category label="Layout Settings">
          <PropertyRow label="Name" value={activeLayout.name} onChange={v => updateLayout(activeLayout.id, { name: String(v) })} icon={<Type size={12}/>} />
          <PropertyRow label="Width" value={activeLayout.width} onChange={v => updateLayout(activeLayout.id, { width: Number(v) })} type="number" icon={<Hash size={12}/>} />
          <PropertyRow label="Height" value={activeLayout.height} onChange={v => updateLayout(activeLayout.id, { height: Number(v) })} type="number" icon={<Hash size={12}/>} />
          <PropertyRow 
            label="Folder" 
            value={activeLayout.folderId || ''} 
            type="select" 
            options={['', ...project.folders.filter(f => f.type === 'layout').map(f => f.id)]}
            displayValues={['(None)', ...project.folders.filter(f => f.type === 'layout').map(f => f.name)]}
            onChange={v => moveEntityToFolder('layout', activeLayout.id, v === '' ? null : String(v))} 
            icon={<Folder size={12}/>}
          />
          <PropertyRow label="Event Sheet" value={project.eventSheets.find(es => es.id === activeLayout.eventSheetId)?.name || 'None'} readOnly icon={<FileText size={12} />} />
        </Category>
      )}

      <Category label="Project Settings">
        <PropertyRow label="Name" value={project.settings.name} onChange={v => updateProjectSettings({ name: String(v) })} icon={<Type size={12}/>} />
        <PropertyRow label="Author" value={project.settings.author} onChange={v => updateProjectSettings({ author: String(v) })} icon={<Type size={12}/>} />
        <PropertyRow label="Viewport Width" value={project.settings.viewportWidth} onChange={v => updateProjectSettings({ viewportWidth: Number(v) })} type="number" icon={<Hash size={12}/>} />
        <PropertyRow label="Viewport Height" value={project.settings.viewportHeight} onChange={v => updateProjectSettings({ viewportHeight: Number(v) })} type="number" icon={<Hash size={12}/>} />
      </Category>

      <div style={{ padding: '16px 20px', fontSize: '10px', color: '#444', textAlign: 'center', borderTop: '1px solid #111', marginTop: 'auto', backgroundColor: '#181818', letterSpacing: '1px' }}>
        v{project.settings.version}
      </div>
    </div>
  );
};

const Category: React.FC<{ label: string, children: React.ReactNode, action?: React.ReactNode, icon?: React.ReactNode }> = ({ label, children, action, icon }) => {
  const [expanded, setExpanded] = React.useState(true);
  return (
    <div style={{ borderBottom: '1px solid #111' }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{ 
          padding: '8px 10px', 
          backgroundColor: '#2d2d2e', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
          borderLeft: expanded ? '2px solid #007acc' : '2px solid transparent',
          transition: 'all 0.1s'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.1s', display: 'flex', alignItems: 'center' }}>
            <ChevronDown size={12} color={expanded ? '#aaa' : '#666'} />
          </div>
          {icon && <div style={{ color: '#888', display: 'flex', alignItems: 'center' }}>{icon}</div>}
          <span style={{ fontSize: '10px', fontWeight: 700, color: expanded ? '#eee' : '#888', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
        </div>
        {action}
      </div>
      {expanded && <div style={{ backgroundColor: '#1e1e1f', padding: '2px 0' }}>{children}</div>}
    </div>
  );
};


// Styles (Moving them to end for cleanliness)
const actionButtonStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#383839',
  border: '1px solid #444',
  color: '#aaa',
  fontSize: '10px',
  fontWeight: 600,
  padding: '4px 8px',
  borderRadius: '4px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'all 0.1s'
};

const PropertyRow: React.FC<{ 
  label: string, 
  value: any, 
  onChange?: (val: any) => void, 
  readOnly?: boolean, 
  type?: 'text' | 'number' | 'select' | 'color',
  options?: string[],
  displayValues?: string[],
  step?: number,
  icon?: React.ReactNode
}> = ({ label, value, onChange, readOnly, type = 'text', options = [], displayValues = [], step = 1, icon }) => {
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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
        {readOnly ? (
          <div style={{ fontSize: '11px', color: '#666', padding: '2px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{value}</div>
        ) : type === 'select' ? (
          <select 
            value={value} 
            onChange={e => onChange?.(e.target.value)} 
            style={{ ...inputStyle, padding: '1px 4px', width: '100%' }}
          >
            {options.map((opt, i) => <option key={opt} value={opt}>{displayValues[i] || opt}</option>)}
          </select>
        ) : type === 'color' ? (
          <div style={{ display: 'flex', gap: '4px', width: '100%' }}>
            <input 
              type="color" 
              value={value || '#ffffff'} 
              onChange={e => onChange?.(e.target.value)} 
              style={{ width: '20px', height: '18px', padding: 0, border: '1px solid #333', background: 'none', cursor: 'pointer', borderRadius: '2px', flexShrink: 0 }}
            />
            <input 
              type="text" 
              value={value || ''} 
              onChange={e => onChange?.(e.target.value)} 
              style={{ ...inputStyle, flex: 1 }}
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
            style={{ ...inputStyle, height: '18px', width: '100%' }}
          />
        )}
      </div>
    </div>
  );
};

const inspectorStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#1e1e1e',
  borderLeft: '1px solid #111',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  color: '#ccc',
  userSelect: 'none'
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#383839',
  fontSize: '11px',
  fontWeight: 800,
  color: '#eee',
  borderBottom: '1px solid #1a1a1a',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
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
  background: 'none',
  border: 'none',
  color: '#888',
  cursor: 'pointer',
  padding: '2px',
  display: 'flex',
  alignItems: 'center',
  borderRadius: '3px',
  transition: 'color 0.2s'
};

const linkButtonStyle: React.CSSProperties = {
  width: '100%', 
  backgroundColor: '#333', 
  border: '1px solid #444', 
  color: '#ccc', 
  padding: '6px', 
  fontSize: '11px', 
  cursor: 'pointer', 
  borderRadius: '4px', 
  transition: 'all 0.2s'
};
