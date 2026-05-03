import React from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { EventBlock, Project, ObjectType, InstanceVariable, Condition, Action } from '../../model/project';
import { Plus, Trash2, Eye, EyeOff, Search, Copy, Scissors, Clipboard, ChevronUp, ChevronDown, List, Settings, Info, Undo, Redo, Maximize2, Minimize2, Terminal, Code, Box, Layers, MousePointer2, GitBranch, Replace, AlertCircle, Variable, Palette, FilePlus, Zap, Bookmark, BookmarkPlus, Ghost, MousePointer, MoreVertical, Edit2, Monitor, FileText } from 'lucide-react';
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
    undo, redo, copySelected, cutSelected, pasteSelected, toggleConditionInverted, toggleOrBlock, pasteLogicItem
  } = useEditorStore();
  
  const [searchTerm, setSearchTerm] = React.useState('');
  const [replaceTerm, setReplaceTerm] = React.useState('');
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
  const [variableEditorState, setVariableEditorState] = React.useState<{ isOpen: boolean, eventSheetId: string, blockId: string, variable: any } | null>(null);
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
  }, [editorState, eventSheet, setSelectedEventBlocks, updateEventBlock, toggleConditionInverted, addEventBlock, removeEventBlock, addCondition, removeCondition, removeAction, copySelected, cutSelected, pasteSelected, pasteLogicItem, editorState.previewMode]);

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
          <button onClick={(e) => { e.stopPropagation(); addEventBlock(eventSheet.id, null, 'variable'); }} style={toolbarButtonStyle} title="Add Variable (V)"> Var</button>
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
                Bookmarks <Bookmark size={10} />
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
                    <Bookmark size={10} fill={editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#f1c40f'} color={editorState.selectedEventBlockIds.includes(b.id) ? '#fff' : '#f1c40f'} /> 
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
          style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', position: 'relative' }}
        >
            {eventSheet.events.map((block) => (
              <EventBlockItem 
                key={block.id} 
                eventSheetId={eventSheet.id} 
                block={block} 
                onOpenBrowser={(m: 'condition' | 'action', b: string, t?: string, il?: string, ei?: string) => setBrowserState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, targetObjectTypeId: t, initialLogicTypeId: il, editingItemId: ei })} 
                onOpenParamEditor={(m: 'condition' | 'action', b: string, i: string, d: LogicDefinition, p: any[], t?: string) => setParamEditorState({ isOpen: true, mode: m, eventSheetId: eventSheet.id, blockId: b, itemId: i, def: d, params: p, targetObjectTypeId: t })} 
                onOpenVariableEditor={(esId, bId, v) => setVariableEditorState({ isOpen: true, eventSheetId: esId, blockId: bId, variable: v })}
                onOpenFunctionEditor={onOpenFunctionEditor}
                onContextMenu={(e: React.MouseEvent, id: string, logicId?: string) => { e.preventDefault(); e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, blockId: id, logicItemId: logicId }); }} 
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
        <VariableEditor 
          variable={variableEditorState.variable}
          onSave={(updates) => {
            updateEventBlock(variableEditorState.eventSheetId, variableEditorState.blockId, { variable: { ...variableEditorState.variable, ...updates } });
            setVariableEditorState(null);
          }}
          onCancel={() => setVariableEditorState(null)}
        />
      )}
      {contextMenu && <ContextMenu project={project} x={contextMenu.x} y={contextMenu.y} blockId={contextMenu.blockId} logicItemId={contextMenu.logicItemId} eventSheetId={eventSheet.id} onClose={() => setContextMenu(null)} />}
    </div>
  );
};

