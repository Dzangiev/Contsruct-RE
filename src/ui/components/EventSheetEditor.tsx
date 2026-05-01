import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock, Project } from '../../model/project';
import { Plus, Trash2, Eye, EyeOff, Search, Copy, Scissors, Clipboard, ChevronUp, ChevronDown, List, Settings, Info, Undo, Redo, Maximize2, Minimize2, Terminal, Code, Box, Layers, MousePointer2, GitBranch, Replace, AlertCircle } from 'lucide-react';
import { LogicBrowser } from './LogicBrowser';
import { findConditionDefinition, findActionDefinition, LogicDefinition } from '../../model/definitions';

const HighlightText: React.FC<{ text: string, highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <span>{text}</span>;
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? <mark key={i} style={{ backgroundColor: '#f1c40f', color: '#000', borderRadius: '2px', padding: '0 2px' }}>{part}</mark> : part
      )}
    </span>
  );
};

export const EventSheetEditor: React.FC = () => {
  const { 
    project, editorState, 
    addEventBlock, updateEventBlock, removeEventBlock, moveEventBlock,
    addCondition, updateCondition, removeCondition, moveCondition,
    addAction, updateAction, removeAction, moveAction,
    setSelectedEventBlocks, setSelectedLogicItems,
    setActiveLayout,
    undo, redo, copySelected, cutSelected, pasteSelected
  } = useEditorStore();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [replaceTerm, setReplaceTerm] = React.useState('');
  const [showReplace, setShowReplace] = React.useState(false);
  
  const [browserState, setBrowserState] = React.useState<{
    isOpen: boolean, mode: 'condition' | 'action', eventSheetId: string, blockId: string, targetObjectTypeId?: string
  } | null>(null);

  const [paramEditorState, setParamEditorState] = React.useState<{
    isOpen: boolean, mode: 'condition' | 'action', eventSheetId: string, blockId: string, itemId: string, def: LogicDefinition, params: any[]
  } | null>(null);

  const [contextMenu, setContextMenu] = React.useState<{
    x: number, y: number, blockId: string | null
  } | null>(null);

  const [draggedBlockId, setDraggedBlockId] = React.useState<string | null>(null);
  const [draggedLogicItem, setDraggedLogicItem] = React.useState<{ type: 'condition' | 'action', blockId: string, itemId: string } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const activeEventSheetId = activeLayout?.eventSheetId || project.eventSheets[0]?.id;
  const eventSheet = project.eventSheets.find(es => es.id === activeEventSheetId);

  const countTotalEvents = (blocks: EventBlock[]): number => {
    let count = 0;
    blocks.forEach(b => { if (b.type === 'event') count++; count += countTotalEvents(b.children); });
    return count;
  };

  const expandAll = (expand: boolean) => {
    if (!eventSheet) return;
    const updateRecursive = (list: EventBlock[]) => {
      list.forEach(b => { if (b.type === 'group') updateEventBlock(eventSheet.id, b.id, { groupExpanded: expand }); updateRecursive(b.children); });
    };
    updateRecursive(eventSheet.events);
  };

  if (!eventSheet) return <div style={{ color: '#666', padding: '20px' }}>No event sheet found.</div>;

  return (
    <div className="event-sheet-editor" style={{ flex: 1, backgroundColor: '#1e1e1e', color: '#d4d4d4', display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', backgroundColor: '#252526', borderBottom: '1px solid #333' }}>
        {project.eventSheets.map(es => (
          <div key={es.id} onClick={(e) => { e.stopPropagation(); const l = project.layouts.find(layout => layout.eventSheetId === es.id); if (l) setActiveLayout(l.id); }} style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer', backgroundColor: es.id === activeEventSheetId ? '#1e1e1e' : 'transparent', color: es.id === activeEventSheetId ? '#fff' : '#888', borderTop: '2px solid', borderTopColor: es.id === activeEventSheetId ? '#007acc' : 'transparent', borderRight: '1px solid #333', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <List size={14} /> {es.name}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #333', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '2px', marginRight: '10px', borderRight: '1px solid #444', paddingRight: '10px' }}>
            <button onClick={(e) => { e.stopPropagation(); undo(); }} style={iconButtonStyle} title="Undo (Ctrl+Z)"><Undo size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); redo(); }} style={iconButtonStyle} title="Redo (Ctrl+Y)"><Redo size={14} /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Search size={14} style={{ position: 'absolute', left: '8px', color: '#666' }} />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Search..." style={{ backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '4px 10px 4px 28px', fontSize: '12px', color: '#fff', width: '130px', outline: 'none' }} />
              <button onClick={() => setShowReplace(!showReplace)} style={{ ...iconButtonStyle, backgroundColor: showReplace ? '#007acc' : 'transparent' }} title="Replace Mode"><Replace size={14} /></button>
            </div>
            {showReplace && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '28px' }}>
                <input value={replaceTerm} onChange={(e) => setReplaceTerm(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Replace with..." style={{ backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: '#fff', width: '100px', outline: 'none' }} />
                <button style={{ fontSize: '10px', backgroundColor: '#444', color: '#fff', border: 'none', padding: '2px 6px', borderRadius: '2px', cursor: 'pointer' }}>All</button>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '2px', marginLeft: '10px' }}>
            <button onClick={(e) => { e.stopPropagation(); expandAll(true); }} style={iconButtonStyle} title="Expand All"><Maximize2 size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); expandAll(false); }} style={iconButtonStyle} title="Collapse All"><Minimize2 size={14} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'event'); }} style={toolbarButtonStyle}><Plus size={14} /> Add Event</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'group'); }} style={toolbarButtonStyle}> Group</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'comment'); }} style={toolbarButtonStyle}> Comment</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'variable'); }} style={toolbarButtonStyle}> Variable</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '220px', backgroundColor: '#252526', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 15px', fontSize: '11px', fontWeight: 'bold', color: '#888', borderBottom: '1px solid #333', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}><Box size={14} /> Objects</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            <div style={objectItemStyle}><Terminal size={14} color="#3498db" /> <span>System</span></div>
            {project.objectTypes.map(ot => (
              <div key={ot.id} draggable onDragStart={(e) => { e.dataTransfer.setData('objectTypeId', ot.id); e.dataTransfer.effectAllowed = 'copy'; }} style={objectItemStyle}><Code size={14} color="#2ecc71" /> <span>{ot.name}</span></div>
            ))}
          </div>
        </div>

        <div ref={containerRef} className="event-sheet-bg" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', position: 'relative' }}>
          {eventSheet.events.map((event, index) => (
            <EventBlockItem 
              key={event.id} eventSheetId={eventSheet.id} block={event} index={index + 1} 
              onOpenBrowser={(m: 'condition' | 'action', b: string, t?: string) => setBrowserState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, targetObjectTypeId: t })} 
              onOpenParamEditor={(m: 'condition' | 'action', b: string, i: string, d: LogicDefinition, p: any[]) => setParamEditorState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, itemId: i, def: d, params: p })} 
              onContextMenu={(e: React.MouseEvent, id: string) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, blockId: id }); }} 
              draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} 
              draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} 
              searchTerm={searchTerm} 
            />
          ))}
        </div>
      </div>

      <div style={{ padding: '4px 16px', backgroundColor: '#007acc', color: '#fff', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '12px' }}><span>{project.globalVariables.length} Variables</span><span>{countTotalEvents(eventSheet.events)} Blocks</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> C3 Mode Active</div>
      </div>

      {browserState?.isOpen && <LogicBrowser project={project} mode={browserState.mode} initialObjectTypeId={browserState.targetObjectTypeId} onSelect={(t, ty, p) => { if (browserState.mode === 'condition') addCondition(browserState.eventSheetId, browserState.blockId, ty, p, t); else addAction(browserState.eventSheetId, browserState.blockId, ty, p, t); }} onClose={() => setBrowserState(null)} />}
      {paramEditorState?.isOpen && <ParamEditor project={project} def={paramEditorState.def} initialParams={paramEditorState.params} onSave={(p) => { if (paramEditorState.mode === 'condition') updateCondition(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { params: p }); else updateAction(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { params: p }); setParamEditorState(null); }} onCancel={() => setParamEditorState(null)} />}
      {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} blockId={contextMenu.blockId} eventSheetId={eventSheet.id} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

