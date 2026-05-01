import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock } from '../../model/project';
import { Plus, Trash2, Eye, EyeOff, Search } from 'lucide-react';
import { LogicBrowser } from './LogicBrowser';
import { findConditionDefinition, findActionDefinition, LogicDefinition } from '../../model/definitions';

export const EventSheetEditor: React.FC = () => {
  const { 
    project, editorState, 
    addEventBlock, updateEventBlock, removeEventBlock, 
    addCondition, updateCondition, removeCondition, 
    addAction, updateAction, removeAction,
    setSelectedEventBlocks, setSelectedLogicItems
  } = useEditorStore();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  
  // Browser/Editor State
  const [browserState, setBrowserState] = React.useState<{
    isOpen: boolean,
    mode: 'condition' | 'action',
    eventSheetId: string,
    blockId: string
  } | null>(null);

  const [paramEditorState, setParamEditorState] = React.useState<{
    isOpen: boolean,
    mode: 'condition' | 'action',
    eventSheetId: string,
    blockId: string,
    itemId: string,
    def: LogicDefinition,
    params: any[]
  } | null>(null);

  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const eventSheet = project.eventSheets.find(es => es.id === activeLayout?.eventSheetId) || project.eventSheets[0];

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const blockIds = editorState.selectedEventBlockIds;
      const logicIds = editorState.selectedLogicItemIds;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        blockIds.forEach(id => removeEventBlock(eventSheet.id, id));
        setSelectedEventBlocks([]);
        
        logicIds.forEach(fullId => {
          const [blockId, itemId] = fullId.split(':');
          // We need to know if it's a condition or an action. 
          // For now, let's try to remove from both as a simple solution or store type in ID.
          removeCondition(eventSheet.id, blockId, itemId);
          removeAction(eventSheet.id, blockId, itemId);
        });
        setSelectedLogicItems([]);
      }

      if (e.key === 'd' || e.key === 'D') {
        blockIds.forEach(id => {
          const findBlock = (blocks: EventBlock[]): EventBlock | undefined => {
            for (const b of blocks) {
              if (b.id === id) return b;
              const found = findBlock(b.children);
              if (found) return found;
            }
            return undefined;
          };
          const block = findBlock(eventSheet.events);
          if (block) updateEventBlock(eventSheet.id, id, { disabled: !block.disabled });
        });
      }

      if (e.key === 'i' || e.key === 'I') {
        // Invert selected conditions
        logicIds.forEach(fullId => {
          const [blockId, itemId] = fullId.split(':');
          const findBlock = (blocks: EventBlock[]): EventBlock | undefined => {
            for (const b of blocks) {
              if (b.id === blockId) return b;
              const found = findBlock(b.children);
              if (found) return found;
            }
            return undefined;
          };
          const block = findBlock(eventSheet.events);
          const cond = block?.conditions.find(c => c.id === itemId);
          if (cond) updateCondition(eventSheet.id, blockId, itemId, { inverted: !cond.inverted });
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState.selectedEventBlockIds, editorState.selectedLogicItemIds, eventSheet, updateEventBlock, removeEventBlock, updateCondition, removeCondition, removeAction, setSelectedEventBlocks, setSelectedLogicItems]);

  if (!eventSheet) {
    return <div style={{ color: '#666', padding: '20px' }}>No event sheet found.</div>;
  }

  const openBrowser = (mode: 'condition' | 'action', blockId: string) => {
    setBrowserState({ isOpen: true, mode, eventSheetId: eventSheet.id, blockId });
  };

  const openParamEditor = (mode: 'condition' | 'action', blockId: string, itemId: string, def: LogicDefinition, params: any[]) => {
    setParamEditorState({ isOpen: true, mode, eventSheetId: eventSheet.id, blockId, itemId, def, params });
  };

  const handleBrowserSelect = (targetObjectTypeId: string | undefined, type: string, params: any[]) => {
    if (!browserState) return;
    if (browserState.mode === 'condition') {
      addCondition(browserState.eventSheetId, browserState.blockId, type, params, targetObjectTypeId);
    } else {
      addAction(browserState.eventSheetId, browserState.blockId, type, params, targetObjectTypeId);
    }
  };

  const handleParamUpdate = (newParams: any[]) => {
    if (!paramEditorState) return;
    if (paramEditorState.mode === 'condition') {
      updateCondition(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { params: newParams });
    } else {
      updateAction(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { params: newParams });
    }
    setParamEditorState(null);
  };

  const filterBlocks = (blocks: EventBlock[]): EventBlock[] => {
    if (!searchTerm) return blocks;
    return blocks.filter(b => {
      const matchComment = b.commentText?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchGroup = b.groupName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchVar = b.variable?.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchConditions = b.conditions.some(c => c.type.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchActions = b.actions.some(a => a.type.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchChildren = filterBlocks(b.children).length > 0;
      return matchComment || matchGroup || matchVar || matchConditions || matchActions || matchChildren;
    });
  };

  const visibleEvents = filterBlocks(eventSheet.events);

  return (
    <div className="event-sheet-editor" 
      onClick={() => { setSelectedEventBlocks([]); setSelectedLogicItems([]); }}
      style={{
        flex: 1, backgroundColor: '#1e1e1e', color: '#d4d4d4', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', height: '100%'
      }}
    >
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 20px',
        backgroundColor: '#252526', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{eventSheet.name}</h2>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', color: '#666' }} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search events..."
              style={{
                backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '4px',
                padding: '4px 10px 4px 28px', fontSize: '12px', color: '#fff', width: '200px'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'event'); }} style={toolbarButtonStyle}><Plus size={14} /> Add Event</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'group'); }} style={toolbarButtonStyle}><Plus size={14} /> Add Group</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'comment'); }} style={toolbarButtonStyle}><Plus size={14} /> Add Comment</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'variable'); }} style={toolbarButtonStyle}><Plus size={14} /> Add Variable</button>
        </div>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {visibleEvents.map((event, index) => (
          <EventBlockItem 
            key={event.id} 
            eventSheetId={eventSheet.id} 
            block={event} 
            index={index + 1} 
            onOpenBrowser={openBrowser}
            onOpenParamEditor={openParamEditor}
          />
        ))}
        {eventSheet.events.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#666', border: '2px dashed #333', borderRadius: '8px' }}>
            This event sheet is empty. Use the buttons above to begin.
          </div>
        )}
      </div>

      {browserState?.isOpen && (
        <LogicBrowser project={project} mode={browserState.mode} onSelect={handleBrowserSelect} onClose={() => setBrowserState(null)} />
      )}

      {paramEditorState?.isOpen && (
        <ParamEditor project={project} def={paramEditorState.def} initialParams={paramEditorState.params} onSave={handleParamUpdate} onCancel={() => setParamEditorState(null)} />
      )}
    </div>
  );
};

