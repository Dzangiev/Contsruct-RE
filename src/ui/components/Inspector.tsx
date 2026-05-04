import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { Hash, Type, ToggleLeft, Plus, Trash2, Package, ChevronDown, ChevronRight, Edit2, Users, Folder, CheckSquare, Square, Info, Layers as LayersIcon, List as ListIcon, FileText, AlignCenter, AlignLeft, AlignRight, ArrowUp, ArrowDown, Eye, EyeOff, Zap, Activity, MousePointer2, Bug, Sparkles, Clock, LayoutGrid } from 'lucide-react';
import { BehaviorsDialog } from './BehaviorsDialog';
import { BEHAVIOR_DEFINITIONS, PLUGIN_DEFINITIONS } from '../../model/definitions';
import { VariableDialog } from './VariableDialog';
import { ObjectTypeKind } from '../../model/project';
import { FamilyMembersDialog } from './FamilyMembersDialog';
import { EffectsDialog } from './EffectsDialog';
import { StatesDialog } from './StatesDialog';

export const Inspector: React.FC = () => {
  const {
    project, editorState, updateInstance, updateLayer, updateObjectType, addInstanceVariable, updateInstanceVariable, removeInstanceVariable,
    addBehavior, removeBehavior, updateBehavior, updateLayout, updateProjectSettings, showDialog, openSpriteEditor,
    updateFamily, addFamilyObjectType, removeFamilyObjectType, addFamilyInstanceVariable, updateFamilyInstanceVariable, removeFamilyInstanceVariable,
    addFamilyBehavior, updateFamilyBehavior, removeFamilyBehavior,
    moveEntityToFolder, setSelectedInstances, reorderInstance, openTilemapEditor
  } = useEditorStore();

  const { selectedInstanceIds, selectedObjectTypeId, activeLayoutId, activeLayerId } = editorState;
  const activeLayout = project.layouts.find(l => l.id === activeLayoutId);

  const [showBehaviorsDialog, setShowBehaviorsDialog] = React.useState(false);
  const [showFamilyMembersDialog, setShowFamilyMembersDialog] = React.useState(false);
  const [variableEditor, setVariableEditor] = React.useState<{ isOpen: boolean, variable?: any, objectTypeId?: string, familyId?: string } | null>(null);
  const [showEffectsDialog, setShowEffectsDialog] = React.useState<{ targetType: 'layer' | 'objectType' | 'instance', targetId: string } | null>(null);
  const [showStatesDialog, setShowStatesDialog] = React.useState<{ objectTypeId: string } | null>(null);

  let content: React.ReactNode = null;

  const { selectedEventBlockIds, selectedLogicItemIds, highlightedInstanceIds } = editorState;

  // 0. Inspect Selected Logic Item (Condition/Action)
  if (selectedLogicItemIds.length === 1) {
    const [blockId, itemId] = selectedLogicItemIds[0].split(':');
    let selectedBlock: any = null;
    let selectedEventSheet: any = null;
    let foundItem: any = null;
    let itemType: 'condition' | 'action' = 'condition';

    project.eventSheets.forEach(es => {
      const find = (list: any[]) => {
        list.forEach(b => {
          const c = b.conditions?.find((c: any) => c.id === itemId);
          const a = b.actions?.find((a: any) => a.id === itemId);
          if (c) { foundItem = c; selectedBlock = b; selectedEventSheet = es; itemType = 'condition'; }
          if (a) { foundItem = a; selectedBlock = b; selectedEventSheet = es; itemType = 'action'; }
          find(b.children || []);
        });
      };
      find(es.events);
    });

    if (foundItem) {
      content = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={panelHeaderStyle}>
            {itemType === 'condition' ? <Zap size={14} style={{ color: '#f1c40f' }} /> : <Activity size={14} style={{ color: '#3498db' }} />}
            {itemType === 'condition' ? 'Condition' : 'Action'}: {foundItem.type}
          </div>
          
          <Category label="Common" icon={<ListIcon size={12} />}>
            <PropertyRow label="ID" value={foundItem.id} readOnly />
            <PropertyRow 
              label="Disabled" 
              value={foundItem.disabled ? 'Yes' : 'No'} 
              onChange={v => {
                if (itemType === 'condition') useEditorStore.getState().toggleConditionDisabled(selectedEventSheet.id, selectedBlock.id, foundItem.id);
                else useEditorStore.getState().toggleActionDisabled(selectedEventSheet.id, selectedBlock.id, foundItem.id);
              }} 
              type="select" 
              options={['Yes', 'No']} 
            />
          </Category>

          {highlightedInstanceIds.length > 0 && (
            <Category label="Object Picking Visualizer" icon={<Eye size={12} color="#f1c40f" />}>
               <div style={{ padding: '8px 12px', fontSize: '11px', color: '#ccc', lineHeight: '1.4' }}>
                  This logic targets <span style={{ color: '#f1c40f', fontWeight: 700 }}>{highlightedInstanceIds.length}</span> instances of 
                  <span style={{ color: '#2ecc71', fontWeight: 700 }}> {project.objectTypes.find(o => o.id === foundItem.targetObjectTypeId)?.name || 'System'}</span> in the current layout.
               </div>
               <div style={{ padding: '0 10px 10px' }}>
                  <button 
                    onClick={() => setSelectedInstances(highlightedInstanceIds)}
                    style={{ ...actionButtonStyle, width: '100%', justifyContent: 'center' }}
                  >
                    <MousePointer2 size={12} /> Select all targeted
                  </button>
               </div>
            </Category>
          )}
        </div>
      );
    }
  }

  // 0.5. Inspect Selected Event Block
  if (!content && selectedEventBlockIds.length === 1) {
    const blockId = selectedEventBlockIds[0]!;
    let selectedBlock: any = null;
    let selectedEventSheet: any = null;
    
    project.eventSheets.forEach(es => {
      const find = (list: any[]) => {
        list.forEach(b => {
          if (b.id === blockId) {
            selectedBlock = b;
            selectedEventSheet = es;
          }
          find(b.children);
        });
      };
      find(es.events);
    });

    if (selectedBlock) {
      content = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={panelHeaderStyle}>
            <ListIcon size={14} style={{ color: '#007acc' }} />
            Event: {selectedBlock.type.charAt(0).toUpperCase() + selectedBlock.type.slice(1)}
          </div>
          
          <Category label="Common" icon={<ListIcon size={12} />}>
            <PropertyRow label="ID" value={selectedBlock.id} readOnly />
            <PropertyRow label="Type" value={selectedBlock.type} readOnly />
            <PropertyRow 
              label="Disabled" 
              value={selectedBlock.disabled ? 'Yes' : 'No'} 
              onChange={v => useEditorStore.getState().updateEventBlock(selectedEventSheet.id, selectedBlock.id, { disabled: v === 'Yes' })} 
              type="select" 
              options={['Yes', 'No']} 
              icon={<EyeOff size={12}/>} 
            />
            <PropertyRow 
              label="Bookmark" 
              value={selectedBlock.bookmarked ? 'Yes' : 'No'} 
              onChange={v => useEditorStore.getState().updateEventBlock(selectedEventSheet.id, selectedBlock.id, { bookmarked: v === 'Yes' })} 
              type="select" 
              options={['Yes', 'No']} 
              icon={<Activity size={12}/>} 
            />
          </Category>

          {selectedBlock.type === 'group' && (
            <Category label="Group Properties">
              <PropertyRow 
                label="Name" 
                value={selectedBlock.groupName || ''} 
                onChange={v => useEditorStore.getState().updateEventBlock(selectedEventSheet.id, selectedBlock.id, { groupName: String(v) })} 
              />
              <PropertyRow 
                label="Active on start" 
                value={selectedBlock.groupActiveOnStart !== false ? 'Yes' : 'No'} 
                onChange={v => useEditorStore.getState().updateEventBlock(selectedEventSheet.id, selectedBlock.id, { groupActiveOnStart: v === 'Yes' })} 
                type="select" 
                options={['Yes', 'No']} 
              />
            </Category>
          )}

          {selectedBlock.type === 'comment' && (
            <Category label="Comment">
               <div style={{ padding: '8px 10px' }}>
                <textarea 
                  value={selectedBlock.commentText || ''} 
                  onChange={e => useEditorStore.getState().updateEventBlock(selectedEventSheet.id, selectedBlock.id, { commentText: e.target.value })}
                  style={{ width: '100%', backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', color: '#fff', fontSize: '12px', minHeight: '80px', padding: '8px', outline: 'none' }}
                />
               </div>
            </Category>
          )}
        </div>
      );
    }
  }

  // 1. Inspect Selected Instance
  if (selectedInstanceIds.length === 1) {
    const instanceId = selectedInstanceIds[0]!;
    const instance = activeLayout?.instances.find(inst => inst.id === instanceId);
    if (instance) {
      const objectType = project.objectTypes?.find(ot => ot.id === instance.objectTypeId);
      if (!objectType) return null;
      const families = project.families.filter(f => f.objectTypeIds.includes(objectType.id));
      content = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={panelHeaderStyle}>
            <Package size={14} style={{ color: '#007acc' }} />
            Properties: {objectType?.name || 'Instance'}
          </div>

          <Category label="Common" icon={<ListIcon size={12} />}>
            <PropertyRow label="Name" value={objectType?.name || ''} readOnly icon={<Type size={12} />} />
            <PropertyRow label="Plugin" value={objectType?.kind || ''} readOnly icon={<Package size={12} />} />
            <PropertyRow label="Layer" value={activeLayout?.layers.find(l => l.id === instance.layerId)?.name || ''} readOnly icon={<LayersIcon size={12} />} />
            <div style={{ padding: '4px 10px 8px' }}>
              <button onClick={() => setShowBehaviorsDialog(true)} style={actionButtonStyle}>
                <Plus size={12} /> Behaviors ({objectType?.behaviors?.length || 0})
              </button>
            </div>
          </Category>

          <Category label="Position">
            <PropertyRow label="X" value={instance.x} onChange={v => updateInstance(activeLayoutId!, instanceId, { x: Number(v) })} type="number" icon={<Hash size={12} />} />
            <PropertyRow label="Y" value={instance.y} onChange={v => updateInstance(activeLayoutId!, instanceId, { y: Number(v) })} type="number" icon={<Hash size={12} />} />
          </Category>

          <Category label="Size">
            <PropertyRow label="Width" value={instance.width} onChange={v => updateInstance(activeLayoutId!, instanceId, { width: Number(v) })} type="number" icon={<Hash size={12} />} />
            <PropertyRow label="Height" value={instance.height} onChange={v => updateInstance(activeLayoutId!, instanceId, { height: Number(v) })} type="number" icon={<Hash size={12} />} />
          </Category>

          <Category label="Appearance">
            <PropertyRow label="Angle" value={instance.angle} onChange={v => updateInstance(activeLayoutId!, instanceId, { angle: Number(v) })} type="number" icon={<Hash size={12} />} />
            <PropertyRow label="Opacity" value={instance.opacity} onChange={v => updateInstance(activeLayoutId!, instanceId, { opacity: Number(v) })} type="number" step={0.1} icon={<Hash size={12} />} />
            <PropertyRow label="Visible" value={instance.visible ? 'Yes' : 'No'} onChange={v => updateInstance(activeLayoutId!, instanceId, { visible: v === 'Yes' })} type="select" options={['Yes', 'No']} icon={<ToggleLeft size={12} />} />
            <div style={{ padding: '4px 10px 8px', display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowEffectsDialog({ targetType: 'instance', targetId: instanceId })} style={actionButtonStyle}>
                <Zap size={12} /> Effects ({instance.effects?.length || 0})
              </button>
              {objectType.kind === 'tilemap' && (
                <button onClick={() => openTilemapEditor(objectType.id)} style={actionButtonStyle}>
                  <LayoutGrid size={12} /> Edit Tilemap
                </button>
              )}
            </div>
          </Category>

          <Category label="Z Order">
            <div style={{ padding: '0 10px 10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button onClick={() => reorderInstance(activeLayoutId!, instanceId, 'front')} style={actionButtonStyle} title="Move to very top">
                <ArrowUp size={12} color="#2ecc71" /> Top
              </button>
              <button onClick={() => reorderInstance(activeLayoutId!, instanceId, 'forward')} style={actionButtonStyle} title="Move forward one step">
                <ArrowUp size={12} /> Forward
              </button>
              <button onClick={() => reorderInstance(activeLayoutId!, instanceId, 'back')} style={actionButtonStyle} title="Move to very bottom">
                <ArrowDown size={12} color="#e74c3c" /> Bottom
              </button>
              <button onClick={() => reorderInstance(activeLayoutId!, instanceId, 'backward')} style={actionButtonStyle} title="Move backward one step">
                <ArrowDown size={12} /> Backward
              </button>
            </div>
          </Category>

          {editorState.runtimeState && (
            <Category label="Runtime Debugger" icon={<Bug size={12} color="#f1c40f" />}>
              {(() => {
                const rtInst = editorState.runtimeState.instances.find((i: any) => i.id === instance.id);
                if (!rtInst) return <div style={infoTextStyle}>Instance not found in active runtime</div>;
                return (
                  <>
                    <div style={{ fontSize: '10px', color: '#555', padding: '6px 10px', backgroundColor: '#1a1a1a', borderBottom: '1px solid #111' }}>
                      LIVE VALUES FROM PREVIEW
                    </div>
                    <PropertyRow label="RT Pos" value={`${rtInst.x.toFixed(1)}, ${rtInst.y.toFixed(1)}`} readOnly icon={<MousePointer2 size={12} />} />
                    <PropertyRow label="RT Angle" value={`${rtInst.angle.toFixed(1)}°`} readOnly icon={<Zap size={12} />} />
                    {objectType.kind === ObjectTypeKind.Sprite && (
                      <>
                        <PropertyRow label="Anim" value={project.objectTypes.find(ot => ot.id === rtInst.objectTypeId)?.animations?.find(a => a.id === rtInst.properties._animId)?.name || 'default'} readOnly icon={<Sparkles size={12} />} />
                        <PropertyRow label="Frame" value={rtInst.properties._frameIdx} readOnly icon={<Clock size={12} />} />
                        <PropertyRow label="Playing" value={rtInst.properties._animPlaying !== false ? 'Yes' : 'No'} readOnly icon={<Activity size={12} />} />
                      </>
                    )}
                    {Object.entries(rtInst.properties).filter(([k]) => !k.startsWith('_')).map(([k, v]) => (
                      <PropertyRow 
                        key={`rt-${k}`} 
                        label={k.charAt(0).toUpperCase() + k.slice(1)} 
                        value={String(v)} 
                        readOnly 
                        icon={<Bug size={10} style={{ opacity: 0.5 }} />}
                      />
                    ))}
                    <div style={{ height: '8px' }} />
                  </>
                );
              })()}
            </Category>
          )}

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
                    icon = <Hash size={12} />;
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

          <Category label="Effects" action={<button onClick={() => setShowEffectsDialog({ targetType: 'instance', targetId: instance.id })} style={miniButtonStyle}><Plus size={12} /></button>}>
            {instance.effects?.map(e => (
              <PropertyRow
                key={e.id}
                label={e.name}
                value={e.disabled ? 'Disabled' : 'Active'}
                readOnly
                icon={<Zap size={12} color={e.disabled ? '#444' : '#f1c40f'} />}
              />
            ))}
            {(!instance.effects || instance.effects.length === 0) && <div style={{ padding: '8px 12px', fontSize: '10px', color: '#555', fontStyle: 'italic' }}>No effects</div>}
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

  // 1.5. Inspect Multiple Selected Instances
  if (!content && selectedInstanceIds.length > 1) {
    const selectedInstances = activeLayout?.instances.filter(i => selectedInstanceIds.includes(i.id)) || [];

    const getCommonValue = (key: string, subKey?: string) => {
      if (selectedInstances.length === 0) return undefined;
      const first = subKey ? (selectedInstances[0] as any)[key][subKey] : (selectedInstances[0] as any)[key];
      const allSame = selectedInstances.every(i => {
        const val = subKey ? (i as any)[key][subKey] : (i as any)[key];
        return val === first;
      });
      return allSame ? first : '';
    };

    const updateAll = (updates: any) => {
      selectedInstanceIds.forEach(id => updateInstance(activeLayoutId!, id, updates));
    };

    content = (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={panelHeaderStyle}>
          <Package size={14} style={{ color: '#007acc' }} />
          Multiple Selection ({selectedInstanceIds.length})
        </div>

        <Category label="Common Properties" icon={<ListIcon size={12} />}>
          <PropertyRow label="X" value={getCommonValue('x')} onChange={v => updateAll({ x: Number(v) })} type="number" icon={<Hash size={12} />} />
          <PropertyRow label="Y" value={getCommonValue('y')} onChange={v => updateAll({ y: Number(v) })} type="number" icon={<Hash size={12} />} />
          <PropertyRow label="Width" value={getCommonValue('width')} onChange={v => updateAll({ width: Number(v) })} type="number" icon={<Hash size={12} />} />
          <PropertyRow label="Height" value={getCommonValue('height')} onChange={v => updateAll({ height: Number(v) })} type="number" icon={<Hash size={12} />} />
          <PropertyRow label="Angle" value={getCommonValue('angle')} onChange={v => updateAll({ angle: Number(v) })} type="number" icon={<Hash size={12} />} />
          <PropertyRow label="Opacity" value={getCommonValue('opacity')} onChange={v => updateAll({ opacity: Number(v) })} type="number" step={0.1} icon={<Hash size={12} />} />
          <PropertyRow
            label="Visible"
            value={getCommonValue('visible') === '' ? '' : (getCommonValue('visible') ? 'Yes' : 'No')}
            onChange={v => updateAll({ visible: v === 'Yes' })}
            type="select"
            options={['', 'Yes', 'No']}
            displayValues={['(Mixed)', 'Yes', 'No']}
            icon={<ToggleLeft size={12} />}
          />
        </Category>

        <Category label="Alignment Tools" icon={<AlignCenter size={12} />}>
          <div style={{ padding: '8px 10px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
            <button onClick={() => {
              const minX = Math.min(...selectedInstances.map(i => i.x));
              updateAll({ x: minX });
            }} style={actionButtonStyle} title="Align Left"><AlignLeft size={12} /></button>
            <button onClick={() => {
              const minX = Math.min(...selectedInstances.map(i => i.x));
              const maxX = Math.max(...selectedInstances.map(i => i.x + i.width));
              selectedInstances.forEach(inst => updateInstance(activeLayoutId!, inst.id, { x: Math.round(minX + (maxX - minX) / 2 - inst.width / 2) }));
            }} style={actionButtonStyle} title="Align Center"><AlignCenter size={12} /></button>
            <button onClick={() => {
              const maxX = Math.max(...selectedInstances.map(i => i.x + i.width));
              selectedInstances.forEach(inst => updateInstance(activeLayoutId!, inst.id, { x: maxX - inst.width }));
            }} style={actionButtonStyle} title="Align Right"><AlignRight size={12} /></button>
            <button onClick={() => {
              const minY = Math.min(...selectedInstances.map(i => i.y));
              updateAll({ y: minY });
            }} style={actionButtonStyle} title="Align Top"><ArrowUp size={12} /></button>
            <button onClick={() => {
              const minY = Math.min(...selectedInstances.map(i => i.y));
              const maxY = Math.max(...selectedInstances.map(i => i.y + i.height));
              selectedInstances.forEach(inst => updateInstance(activeLayoutId!, inst.id, { y: Math.round(minY + (maxY - minY) / 2 - inst.height / 2) }));
            }} style={actionButtonStyle} title="Align Middle"><span style={{ fontWeight: 'bold' }}>—</span></button>
            <button onClick={() => {
              const maxY = Math.max(...selectedInstances.map(i => i.y + i.height));
              selectedInstances.forEach(inst => updateInstance(activeLayoutId!, inst.id, { y: maxY - inst.height }));
            }} style={actionButtonStyle} title="Align Bottom"><ArrowDown size={12} /></button>
          </div>
        </Category>
      </div>
    );
  }

  // 2. Inspect Selected Object Type
  if (!content && selectedObjectTypeId) {
    const objectType = project.objectTypes?.find(ot => ot.id === selectedObjectTypeId);
    if (objectType) {
      const families = project.families.filter(f => f.objectTypeIds.includes(objectType.id));
      content = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={panelHeaderStyle}>
            <Package size={14} style={{ color: '#007acc' }} />
            Object Type: {objectType.name}
          </div>

          <Category label="General" icon={<ListIcon size={12} />}>
            <PropertyRow label="Name" value={objectType.name} onChange={v => updateObjectType(objectType.id, { name: String(v) })} icon={<Type size={12} />} />
            <PropertyRow label="Kind" value={objectType.kind} readOnly icon={<Package size={12} />} />
            <PropertyRow
              label="Folder"
              value={objectType.folderId || ''}
              type="select"
              options={['', ...project.folders.filter(f => f.type === 'objectType').map(f => f.id)]}
              displayValues={['(None)', ...project.folders.filter(f => f.type === 'objectType').map(f => f.name)]}
              onChange={v => moveEntityToFolder('objectType', objectType.id, v === '' ? null : String(v))}
              icon={<Folder size={12} />}
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
              {objectType.kind === 'tilemap' && (
                <button onClick={() => openTilemapEditor(objectType.id)} style={actionButtonStyle}>
                  <LayoutGrid size={12} /> Edit Tilemap
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
                <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#555' }}><Type size={12} /></div>
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
                  onClick={() => updateInstanceVariable(objectType.id, v.id, { watcherEnabled: !v.watcherEnabled })}
                  style={{ background: 'none', border: 'none', color: v.watcherEnabled ? '#007acc' : '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  title="Toggle Live Watcher"
                >
                  {v.watcherEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
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
                    <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#f1c40f' }}><Type size={12} /></div>
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

          <Category label="State Machine" action={<button onClick={() => setShowStatesDialog({ objectTypeId: objectType.id })} style={miniButtonStyle}><Plus size={12} /></button>}>
            <div style={{ padding: '8px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', color: '#888' }}>Initial State:</span>
                <span style={{ fontSize: '11px', color: '#ccc', fontWeight: 600 }}>
                  {objectType.states?.find(s => s.id === objectType.initialStateId)?.name || '(None)'}
                </span>
              </div>
              {objectType.states?.map(s => (
                <div key={s.id} style={{ fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Activity size={10} color={s.id === objectType.initialStateId ? '#3498db' : '#444'} />
                  {s.name}
                </div>
              ))}
              {(!objectType.states || objectType.states.length === 0) && <div style={{ fontSize: '10px', color: '#555', fontStyle: 'italic' }}>No states defined</div>}
            </div>
          </Category>

          <Category label="Effects" action={<button onClick={() => setShowEffectsDialog({ targetType: 'objectType', targetId: objectType.id })} style={miniButtonStyle}><Plus size={12} /></button>}>
            {objectType.effects?.map(e => (
              <PropertyRow
                key={e.id}
                label={e.name}
                value={e.disabled ? 'Disabled' : 'Active'}
                readOnly
                icon={<Zap size={12} color={e.disabled ? '#444' : '#f1c40f'} />}
              />
            ))}
            {(!objectType.effects || objectType.effects.length === 0) && <div style={{ padding: '8px 12px', fontSize: '10px', color: '#555', fontStyle: 'italic' }}>No effects</div>}
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
  if (!content && editorState.selectedFamilyId) {
    const family = project.families.find(f => f.id === editorState.selectedFamilyId);
    if (family) {
      content = (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={panelHeaderStyle}>
            <Users size={14} style={{ color: '#007acc' }} />
            Family: {family.name}
          </div>

          <Category label="General" icon={<ListIcon size={12} />}>
            <PropertyRow label="Name" value={family.name} onChange={v => updateFamily(family.id, { name: String(v) })} icon={<Users size={12} />} />
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
                <div style={{ width: '16px', display: 'flex', alignItems: 'center', color: '#555' }}><Type size={12} /></div>
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
                  onClick={() => updateFamilyInstanceVariable(family.id, v.id, { watcherEnabled: !v.watcherEnabled })}
                  style={{ background: 'none', border: 'none', color: v.watcherEnabled ? '#007acc' : '#444', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                  title="Toggle Live Watcher"
                >
                  {v.watcherEnabled ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
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

  const defaultContent = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      <div style={panelHeaderStyle}>
        <Info size={14} style={{ color: '#007acc' }} />
        Properties: {activeLayout?.name || 'Project'}
      </div>

      {layer && (
        <Category label="Active Layer" icon={<LayersIcon size={12} />}>
          <PropertyRow label="Name" value={layer.name} onChange={v => updateLayer(activeLayout!.id, layer.id, { name: String(v) })} icon={<Type size={12} />} />
          <PropertyRow label="Opacity" value={layer.opacity} onChange={v => updateLayer(activeLayout!.id, layer.id, { opacity: Number(v) })} type="number" step={0.1} icon={<Hash size={12} />} />
          <PropertyRow label="Parallax X" value={layer.parallaxX} onChange={v => updateLayer(activeLayout!.id, layer.id, { parallaxX: Number(v) })} type="number" step={0.1} icon={<Hash size={12} />} />
          <PropertyRow label="Parallax Y" value={layer.parallaxY} onChange={v => updateLayer(activeLayout!.id, layer.id, { parallaxY: Number(v) })} type="number" step={0.1} icon={<Hash size={12} />} />
          <PropertyRow label="Visible" value={layer.visible ? 'Yes' : 'No'} onChange={v => updateLayer(activeLayout!.id, layer.id, { visible: v === 'Yes' })} type="select" options={['Yes', 'No']} icon={<ToggleLeft size={12} />} />
          <PropertyRow label="Locked" value={layer.locked ? 'Yes' : 'No'} onChange={v => updateLayer(activeLayout!.id, layer.id, { locked: v === 'Yes' })} type="select" options={['Yes', 'No']} icon={<ToggleLeft size={12} />} />
          <div style={{ padding: '4px 10px' }}>
            <button onClick={() => setShowEffectsDialog({ targetType: 'layer', targetId: layer.id })} style={actionButtonStyle}>
              <Plus size={12} /> Effects ({layer.effects?.length || 0})
            </button>
          </div>
        </Category>
      )}

      {activeLayout && (
        <Category label="Layout Settings">
          <PropertyRow label="Name" value={activeLayout.name} onChange={v => updateLayout(activeLayout.id, { name: String(v) })} icon={<Type size={12} />} />
          <PropertyRow label="Width" value={activeLayout.width} onChange={v => updateLayout(activeLayout.id, { width: Number(v) })} type="number" icon={<Hash size={12} />} />
          <PropertyRow label="Height" value={activeLayout.height} onChange={v => updateLayout(activeLayout.id, { height: Number(v) })} type="number" icon={<Hash size={12} />} />
          <PropertyRow
            label="Folder"
            value={activeLayout.folderId || ''}
            type="select"
            options={['', ...project.folders.filter(f => f.type === 'layout').map(f => f.id)]}
            displayValues={['(None)', ...project.folders.filter(f => f.type === 'layout').map(f => f.name)]}
            onChange={v => moveEntityToFolder('layout', activeLayout.id, v === '' ? null : String(v))}
            icon={<Folder size={12} />}
          />
          <PropertyRow label="Event Sheet" value={project.eventSheets.find(es => es.id === activeLayout.eventSheetId)?.name || 'None'} readOnly icon={<FileText size={12} />} />
        </Category>
      )}

      <Category label="Project Settings">
        <PropertyRow label="Name" value={project.settings.name} onChange={v => updateProjectSettings({ name: String(v) })} icon={<Type size={12} />} />
        <PropertyRow label="Author" value={project.settings.author} onChange={v => updateProjectSettings({ author: String(v) })} icon={<Type size={12} />} />
        <PropertyRow label="Viewport Width" value={project.settings.viewportWidth} onChange={v => updateProjectSettings({ viewportWidth: Number(v) })} type="number" icon={<Hash size={12} />} />
        <PropertyRow label="Viewport Height" value={project.settings.viewportHeight} onChange={v => updateProjectSettings({ viewportHeight: Number(v) })} type="number" icon={<Hash size={12} />} />
      </Category>

      <div style={{ padding: '16px 20px', fontSize: '10px', color: '#444', textAlign: 'center', borderTop: '1px solid #111', marginTop: 'auto', backgroundColor: '#181818', letterSpacing: '1px' }}>
        v{project.settings.version}
      </div>
    </div>
  );

  return (
    <div className="inspector" style={inspectorStyle}>
      <style>{`
        .property-row-hover:hover { background-color: rgba(255,255,255,0.03); }
        .inspector select:hover, .inspector input:hover { border-color: #555; }
        .inspector select:focus, .inspector input:focus { border-color: #007acc; outline: none; }
        .var-actions-hover:hover { opacity: 1 !important; }
        .action-button:hover { background-color: #444 !important; color: #fff !important; }
        .inspector::-webkit-scrollbar { width: 6px; }
        .inspector::-webkit-scrollbar-track { background: transparent; }
        .inspector::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .inspector::-webkit-scrollbar-thumb:hover { background: #444; }
      `}</style>

      {content || defaultContent}

      {showEffectsDialog && (
        <EffectsDialog
          effects={(() => {
            const d = showEffectsDialog!;
            if (d.targetType === 'layer') return project.layouts.find(l => l.id === activeLayoutId)?.layers.find(ly => ly.id === d.targetId)?.effects || [];
            if (d.targetType === 'objectType') return project.objectTypes.find(ot => ot.id === d.targetId)?.effects || [];
            if (d.targetType === 'instance') return project.layouts.find(l => l.id === activeLayoutId)?.instances.find(inst => inst.id === d.targetId)?.effects || [];
            return [];
          })()}
          onAdd={(type, name, props) => useEditorStore.getState().addEffect(showEffectsDialog!.targetType, showEffectsDialog!.targetId, type, name, props)}
          onRemove={id => useEditorStore.getState().removeEffect(showEffectsDialog!.targetType, showEffectsDialog!.targetId, id)}
          onUpdate={(id, updates) => useEditorStore.getState().updateEffect(showEffectsDialog!.targetType, showEffectsDialog!.targetId, id, updates)}
          onClose={() => setShowEffectsDialog(null)}
        />
      )}

      {showStatesDialog && (
        <StatesDialog
          states={project.objectTypes.find(ot => ot.id === showStatesDialog!.objectTypeId)?.states || []}
          initialStateId={project.objectTypes.find(ot => ot.id === showStatesDialog!.objectTypeId)?.initialStateId}
          onAdd={name => useEditorStore.getState().addState(showStatesDialog!.objectTypeId, name)}
          onRemove={id => useEditorStore.getState().removeState(showStatesDialog!.objectTypeId, id)}
          onUpdate={(id, updates) => useEditorStore.getState().updateState(showStatesDialog!.objectTypeId, id, updates)}
          onSetInitial={id => useEditorStore.getState().updateObjectType(showStatesDialog!.objectTypeId, { initialStateId: id })}
          onClose={() => setShowStatesDialog(null)}
        />
      )}
    </div>
  );
};

const Category: React.FC<{ label: string, children: React.ReactNode, action?: React.ReactNode, icon?: React.ReactNode }> = ({ label, children, action, icon }) => {
  const [expanded, setExpanded] = React.useState(true);
  return (
    <div style={{ borderBottom: '1px solid #111' }}>
      <div
        style={{
          padding: '8px 10px',
          backgroundColor: '#2d2d2e',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          userSelect: 'none',
          borderLeft: expanded ? '2px solid #007acc' : '2px solid transparent',
          transition: 'all 0.1s'
        }}
      >
        <div
          onClick={() => setExpanded(!expanded)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}
        >
          <div style={{ transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.1s', display: 'flex', alignItems: 'center' }}>
            <ChevronDown size={12} color={expanded ? '#aaa' : '#666'} />
          </div>
          {icon && <div style={{ color: '#888', display: 'flex', alignItems: 'center' }}>{icon}</div>}
          <span style={{ fontSize: '10px', fontWeight: 700, color: expanded ? '#eee' : '#888', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</span>
        </div>
        {action && (
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {action}
          </div>
        )}
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
      <div style={{ width: '16px', flexShrink: 0, display: 'flex', alignItems: 'center', color: '#666' }}>{icon}</div>
      <label
        style={{
          width: '90px',
          flexShrink: 0,
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
  height: '100%',
  flex: 1,
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
  outline: 'none',
  transition: 'all 0.1s ease',
  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
  margin: '1px 0'
};

const infoTextStyle: React.CSSProperties = {
  padding: '8px 12px',
  fontSize: '11px',
  color: '#888',
  fontStyle: 'italic'
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