const VariableEditor: React.FC<{ 
  variable: any, 
  onSave: (updates: any) => void, 
  onCancel: () => void 
}> = ({ variable, onSave, onCancel }) => {
  const [name, setName] = React.useState(variable.name);
  const [type, setType] = React.useState(variable.type);
  const [initialValue, setInitialValue] = React.useState(variable.initialValue);
  const [description, setDescription] = React.useState(variable.description || '');
  const [isStatic, setIsStatic] = React.useState(variable.isStatic || false);
  const [isConstant, setIsConstant] = React.useState(variable.isConstant || false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim()) return setError('Name cannot be empty');
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return setError('Invalid variable name (start with letter, no spaces)');
    onSave({ name, type, initialValue, description, isStatic, isConstant });
  };

  const labelStyle: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#888', width: '130px', textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '20px' };
  const inputBaseStyle: React.CSSProperties = { backgroundColor: '#181818', border: '1px solid #333', borderRadius: '4px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none', flex: 1, transition: 'border-color 0.2s' };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...modalStyle, width: '500px', padding: '0', overflow: 'hidden', backgroundColor: '#252526', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', border: '1px solid #444' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', backgroundColor: '#2d2d2d', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ backgroundColor: '#3498db', padding: '6px', borderRadius: '6px' }}><Variable size={18} color="#fff" /></div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Edit Variable</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Configure global or local project variable</div>
          </div>
        </div>

        <div style={{ padding: '32px 40px 24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={rowStyle}>
              <label style={labelStyle}>Name</label>
              <input 
                autoFocus 
                value={name} 
                onChange={e => { setName(e.target.value); setError(null); }} 
                style={{ ...inputBaseStyle, borderColor: error ? '#f44336' : '#333' }} 
              />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Type</label>
              <select value={type} onChange={e => setType(e.target.value as any)} style={inputBaseStyle}>
                <option value="number">Number</option>
                <option value="string">String</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Initial value</label>
              {type === 'boolean' ? (
                <select value={String(initialValue)} onChange={e => setInitialValue(e.target.value === 'true')} style={inputBaseStyle}>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input 
                  type={type === 'number' ? 'number' : 'text'}
                  value={initialValue} 
                  onChange={e => setInitialValue(type === 'number' ? Number(e.target.value) : e.target.value)} 
                  style={inputBaseStyle} 
                />
              )}
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description..." style={inputBaseStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '150px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setIsStatic(!isStatic)}>
                <div style={{ width: '16px', height: '16px', backgroundColor: isStatic ? '#007acc' : '#1e1e1e', border: '1px solid #444', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isStatic && <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '1px' }} />}
                </div>
                <span style={{ fontSize: '13px', color: isStatic ? '#fff' : '#888', fontWeight: isStatic ? 600 : 400 }}>Static</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setIsConstant(!isConstant)}>
                <div style={{ width: '16px', height: '16px', backgroundColor: isConstant ? '#007acc' : '#1e1e1e', border: '1px solid #444', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isConstant && <div style={{ width: '8px', height: '8px', backgroundColor: '#fff', borderRadius: '1px' }} />}
                </div>
                <span style={{ fontSize: '13px', color: isConstant ? '#fff' : '#888', fontWeight: isConstant ? 600 : 400 }}>Constant</span>
              </div>
            </div>

            {error && <div style={{ fontSize: '12px', color: '#f44336', paddingLeft: '150px', marginTop: '-10px' }}>{error}</div>}
          </form>
        </div>

        <div style={{ padding: '16px 24px', backgroundColor: '#2d2d2d', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11px', color: '#555', fontStyle: 'italic' }}>
            Preview: <span style={{ color: '#aaa' }}>{name} = {type === 'string' ? `"${initialValue}"` : String(initialValue)}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onCancel} style={{ ...cancelButtonStyle, padding: '8px 20px' }}>Cancel</button>
            <button onClick={() => handleSubmit()} style={{ ...saveButtonStyle, padding: '8px 24px', minWidth: '80px' }}>OK</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const EventBlockItem: React.FC<{ 
  eventSheetId: string, 
  block: EventBlock, 
  onOpenBrowser: (mode: 'condition' | 'action', blockId: string, targetObjectTypeId?: string, initialLogicTypeId?: string, editingItemId?: string) => void, 
  onOpenParamEditor: any, 
  onOpenVariableEditor: (eventSheetId: string, blockId: string, variable: any) => void,
  onOpenFunctionEditor: (eventSheetId: string, block: EventBlock) => void,
  onContextMenu: any, 
  draggedBlockId: any, 
  setDraggedBlockId: any, 
  draggedLogicItem: any, 
  setDraggedLogicItem: any, 
  depth?: number, 
  searchTerm?: string,
  blockIndices: Map<string, number>
}> = ({ eventSheetId, block, onOpenBrowser, onOpenParamEditor, onOpenVariableEditor, onOpenFunctionEditor, onContextMenu, draggedBlockId, setDraggedBlockId, draggedLogicItem, setDraggedLogicItem, depth = 0, searchTerm = '', blockIndices }) => {
  const { editorState, setSelectedEventBlocks, updateEventBlock, addEventBlock, moveEventBlock, moveCondition, moveAction } = useEditorStore();
  const isSelected = editorState.selectedEventBlockIds.includes(block.id);
  const isDisabled = block.disabled;
  const isDragged = draggedBlockId === block.id;

  const [dragIndicator, setDragIndicator] = React.useState<'before' | 'inside' | 'after' | null>(null);

  const handleDragStart = (e: React.DragEvent) => { e.stopPropagation(); setDraggedBlockId(block.id); e.dataTransfer.setData('text/plain', block.id); e.dataTransfer.effectAllowed = 'move'; };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedBlockId || draggedBlockId === block.id) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const canHaveChildren = block.type === 'event' || block.type === 'group' || block.type === 'function';
    
    if (y < rect.height * 0.4) {
      setDragIndicator('before');
    } else if (canHaveChildren && x > 150) {
      setDragIndicator('inside');
    } else {
      setDragIndicator('after');
    }
  };

  const handleDragLeave = () => {
    setDragIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    const indicator = dragIndicator;
    setDragIndicator(null);

    if (draggedLogicItem) { 
      if (draggedLogicItem.type === 'condition') moveCondition(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, block.id, block.conditions.length); 
      else moveAction(eventSheetId, draggedLogicItem.blockId, draggedLogicItem.itemId, block.id, block.actions.length); 
      return setDraggedLogicItem(null); 
    } 
    
    if (!draggedBlockId || draggedBlockId === block.id) return; 

    if (indicator === 'inside') {
      moveEventBlock(eventSheetId, draggedBlockId, block.id, 0);
    } else if (indicator === 'before') {
      moveEventBlock(eventSheetId, draggedBlockId, null, 0, undefined, block.id);
    } else {
      moveEventBlock(eventSheetId, draggedBlockId, null, -1, block.id); 
    }
    setDraggedBlockId(null); 
  };

  const itemStyleWrapper: React.CSSProperties = { position: 'relative', marginLeft: depth > 0 ? '16px' : '0', borderLeft: (depth > 0 || block.children.length > 0) ? '1px solid #444' : 'none', paddingLeft: depth > 0 ? '8px' : '0', borderTop: block.color ? `2px solid ${block.color}` : 'none', opacity: isDragged ? 0.4 : 1, transition: 'opacity 0.2s', marginBottom: '2px' };

  const DragIndicatorLine = () => {
    if (!dragIndicator) return null;
    const isInside = dragIndicator === 'inside';
    const isBefore = dragIndicator === 'before';
    return (
      <div style={{
        position: 'absolute',
        top: isBefore ? '-2px' : 'auto',
        bottom: !isBefore ? '-2px' : 'auto',
        left: isInside ? '100px' : '0',
        right: '0',
        height: '3px',
        backgroundColor: '#1abc9c',
        zIndex: 100,
        borderRadius: '2px',
        boxShadow: '0 0 8px rgba(26, 188, 156, 0.5)'
      }} />
    );
  };

  if (block.type === 'variable' && block.variable) {
    const isLocal = depth > 0;
    return (
      <div 
        className="event-block-item-container" 
        data-block-id={block.id} 
        draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} 
        onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave}
        onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} 
        onDoubleClick={(e) => { e.stopPropagation(); onOpenVariableEditor(eventSheetId, block.id, block.variable); }}
        onContextMenu={(e) => onContextMenu(e, block.id)} 
        style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#004b7e' : '#252526', borderLeft: '4px solid', borderLeftColor: isLocal ? '#e67e22' : '#3498db', padding: '6px 12px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), cursor: 'pointer' }}
      >
        <DragIndicatorLine />
        <div style={{ color: isLocal ? '#e67e22' : '#3498db', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', width: '40px', userSelect: 'none' }}>{isLocal ? 'Local' : 'Global'}</div>
        <div style={{ flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
          <Variable size={14} color={isLocal ? '#e67e22' : '#3498db'} /> 
          <span>{block.variable.name}</span>
          <span style={{ color: '#888' }}>=</span>
          <span style={{ color: block.variable.type === 'string' ? '#e67e22' : '#2ecc71' }}>{block.variable.type === 'string' ? `"${block.variable.initialValue}"` : String(block.variable.initialValue)}</span>
          {block.variable.isConstant && <span style={{ fontSize: '9px', backgroundColor: '#444', padding: '1px 4px', borderRadius: '2px', color: '#aaa' }}>CONST</span>}
        </div>
        {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
      </div>
    );
  }

  if (block.type === 'function') {
    const paramsSummary = (block.functionParams || []).map((p: any) => p.name).join(', ');
    return (
      <div 
        className="event-block-item-container" 
        data-block-id={block.id} 
        draggable 
        onDragStart={handleDragStart} 
        onDragEnd={() => setDraggedBlockId(null)} 
        onDrop={handleDrop} 
        onDragOver={handleDragOver} 
        onDragLeave={handleDragLeave} 
        onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} 
        onDoubleClick={(e) => { e.stopPropagation(); onOpenFunctionEditor(eventSheetId, block); }}
        onContextMenu={(e) => onContextMenu(e, block.id)} 
        style={{ ...itemStyleWrapper, display: 'flex', flexDirection: 'column', borderRadius: '4px', backgroundColor: '#252526', border: isSelected ? '1px solid #9b59b6' : '1px solid #333', boxShadow: isSelected ? '0 0 12px rgba(155, 89, 182, 0.3)' : 'none', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: '6px', overflow: 'visible', borderLeft: isSelected ? '4px solid #9b59b6' : '4px solid #8e44ad' }}
      >
        <DragIndicatorLine />
        
        {/* Function Header */}
        <div style={{ backgroundColor: '#2d2d2d', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #333' }}>
          <Zap size={14} color="#9b59b6" />
          <div style={{ fontWeight: 'bold', flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#9b59b6', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>Function:</span>
            <span style={{ color: '#fff', fontSize: '13px' }}>{block.functionName}</span>
            {paramsSummary && (
              <>
                <span style={{ fontSize: '11px', color: '#666', marginLeft: '12px' }}>Params:</span>
                <span style={{ color: '#aaa', fontSize: '11px' }}>({paramsSummary})</span>
              </>
            )}
            {block.functionReturnType && block.functionReturnType !== 'none' && (
              <span style={{ fontSize: '10px', backgroundColor: '#333', padding: '1px 4px', borderRadius: '2px', color: '#8e44ad', marginLeft: '8px', border: '1px solid #8e44ad' }}>RETURNS {block.functionReturnType.toUpperCase()}</span>
            )}
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); onOpenFunctionEditor(eventSheetId, block); }}
            style={{ ...iconButtonStyle, color: '#9b59b6' }}
            title="Edit Function Properties"
          >
            <Edit2 size={14} />
          </button>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>

        {/* Function Body (Conditions & Actions) */}
        <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', minHeight: '40px', position: 'relative' }}>
          <div style={{ backgroundColor: isSelected ? '#9b59b6' : '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: isSelected ? '#fff' : '#555', borderRight: '1px solid #333', width: '30px', fontWeight: 'bold' }}>
            F
          </div>
          <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ padding: '0', borderRight: '1px solid #333', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            {block.conditions.map((c, i) => (
              <ConditionItem key={c.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} condition={c} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} />
            ))}
            <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add condition</div>
          </div>
          <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ padding: '0', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            {block.actions.map((a, i) => (
              <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} action={a} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} />
            ))}
            <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add action</div>
          </div>
        </div>

        {/* Children */}
        {block.children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 4px 4px 12px', borderTop: '1px solid #333' }}>
            {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />)}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'include') {
    const includedSheet = useEditorStore.getState().project.eventSheets.find(s => s.id === block.includeSheetId);
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#004b7e' : '#252526', borderLeft: '4px solid #2ecc71', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <DragIndicatorLine />
        <FilePlus size={14} color="#2ecc71" />
        <div style={{ fontWeight: 'bold', flex: 1 }}>Include sheet: <span style={{ color: '#2ecc71' }}>{includedSheet?.name || 'Unknown'}</span></div>
        {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
      </div>
    );
  }

  if (block.type === 'comment') {
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#333' : '#feffc1', color: '#000', padding: '8px 12px', borderLeft: '4px solid #f1c40f', fontStyle: 'italic', display: 'flex', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <DragIndicatorLine />
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
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, borderRadius: '4px', overflow: 'visible', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1) }}>
        <DragIndicatorLine />
        <div style={{ backgroundColor: isSelected ? '#007acc' : '#2d2d2d', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderLeft: '4px solid #f39c12' }} onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !block.groupExpanded }); }}>
          <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s' }}>▶</span>
          <div style={{ fontWeight: 'bold', flex: 1 }}>
            <input value={block.groupName} onChange={(e) => updateEventBlock(eventSheetId, block.id, { groupName: e.target.value })} onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', outline: 'none', width: '100%' }} />
          </div>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
            {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, display: 'flex', flexDirection: 'column', borderRadius: '3px', backgroundColor: '#252526', border: isSelected ? '1px solid #007acc' : '1px solid #333', boxShadow: isSelected ? '0 0 12px rgba(0, 122, 204, 0.3)' : 'none', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: '6px', overflow: 'visible', borderLeft: isSelected ? '4px solid #007acc' : '4px solid #3498db' }}>
      <DragIndicatorLine />
      <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', minHeight: '60px', position: 'relative' }}>
        {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" style={{ position: 'absolute', right: '4px', top: '4px', zIndex: 5 }} />}
        {isDisabled && <Ghost size={14} style={{ position: 'absolute', right: '24px', top: '4px', color: '#666' }} />}
        <div style={{ backgroundColor: isSelected ? '#007acc' : '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: isSelected ? '#fff' : '#555', borderRight: '1px solid #333', width: '30px', fontWeight: 'bold' }}>
          {blockIndices.get(block.id)}
        </div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ padding: '0', borderRight: '1px solid #333', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
          {block.conditions.map((c, i) => (
            <React.Fragment key={c.id}>
              {block.isOrBlock && i > 0 && <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', margin: '3px 0', fontWeight: 'bold', backgroundColor: '#222' }}>— OR —</div>}
              <ConditionItem project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} condition={c} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} />
            </React.Fragment>
          ))}
          <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add condition</div>
        </div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ padding: '0', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
          {block.actions.map((a, i) => (
            <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} action={a} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} />
          ))}
          <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add action</div>
        </div>
      </div>
      {block.children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
          {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />)}
        </div>
      )}
    </div>
  );
};