const EventBlockItem: React.FC<{ 
  eventSheetId: string, 
  block: EventBlock, 
  index?: number,
  onOpenBrowser: (mode: 'condition' | 'action', blockId: string) => void,
  onOpenParamEditor: (mode: 'condition' | 'action', blockId: string, itemId: string, def: LogicDefinition, params: any[]) => void
}> = ({ eventSheetId, block, index, onOpenBrowser, onOpenParamEditor }) => {
  const { 
    editorState, setSelectedEventBlocks, setSelectedLogicItems,
    updateEventBlock, removeEventBlock, addEventBlock
  } = useEditorStore();

  const isSelected = editorState.selectedEventBlockIds.includes(block.id);
  const isDisabled = block.disabled;

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const next = isSelected 
        ? editorState.selectedEventBlockIds.filter(id => id !== block.id)
        : [...editorState.selectedEventBlockIds, block.id];
      setSelectedEventBlocks(next);
    } else {
      setSelectedEventBlocks([block.id]);
    }
  };

  if (block.type === 'variable' && block.variable) {
    return (
      <div 
        onClick={handleSelect}
        style={{
          backgroundColor: '#252526', border: '1px solid', borderColor: isSelected ? '#007acc' : '#444', 
          borderLeftWidth: '4px', borderLeftColor: '#3498db', padding: '6px 12px', margin: '4px 0', 
          borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px'
        }}
      >
        <div style={{ color: '#3498db', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>Global</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <input
            value={block.variable.name}
            onChange={(e) => updateEventBlock(eventSheetId, block.id, { variable: { ...block.variable!, name: e.target.value } })}
            onClick={(e) => e.stopPropagation()}
            style={{ ...inputStyle, width: 'auto', fontWeight: 'bold' }}
          />
          <span style={{ color: '#888', fontSize: '12px' }}>=</span>
          <input
            value={block.variable.initialValue}
            onChange={(e) => updateEventBlock(eventSheetId, block.id, { variable: { ...block.variable!, initialValue: e.target.value } })}
            onClick={(e) => e.stopPropagation()}
            style={{ ...inputStyle, width: '80px' }}
          />
          <span style={{ color: '#666', fontSize: '11px', marginLeft: '10px' }}>({block.variable.type})</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); removeEventBlock(eventSheetId, block.id); }} style={iconButtonStyle}><Trash2 size={14} color="#f44336" /></button>
      </div>
    );
  }

  if (block.type === 'comment') {
    return (
      <div 
        onClick={handleSelect}
        style={{
          backgroundColor: '#feffc1', color: '#000', padding: '8px 12px', margin: '4px 0', borderRadius: '2px', 
          border: '1px solid', borderColor: isSelected ? '#007acc' : 'transparent',
          borderLeft: '4px solid #f1c40f', fontSize: '13px', fontStyle: 'italic', display: 'flex', justifyContent: 'space-between', alignItems: 'start'
        }}
      >
        <textarea
          value={block.commentText || ''}
          onChange={(e) => updateEventBlock(eventSheetId, block.id, { commentText: e.target.value })}
          onClick={(e) => e.stopPropagation()}
          style={{ background: 'none', border: 'none', outline: 'none', width: '100%', resize: 'none', fontFamily: 'inherit', fontSize: 'inherit', fontStyle: 'inherit' }}
          placeholder="Double-click to edit comment..."
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto'; target.style.height = target.scrollHeight + 'px';
          }}
        />
        <button onClick={(e) => { e.stopPropagation(); removeEventBlock(eventSheetId, block.id); }} style={{ ...iconButtonStyle, color: '#666' }}><Trash2 size={14} /></button>
      </div>
    );
  }

  if (block.type === 'group') {
    return (
      <div 
        onClick={handleSelect}
        style={{ margin: '8px 0', border: '1px solid', borderColor: isSelected ? '#007acc' : '#444', borderRadius: '4px', overflow: 'hidden' }}
      >
        <div style={{ backgroundColor: '#333', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !block.groupExpanded }); }}>
          <span style={{ fontSize: '12px', transform: block.groupExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}>▶</span>
          <input
            value={block.groupName || ''}
            onChange={(e) => updateEventBlock(eventSheetId, block.id, { groupName: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 'bold', outline: 'none', flex: 1 }}
            placeholder="Group Name"
          />
          <button onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { disabled: !block.disabled }); }} style={iconButtonStyle}>
            {isDisabled ? <EyeOff size={14} color="#e67e22" /> : <Eye size={14} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheetId, block.id, 'event'); }} style={iconButtonStyle}><Plus size={14} color="#4caf50" /></button>
          <button onClick={(e) => { e.stopPropagation(); removeEventBlock(eventSheetId, block.id); }} style={iconButtonStyle}><Trash2 size={14} color="#f44336" /></button>
        </div>
        {block.groupExpanded && (
          <div style={{ padding: '8px 8px 8px 20px', backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {block.children.map((child) => (
              <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} />
            ))}
            {block.children.length === 0 && <div style={{ padding: '10px', color: '#666', fontSize: '11px', textAlign: 'center' }}>Group is empty.</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={handleSelect}
      style={{
        display: 'flex', flexDirection: 'column', border: '1px solid', borderColor: isSelected ? '#007acc' : '#333', borderRadius: '2px',
        backgroundColor: isDisabled ? '#252526' : '#2d2d2d', opacity: isDisabled ? 0.6 : 1, marginBottom: '2px'
      }}
    >
      <div style={{ display: 'flex', minHeight: '60px' }}>
        <div style={{ width: '30px', backgroundColor: isSelected ? '#004b7e' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#888', borderRight: '1px solid #444', userSelect: 'none' }}>
          {index}
        </div>

        <div style={{ flex: 1, padding: '8px', borderRight: '1px solid #333', minWidth: '300px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {block.conditions.map(c => (
              <ConditionItem key={c.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} condition={c} onOpenParamEditor={onOpenParamEditor} />
            ))}
            <button onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ ...addLinkStyle, alignSelf: 'flex-start' }}>+ Add condition</button>
          </div>
        </div>

        <div style={{ flex: 1, padding: '8px', minWidth: '300px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {block.actions.map(a => (
              <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} action={a} onOpenParamEditor={onOpenParamEditor} />
            ))}
            <button onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ ...addLinkStyle, alignSelf: 'flex-start' }}>+ Add action</button>
          </div>
        </div>

        <div style={{ padding: '4px', display: 'flex', flexDirection: 'column', gap: '4px', borderLeft: '1px solid #333', backgroundColor: '#252526', width: '28px' }}>
          <button onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { disabled: !block.disabled }); }} style={iconButtonStyle}>
            {isDisabled ? <EyeOff size={12} color="#e67e22" /> : <Eye size={12} />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheetId, block.id, 'event'); }} style={iconButtonStyle}><Plus size={12} color="#4caf50" /></button>
          <button onClick={(e) => { e.stopPropagation(); removeEventBlock(eventSheetId, block.id); }} style={iconButtonStyle}><Trash2 size={12} color="#f44336" /></button>
        </div>
      </div>

      {block.children.length > 0 && (
        <div style={{ padding: '2px 0 2px 30px', backgroundColor: 'rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {block.children.map((child) => (
            <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} />
          ))}
        </div>
      )}
    </div>
  );
};

