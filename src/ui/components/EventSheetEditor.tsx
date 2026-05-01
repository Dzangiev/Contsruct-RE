import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock } from '../../model/project';
import { Plus, Trash2, Eye, EyeOff, Search, Copy, Scissors, Clipboard, ChevronUp, ChevronDown, List, Settings, Info } from 'lucide-react';
import { LogicBrowser } from './LogicBrowser';
import { findConditionDefinition, findActionDefinition, LogicDefinition } from '../../model/definitions';

export const EventSheetEditor: React.FC = () => {
  const { 
    project, editorState, 
    addEventBlock, updateEventBlock, removeEventBlock, moveEventBlock,
    addCondition, updateCondition, removeCondition, 
    addAction, updateAction, removeAction,
    setSelectedEventBlocks, setSelectedLogicItems,
    setActiveLayout // Use this to change active sheet indirectly if needed, or I should add setActiveEventSheet
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

  const [contextMenu, setContextMenu] = React.useState<{
    x: number, y: number, blockId: string | null
  } | null>(null);

  const [draggedBlockId, setDraggedBlockId] = React.useState<string | null>(null);

  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const activeEventSheetId = activeLayout?.eventSheetId || project.eventSheets[0]?.id;
  const eventSheet = project.eventSheets.find(es => es.id === activeEventSheetId);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

      const blockIds = editorState.selectedEventBlockIds;
      const logicIds = editorState.selectedLogicItemIds;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!eventSheet) return;
        blockIds.forEach(id => removeEventBlock(eventSheet.id, id));
        setSelectedEventBlocks([]);
        logicIds.forEach(fullId => {
          const [blockId, itemId] = fullId.split(':');
          removeCondition(eventSheet.id, blockId, itemId);
          removeAction(eventSheet.id, blockId, itemId);
        });
        setSelectedLogicItems([]);
      }

      if (e.key === 'd' || e.key === 'D') {
        if (!eventSheet) return;
        blockIds.forEach(id => {
          const block = findBlockInTree(eventSheet.events, id);
          if (block) updateEventBlock(eventSheet.id, id, { disabled: !block.disabled });
        });
      }

      if (e.key === 'i' || e.key === 'I') {
        if (!eventSheet) return;
        logicIds.forEach(fullId => {
          const [blockId, itemId] = fullId.split(':');
          const block = findBlockInTree(eventSheet.events, blockId);
          const cond = block?.conditions.find(c => c.id === itemId);
          if (cond) updateCondition(eventSheet.id, blockId, itemId, { inverted: !cond.inverted });
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState.selectedEventBlockIds, editorState.selectedLogicItemIds, eventSheet, updateEventBlock, removeEventBlock, updateCondition, removeCondition, removeAction, setSelectedEventBlocks, setSelectedLogicItems]);

  const findBlockInTree = (blocks: EventBlock[], id: string): EventBlock | undefined => {
    for (const b of blocks) {
      if (b.id === id) return b;
      const found = findBlockInTree(b.children, id);
      if (found) return found;
    }
    return undefined;
  };

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

  const handleContextMenu = (e: React.MouseEvent, blockId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, blockId });
  };

  const closeContextMenu = () => setContextMenu(null);

  const visibleEvents = filterBlocks(eventSheet.events);
  
  const countTotalEvents = (blocks: EventBlock[]): number => {
    let count = 0;
    blocks.forEach(b => {
      if (b.type === 'event') count++;
      count += countTotalEvents(b.children);
    });
    return count;
  };

  return (
    <div className="event-sheet-editor" 
      onClick={() => { setSelectedEventBlocks([]); setSelectedLogicItems([]); closeContextMenu(); }}
      onContextMenu={(e) => handleContextMenu(e, null)}
      style={{
        flex: 1, backgroundColor: '#1e1e1e', color: '#d4d4d4', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', height: '100%'
      }}
    >
      {/* Header Tabs */}
      <div style={{ display: 'flex', backgroundColor: '#252526', borderBottom: '1px solid #333' }}>
        {project.eventSheets.map(es => (
          <div 
            key={es.id} 
            onClick={(e) => {
              e.stopPropagation();
              // Find first layout that uses this sheet and make it active
              const l = project.layouts.find(layout => layout.eventSheetId === es.id);
              if (l) setActiveLayout(l.id);
            }}
            style={{
              padding: '8px 16px', fontSize: '12px', cursor: 'pointer',
              backgroundColor: es.id === activeEventSheetId ? '#1e1e1e' : 'transparent',
              color: es.id === activeEventSheetId ? '#fff' : '#888',
              borderTop: '2px solid', borderTopColor: es.id === activeEventSheetId ? '#007acc' : 'transparent',
              borderRight: '1px solid #333', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <List size={14} />
            {es.name}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px',
        backgroundColor: '#2d2d2d', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', color: '#666' }} />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Search..."
              style={{
                backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px',
                padding: '4px 10px 4px 28px', fontSize: '12px', color: '#fff', width: '150px', outline: 'none'
              }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'event'); }} style={toolbarButtonStyle} title="Add Event (E)"><Plus size={14} /> Add Event</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'group'); }} style={toolbarButtonStyle} title="Add Group (G)"><Plus size={14} /> Group</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'comment'); }} style={toolbarButtonStyle} title="Add Comment (C)"><Plus size={14} /> Comment</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'variable'); }} style={toolbarButtonStyle} title="Add Variable (V)"><Plus size={14} /> Variable</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
        {visibleEvents.map((event, index) => (
          <EventBlockItem 
            key={event.id} 
            eventSheetId={eventSheet.id} 
            block={event} 
            index={index + 1} 
            onOpenBrowser={openBrowser}
            onOpenParamEditor={openParamEditor}
            onContextMenu={handleContextMenu}
            draggedBlockId={draggedBlockId}
            setDraggedBlockId={setDraggedBlockId}
          />
        ))}
        {eventSheet.events.length === 0 && (
          <div style={{ 
            padding: '60px', textAlign: 'center', color: '#666', border: '2px dashed #333', 
            borderRadius: '8px', marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px'
          }}>
            <Info size={32} opacity={0.3} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>Empty Event Sheet</div>
              <div style={{ fontSize: '12px' }}>Start by adding a new event or variable.</div>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div style={{ 
        padding: '4px 16px', backgroundColor: '#007acc', color: '#fff', fontSize: '11px', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <span>{countTotalEvents(eventSheet.events)} Events</span>
          <span>{project.globalVariables.length} Global Variables</span>
        </div>
        <div>
          {eventSheet.name}
        </div>
      </div>

      {browserState?.isOpen && (
        <LogicBrowser project={project} mode={browserState.mode} onSelect={handleBrowserSelect} onClose={() => setBrowserState(null)} />
      )}

      {paramEditorState?.isOpen && (
        <ParamEditor project={project} def={paramEditorState.def} initialParams={paramEditorState.params} onSave={handleParamUpdate} onCancel={() => setParamEditorState(null)} />
      )}

      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} y={contextMenu.y} blockId={contextMenu.blockId} 
          eventSheetId={eventSheet.id} onClose={closeContextMenu} 
        />
      )}
    </div>
  );
};