const LogicItemContent: React.FC<{ 
  item: any, 
  def?: LogicDefinition, 
  project: Project,
  type: 'condition' | 'action',
  searchTerm: string
}> = ({ item, def, project, type, searchTerm }) => {
  const ot = project.objectTypes.find(o => o.id === item.targetObjectTypeId);
  
  const renderFormattedLogic = () => {
    if (!def) return <HighlightText text={item.type} highlight={searchTerm} />;
    const p = item.params;
    
    switch (item.type) {
      case 'compareInstanceVariable':
      case 'compareVariable': {
        const op = p[1] === '==' ? '=' : p[1];
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>{op}</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[2]}</span>
        </div>;
      }
      case 'setInstanceVariable':
      case 'setVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>=</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[1]}</span>
        </div>;
      case 'subtractInstanceVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>-=</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[1]}</span>
        </div>;
      case 'addInstanceVariable':
        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, color: '#eee', letterSpacing: '0.2px' }}><HighlightText text={String(p[0])} highlight={searchTerm} /></span>
          <span style={{ color: '#888', fontSize: '11px', marginTop: '1px' }}>+=</span>
          <span style={{ color: '#f1c40f', fontWeight: 600 }}>{p[1]}</span>
        </div>;
      case 'callFunction': {
        const funcName = p[0];
        let foundParams: { name: string, type: string, defaultValue: any }[] = [];
        project.eventSheets.forEach(es => {
          const findFunc = (blocks: EventBlock[]) => {
            blocks.forEach(b => {
              if (b.type === 'function' && b.functionName === funcName) foundParams = (b.functionParams || []) as any;
              findFunc(b.children);
            });
          };
          findFunc(es.events);
        });

        const formattedParams = foundParams.map((pInfo, idx) => {
          const val = p[idx + 1] ?? '0';
          return `${pInfo.name || `Param${idx}`}: ${val}`;
        }).join(', ');

        return <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <span style={{ color: '#aaa' }}>Call</span>
          <span style={{ fontWeight: 700, color: '#9b59b6', letterSpacing: '0.2px' }}>{funcName}</span>
          {formattedParams && <span style={{ color: '#888', fontStyle: 'italic', fontSize: '11px' }}>({formattedParams})</span>}
        </div>;
      }
      case 'destroy':
        return <span style={{ color: '#ddd' }}>Destroy</span>;
      case 'onPointerPressedOnObject':
        return <span style={{ color: '#ddd' }}>On clicked</span>;
      default:
        return (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ color: '#ccc', fontWeight: 500 }}><HighlightText text={def.name} highlight={searchTerm} /></span>
            {p.length > 0 && (
              <span style={{ color: '#f1c40f', fontSize: '10px', fontWeight: 700 }}>
                ({p.map((val: any) => (typeof val === 'string' && val.length > 15 ? val.substring(0, 12) + '...' : val)).join(', ')})
              </span>
            )}
          </div>
        );
    }
  };

  return (
    <div className="logic-row-container" style={{ display: 'flex', alignItems: 'stretch', minHeight: '26px', fontSize: '13px', width: '100%', borderBottom: '1px solid #111' }}>
      {/* Object Column */}
      <div style={{ 
        width: '120px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px', 
        padding: '4px 8px',
        borderRight: '1px solid #1a1a1a',
        backgroundColor: '#2d2d2d',
        flexShrink: 0
      }}>
        {ot ? (
          <>
            <Box size={12} color="#2ecc71" />
            <span style={{ color: '#2ecc71', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <HighlightText text={ot.name} highlight={searchTerm} />
            </span>
          </>
        ) : (
          <>
            <Settings size={12} color="#3498db" />
            <span style={{ color: '#3498db', fontWeight: 600 }}>System</span>
          </>
        )}
      </div>

      {/* Logic Column */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', padding: '0 10px', gap: '6px', overflow: 'hidden', lineHeight: '1.4' }}>
        {type === 'condition' && item.inverted && <span style={{ color: '#e67e22', fontWeight: 800, marginRight: '2px' }}>!</span>}
        {renderFormattedLogic()}
      </div>
    </div>
  );
};

const ConditionItem: React.FC<{ project: Project, eventSheetId: string, blockId: string, condition: any, index: number, onOpenBrowser: any, onOpenParamEditor: any, onContextMenu: any, searchTerm: string, setDraggedLogicItem: any, draggedLogicItem: any }> = ({ project, eventSheetId, blockId, condition, index, onOpenBrowser, onOpenParamEditor, onContextMenu, searchTerm, setDraggedLogicItem, draggedLogicItem }) => {
  const { editorState, setSelectedLogicItems, moveCondition } = useEditorStore();
  const def = findConditionDefinition(condition.type);
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
      onDoubleClick={(e) => { 
        e.stopPropagation(); 
        if (def) {
          if (def.params.length > 0) {
            onOpenParamEditor('condition', blockId, condition.id, def, condition.params, condition.targetObjectTypeId); 
          } else {
            // Item has no params, open browser to allow changing it
            onOpenBrowser('condition', blockId, condition.targetObjectTypeId, condition.type, condition.id);
          }
        }
      }} 
      onContextMenu={(e) => onContextMenu(e, blockId, condition.id)}
      className={`logic-item-hover ${isSelected ? 'selected' : ''}`}
      style={{ opacity: (draggedLogicItem?.itemId === condition.id) ? 0.3 : 1, width: '100%' }}
    >
      <LogicItemContent item={condition} def={def} project={project} type="condition" searchTerm={searchTerm} />
    </div>
  );
};

const ActionItem: React.FC<{ project: Project, eventSheetId: string, blockId: string, action: any, index: number, onOpenBrowser: any, onOpenParamEditor: any, onContextMenu: any, searchTerm: string, setDraggedLogicItem: any, draggedLogicItem: any }> = ({ project, eventSheetId, blockId, action, index, onOpenBrowser, onOpenParamEditor, onContextMenu, searchTerm, setDraggedLogicItem, draggedLogicItem }) => {
  const { editorState, setSelectedLogicItems, moveAction } = useEditorStore();
  const def = findActionDefinition(action.type);
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
      onDoubleClick={(e) => { 
        e.stopPropagation(); 
        if (def) {
          if (def.params.length > 0) {
            onOpenParamEditor('action', blockId, action.id, def, action.params, action.targetObjectTypeId); 
          } else {
            // Item has no params, open browser to allow changing it
            onOpenBrowser('action', blockId, action.targetObjectTypeId, action.type, action.id);
          }
        }
      }} 
      onContextMenu={(e) => onContextMenu(e, blockId, action.id)}
      className={`logic-item-hover ${isSelected ? 'selected' : ''}`}
      style={{ opacity: (draggedLogicItem?.itemId === action.id) ? 0.3 : 1, width: '100%' }}
    >
      <LogicItemContent item={action} def={def} project={project} type="action" searchTerm={searchTerm} />
    </div>
  );
};

