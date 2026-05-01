import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock, Project, ObjectType, InstanceVariable, Condition, Action } from '../../model/project';
import { Plus, Trash2, Eye, EyeOff, Search, Copy, Scissors, Clipboard, ChevronUp, ChevronDown, List, Settings, Info, Undo, Redo, Maximize2, Minimize2, Terminal, Code, Box, Layers, MousePointer2, GitBranch, Replace, AlertCircle, Variable, Palette, FilePlus, Zap, Bookmark, BookmarkPlus, Ghost, MousePointer, MoreVertical, Edit2 } from 'lucide-react';
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
    undo, redo, copySelected, cutSelected, pasteSelected, toggleConditionInverted, pasteLogicItem
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
    x: number, y: number, blockId: string | null, logicItemId?: string | null
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

  const findBlockRecursive = (list: EventBlock[], id: string): EventBlock | undefined => {
    for (const b of list) { if (b.id === id) return b; const f = findBlockRecursive(b.children, id); if (f) return f; }
    return undefined;
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (!eventSheet) return;

      const selectedBlockId = editorState.selectedEventBlockIds[0];
      const selectedLogicId = editorState.selectedLogicItemIds[0];

      const flatEvents: string[] = [];
      const flatten = (list: EventBlock[]) => { list.forEach(b => { flatEvents.push(b.id); flatten(b.children); }); };
      flatten(eventSheet.events);

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const idx = flatEvents.indexOf(selectedBlockId || '');
        if (idx < flatEvents.length - 1) setSelectedEventBlocks([flatEvents[idx + 1]!]);
        else if (!selectedBlockId && flatEvents.length > 0) setSelectedEventBlocks([flatEvents[0]!]);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = flatEvents.indexOf(selectedBlockId || '');
        if (idx > 0) setSelectedEventBlocks([flatEvents[idx - 1]!]);
      }
      if (e.key === 'F2' || (e.key === 'b' && !e.ctrlKey)) {
        if (selectedBlockId) {
          const b = findBlockRecursive(eventSheet.events, selectedBlockId);
          if (b) updateEventBlock(eventSheet.id, b.id, { bookmarked: !b.bookmarked });
        }
      }
      if (e.key === 's' && !e.ctrlKey) { if (selectedBlockId) addEventBlock(eventSheet.id, selectedBlockId, 'event'); }
      if (e.key === 'g' && !e.ctrlKey) { addEventBlock(eventSheet.id, selectedBlockId || null, 'group'); }
      if (e.key === 'v' && !e.ctrlKey) { addEventBlock(eventSheet.id, selectedBlockId || null, 'variable'); }
      if (e.key === 'c' && !e.ctrlKey && !e.shiftKey) { addEventBlock(eventSheet.id, selectedBlockId || null, 'comment'); }
      if (e.key === 'f' && !e.ctrlKey) { addEventBlock(eventSheet.id, selectedBlockId || null, 'function'); }
      if (e.key === 'd' && !e.ctrlKey) {
        if (selectedBlockId) {
          const b = findBlockRecursive(eventSheet.events, selectedBlockId);
          if (b) updateEventBlock(eventSheet.id, b.id, { disabled: !b.disabled });
        }
      }
      if (e.key === 'i' && !e.ctrlKey) {
        if (selectedLogicId) {
          const [bId, cId] = selectedLogicId.split(':');
          if (bId && cId) toggleConditionInverted(eventSheet.id, bId, cId);
        }
      }
      if (e.key === 'x' && !e.ctrlKey) {
        if (selectedBlockId) {
          addEventBlock(eventSheet.id, null, 'event');
          addCondition(eventSheet.id, 'LAST', 'else', []);
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedBlockId) {
          const idx = flatEvents.indexOf(selectedBlockId);
          removeEventBlock(eventSheet.id, selectedBlockId);
          if (idx < flatEvents.length - 1) setSelectedEventBlocks([flatEvents[idx + 1]!]);
          else if (idx > 0) setSelectedEventBlocks([flatEvents[idx - 1]!]);
        } else if (selectedLogicId) {
          const [bId, lId] = selectedLogicId.split(':');
          removeCondition(eventSheet.id, bId, lId);
          removeAction(eventSheet.id, bId, lId);
        }
      }
      if (e.key === 'c' && e.ctrlKey) { copySelected(); }
      if (e.key === 'x' && e.ctrlKey) { cutSelected(); }
      if (e.key === 'v' && e.ctrlKey) {
        if (editorState.clipboard?.type === 'blocks') pasteSelected(eventSheet.id, selectedBlockId || null);
        else if (editorState.clipboard?.type === 'logicItems' && selectedBlockId) pasteLogicItem(eventSheet.id, selectedBlockId, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState, eventSheet, setSelectedEventBlocks, updateEventBlock, toggleConditionInverted, addEventBlock, removeEventBlock, addCondition, removeCondition, removeAction, copySelected, cutSelected, pasteSelected, pasteLogicItem]);

  if (!eventSheet) return <div style={{ color: '#666', padding: '20px' }}>No event sheet found.</div>;

  const bookmarks: EventBlock[] = [];
  const findBookmarks = (list: EventBlock[]) => { list.forEach(b => { if (b.bookmarked) bookmarks.push(b); findBookmarks(b.children); }); };
  findBookmarks(eventSheet.events);

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
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Search size={14} style={{ position: 'absolute', left: '8px', color: '#666' }} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onClick={(e) => e.stopPropagation()} placeholder="Search logic..." style={{ backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '4px 10px 4px 28px', fontSize: '12px', color: '#fff', width: '150px', outline: 'none' }} />
            <button onClick={() => setShowReplace(!showReplace)} style={{ ...iconButtonStyle, backgroundColor: showReplace ? '#007acc' : 'transparent' }} title="Replace Mode"><Replace size={14} /></button>
          </div>
          <div style={{ display: 'flex', gap: '2px', marginLeft: '10px' }}>
            <button onClick={(e) => { e.stopPropagation(); expandAll(true); }} style={iconButtonStyle} title="Expand All"><Maximize2 size={14} /></button>
            <button onClick={(e) => { e.stopPropagation(); expandAll(false); }} style={iconButtonStyle} title="Collapse All"><Minimize2 size={14} /></button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'event'); }} style={toolbarButtonStyle} title="Add Event (A)"><Plus size={14} /> Event</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'function'); }} style={toolbarButtonStyle} title="Add Function (F)"><Zap size={14} /> Function</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'include'); }} style={toolbarButtonStyle} title="Include Sheet"><FilePlus size={14} /> Include</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'group'); }} style={toolbarButtonStyle} title="Add Group (G)"> Group</button>
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'variable'); }} style={toolbarButtonStyle} title="Add Variable (V)"> Var</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '220px', backgroundColor: '#252526', borderRight: '1px solid #333', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 15px', fontSize: '11px', fontWeight: 'bold', color: '#888', borderBottom: '1px solid #333', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}><Box size={14} /> Objects</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            <div style={objectItemStyle}><Terminal size={14} color="#3498db" /> <span>System</span></div>
            {project.objectTypes.map(ot => (
              <div key={ot.id} draggable onDragStart={(e) => { e.dataTransfer.setData('objectTypeId', ot.id); e.dataTransfer.effectAllowed = 'copy'; }} style={objectItemStyle} onClick={() => useEditorStore.getState().setSelectedObjectType(ot.id)}><Code size={14} color="#2ecc71" /> <span>{ot.name}</span></div>
            ))}
          </div>
          {bookmarks.length > 0 && (
            <div style={{ padding: '10px', borderTop: '1px solid #333', backgroundColor: '#1e1e1e' }}>
              <div style={{ fontSize: '10px', color: '#666', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>Bookmarks <Bookmark size={10} /></div>
              {bookmarks.map((b: any) => (
                <div key={b.id} onClick={() => { setSelectedEventBlocks([b.id]); const el = document.querySelector(`[data-block-id="${b.id}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} style={{ fontSize: '11px', color: editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#aaa', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: editorState.selectedEventBlockIds.includes(b.id) ? '#007acc' : 'transparent', borderRadius: '4px', marginBottom: '2px' }}>
                  <Bookmark size={10} fill={editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#f1c40f'} color={editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#f1c40f'} /> {b.groupName || b.functionName || b.commentText || 'Event'}
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={containerRef} className="event-sheet-bg" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', position: 'relative' }}>
          {eventSheet.events.map((event, index) => (
            <EventBlockItem 
              key={event.id} eventSheetId={eventSheet.id} block={event} index={index + 1} 
              onOpenBrowser={(m: 'condition' | 'action', b: string, t?: string) => setBrowserState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, targetObjectTypeId: t })} 
              onOpenParamEditor={(m: 'condition' | 'action', b: string, i: string, d: LogicDefinition, p: any[]) => setParamEditorState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, itemId: i, def: d, params: p })} 
              onContextMenu={(e: React.MouseEvent, id: string, logicId?: string) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, blockId: id, logicItemId: logicId }); }} 
              draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} 
              draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} 
              searchTerm={searchTerm} 
            />
          ))}
        </div>
      </div>

      <div style={{ padding: '4px 16px', backgroundColor: '#007acc', color: '#fff', fontSize: '11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #005a9e' }}>
        <div style={{ display: 'flex', gap: '12px' }}><span>{project.globalVariables.length} Global</span><span>{countTotalEvents(eventSheet.events)} Blocks</span></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2ecc71' }}></div> <span>C3 ELITE MODE ACTIVE</span></div>
      </div>

      {browserState?.isOpen && <LogicBrowser project={project} mode={browserState.mode} initialObjectTypeId={browserState.targetObjectTypeId} onSelect={(t, ty, p) => { if (browserState.mode === 'condition') addCondition(browserState.eventSheetId, browserState.blockId, ty, p, t); else addAction(browserState.eventSheetId, browserState.blockId, ty, p, t); }} onClose={() => setBrowserState(null)} />}
      {paramEditorState?.isOpen && <ParamEditor project={project} def={paramEditorState.def} initialParams={paramEditorState.params} onSave={(p) => { if (paramEditorState.mode === 'condition') updateCondition(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { params: p }); else updateAction(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { params: p }); setParamEditorState(null); }} onCancel={() => setParamEditorState(null)} />}
      {contextMenu && <ContextMenu project={project} x={contextMenu.x} y={contextMenu.y} blockId={contextMenu.blockId} logicItemId={contextMenu.logicItemId} eventSheetId={eventSheet.id} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

const EventBlockItem: React.FC<{ 
  eventSheetId: string, block: EventBlock, index?: number, onOpenBrowser: any, onOpenParamEditor: any, onContextMenu: any, draggedBlockId: any, setDraggedBlockId: any, draggedLogicItem: any, setDraggedLogicItem: any, depth?: number, searchTerm?: string
}> = ({ eventSheetId, block, index, onOpenBrowser, onOpenParamEditor, onContextMenu, draggedBlockId, setDraggedBlockId, draggedLogicItem, setDraggedLogicItem, depth = 0, searchTerm = '' }) => {
  const { editorState, setSelectedEventBlocks, updateEventBlock, addEventBlock, moveEventBlock, moveCondition, moveAction } = useEditorStore();
  const isSelected = editorState.selectedEventBlockIds.includes(block.id);
  const isDisabled = block.disabled;
  const isDragged = draggedBlockId === block.id;

  const handleDragStart = (e: React.DragEvent) => { e.stopPropagation(); setDraggedBlockId(block.id); e.dataTransfer.setData('text/plain', block.id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); 
    if (draggedLogicItem) { 
      if (draggedLogicItem.type === 'condition') moveCondition(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, block.id, block.conditions.length); 
      else moveAction(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, block.id, block.actions.length); 
      return setDraggedLogicItem(null); 
    } 
    if (!draggedBlockId || draggedBlockId === block.id) return; 
    moveEventBlock(eventSheetId, draggedBlockId, null, index ? index - 1 : 0); 
    setDraggedBlockId(null); 
  };

  const itemStyleWrapper: React.CSSProperties = { position: 'relative', marginLeft: depth > 0 ? '16px' : '0', borderLeft: (depth > 0 || block.children.length > 0) ? '1px solid #444' : 'none', paddingLeft: depth > 0 ? '8px' : '0', borderTop: block.color ? `2px solid ${block.color}` : 'none', opacity: isDragged ? 0.4 : 1, transition: 'opacity 0.2s' };

  if (block.type === 'variable' && block.variable) {
    const isLocal = depth > 0;
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#004b7e' : '#252526', borderLeft: '4px solid', borderLeftColor: isLocal ? '#e67e22' : '#3498db', padding: '6px 12px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <div style={{ color: isLocal ? '#e67e22' : '#3498db', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', width: '40px' }}>{isLocal ? 'Local' : 'Global'}</div>
        <div style={{ flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Variable size={14} color={isLocal ? '#e67e22' : '#3498db'} /> 
          <input value={block.variable.name} onChange={(e) => updateEventBlock(eventSheetId, block.id, { variable: { ...block.variable, name: e.target.value } })} style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', outline: 'none', width: '100%' }} />
          <span style={{ color: '#888' }}>=</span>
          <span style={{ color: '#fff' }}>{block.variable.initialValue}</span>
        </div>
        {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
      </div>
    );
  }

  if (block.type === 'function') {
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#004b7e' : '#2d2d2d', borderLeft: '4px solid #9b59b6', borderRadius: '4px', overflow: 'hidden', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <div style={{ backgroundColor: '#333', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={14} color="#9b59b6" />
          <div style={{ fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Function: <input value={block.functionName} onChange={(e) => updateEventBlock(eventSheetId, block.id, { functionName: e.target.value })} style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #444', color: '#fff', fontWeight: 'bold', outline: 'none' }} />
            <span style={{ fontSize: '11px', color: '#666' }}>Parameters:</span>
            <input value={block.functionParams?.join(', ')} onChange={(e) => updateEventBlock(eventSheetId, block.id, { functionParams: e.target.value.split(',').map(s => s.trim()) })} style={{ backgroundColor: 'transparent', border: 'none', borderBottom: '1px solid #444', color: '#aaa', fontSize: '11px', width: '150px', outline: 'none' }} />
          </div>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>
        <div style={{ padding: '4px 4px 4px 24px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} />)}
        </div>
      </div>
    );
  }

  if (block.type === 'include') {
    const includedSheet = useEditorStore.getState().project.eventSheets.find(s => s.id === block.includeSheetId);
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#004b7e' : '#252526', borderLeft: '4px solid #2ecc71', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <FilePlus size={14} color="#2ecc71" />
        <div style={{ fontWeight: 'bold', flex: 1 }}>Include sheet: <span style={{ color: '#2ecc71' }}>{includedSheet?.name || 'Unknown'}</span></div>
        {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
      </div>
    );
  }

  if (block.type === 'comment') {
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#333' : '#feffc1', color: '#000', padding: '8px 12px', borderLeft: '4px solid #f1c40f', fontStyle: 'italic', display: 'flex', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <div style={{ flex: 1 }}>
          <input value={block.commentText} onChange={(e) => updateEventBlock(eventSheetId, block.id, { commentText: e.target.value })} style={{ backgroundColor: 'transparent', border: 'none', color: '#000', fontStyle: 'italic', outline: 'none', width: '100%' }} />
        </div>
        {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
      </div>
    );
  }

  if (block.type === 'group') {
    const isExpanded = searchTerm ? true : block.groupExpanded;
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, borderRadius: '4px', overflow: 'hidden', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <div style={{ backgroundColor: isSelected ? '#004b7e' : '#333', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !block.groupExpanded }); }}>
          <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}>▶</span>
          <div style={{ fontWeight: 'bold', flex: 1 }}>
            <input value={block.groupName} onChange={(e) => updateEventBlock(eventSheetId, block.id, { groupName: e.target.value })} onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', outline: 'none', width: '100%' }} />
          </div>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, display: 'flex', flexDirection: 'column', borderRadius: '2px', backgroundColor: (isSelected ? '#004b7e' : '#2d2d2d'), border: isSelected ? '1px solid #007acc' : '1px solid #333', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: '2px' }}>
      <div style={{ display: 'flex', minHeight: '60px', position: 'relative' }}>
        {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" style={{ position: 'absolute', right: '4px', top: '4px', zIndex: 5 }} />}
        {isDisabled && <Ghost size={14} style={{ position: 'absolute', right: '24px', top: '4px', color: '#666' }} />}
        <div style={{ width: '30px', backgroundColor: isSelected ? '#007acc' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', borderRight: '1px solid #444' }}>{index}</div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ flex: 1, padding: '8px', borderRight: '1px solid #333', minWidth: '300px' }}>
          {block.conditions.map((c, i) => (
            <ConditionItem key={c.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} condition={c} index={i+1} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} />
          ))}
          <div style={addLinkStyle}>+ Add condition</div>
        </div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ flex: 1, padding: '8px', minWidth: '300px' }}>
          {block.actions.map((a, i) => (
            <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} action={a} index={i+1} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} />
          ))}
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

const ConditionItem: React.FC<{ project: Project, eventSheetId: string, blockId: string, condition: any, index: number, onOpenParamEditor: any, onContextMenu: any, searchTerm: string, setDraggedLogicItem: any, draggedLogicItem: any }> = ({ project, eventSheetId, blockId, condition, index, onOpenParamEditor, onContextMenu, searchTerm, setDraggedLogicItem, draggedLogicItem }) => {
  const { editorState, setSelectedLogicItems, moveCondition } = useEditorStore();
  const def = findConditionDefinition(condition.type);
  const targetObject = project.objectTypes.find((ot: any) => ot.id === condition.targetObjectTypeId);
  const selectionId = `${blockId}:${condition.id}`;
  const isSelected = editorState.selectedLogicItemIds.includes(selectionId);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (draggedLogicItem && draggedLogicItem.type === 'condition') {
      moveCondition(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, blockId, index - 1);
      setDraggedLogicItem(null);
    }
  };

  return (
    <div 
      draggable onDragStart={(e) => { e.stopPropagation(); setDraggedLogicItem({ type: 'condition', blockId, itemId: condition.id }); }} 
      onDragOver={(e) => { if (draggedLogicItem?.type === 'condition') e.preventDefault(); }}
      onDrop={handleDrop}
      onClick={(e) => { e.stopPropagation(); setSelectedLogicItems([selectionId]); }} 
      onDoubleClick={(e) => { e.stopPropagation(); def && onOpenParamEditor('condition', blockId, condition.id, def, condition.params); }} 
      onContextMenu={(e) => onContextMenu(e, blockId, condition.id)}
      style={{ ...logicItemStyle, backgroundColor: isSelected ? '#007acc' : 'transparent', color: targetObject ? '#2ecc71' : '#3498db', opacity: (draggedLogicItem?.itemId === condition.id) ? 0.3 : 1 }}
    >
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

const ActionItem: React.FC<{ project: Project, eventSheetId: string, blockId: string, action: any, index: number, onOpenParamEditor: any, onContextMenu: any, searchTerm: string, setDraggedLogicItem: any, draggedLogicItem: any }> = ({ project, eventSheetId, blockId, action, index, onOpenParamEditor, onContextMenu, searchTerm, setDraggedLogicItem, draggedLogicItem }) => {
  const { editorState, setSelectedLogicItems, moveAction } = useEditorStore();
  const def = findActionDefinition(action.type);
  const targetObject = project.objectTypes.find((ot: any) => ot.id === action.targetObjectTypeId);
  const selectionId = `${blockId}:${action.id}`;
  const isSelected = editorState.selectedLogicItemIds.includes(selectionId);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (draggedLogicItem && draggedLogicItem.type === 'action') {
      moveAction(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, blockId, index - 1);
      setDraggedLogicItem(null);
    }
  };

  return (
    <div 
      draggable onDragStart={(e) => { e.stopPropagation(); setDraggedLogicItem({ type: 'action', blockId, itemId: action.id }); }} 
      onDragOver={(e) => { if (draggedLogicItem?.type === 'action') e.preventDefault(); }}
      onDrop={handleDrop}
      onClick={(e) => { e.stopPropagation(); setSelectedLogicItems([selectionId]); }} 
      onDoubleClick={(e) => { e.stopPropagation(); def && onOpenParamEditor('action', blockId, action.id, def, action.params); }} 
      onContextMenu={(e) => onContextMenu(e, blockId, action.id)}
      style={{ ...logicItemStyle, backgroundColor: isSelected ? '#007acc' : 'transparent', color: targetObject ? '#2ecc71' : '#3498db', opacity: (draggedLogicItem?.itemId === action.id) ? 0.3 : 1 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '9px', opacity: 0.4, width: '12px' }}>{index}</div>
        <div style={{ width: '16px', height: '16px', backgroundColor: targetObject ? '#27ae60' : '#2980b9', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>{targetObject?.name?.[0] || 'S'}</div>
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          <span style={{ fontWeight: 600 }}><HighlightText text={targetObject?.name || 'System'} highlight={searchTerm} /></span>
          <span style={{ color: '#fff' }}><HighlightText text={def?.name || action.type} highlight={searchTerm} /></span>
          <span style={{ color: '#f1c40f', fontSize: '11px', fontWeight: 'bold' }}>({action.params.join(', ')})</span>
        </div>
      </div>
    </div>
  );
};

const ContextMenu: React.FC<{ project: Project, x: number, y: number, blockId: string | null, logicItemId: string | null | undefined, eventSheetId: string, onClose: any }> = ({ project, x, y, blockId, logicItemId, eventSheetId, onClose }) => {
  const { addEventBlock, removeEventBlock, copySelected, cutSelected, pasteSelected, addCondition, updateEventBlock, toggleConditionInverted, removeCondition, removeAction, pasteLogicItem } = useEditorStore();
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];

  const findBlock = (list: EventBlock[]): EventBlock | undefined => { for (const b of list) { if (b.id === blockId) return b; const f = findBlock(b.children); if (f) return f; } return undefined; };
  const currentBlock = blockId ? findBlock(project.eventSheets.find(es => es.id === eventSheetId)?.events || []) : undefined;

  const isLogicItem = !!logicItemId;

  return (
    <div style={{ position: 'fixed', top: y, left: x, backgroundColor: '#2d2d2d', border: '1px solid #444', borderRadius: '4px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)', zIndex: 3000, padding: '4px 0', minWidth: '180px' }}>
      {isLogicItem ? (
        <>
          <div style={contextItemStyle} onClick={() => { copySelected(); onClose(); }}><Copy size={14} /> Copy Item</div>
          <div style={contextItemStyle} onClick={() => { cutSelected(); onClose(); }}><Scissors size={14} /> Cut Item</div>
          <div style={contextDividerStyle} />
          {blockId && logicItemId && (
            <div style={contextItemStyle} onClick={() => { toggleConditionInverted(eventSheetId, blockId, logicItemId); onClose(); }}><Eye size={14} /> Invert (I)</div>
          )}
          <div style={contextDividerStyle} />
          <div onClick={() => { if (blockId && logicItemId) { removeCondition(eventSheetId, blockId, logicItemId); removeAction(eventSheetId, blockId, logicItemId); } onClose(); }} style={{ ...contextItemStyle, color: '#f44336' }}><Trash2 size={14} /> Delete Item</div>
        </>
      ) : blockId ? (
        <>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, blockId, 'event'); onClose(); }}><Plus size={14} /> Add sub-event (S)</div>
          <div style={contextItemStyle} onClick={() => { updateEventBlock(eventSheetId, blockId, { disabled: !currentBlock?.disabled }); onClose(); }}><EyeOff size={14} /> {currentBlock?.disabled ? 'Enable' : 'Disable (D)'}</div>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'event'); addCondition(eventSheetId, 'LAST', 'else', []); onClose(); }}><GitBranch size={14} /> Add Else (X)</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { copySelected(); onClose(); }}><Copy size={14} /> Copy Block (Ctrl+C)</div>
          <div style={contextItemStyle} onClick={() => { cutSelected(); onClose(); }}><Scissors size={14} /> Cut Block (Ctrl+X)</div>
          <div style={contextItemStyle} onClick={() => { pasteSelected(eventSheetId, blockId); pasteLogicItem(eventSheetId, blockId, 0); onClose(); }}><Clipboard size={14} /> Paste (Ctrl+V)</div>
          <div style={contextDividerStyle} />
          <div style={{ padding: '6px 12px', fontSize: '11px', color: '#666', fontWeight: 'bold' }}>SET COLOR</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', padding: '4px 12px' }}>
            {colors.map(c => <div key={c} onClick={() => { updateEventBlock(eventSheetId, blockId, { color: c }); onClose(); }} style={{ width: '20px', height: '20px', backgroundColor: c, borderRadius: '2px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }} />)}
          </div>
          <div style={contextDividerStyle} />
          <div onClick={() => { removeEventBlock(eventSheetId, blockId); onClose(); }} style={{ ...contextItemStyle, color: '#f44336' }}><Trash2 size={14} /> Delete Block</div>
        </>
      ) : (
        <>
          <div style={contextItemStyle} onClick={() => { pasteSelected(eventSheetId, null); onClose(); }}><Clipboard size={14} /> Paste (Ctrl+V)</div>
          <div style={contextDividerStyle} />
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'function'); onClose(); }}><Zap size={14} /> Add Function (F)</div>
          <div style={contextItemStyle} onClick={() => { addEventBlock(eventSheetId, null, 'include'); onClose(); }}><FilePlus size={14} /> Add Include</div>
        </>
      )}
    </div>
  );
};

const ParamEditor: React.FC<{ project: Project, def: LogicDefinition, initialParams: any[], onSave: (p: any[]) => void, onCancel: () => void }> = ({ project, def, initialParams, onSave, onCancel }) => {
  const [params, setParams] = React.useState([...initialParams]);
  const [activeParamIndex, setActiveParamIndex] = React.useState(0);
  const [filter, setFilter] = React.useState('');

  const assistantItems = [
    ...project.globalVariables.map((v: any) => ({ name: v.name, type: 'variable', category: 'Global' })), 
    ...project.objectTypes.map((ot: any) => ({ name: ot.name, type: 'object', category: 'Object' })), 
    ...project.objectTypes.flatMap((ot: any) => ot.instanceVariables.map((v: any) => ({ name: `${ot.name}.${v.name}`, type: 'instance-variable', category: 'Instance' }))), 
    { name: 'dt', type: 'function', category: 'System' }, 
    { name: 'time', type: 'function', category: 'System' }
  ].filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) || i.category.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div style={overlayStyle} onClick={(e) => e.stopPropagation()}>
      <div style={{ ...modalStyle, width: '800px', flexDirection: 'row' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={modalHeaderStyle}><h3 style={{ margin: 0, fontSize: '14px' }}>Parameters: {def.name}</h3></div>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
            {def.params.map((pDef, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><label style={{ fontSize: '12px', color: '#888' }}>{pDef.name}</label><span style={{ fontSize: '10px', color: '#555' }}>{pDef.type}</span></div>
                <input type="text" onFocus={() => setActiveParamIndex(i)} value={params[i]} onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} style={{ ...paramInputStyle, borderLeft: '4px solid #007acc' }} />
              </div>
            ))}
          </div>
          <div style={modalFooterStyle}><button onClick={() => onSave(params)} style={saveButtonStyle}>Done</button><button onClick={onCancel} style={cancelButtonStyle}>Cancel</button></div>
        </div>
        <div style={{ width: '300px', backgroundColor: '#252526', borderLeft: '1px solid #444', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px', borderBottom: '1px solid #444' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}><AlertCircle size={14} /> ASSISTANT</div>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter..." style={{ width: '100%', backgroundColor: '#1e1e1e', border: '1px solid #444', borderRadius: '4px', padding: '4px 8px', fontSize: '11px', color: '#fff', outline: 'none' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {assistantItems.map((item, idx) => (
              <div key={idx} onClick={() => { const cur = String(params[activeParamIndex]); const n = [...params]; n[activeParamIndex] = cur + (cur ? ' ' : '') + item.name; setParams(n); }} style={assistantItemStyle}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 'bold' }}>{item.name}</span>
                  <span style={{ fontSize: '9px', opacity: 0.5 }}>{item.category}</span>
                </div>
              </div>
            ))}
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
const logicItemStyle: React.CSSProperties = { padding: '4px 6px', borderRadius: '2px', display: 'flex', transition: 'background-color 0.1s', cursor: 'pointer', position: 'relative' };
const addLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#007acc', fontSize: '12px', cursor: 'pointer', padding: '4px 0', textAlign: 'left' };
const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' };
const contextItemStyle: React.CSSProperties = { padding: '6px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', transition: 'background 0.1s' };
const contextDividerStyle: React.CSSProperties = { height: '1px', backgroundColor: '#444', margin: '4px 0' };
const assistantItemStyle: React.CSSProperties = { padding: '8px 12px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', transition: 'background 0.1s', borderBottom: '1px solid #333' };
const objectItemStyle: React.CSSProperties = { padding: '8px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#ccc', borderRadius: '4px', transition: 'background-color 0.1s', marginBottom: '2px' };