const EventBlockItem: React.FC<{ 
  eventSheetId: string, block: EventBlock, index?: number, onOpenBrowser: any, onOpenParamEditor: any, onContextMenu: any, draggedBlockId: any, setDraggedBlockId: any, draggedLogicItem: any, setDraggedLogicItem: any, depth?: number, searchTerm?: string
}> = ({ eventSheetId, block, index, onOpenBrowser, onOpenParamEditor, onContextMenu, draggedBlockId, setDraggedBlockId, draggedLogicItem, setDraggedLogicItem, depth = 0, searchTerm = '' }) => {
  const { editorState, setSelectedEventBlocks, updateEventBlock, addEventBlock, moveEventBlock, moveCondition, moveAction } = useEditorStore();
  const isSelected = editorState.selectedEventBlockIds.includes(block.id);
  const isDisabled = block.disabled;

  const hasMatch = searchTerm && (
    block.commentText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.groupName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.variable?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    block.conditions.some(c => c.type.toLowerCase().includes(searchTerm.toLowerCase())) ||
    block.actions.some(a => a.type.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedBlockId(block.id);
    e.dataTransfer.setData('text/plain', block.id);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    const otId = e.dataTransfer.getData('objectTypeId');
    if (otId) return onOpenBrowser('condition', block.id, otId);
    if (draggedLogicItem) {
      if (draggedLogicItem.type === 'condition') moveCondition(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, block.id, block.conditions.length);
      else moveAction(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, block.id, block.actions.length);
      return setDraggedLogicItem(null);
    }
    if (!draggedBlockId || draggedBlockId === block.id) return;
    moveEventBlock(eventSheetId, draggedBlockId, null, index ? index - 1 : 0);
    setDraggedBlockId(null);
  };

  const itemStyleWrapper: React.CSSProperties = {
    position: 'relative', marginLeft: depth > 0 ? '16px' : '0', borderLeft: depth > 0 ? '1px solid #444' : 'none', paddingLeft: depth > 0 ? '8px' : '0'
  };

  if (block.type === 'variable' && block.variable) {
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#004b7e' : '#252526', borderLeft: '4px solid #3498db', padding: '6px 12px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px', opacity: isDisabled ? 0.5 : 1 }}>
        <div style={{ color: '#3498db', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>Global</div>
        <div style={{ flex: 1, fontWeight: 'bold' }}><HighlightText text={block.variable.name} highlight={searchTerm} /> = {block.variable.initialValue}</div>
      </div>
    );
  }

  if (block.type === 'comment') {
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#333' : '#feffc1', color: '#000', padding: '8px 12px', borderLeft: '4px solid #f1c40f', fontStyle: 'italic' }}>
        <HighlightText text={block.commentText || ''} highlight={searchTerm} />
      </div>
    );
  }

  if (block.type === 'group') {
    const isExpanded = searchTerm ? true : block.groupExpanded;
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ backgroundColor: isSelected ? '#004b7e' : '#333', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !block.groupExpanded }); }}>
          <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}>▶</span>
          <div style={{ fontWeight: 'bold', flex: 1 }}><HighlightText text={block.groupName || ''} highlight={searchTerm} /></div>
        </div>
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {block.children.map((child, i) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, display: 'flex', flexDirection: 'column', borderRadius: '2px', backgroundColor: isDisabled ? '#252526' : (isSelected ? '#004b7e' : '#2d2d2d'), border: isSelected ? '1px solid #007acc' : '1px solid #333', opacity: isDisabled ? 0.6 : 1, marginBottom: '2px' }}>
      <div style={{ display: 'flex', minHeight: '60px' }}>
        <div style={{ width: '30px', backgroundColor: isSelected ? '#007acc' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', borderRight: '1px solid #444' }}>{index}</div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ flex: 1, padding: '8px', borderRight: '1px solid #333', minWidth: '300px' }}>
          {block.conditions.map((c, i) => <ConditionItem key={c.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} condition={c} index={i+1} onOpenParamEditor={onOpenParamEditor} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} />)}
          <div style={addLinkStyle}>+ Add condition</div>
        </div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ flex: 1, padding: '8px', minWidth: '300px' }}>
          {block.actions.map((a, i) => <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} action={a} index={i+1} onOpenParamEditor={onOpenParamEditor} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} />)}
          <div style={addLinkStyle}>+ Add action</div>
        </div>
      </div>
      {block.children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
          {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} />)}
        </div>
      )}
    </div>
  );
};