const ConditionItem: React.FC<{ 
  project: any, eventSheetId: string, blockId: string, condition: any,
  onOpenParamEditor: (mode: 'condition' | 'action', blockId: string, itemId: string, def: LogicDefinition, params: any[]) => void
}> = ({ project, eventSheetId, blockId, condition, onOpenParamEditor }) => {
  const { editorState, setSelectedLogicItems, removeCondition } = useEditorStore();
  const def = findConditionDefinition(condition.type);
  const targetObject = project.objectTypes.find((ot: any) => ot.id === condition.targetObjectTypeId);

  const selectionId = `${blockId}:${condition.id}`;
  const isSelected = editorState.selectedLogicItemIds.includes(selectionId);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const next = isSelected 
        ? editorState.selectedLogicItemIds.filter(id => id !== selectionId)
        : [...editorState.selectedLogicItemIds, selectionId];
      setSelectedLogicItems(next);
    } else {
      setSelectedLogicItems([selectionId]);
    }
  };

  return (
    <div 
      onClick={handleSelect}
      onDoubleClick={() => def && onOpenParamEditor('condition', blockId, condition.id, def, condition.params)}
      style={{
        ...logicItemStyle, 
        backgroundColor: isSelected ? '#004b7e' : 'transparent',
        border: isSelected ? '1px solid #007acc' : '1px solid transparent'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '16px', height: '16px', backgroundColor: targetObject?.assetId ? 'transparent' : '#555', borderRadius: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
          {targetObject?.name?.[0] || 'S'}
        </div>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', opacity: isSelected ? 1 : 0.9 }}>
          {condition.inverted && <span style={{ color: '#e67e22', fontWeight: 'bold', fontSize: '14px' }}>!</span>}
          <span style={{ color: isSelected ? '#fff' : '#aaa', fontSize: '12px' }}>{targetObject?.name || 'System'}</span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 500 }}>{def?.name || condition.type}</span>
          <span style={{ color: isSelected ? '#fff' : '#007acc', fontSize: '11px', fontWeight: 'bold' }}>
            ({condition.params.map((p: any, i: number) => {
              const pDef = def?.params[i];
              return pDef?.type === 'objectType' ? (project.objectTypes.find((ot: any) => ot.id === p)?.name || p) : String(p);
            }).join(', ')})
          </span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); removeCondition(eventSheetId, blockId, condition.id); }} style={{ ...iconButtonStyle, opacity: isSelected ? 1 : 0.4 }}><Trash2 size={12} /></button>
      </div>
    </div>
  );
};

