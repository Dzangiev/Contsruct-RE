import React from 'react';
import { 
  Variable as VariableIcon, 
  Zap, 
  Bookmark, 
  FilePlus, 
  Ghost, 
  Edit2,
  Box
} from 'lucide-react';
import { useEditorStore } from '../../../store/useEditorStore';
import { EventBlock } from '../../../model/project';
import { ConditionItem, ActionItem } from './LogicItem';
import { EventBlockItemProps } from './types';

export const EventBlockItem: React.FC<EventBlockItemProps> = ({ 
  eventSheetId, block, onOpenBrowser, onOpenParamEditor, onOpenVariableEditor, onOpenFunctionEditor, onContextMenu, draggedBlockId, setDraggedBlockId, draggedLogicItem, setDraggedLogicItem, depth = 0, searchTerm = '', blockIndices 
}) => {
  const { editorState, setSelectedEventBlocks, updateEventBlock, moveEventBlock, moveCondition, moveAction } = useEditorStore();
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

  const itemStyleWrapper: React.CSSProperties = { 
    position: 'relative', 
    marginLeft: depth > 0 ? '24px' : '0', 
    opacity: isDragged ? 0.4 : 1, 
    transition: 'opacity 0.2s', 
    marginBottom: '0px'
  };

  const addLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#007acc', fontSize: '12px', cursor: 'pointer', padding: '4px 0', textAlign: 'left' };
  const iconButtonStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' };

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
        style={{ ...itemStyleWrapper, backgroundColor: isSelected ? '#004b7e' : '#252526', borderLeft: '4px solid', borderLeftColor: isLocal ? '#e67e22' : '#3498db', padding: '6px 12px', borderRadius: '2px', display: 'flex', alignItems: 'center', gap: '12px', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), cursor: 'pointer', marginBottom: '2px' }}
      >
        <DragIndicatorLine />
        <div style={{ color: isLocal ? '#e67e22' : '#3498db', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', width: '40px', userSelect: 'none' }}>{isLocal ? 'Local' : 'Global'}</div>
        <div style={{ flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
          <VariableIcon size={14} color={isLocal ? '#e67e22' : '#3498db'} /> 
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

        <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr', minHeight: '40px', position: 'relative' }}>
          <div style={{ backgroundColor: isSelected ? '#9b59b6' : '#1e1e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: isSelected ? '#fff' : '#555', borderRight: '1px solid #333', width: '30px', fontWeight: 'bold' }}>
            F
          </div>
          <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ padding: '0', borderRight: '1px solid #333', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            {block.conditions.map((c, i) => (
              <ConditionItem key={c.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={c} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="condition" />
            ))}
            <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add condition</div>
          </div>
          <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ padding: '0', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            {block.actions.map((a, i) => (
              <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={a} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="action" />
            ))}
            <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add action</div>
          </div>
        </div>

        {block.children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 4px 4px 12px', borderTop: '1px solid #333' }}>
            {block.children.map((child) => (
              <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />
            ))}
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
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, borderRadius: '4px', overflow: 'visible', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: '2px' }}>
        <DragIndicatorLine />
        <div style={{ backgroundColor: isSelected ? '#007acc' : '#2d2d2d', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderLeft: '4px solid #f39c12' }} onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !block.groupExpanded }); }}>
          <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.1s', fontSize: '10px' }}>▶</span>
          <div style={{ fontWeight: 'bold', flex: 1 }}>
            <input value={block.groupName} onChange={(e) => updateEventBlock(eventSheetId, block.id, { groupName: e.target.value })} onClick={(e) => e.stopPropagation()} style={{ backgroundColor: 'transparent', border: 'none', color: '#fff', fontWeight: 'bold', outline: 'none', width: '100%' }} />
          </div>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '12px', top: 0, bottom: 0, width: '1px', backgroundColor: '#444' }} />
            {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, display: 'flex', flexDirection: 'column', borderRadius: '3px', backgroundColor: '#252526', border: isSelected ? '1px solid #007acc' : '1px solid #333', boxShadow: isSelected ? '0 0 12px rgba(0, 122, 204, 0.3)' : 'none', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: '4px', overflow: 'visible', borderLeft: isSelected ? '4px solid #007acc' : '4px solid #3498db' }}>
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
              <ConditionItem project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={c} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="condition" />
            </React.Fragment>
          ))}
          <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add condition</div>
        </div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ padding: '0', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
          {block.actions.map((a, i) => (
            <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={a} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="action" />
          ))}
          <div style={{ ...addLinkStyle, padding: '4px 8px', color: '#555', fontSize: '12px' }}>+ Add action</div>
        </div>
      </div>
      {block.children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '0px', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '12px', top: 0, bottom: 0, width: '1px', backgroundColor: '#444' }} />
          {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />)}
        </div>
      )}
    </div>
  );
};