const ConditionItem: React.FC<{ project: Project, eventSheetId: string, blockId: string, condition: any, index: number, onOpenParamEditor: any, searchTerm: string, setDraggedLogicItem: any }> = ({ project, eventSheetId, blockId, condition, index, onOpenParamEditor, searchTerm, setDraggedLogicItem }) => {
  const { editorState, setSelectedLogicItems, removeCondition } = useEditorStore();
  const def = findConditionDefinition(condition.type);
  const targetObject = project.objectTypes.find((ot: any) => ot.id === condition.targetObjectTypeId);
  const selectionId = `${blockId}:${condition.id}`;
  const isSelected = editorState.selectedLogicItemIds.includes(selectionId);

  return (
    <div draggable onDragStart={(e) => { e.stopPropagation(); setDraggedLogicItem({ type: 'condition', blockId, itemId: condition.id }); }} onClick={(e) => { e.stopPropagation(); setSelectedLogicItems([selectionId]); }} onDoubleClick={(e) => { e.stopPropagation(); def && onOpenParamEditor('condition', blockId, condition.id, def, condition.params); }} style={{ ...logicItemStyle, backgroundColor: isSelected ? '#007acc' : 'transparent', color: targetObject ? '#2ecc71' : '#3498db' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
        <div style={{ fontSize: '9px', opacity: 0.4, width: '12px' }}>{index}</div>
        <div style={{ width: '16px', height: '16px', backgroundColor: targetObject ? '#27ae60' : '#2980b9', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>{targetObject?.name?.[0] || 'S'}</div>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {condition.type === 'else' && <GitBranch size={12} color="#e67e22" />}
          {condition.inverted && <span style={{ color: '#e67e22', fontWeight: 'bold' }}>!</span>}
          <span style={{ fontWeight: 600 }}><HighlightText text={targetObject?.name || 'System'} highlight={searchTerm} /></span>
          <span style={{ color: '#fff' }}><HighlightText text={def?.name || condition.type} highlight={searchTerm} /></span>
          <span style={{ color: '#f1c40f', fontSize: '11px', fontWeight: 'bold' }}>({condition.params.join(', ')})</span>
        </div>
      </div>
    </div>
  );
};

const ActionItem: React.FC<{ project: Project, eventSheetId: string, blockId: string, action: any, index: number, onOpenParamEditor: any, searchTerm: string, setDraggedLogicItem: any }> = ({ project, eventSheetId, blockId, action, index, onOpenParamEditor, searchTerm, setDraggedLogicItem }) => {
  const { editorState, setSelectedLogicItems, removeAction } = useEditorStore();
  const def = findActionDefinition(action.type);
  const targetObject = project.objectTypes.find((ot: any) => ot.id === action.targetObjectTypeId);
  const selectionId = `${blockId}:${action.id}`;
  const isSelected = editorState.selectedLogicItemIds.includes(selectionId);

  return (
    <div draggable onDragStart={(e) => { e.stopPropagation(); setDraggedLogicItem({ type: 'action', blockId, itemId: action.id }); }} onClick={(e) => { e.stopPropagation(); setSelectedLogicItems([selectionId]); }} onDoubleClick={(e) => { e.stopPropagation(); def && onOpenParamEditor('action', blockId, action.id, def, action.params); }} style={{ ...logicItemStyle, backgroundColor: isSelected ? '#007acc' : 'transparent', color: targetObject ? '#2ecc71' : '#3498db' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '9px', opacity: 0.4, width: '12px' }}>{index}</div>
        <div style={{ width: '16px', height: '16px', backgroundColor: targetObject ? '#27ae60' : '#2980b9', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>{targetObject?.name?.[0] || 'S'}</div>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px' }}><span style={{ fontWeight: 600 }}><HighlightText text={targetObject?.name || 'System'} highlight={searchTerm} /></span><span style={{ color: '#fff' }}><HighlightText text={def?.name || action.type} highlight={searchTerm} /></span><span style={{ color: '#f1c40f', fontSize: '11px', fontWeight: 'bold' }}>({action.params.join(', ')})</span></div>
      </div>
    </div>
  );
};

const ContextMenu: React.FC<{ x: number, y: number, blockId: string | null, eventSheetId: string, onClose: any }> = ({ x, y, blockId, eventSheetId, onClose }) => {
  const { addEventBlock, removeEventBlock, copySelected, cutSelected, pasteSelected, addCondition } = useEditorStore();
  return (
    <div style={{ position: 'fixed', top: y, left: x, backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', zIndex: 3000, padding: '4px 0', minWidth: '150px' }}>
      {blockId ? (
        <>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, blockId, 'event'); onClose(); }}><Plus size={14} /> Add sub-event</div>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'event'); addCondition(eventSheetId, 'LAST', 'else', []); onClose(); }}><GitBranch size={14} /> Add Else (X)</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { copySelected(); onClose(); }}><Copy size={14} /> Copy</div>
          <div style={contextItemStyle} onClick={() => { cutSelected(); onClose(); }}><Scissors size={14} /> Cut</div>
          <div style={contextItemStyle} onClick={() => { pasteSelected(eventSheetId, blockId); onClose(); }}><Clipboard size={14} /> Paste Inside</div>
          <div style={contextDividerStyle} />
          <div onClick={() => { removeEventBlock(eventSheetId, blockId); onClose(); }} style={{ ...contextItemStyle, color: '#f44336' }}><Trash2 size={14} /> Delete</div>
        </>
      ) : (
        <div style={contextItemStyle} onClick={() => { pasteSelected(eventSheetId, null); onClose(); }}><Clipboard size={14} /> Paste</div>
      )}
    </div>
  );
};

const ParamEditor: React.FC<{ project: Project, def: LogicDefinition, initialParams: any[], onSave: (p: any[]) => void, onCancel: () => void }> = ({ project, def, initialParams, onSave, onCancel }) => {
  const [params, setParams] = React.useState([...initialParams]);
  const [activeParamIndex, setActiveParamIndex] = React.useState(0);
  const assistantItems = [...project.globalVariables.map((v: any) => ({ name: v.name, type: 'variable' })), ...project.objectTypes.map((ot: any) => ({ name: ot.name, type: 'object' })), { name: 'dt', type: 'function' }, { name: 'time', type: 'function' }];

  return (
    <div style={overlayStyle} onClick={(e) => e.stopPropagation()}>
      <div style={{ ...modalStyle, width: '700px', flexDirection: 'row' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={modalHeaderStyle}><h3 style={{ margin: 0, fontSize: '14px' }}>Parameters: {def.name}</h3></div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            {def.params.map((pDef, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '12px', color: '#888' }}>{pDef.name}</label><span style={{ fontSize: '10px', color: '#555' }}>{pDef.type}</span></div>
                <input type="text" onFocus={() => setActiveParamIndex(i)} value={params[i]} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, borderLeft: '4px solid #007acc' }} />
                <div style={{ fontSize: '11px', color: '#666', fontStyle: 'italic' }}>{pDef.defaultValue !== undefined ? `Default: ${pDef.defaultValue}` : ''}</div>
              </div>
            ))}
          </div>
          <div style={modalFooterStyle}><button onClick={() => onSave(params)} style={saveButtonStyle}>Done</button><button onClick={onCancel} style={cancelButtonStyle}>Cancel</button></div>
        </div>
        <div style={{ width: '250px', backgroundColor: '#252526', borderLeft: '1px solid #444', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', fontSize: '11px', fontWeight: 'bold', color: '#888', borderBottom: '1px solid #444', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertCircle size={14} /> EXPRESSION ASSISTANT</div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {assistantItems.map((item, idx) => <div key={idx} onClick={() => { const cur = String(params[activeParamIndex]); const n = [...params]; n[activeParamIndex] = cur + (cur ? ' ' : '') + item.name; setParams(n); }} style={assistantItemStyle}><span>{item.name}</span> <span style={{ fontSize: '9px', opacity: 0.5 }}>{item.type}</span></div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#2d2d2d', borderRadius: '8px', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '1px solid #444', color: '#d4d4d4', overflow: 'hidden' };
const modalHeaderStyle: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid #444' };
const modalFooterStyle: React.CSSProperties = { padding: '12px 16px', borderTop: '1px solid #444', display: 'flex', justifyContent: 'flex-end', gap: '10px' };
const paramInputStyle: React.CSSProperties = { backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '6px 10px', color: '#fff', fontSize: '13px', outline: 'none' };
const saveButtonStyle: React.CSSProperties = { backgroundColor: '#007acc', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const cancelButtonStyle: React.CSSProperties = { backgroundColor: 'transparent', color: '#aaa', border: '1px solid #444', padding: '6px 16px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' };
const toolbarButtonStyle: React.CSSProperties = { backgroundColor: '#3c3c3c', color: '#ccc', border: '1px solid #444', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' };
const logicItemStyle: React.CSSProperties = { padding: '4px 6px', borderRadius: '2px', display: 'flex', transition: 'background-color 0.1s', cursor: 'pointer' };
const addLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#007acc', fontSize: '12px', cursor: 'pointer', padding: '4px 0', textAlign: 'left' };
const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' };
const contextItemStyle: React.CSSProperties = { padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', transition: 'background 0.1s' };
const contextDividerStyle: React.CSSProperties = { height: '1px', backgroundColor: '#444', margin: '4px 0' };
const assistantItemStyle: React.CSSProperties = { padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', transition: 'background 0.1s', borderBottom: '1px solid #333' };
const objectItemStyle: React.CSSProperties = { padding: '8px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#ccc', borderRadius: '4px', transition: 'background-color 0.1s', marginBottom: '2px' };