const ActionItem: React.FC<{ 
  project: any, eventSheetId: string, blockId: string, action: any,
  onOpenParamEditor: (mode: 'condition' | 'action', blockId: string, itemId: string, def: LogicDefinition, params: any[]) => void
}> = ({ project, eventSheetId, blockId, action, onOpenParamEditor }) => {
  const { editorState, setSelectedLogicItems, removeAction } = useEditorStore();
  const def = findActionDefinition(action.type);
  const targetObject = project.objectTypes.find((ot: any) => ot.id === action.targetObjectTypeId);

  const selectionId = `${blockId}:${action.id}`;
  const isSelected = editorState.selectedLogicItemIds.includes(selectionId);

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      const next = isSelected 
        ? editorState.selectedLogicItemIds.filter(id => id !== selectionId)
        : [...editorState.selectedLogicItemIds, selectionId];
      setSelectedLogicItems(next);
    } else {
      setSelectedLogicItems([selectionId]);
    }
  };

  return (
    <div 
      onClick={handleSelect}
      onDoubleClick={() => def && onOpenParamEditor('action', blockId, action.id, def, action.params)}
      style={{
        ...logicItemStyle, 
        backgroundColor: isSelected ? '#004b7e' : 'transparent',
        border: isSelected ? '1px solid #007acc' : '1px solid transparent'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ width: '16px', height: '16px', backgroundColor: targetObject?.assetId ? 'transparent' : '#555', borderRadius: '2px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
          {targetObject?.name?.[0] || 'S'}
        </div>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', opacity: isSelected ? 1 : 0.9 }}>
          <span style={{ color: isSelected ? '#fff' : '#aaa', fontSize: '12px' }}>{targetObject?.name || 'System'}</span>
          <span style={{ color: '#fff', fontSize: '12px', fontWeight: 500 }}>{def?.name || action.type}</span>
          <span style={{ color: isSelected ? '#fff' : '#007acc', fontSize: '11px', fontWeight: 'bold' }}>
            ({action.params.map((p: any, i: number) => {
              const pDef = def?.params[i];
              return pDef?.type === 'objectType' ? (project.objectTypes.find((ot: any) => ot.id === p)?.name || p) : String(p);
            }).join(', ')})
          </span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); removeAction(eventSheetId, blockId, action.id); }} style={{ ...iconButtonStyle, opacity: isSelected ? 1 : 0.4 }}><Trash2 size={12} /></button>
      </div>
    </div>
  );
};