const EventBlockItem: React.FC<{ 
  eventSheetId: string, 
  block: EventBlock, 
  index?: number,
  onOpenBrowser: (mode: 'condition' | 'action', blockId: string) => void,
  onOpenParamEditor: (mode: 'condition' | 'action', blockId: string, itemId: string, def: LogicDefinition, params: any[]) => void,
  onContextMenu: (e: React.MouseEvent, blockId: string) => void,
  draggedBlockId: string | null,
  setDraggedBlockId: (id: string | null) => void,
  depth?: number
}> = ({ eventSheetId, block, index, onOpenBrowser, onOpenParamEditor, onContextMenu, draggedBlockId, setDraggedBlockId, depth = 0 }) => {
  const { 
    editorState, setSelectedEventBlocks, setSelectedLogicItems,
    updateEventBlock, removeEventBlock, addEventBlock, moveEventBlock
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

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedBlockId(block.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', block.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedBlockId || draggedBlockId === block.id) return;
    moveEventBlock(eventSheetId, draggedBlockId, null, index ? index - 1 : 0);
    setDraggedBlockId(null);
  };

  const commonStyle: React.CSSProperties = {
    cursor: 'grab',
    userSelect: 'none',
    border: isSelected ? '2px solid #007acc' : '1px solid #333',
    borderColor: isSelected ? '#007acc' : (draggedBlockId === block.id ? '#555' : '#333'),
    opacity: draggedBlockId === block.id ? 0.4 : 1,
    transition: 'border-color 0.1s, opacity 0.1s',
    boxShadow: isSelected ? '0 0 10px rgba(0,122,204,0.3)' : 'none',
    zIndex: isSelected ? 5 : 1
  };

  if (block.type === 'variable' && block.variable) {
    return (
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => setDraggedBlockId(null)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleSelect}
        onContextMenu={(e) => onContextMenu(e, block.id)}
        style={{
          ...commonStyle,
          backgroundColor: '#252526', borderLeftWidth: '4px', borderLeftColor: '#3498db', 
          padding: '6px 12px', margin: '2px 0', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px'
        }}
      >
        <div style={{ color: '#3498db', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', width: '40px' }}>Global</div>
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
      </div>
    );
  }

  if (block.type === 'comment') {
    return (
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => setDraggedBlockId(null)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleSelect}
        onContextMenu={(e) => onContextMenu(e, block.id)}
        style={{
          ...commonStyle,
          backgroundColor: '#feffc1', color: '#000', padding: '8px 12px', margin: '2px 0', borderRadius: '2px', 
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
      </div>
    );
  }

  if (block.type === 'group') {
    return (
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragEnd={() => setDraggedBlockId(null)}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleSelect}
        onContextMenu={(e) => onContextMenu(e, block.id)}
        style={{ ...commonStyle, margin: '4px 0', borderRadius: '4px', overflow: 'hidden' }}
      >
        <div style={{ backgroundColor: '#333', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }} onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !block.groupExpanded }); }}>
          <span style={{ fontSize: '12px', transform: block.groupExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s', color: '#888' }}>▶</span>
          <input
            value={block.groupName || ''}
            onChange={(e) => updateEventBlock(eventSheetId, block.id, { groupName: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 'bold', outline: 'none', flex: 1 }}
            placeholder="Group Name"
          />
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { disabled: !block.disabled }); }} style={iconButtonStyle}>
              {isDisabled ? <EyeOff size={14} color="#e67e22" /> : <Eye size={14} />}
            </button>
            <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheetId, block.id, 'event'); }} style={iconButtonStyle}><Plus size={14} color="#4caf50" /></button>
          </div>
        </div>
        {block.groupExpanded && (
          <div style={{ 
            padding: '4px 4px 4px 24px', backgroundColor: '#1e1e1e', display: 'flex', flexDirection: 'column', gap: '2px',
            borderLeft: '1px solid #444', marginLeft: '12px'
          }}>
            {block.children.map((child, i) => (
              <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} depth={depth + 1} />
            ))}
            {block.children.length === 0 && <div style={{ padding: '10px', color: '#666', fontSize: '11px', textAlign: 'center' }}>Group is empty.</div>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={() => setDraggedBlockId(null)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleSelect}
      onContextMenu={(e) => onContextMenu(e, block.id)}
      style={{
        ...commonStyle,
        display: 'flex', flexDirection: 'column', borderRadius: '2px',
        backgroundColor: isDisabled ? '#252526' : '#2d2d2d', opacity: isDisabled ? 0.6 : (draggedBlockId === block.id ? 0.4 : 1), marginBottom: '2px'
      }}
    >
      <div style={{ display: 'flex', minHeight: '60px' }}>
        <div style={{ 
          width: '30px', backgroundColor: isSelected ? '#004b7e' : '#333', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '10px', color: isSelected ? '#fff' : '#888', 
          borderRight: '1px solid #444', userSelect: 'none' 
        }}>
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
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheetId, block.id, 'event'); }} title="Add sub-event" style={iconButtonStyle}><Plus size={12} color="#4caf50" /></button>
        </div>
      </div>

      {block.children.length > 0 && (
        <div style={{ 
          padding: '2px 0 2px 24px', backgroundColor: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', gap: '2px',
          borderLeft: '1px solid #444', marginLeft: '12px', marginTop: '1px'
        }}>
          {block.children.map((child) => (
            <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} depth={depth + 1} />
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

const ContextMenu: React.FC<{ x: number, y: number, blockId: string | null, eventSheetId: string, onClose: () => void }> = ({ x, y, blockId, eventSheetId, onClose }) => {
  const { addEventBlock, removeEventBlock, updateEventBlock } = useEditorStore();

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: y, left: x, backgroundColor: '#2d2d2d', border: '1px solid #444', 
      borderRadius: '4px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', zIndex: 3000, padding: '4px 0', minWidth: '150px'
    }}>
      {blockId ? (
        <>
          <div style={contextItemStyle} onClick={() => handleAction(() => addEventBlock(eventSheetId, blockId, 'event'))}><Plus size={14} /> Add sub-event</div>
          <div style={contextItemStyle} onClick={() => handleAction(() => addEventBlock(eventSheetId, blockId, 'group'))}><Plus size={14} /> Add sub-group</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => handleAction(() => {})}> <Copy size={14} /> Copy</div>
          <div style={contextItemStyle} onClick={() => handleAction(() => {})}> <Scissors size={14} /> Cut</div>
          <div style={contextItemStyle} onClick={() => handleAction(() => {})}> <Clipboard size={14} /> Paste</div>
          <div style={contextDividerStyle} />
          <div onClick={() => handleAction(() => removeEventBlock(eventSheetId, blockId))} style={{ ...contextItemStyle, color: '#f44336' }}> <Trash2 size={14} /> Delete</div>
        </>
      ) : (
        <>
          <div style={contextItemStyle} onClick={() => handleAction(() => addEventBlock(eventSheetId, null, 'event'))}><Plus size={14} /> Add Event</div>
          <div style={contextItemStyle} onClick={() => handleAction(() => addEventBlock(eventSheetId, null, 'group'))}><Plus size={14} /> Add Group</div>
          <div style={contextItemStyle} onClick={() => handleAction(() => addEventBlock(eventSheetId, null, 'comment'))}><Plus size={14} /> Add Comment</div>
          <div style={contextItemStyle} onClick={() => handleAction(() => addEventBlock(eventSheetId, null, 'variable'))}><Plus size={14} /> Add Variable</div>
        </>
      )}
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
const contextItemStyle: React.CSSProperties = { padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', transition: 'background 0.1s' };
const contextDividerStyle: React.CSSProperties = { height: '1px', backgroundColor: '#444', margin: '4px 0' };