const ContextMenu: React.FC<{ project: Project, x: number, y: number, blockId: string | null, logicItemId: string | null | undefined, eventSheetId: string, onClose: any }> = ({ project, x, y, blockId, logicItemId, eventSheetId, onClose }) => {
  const { addEventBlock, removeEventBlock, copySelected, cutSelected, pasteSelected, addCondition, updateEventBlock, toggleConditionInverted, toggleOrBlock, removeCondition, removeAction, pasteLogicItem } = useEditorStore();
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
          <div style={contextItemStyle} onClick={() => { toggleOrBlock(eventSheetId, blockId); onClose(); }}> {currentBlock?.isOrBlock ? 'Make AND block' : 'Make OR block'}</div>
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

interface FunctionEditorProps {
  block: EventBlock;
  onSave: (data: any) => void;
  onCancel: () => void;
}

const FunctionEditor: React.FC<FunctionEditorProps> = ({ block, onSave, onCancel }) => {
  const [name, setName] = React.useState(block.functionName || '');
  const [description, setDescription] = React.useState(block.functionDescription || '');
  const [returnType, setReturnType] = React.useState(block.functionReturnType || 'none');
  const [passPicking, setPassPicking] = React.useState(block.functionPassPicking || false);
  const [params, setParams] = React.useState(block.functionParams || []);

  const addParam = () => {
    setParams([...params, { name: 'Param' + params.length, type: 'any', defaultValue: '0' }]);
  };

  const removeParam = (index: number) => {
    setParams(params.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, data: any) => {
    setParams(params.map((p, i) => i === index ? { ...p, ...data } : p));
  };

  return (
    <div style={overlayStyle} onClick={onCancel}>
      <div style={{ ...modalStyle, width: '600px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#9b59b6', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Zap size={18} color="#fff" /></div>
            <h3 style={{ margin: 0, fontSize: '16px' }}>Function Properties</h3>
          </div>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="e.g. OnPlayerDied"
              style={paramInputStyle} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Description</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="What does this function do?"
              style={{ ...paramInputStyle, minHeight: '60px', resize: 'vertical' }} 
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Return Type</label>
            <select 
              value={returnType} 
              onChange={e => setReturnType(e.target.value as any)}
              style={paramInputStyle}
            >
              <option value="none">None</option>
              <option value="number">Number</option>
              <option value="string">String</option>
              <option value="any">Any</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: '#1e1e1e', borderRadius: '6px', border: '1px solid #333' }}>
            <input 
              type="checkbox" 
              checked={passPicking} 
              onChange={e => setPassPicking(e.target.checked)} 
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Pass Picking</div>
              <div style={{ fontSize: '11px', color: '#666' }}>If enabled, the function inherits picked objects from the caller.</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: '#888', textTransform: 'uppercase' }}>Parameters</label>
              <button onClick={addParam} style={{ ...addLinkStyle, color: '#9b59b6', fontWeight: 'bold' }}>+ Add Parameter</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {params.length === 0 && <div style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', padding: '10px', backgroundColor: '#1e1e1e', borderRadius: '4px', textAlign: 'center' }}>No parameters defined.</div>}
              {params.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#1e1e1e', padding: '8px', borderRadius: '4px', border: '1px solid #333' }}>
                  <input 
                    value={p.name} 
                    onChange={e => updateParam(i, { name: e.target.value })}
                    placeholder="Name"
                    style={{ ...paramInputStyle, flex: 2, padding: '4px 8px', fontSize: '12px' }}
                  />
                  <select 
                    value={p.type} 
                    onChange={e => updateParam(i, { type: e.target.value })}
                    style={{ ...paramInputStyle, flex: 1, padding: '4px 8px', fontSize: '12px' }}
                  >
                    <option value="number">Number</option>
                    <option value="string">String</option>
                    <option value="any">Any</option>
                  </select>
                  <input 
                    value={p.defaultValue} 
                    onChange={e => updateParam(i, { defaultValue: e.target.value })}
                    placeholder="Default"
                    style={{ ...paramInputStyle, flex: 1, padding: '4px 8px', fontSize: '12px' }}
                  />
                  <button onClick={() => removeParam(i)} style={{ ...iconButtonStyle, color: '#e74c3c' }}><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={modalFooterStyle}>
          <button onClick={() => onSave({ functionName: name, functionDescription: description, functionReturnType: returnType, functionParams: params, functionPassPicking: passPicking })} style={{ ...saveButtonStyle, backgroundColor: '#9b59b6' }}>Save Changes</button>
          <button onClick={onCancel} style={cancelButtonStyle}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

interface ParamEditorProps {
  project: Project;
  mode: 'condition' | 'action';
  def: LogicDefinition;
  initialParams: any[];
  targetObjectTypeId?: string;
  onSave: (p: any[]) => void;
  onBack: () => void;
  onCancel: () => void;
}

const ParamEditor: React.FC<ParamEditorProps> = ({ project, mode, def, initialParams, targetObjectTypeId, onSave, onBack, onCancel }) => {
  const [params, setParams] = React.useState([...initialParams]);

  React.useEffect(() => {
    // Auto-select first variable if current is empty or invalid
    const newParams = [...params];
    let changed = false;
    def.params.forEach((pDef, i) => {
      if (pDef.type === 'globalVariable' && (!newParams[i] || !project.globalVariables.find(v => v.name === newParams[i]))) {
        if (project.globalVariables.length > 0) {
          newParams[i] = project.globalVariables[0].name;
          changed = true;
        }
      } else if (pDef.type === 'instanceVariable' && (!newParams[i] || !project.objectTypes.find(o => o.id === targetObjectTypeId)?.instanceVariables.find(v => v.name === newParams[i]))) {
        const ot = project.objectTypes.find(o => o.id === targetObjectTypeId);
        if (ot && ot.instanceVariables.length > 0) {
          newParams[i] = ot.instanceVariables[0].name;
          changed = true;
        }
      }
    });
    if (changed) setParams(newParams);
  }, [def, project, targetObjectTypeId]);

  const [activeParamIndex, setActiveParamIndex] = React.useState(0);
  const [filter, setFilter] = React.useState('');

  const assistantItems = [
    ...project.globalVariables.map((v: any) => ({ name: v.name, type: 'variable', category: 'Global Variables', icon: <Variable size={12} color="#3498db" /> })), 
    ...project.objectTypes.map((ot: any) => ({ name: ot.name, type: 'object', category: 'Objects', icon: <Box size={12} color="#2ecc71" /> })), 
    ...project.objectTypes.flatMap((ot: any) => ot.instanceVariables.map((v: any) => ({ name: `${ot.name}.${v.name}`, type: 'instance-variable', category: 'Instance Variables', icon: <Terminal size={12} color="#e67e22" /> }))), 
    { name: 'dt', type: 'system', category: 'System', icon: <Settings size={12} color="#95a5a6" /> }, 
    { name: 'time', type: 'system', category: 'System', icon: <Settings size={12} color="#95a5a6" /> },
    { name: 'random(0, 100)', type: 'math', category: 'Math', icon: <Code size={12} color="#9b59b6" /> },
    { name: 'Function.ReturnValue', type: 'function', category: 'Functions', icon: <Zap size={12} color="#9b59b6" /> },
    { name: 'Function.Param(0)', type: 'function', category: 'Functions', icon: <Zap size={12} color="#9b59b6" /> },
    ...(() => {
      const names: string[] = [];
      project.eventSheets.forEach(es => {
        const find = (blocks: EventBlock[]) => {
          blocks.forEach(b => {
            if (b.type === 'function' && b.functionName) names.push(b.functionName);
            find(b.children);
          });
        };
        find(es.events);
      });
      return names.map(n => ({ name: `Function.Call("${n}")`, type: 'function', category: 'Functions', icon: <Zap size={12} color="#9b59b6" /> }));
    })()
  ].filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) || i.category.toLowerCase().includes(filter.toLowerCase()));

  const categories = Array.from(new Set(assistantItems.map(i => i.category)));

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onSave(params);
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [params, onSave, onCancel]);

  const insertAtCaret = (text: string) => {
    const n = [...params];
    const current = String(n[activeParamIndex] || '');
    n[activeParamIndex] = current ? current + (current.endsWith('.') ? '' : ' ') + text : text;
    setParams(n);
  };

  const [mouseDownOnOverlay, setMouseDownOnOverlay] = React.useState(false);

  const handleOverlayMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) setMouseDownOnOverlay(true);
    else setMouseDownOnOverlay(false);
  };

  const handleOverlayMouseUp = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && mouseDownOnOverlay) {
      onCancel();
    }
    setMouseDownOnOverlay(false);
  };

  return (
    <div 
      style={overlayStyle} 
      onMouseDown={handleOverlayMouseDown}
      onMouseUp={handleOverlayMouseUp}
    >
      <div style={{ ...modalStyle, width: '900px', height: '650px', flexDirection: 'row' }} onMouseDown={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#1e1e1e', borderRight: '1px solid #333' }}>
          <div style={{ ...modalHeaderStyle, backgroundColor: '#252526', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px' }}>
            <button 
              onClick={onBack} 
              style={{ ...iconButtonStyle, width: '32px', height: '32px', border: '1px solid #444', borderRadius: '6px' }}
              title="Back to logic selection"
            >
              <ChevronUp size={18} style={{ transform: 'rotate(-90deg)' }} />
            </button>
            <div style={{ width: '32px', height: '32px', backgroundColor: '#007acc', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Settings size={18} color="#fff" /></div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Parameters: {def.name}</h3>
              <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>{def.description}</div>
            </div>
          </div>
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', flex: 1, overflowY: 'auto' }}>
            {def.params.map((pDef, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{pDef.name}</label>
                  <span style={{ fontSize: '9px', color: '#444', fontWeight: 'bold' }}>{pDef.type.toUpperCase()}</span>
                </div>
                {pDef.type === 'enum' ? (
                  <select 
                    value={params[i]} 
                    onFocus={() => setActiveParamIndex(i)}
                    onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }}
                    style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}
                  >
                    {pDef.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : pDef.type === 'functionName' ? (
                  <select 
                    value={params[i]} 
                    onFocus={() => setActiveParamIndex(i)}
                    onChange={(e) => { 
                      const n = [...params]; 
                      n[i] = e.target.value; 
                      setParams(n); 
                    }}
                    style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}
                  >
                    <option value="">Select a function...</option>
                    {project.eventSheets.flatMap(es => {
                      const findFuncs = (blocks: EventBlock[]): string[] => {
                        let names: string[] = [];
                        blocks.forEach(b => {
                          if (b.type === 'function' && b.functionName) names.push(b.functionName);
                          names = [...names, ...findFuncs(b.children)];
                        });
                        return names;
                      };
                      return findFuncs(es.events);
                    }).map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
                ) : pDef.type === 'globalVariable' ? (
                  <select 
                    value={params[i]} 
                    onFocus={() => setActiveParamIndex(i)}
                    onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }}
                    style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}
                  >
                    {project.globalVariables.length === 0 && <option value="">No global variables</option>}
                    {project.globalVariables.map(v => <option key={v.name} value={v.name}>{v.name}</option>)}
                  </select>
                ) : pDef.type === 'instanceVariable' ? (
                  <select 
                    value={params[i]} 
                    onFocus={() => setActiveParamIndex(i)}
                    onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }}
                    style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}
                  >
                    {(() => {
                      const ot = project.objectTypes.find(o => o.id === targetObjectTypeId);
                      if (!ot || ot.instanceVariables.length === 0) return <option value="">No instance variables</option>;
                      return ot.instanceVariables.map(v => <option key={v.name} value={v.name}>{v.name}</option>);
                    })()}
                  </select>
                ) : pDef.type === 'objectType' ? (
                  <select 
                    value={params[i]} 
                    onFocus={() => setActiveParamIndex(i)}
                    onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }}
                    style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333' }}
                  >
                    {project.objectTypes.map(ot => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    onFocus={() => setActiveParamIndex(i)} 
                    value={params[i]} 
                    onChange={(e) => { const n = [...params]; n[i] = e.target.value; setParams(n); }} 
                    style={{ ...paramInputStyle, border: activeParamIndex === i ? '1px solid #007acc' : '1px solid #333', borderLeft: activeParamIndex === i ? '4px solid #007acc' : '1px solid #333' }} 
                  />
                )}
              </div>
            ))}

            {/* Dynamic Function Parameters */}
            {def.type === 'callFunction' && params[0] && (() => {
              const selectedFuncName = params[0];
              let foundParams: { name: string, type: string }[] = [];
              project.eventSheets.forEach(es => {
                const findFunc = (blocks: EventBlock[]) => {
                  blocks.forEach(b => {
                    if (b.type === 'function' && b.functionName === selectedFuncName) foundParams = (b.functionParams || []) as any;
                    findFunc(b.children);
                  });
                };
                findFunc(es.events);
              });

              return foundParams.map((p, idx) => (
                <div key={`dyn-${idx}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <label style={{ fontSize: '11px', fontWeight: 700, color: '#9b59b6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{p.name || `Parameter ${idx}`}</label>
                    <span style={{ fontSize: '9px', color: '#444', fontWeight: 'bold' }}>{p.type.toUpperCase()}</span>
                  </div>
                  <input 
                    type="text" 
                    onFocus={() => setActiveParamIndex(idx + 1)} // idx + 1 because param 0 is the function name
                    value={params[idx + 1] ?? '0'} 
                    onChange={(e) => { const n = [...params]; n[idx + 1] = e.target.value; setParams(n); }} 
                    style={{ ...paramInputStyle, border: activeParamIndex === (idx + 1) ? '1px solid #9b59b6' : '1px solid #333', borderLeft: activeParamIndex === (idx + 1) ? '4px solid #9b59b6' : '1px solid #333' }} 
                  />
                </div>
              ));
            })()}
          </div>
          <div style={{ ...modalFooterStyle, backgroundColor: '#252526', borderTop: '1px solid #333', padding: '16px 24px' }}>
            <div style={{ fontSize: '11px', color: '#666' }}>Tip: Ctrl+Enter to Save, Esc to Cancel</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => onSave(params)} style={{ ...saveButtonStyle, padding: '8px 24px' }}>Done</button>
              <button onClick={onCancel} style={{ ...cancelButtonStyle, padding: '8px 24px' }}>Cancel</button>
            </div>
          </div>
        </div>

        {/* Expression Assistant Side Panel */}
        <div style={{ width: '320px', display: 'flex', flexDirection: 'column', backgroundColor: '#252526' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #333' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input 
                placeholder="EXPRESSION ASSISTANT" 
                value={filter} 
                onChange={e => setFilter(e.target.value)}
                style={{ width: '100%', backgroundColor: '#1e1e1e', border: '1px solid #333', color: '#fff', fontSize: '11px', padding: '8px 12px 8px 32px', borderRadius: '4px', outline: 'none' }}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {categories.map(cat => (
              <div key={cat} style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', color: '#555', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', paddingLeft: '8px' }}>{cat}</div>
                {assistantItems.filter(i => i.category === cat).map((item, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => insertAtCaret(item.name)}
                    onDoubleClick={() => { insertAtCaret(item.name); onSave(params); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '4px', cursor: 'pointer', transition: 'background 0.2s', fontSize: '12px' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2d2d2d')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ opacity: 0.6 }}>{item.icon}</div>
                    <span style={{ color: '#ccc' }}>{item.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: '12px', fontSize: '11px', color: '#666', borderTop: '1px solid #444', fontStyle: 'italic' }}>
            Double-click or click items to add them to the current parameter.
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