const ParamEditor: React.FC<{ project: any, def: LogicDefinition, initialParams: any[], onSave: (params: any[]) => void, onCancel: () => void }> = ({ project, def, initialParams, onSave, onCancel }) => {
  const [params, setParams] = React.useState([...initialParams]);
  const updateParam = (index: number, value: any) => { const next = [...params]; next[index] = value; setParams(next); };

  return (
    <div style={overlayStyle} onClick={(e) => e.stopPropagation()}>
      <div style={modalStyle}>
        <div style={modalHeaderStyle}><h3 style={{ margin: 0, fontSize: '14px' }}>Parameters: {def.name}</h3></div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {def.params.map((pDef, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12px', color: '#888' }}>{pDef.name}</label>
              {pDef.type === 'enum' ? (
                <select value={params[i]} onChange={(e) => updateParam(i, e.target.value)} style={paramInputStyle}>
                  {pDef.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              ) : pDef.type === 'objectType' ? (
                <select value={params[i]} onChange={(e) => updateParam(i, e.target.value)} style={paramInputStyle}>
                  <option value="">None</option>
                  {project.objectTypes.map((ot: any) => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
                </select>
              ) : pDef.type === 'boolean' ? (
                <input type="checkbox" checked={!!params[i]} onChange={(e) => updateParam(i, e.target.checked)} />
              ) : (
                <input type={pDef.type === 'number' ? 'number' : 'text'} value={params[i]} onChange={(e) => updateParam(i, pDef.type === 'number' ? Number(e.target.value) : e.target.value)} style={paramInputStyle} />
              )}
            </div>
          ))}
          {def.params.length === 0 && <div style={{ color: '#666', fontSize: '13px' }}>No parameters for this action.</div>}
        </div>
        <div style={modalFooterStyle}>
          <button onClick={() => onSave(params)} style={saveButtonStyle}>Done</button>
          <button onClick={onCancel} style={cancelButtonStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 };
const modalStyle: React.CSSProperties = { width: '400px', backgroundColor: '#2d2d2d', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #444', color: '#d4d4d4' };
const modalHeaderStyle: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #444' };
const modalFooterStyle: React.CSSProperties = { padding: '12px 16px', borderTop: '1px solid #444', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
const paramInputStyle: React.CSSProperties = { backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '13px', outline: 'none' };
const saveButtonStyle: React.CSSProperties = { backgroundColor: '#007acc', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const cancelButtonStyle: React.CSSProperties = { backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const toolbarButtonStyle: React.CSSProperties = { backgroundColor: '#3c3c3c', color: '#ccc', border: '1px solid #444', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' };
const logicItemStyle: React.CSSProperties = { padding: '4px 6px', borderRadius: '2px', display: 'flex', flexDirection: 'column', transition: 'background-color 0.1s', cursor: 'pointer' };
const addLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#007acc', fontSize: '12px', cursor: 'pointer', padding: '4px 0', textAlign: 'left' };
const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' };
const inputStyle: React.CSSProperties = { backgroundColor: '#1e1e1e', color: '#fff', border: '1px solid #444', borderRadius: '2px', fontSize: '11px', padding: '2px 4px' };
