import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock, Project } from '../../model/project';
import { Plus, Trash2, Search, Undo, Redo, Maximize2, Minimize2, Box, List, Variable, Zap, FilePlus, Monitor, ChevronUp, Replace } from 'lucide-react';
import { LogicBrowser } from './LogicBrowser';
import { findConditionDefinition, findActionDefinition, LogicDefinition } from '../../model/definitions';
import { getAllVariableNames } from '../../model/eventUpdates';
import { VariableDialog } from './VariableDialog';
import { EventBlockItem } from './event-sheet/EventBlockItem';
import { ParamEditor } from './event-sheet/ParamEditor';
import { FunctionEditor } from './event-sheet/FunctionEditor';
import { ContextMenu } from './event-sheet/ContextMenu';

export const EventSheetEditor: React.FC = () => {
  const { 
    project, editorState, 
    addEventBlock, updateEventBlock, removeEventBlock,
    addCondition, updateCondition, removeCondition,
    addAction, updateAction, removeAction,
    setSelectedEventBlocks, setSelectedLogicItems,
    setActiveLayout,
    undo, redo, copySelected, cutSelected, pasteSelected, toggleOrBlock, pasteLogicItem
  } = useEditorStore();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showReplace, setShowReplace] = React.useState(false);
  
  const [browserState, setBrowserState] = React.useState<{
    isOpen: boolean, mode: 'condition' | 'action', eventSheetId: string, blockId: string, targetObjectTypeId?: string, initialLogicTypeId?: string, editingItemId?: string
  } | null>(null);

  const [paramEditorState, setParamEditorState] = React.useState<{
    isOpen: boolean, mode: 'condition' | 'action', eventSheetId: string, blockId: string, itemId: string, def: LogicDefinition, params: any[], targetObjectTypeId?: string, isNew?: boolean
  } | null>(null);

  const [functionEditorState, setFunctionEditorState] = React.useState<{
    isOpen: boolean, eventSheetId: string, block: EventBlock
  } | null>(null);

  const [contextMenu, setContextMenu] = React.useState<{
    x: number, y: number, blockId: string | null, logicItemId?: string | null
  } | null>(null);

  const [draggedBlockId, setDraggedBlockId] = React.useState<string | null>(null);
  const [draggedLogicItem, setDraggedLogicItem] = React.useState<{ type: 'condition' | 'action', blockId: string, itemId: string } | null>(null);
  const [variableEditorState, setVariableEditorState] = React.useState<{ isOpen: boolean, eventSheetId: string, blockId: string, variable: any, isNew?: boolean, parentId?: string | null } | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const activeLayout = project.layouts.find(l => l.id === editorState.activeLayoutId);
  const activeEventSheetId = activeLayout?.eventSheetId || project.eventSheets[0]?.id;
  const eventSheet = project.eventSheets.find(es => es.id === activeEventSheetId);

  const expandAll = (expand: boolean) => {
    if (!eventSheet) return;
    const updateRecursive = (list: EventBlock[]) => {
      list.forEach(b => { if (b.type === 'group') updateEventBlock(eventSheet.id, b.id, { groupExpanded: expand }); updateRecursive(b.children); });
    };
    updateRecursive(eventSheet.events);
  };

  const onAddVariable = (parentId: string | null = null) => {
    if (!eventSheet) return;
    setVariableEditorState({ 
      isOpen: true, 
      eventSheetId: eventSheet.id, 
      blockId: 'NEW', 
      variable: { name: '', type: 'number', initialValue: 0 },
      isNew: true,
      parentId
    });
  };

  const findBlockRecursive = (list: EventBlock[], id: string): EventBlock | undefined => {
    for (const b of list) { if (b.id === id) return b; const f = findBlockRecursive(b.children, id); if (f) return f; }
    return undefined;
  };

  const onOpenFunctionEditor = (eventSheetId: string, block: EventBlock) => {
    setFunctionEditorState({ isOpen: true, eventSheetId, block });
  };

  const handleSaveFunction = (updatedData: any) => {
    if (functionEditorState) {
      updateEventBlock(functionEditorState.eventSheetId, functionEditorState.block.id, updatedData);
      setFunctionEditorState(null);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editorState.previewMode) return;
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
      if (e.key === 'y' && !e.ctrlKey) {
        if (selectedBlockId) toggleOrBlock(eventSheet.id, selectedBlockId);
      }
      if (e.key === 'Enter') {
        if (selectedBlockId) {
          const b = findBlockRecursive(eventSheet.events, selectedBlockId);
          if (b) {
            if (b.type === 'variable' && b.variable) setVariableEditorState({ isOpen: true, eventSheetId: eventSheet.id, blockId: b.id, variable: b.variable });
            else if (b.type === 'function') onOpenFunctionEditor(eventSheet.id, b);
            else if (b.type === 'group') { /* Focus group name input? */ }
            else setBrowserState({ isOpen: true, mode: 'condition', eventSheetId: eventSheet.id, blockId: b.id });
          }
        } else if (selectedLogicId) {
          const [bId, lId] = selectedLogicId.split(':');
          const b = findBlockRecursive(eventSheet.events, bId);
          if (b) {
            const cond = b.conditions.find(c => c.id === lId);
            const act = b.actions.find(a => a.id === lId);
            if (cond) {
              const def = findConditionDefinition(cond.type);
              if (def) {
                if (def.params.length > 0) setParamEditorState({ isOpen: true, mode: 'condition', eventSheetId: eventSheet.id, blockId: bId, itemId: lId, def, params: cond.params, targetObjectTypeId: cond.targetObjectTypeId });
                else setBrowserState({ isOpen: true, mode: 'condition', eventSheetId: eventSheet.id, blockId: bId, targetObjectTypeId: cond.targetObjectTypeId, initialLogicTypeId: cond.type, editingItemId: lId });
              }
            } else if (act) {
              const def = findActionDefinition(act.type);
              if (def) {
                if (def.params.length > 0) setParamEditorState({ isOpen: true, mode: 'action', eventSheetId: eventSheet.id, blockId: bId, itemId: lId, def, params: act.params, targetObjectTypeId: act.targetObjectTypeId });
                else setBrowserState({ isOpen: true, mode: 'action', eventSheetId: eventSheet.id, blockId: bId, targetObjectTypeId: act.targetObjectTypeId, initialLogicTypeId: act.type, editingItemId: lId });
              }
            }
          }
        }
      }
      if (e.key === 'F2' || (e.key === 'b' && !e.ctrlKey)) {
        if (selectedBlockId) {
          addEventBlock(eventSheet.id, selectedBlockId, 'event'); // Blank sub-event
        } else {
          addEventBlock(eventSheet.id, null, 'event'); // Blank event
        }
      }
      if (e.key === 's' && !e.ctrlKey) { if (selectedBlockId) addEventBlock(eventSheet.id, selectedBlockId, 'event'); }
      if (e.key === 'e' && !e.ctrlKey) { addEventBlock(eventSheet.id, null, 'event'); }
      if (e.key === 'a' && !e.ctrlKey) { if (selectedBlockId) setBrowserState({ isOpen: true, mode: 'action', eventSheetId: eventSheet.id, blockId: selectedBlockId }); }
      if (e.key === 'c' && !e.ctrlKey && !e.shiftKey) { if (selectedBlockId) setBrowserState({ isOpen: true, mode: 'condition', eventSheetId: eventSheet.id, blockId: selectedBlockId }); else addEventBlock(eventSheet.id, null, 'comment'); }
      if (e.key === 'g' && !e.ctrlKey) { addEventBlock(eventSheet.id, selectedBlockId || null, 'group'); }
      if (e.key === 'v' && !e.ctrlKey) { onAddVariable(selectedBlockId || null); }
      if (e.key === 'f' && !e.ctrlKey) { addEventBlock(eventSheet.id, selectedBlockId || null, 'function'); }
      if (e.key === 'x' && !e.ctrlKey) {
        if (selectedBlockId) {
          const newBlockId = addEventBlock(eventSheet.id, null, 'event');
          addCondition(eventSheet.id, newBlockId, 'else', []);
          setSelectedEventBlocks([newBlockId]);
        }
      }
      if (e.key === 'd' && !e.ctrlKey) {
        if (selectedBlockId) {
          const b = findBlockRecursive(eventSheet.events, selectedBlockId);
          if (b) updateEventBlock(eventSheet.id, b.id, { disabled: !b.disabled });
        } else if (selectedLogicId) {
          const [bId, lId] = selectedLogicId.split(':');
          const b = findBlockRecursive(eventSheet.events, bId);
          if (b) {
            if (b.conditions.some(c => c.id === lId)) useEditorStore.getState().toggleConditionDisabled(eventSheet.id, bId, lId);
            else if (b.actions.some(a => a.id === lId)) useEditorStore.getState().toggleActionDisabled(eventSheet.id, bId, lId);
          }
        }
      }
      if (e.key === '/' && e.ctrlKey) {
        if (selectedBlockId) {
          const b = findBlockRecursive(eventSheet.events, selectedBlockId);
          if (b) updateEventBlock(eventSheet.id, b.id, { disabled: !b.disabled });
        } else if (selectedLogicId) {
          const [bId, lId] = selectedLogicId.split(':');
          const b = findBlockRecursive(eventSheet.events, bId);
          if (b) {
            if (b.conditions.some(c => c.id === lId)) useEditorStore.getState().toggleConditionDisabled(eventSheet.id, bId, lId);
            else if (b.actions.some(a => a.id === lId)) useEditorStore.getState().toggleActionDisabled(eventSheet.id, bId, lId);
          }
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
  }, [editorState, eventSheet, setSelectedEventBlocks, updateEventBlock, addEventBlock, removeEventBlock, addCondition, removeCondition, removeAction, copySelected, cutSelected, pasteSelected, pasteLogicItem, editorState.previewMode, toggleOrBlock]);

  if (!eventSheet) return <div style={{ color: '#666', padding: '20px' }}>No event sheet found.</div>;

  const blockIndices = new Map<string, number>();
  let globalIndex = 1;
  const bookmarks: EventBlock[] = [];
  const calculateIndices = (list: EventBlock[]) => {
    list.forEach(block => {
      blockIndices.set(block.id, globalIndex++);
      if (block.bookmarked) bookmarks.push(block);
      if (block.children && block.children.length > 0) {
        calculateIndices(block.children);
      }
    });
  };
  calculateIndices(eventSheet.events);

  React.useEffect(() => {
    let scrollInterval: any = null;
    const stopScrolling = () => { if (scrollInterval) { clearInterval(scrollInterval); scrollInterval = null; } };

    const handleWindowDragOver = (e: DragEvent) => {
      if (!draggedBlockId && !draggedLogicItem) { stopScrolling(); return; }
      const container = containerRef.current;
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const threshold = 100;
      const maxSpeed = 15;
      const fromTop = e.clientY - rect.top;
      const fromBottom = rect.bottom - e.clientY;
      
      if (fromTop < threshold && fromTop > -threshold && fromTop < rect.height) {
        if (!scrollInterval) {
          scrollInterval = setInterval(() => {
            const speed = Math.max(2, Math.floor((threshold - Math.max(0, fromTop)) / threshold * maxSpeed));
            container.scrollTop -= speed;
          }, 16);
        }
      } else if (fromBottom < threshold && fromBottom > -threshold && fromBottom < rect.height) {
        if (!scrollInterval) {
          scrollInterval = setInterval(() => {
            const speed = Math.max(2, Math.floor((threshold - Math.max(0, fromBottom)) / threshold * maxSpeed));
            container.scrollTop += speed;
          }, 16);
        }
      } else {
        stopScrolling();
      }
    };

    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('dragend', stopScrolling);
    window.addEventListener('drop', stopScrolling);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('dragend', stopScrolling);
      window.removeEventListener('drop', stopScrolling);
      stopScrolling();
    };
  }, [draggedBlockId, draggedLogicItem]);

  return (
    <div className="event-sheet-editor" style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#181818', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
      <style>{`
        .logic-item-hover { border-radius: 2px; transition: background-color 0.1s; cursor: pointer; }
        .logic-item-hover:hover { background-color: rgba(255, 255, 255, 0.05); }
        .logic-item-hover.selected { background-color: #007acc !important; }
        .logic-item-hover.selected:hover { background-color: #008ae6 !important; }
        .logic-row-container:hover { border-bottom-color: #444; }
      `}</style>
      <div style={{ display: 'flex', backgroundColor: '#252526', borderBottom: '1px solid #111' }}>
        {project.eventSheets.map(es => (
          <div key={es.id} onClick={(e) => { e.stopPropagation(); const l = project.layouts.find(layout => layout.eventSheetId === es.id); if (l) setActiveLayout(l.id); }} style={{ padding: '8px 16px', fontSize: '12px', cursor: 'pointer', backgroundColor: es.id === activeEventSheetId ? '#2d2d2d' : 'transparent', color: es.id === activeEventSheetId ? '#fff' : '#888', borderTop: '2px solid', borderTopColor: es.id === activeEventSheetId ? '#007acc' : 'transparent', borderRight: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <List size={14} /> {es.name}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', backgroundColor: '#252526', borderBottom: '1px solid #111', position: 'sticky', top: 0, zIndex: 10 }}>
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
          <button onClick={(e) => { e.stopPropagation(); onAddVariable(); }} style={toolbarButtonStyle} title="Add Variable (V)"> Var</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ width: '220px', backgroundColor: '#2d2d2d', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 15px', fontSize: '10px', fontWeight: 800, color: '#888', borderBottom: '1px solid #1a1a1a', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Box size={12} /> PROJECT OBJECTS
          </div>
          
          <div style={{ padding: '6px', borderBottom: '1px solid #1a1a1a', backgroundColor: '#252526' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={12} style={{ position: 'absolute', left: '8px', color: '#555' }} />
              <input 
                placeholder="Filter objects..." 
                style={{ 
                  width: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333', borderRadius: '4px', 
                  padding: '3px 8px 3px 24px', fontSize: '11px', color: '#ccc', outline: 'none' 
                }} 
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '4px' }}>
            <div style={{ padding: '8px 12px', fontSize: '10px', color: '#444', fontWeight: 700, textTransform: 'uppercase' }}>System</div>
            <div style={objectItemStyle} onClick={() => setBrowserState({ isOpen: true, mode: 'condition', eventSheetId: activeEventSheetId!, blockId: 'NEW', targetObjectTypeId: undefined })}>
              <Monitor size={14} color="#3498db" /> 
              <span style={{ fontWeight: 500 }}>System</span>
            </div>

            <div style={{ padding: '8px 12px 4px 12px', fontSize: '10px', color: '#444', fontWeight: 700, textTransform: 'uppercase', marginTop: '8px' }}>Object Types</div>
            {project.objectTypes.map(ot => (
              <div 
                key={ot.id} 
                draggable 
                onDragStart={(e) => { e.dataTransfer.setData('objectTypeId', ot.id); e.dataTransfer.effectAllowed = 'copy'; }} 
                style={objectItemStyle} 
                onClick={() => {
                  setSelectedEventBlocks([]);
                  setSelectedLogicItems([]);
                  useEditorStore.getState().setSelectedObjectType(ot.id);
                }}
              >
                <Box size={14} color="#2ecc71" /> 
                <span style={{ fontWeight: 500 }}>{ot.name}</span>
              </div>
            ))}
          </div>

          {bookmarks.length > 0 && (
            <div style={{ borderTop: '1px solid #111', backgroundColor: '#1e1e1e' }}>
              <div style={{ padding: '8px 15px', fontSize: '10px', color: '#444', fontWeight: 800, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                Bookmarks <Box size={10} />
              </div>
              <div style={{ padding: '4px', maxHeight: '150px', overflowY: 'auto' }}>
                {bookmarks.map((b: any) => (
                  <div 
                    key={b.id} 
                    onClick={() => { setSelectedEventBlocks([b.id]); const el = document.querySelector(`[data-block-id="${b.id}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} 
                    style={{ 
                      fontSize: '11px', color: editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#888', 
                      padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', 
                      backgroundColor: editorState.selectedEventBlockIds.includes(b.id) ? '#007acc' : 'transparent', 
                      borderRadius: '3px', marginBottom: '1px' 
                    }}
                  >
                    <Box size={10} fill={editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#f1c40f'} color={editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#f1c40f'} /> 
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.groupName || b.functionName || b.commentText || 'Event'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div 
          ref={containerRef} 
          className="event-sheet-bg" 
          onClick={() => { setSelectedEventBlocks([]); setSelectedLogicItems([]); setContextMenu(null); }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('x-cre-variable-id') || e.dataTransfer.types.includes('objectTypeId')) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'copy';
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            const variableId = e.dataTransfer.getData('x-cre-variable-id');
            const objectTypeId = e.dataTransfer.getData('objectTypeId');

            if (variableId && eventSheet) {
              const globalVar = project.globalVariables.find(v => v.id === variableId);
              if (globalVar) {
                const newBlockId = addEventBlock(eventSheet.id, null, 'variable');
                updateEventBlock(eventSheet.id, newBlockId, { variable: { ...globalVar } });
              }
            } else if (objectTypeId && eventSheet) {
              setBrowserState({ isOpen: true, mode: 'condition', eventSheetId: eventSheet.id, blockId: 'NEW', targetObjectTypeId: objectTypeId });
            }
          }}
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', position: 'relative' }}
        >
            {eventSheet.events.map((block) => (
              <EventBlockItem 
                key={block.id} 
                eventSheetId={eventSheet.id} 
                block={block} 
                onOpenBrowser={(m, b, t, il, ei) => setBrowserState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, targetObjectTypeId: t, initialLogicTypeId: il, editingItemId: ei })} 
                onOpenParamEditor={(m, b, i, d, p, t) => setParamEditorState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, itemId: i, def: d, params: p, targetObjectTypeId: t })} 
                onOpenVariableEditor={(esId, bId, v) => setVariableEditorState({ isOpen: true, eventSheetId: esId, blockId: bId, variable: v })}
                onOpenFunctionEditor={onOpenFunctionEditor}
                onContextMenu={(e, id, logicId) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, blockId: id, logicItemId: logicId }); }} 
                draggedBlockId={draggedBlockId} 
                setDraggedBlockId={setDraggedBlockId} 
                draggedLogicItem={draggedLogicItem} 
                setDraggedLogicItem={setDraggedLogicItem} 
                searchTerm={searchTerm} 
                depth={0}
                blockIndices={blockIndices}
              />
            ))}
        </div>
      </div>


      {browserState?.isOpen && (
        <LogicBrowser 
          project={project} 
          mode={browserState.mode} 
          initialObjectTypeId={browserState.targetObjectTypeId}
          initialLogicTypeId={browserState.initialLogicTypeId}
          onSelect={(t, ty, p) => { 
            const def = browserState.mode === 'condition' ? findConditionDefinition(ty) : findActionDefinition(ty);
            if (def && def.params.length > 0) {
              setParamEditorState({
                isOpen: true,
                mode: browserState.mode,
                eventSheetId: browserState.eventSheetId,
                blockId: browserState.blockId,
                itemId: browserState.editingItemId || 'NEW',
                def,
                params: p,
                targetObjectTypeId: t,
                isNew: !browserState.editingItemId
              });
              setBrowserState(null);
            } else {
              if (browserState.editingItemId) {
                if (browserState.mode === 'condition') updateCondition(browserState.eventSheetId, browserState.blockId, browserState.editingItemId, { type: ty, params: p, targetObjectTypeId: t });
                else updateAction(browserState.eventSheetId, browserState.blockId, browserState.editingItemId, { type: ty, params: p, targetObjectTypeId: t });
              } else {
                if (browserState.mode === 'condition') addCondition(browserState.eventSheetId, browserState.blockId, ty, p, t);
                else addAction(browserState.eventSheetId, browserState.blockId, ty, p, t);
              }
              setBrowserState(null);
            }
          }} 
          onClose={() => setBrowserState(null)} 
        />
      )}
      {paramEditorState?.isOpen && (
        <ParamEditor 
          project={project} 
          mode={paramEditorState.mode}
          eventSheetId={paramEditorState.eventSheetId}
          blockId={paramEditorState.blockId}
          def={paramEditorState.def} 
          initialParams={paramEditorState.params} 
          targetObjectTypeId={paramEditorState.targetObjectTypeId} 
          onSave={(p) => { 
            if (paramEditorState.itemId === 'NEW') {
              if (paramEditorState.mode === 'condition') addCondition(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.def.type, p, paramEditorState.targetObjectTypeId);
              else addAction(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.def.type, p, paramEditorState.targetObjectTypeId);
            } else {
              if (paramEditorState.mode === 'condition') updateCondition(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { type: paramEditorState.def.type, params: p, targetObjectTypeId: paramEditorState.targetObjectTypeId });
              else updateAction(paramEditorState.eventSheetId, paramEditorState.blockId, paramEditorState.itemId, { type: paramEditorState.def.type, params: p, targetObjectTypeId: paramEditorState.targetObjectTypeId });
            }
            setParamEditorState(null); 
          }} 
          onBack={() => {
            setBrowserState({
              isOpen: true,
              mode: paramEditorState.mode,
              eventSheetId: paramEditorState.eventSheetId,
              blockId: paramEditorState.blockId,
              targetObjectTypeId: paramEditorState.targetObjectTypeId,
              initialLogicTypeId: paramEditorState.def.type,
              editingItemId: paramEditorState.itemId === 'NEW' ? undefined : paramEditorState.itemId
            });
            setParamEditorState(null);
          }}
          onCancel={() => setParamEditorState(null)} 
        />
      )}
      {functionEditorState?.isOpen && (
        <FunctionEditor 
          block={functionEditorState.block}
          onSave={handleSaveFunction}
          onCancel={() => setFunctionEditorState(null)}
        />
      )}
      {variableEditorState?.isOpen && (
        <VariableDialog 
          title={variableEditorState.variable.name ? "Edit Variable" : "New Global Variable"}
          variable={variableEditorState.variable}
          existingNames={getAllVariableNames(project)}
          showStaticConstant={true}
          onSave={(updates) => {
            if (variableEditorState.isNew) {
              const newBlockId = addEventBlock(variableEditorState.eventSheetId, variableEditorState.parentId || null, 'variable');
              const es = project.eventSheets.find(s => s.id === variableEditorState.eventSheetId);
              const findB = (list: EventBlock[]): EventBlock | undefined => {
                for (const b of list) { if (b.id === newBlockId) return b; const f = findB(b.children); if (f) return f; }
                return undefined;
              };
              const newBlock = es ? findB(es.events) : undefined;
              
              if (newBlock && newBlock.variable) {
                updateEventBlock(variableEditorState.eventSheetId, newBlockId, { 
                  variable: { ...newBlock.variable, ...updates } 
                });
              }
            } else {
              const block = findBlockRecursive(eventSheet?.events || [], variableEditorState.blockId);
              if (block && block.variable) {
                updateEventBlock(variableEditorState.eventSheetId, variableEditorState.blockId, { 
                  variable: { ...block.variable, ...updates } 
                });
              }
            }
            setVariableEditorState(null);
          }}
          onCancel={() => setVariableEditorState(null)}
        />
      )}
      {contextMenu && (
        <ContextMenu 
          project={project} 
          x={contextMenu.x} 
          y={contextMenu.y} 
          blockId={contextMenu.blockId} 
          logicItemId={contextMenu.logicItemId} 
          eventSheetId={eventSheet.id} 
          onAddVariable={onAddVariable} 
          onClose={() => setContextMenu(null)} 
          setBrowserState={setBrowserState}
        />
      )}
    </div>
  );
};

const toolbarButtonStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#333', border: '1px solid #444', borderRadius: '4px', padding: '4px 10px', fontSize: '12px', color: '#fff', cursor: 'pointer', outline: 'none' };
const objectItemStyle: React.CSSProperties = { padding: '8px 12px', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', color: '#ccc', borderRadius: '4px', transition: 'background-color 0.1s', marginBottom: '2px' };
const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' };
