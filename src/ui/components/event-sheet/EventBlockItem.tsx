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

const BASE_GUTTER_WIDTH = 50;
const INDENT_STEP = 24;

export const EventBlockItem: React.FC<EventBlockItemProps> = ({ 
  eventSheetId, block, onOpenBrowser, onOpenParamEditor, onOpenVariableEditor, onOpenFunctionEditor, onOpenGroupDialog, onContextMenu, draggedBlockId, setDraggedBlockId, draggedLogicItem, setDraggedLogicItem, depth = 0, searchTerm = '', blockIndices 
}) => {
  const gutterWidth = BASE_GUTTER_WIDTH + (depth * INDENT_STEP);

  const { editorState, setSelectedEventBlocks, updateEventBlock, moveEventBlock, moveCondition, moveAction } = useEditorStore();
  const isSelected = editorState.selectedEventBlockIds.includes(block.id);
  const isDisabled = block.disabled;
  const isDragged = draggedBlockId === block.id;

  const isExpanded = searchTerm ? true : (block.groupExpanded !== false);

  const [dragIndicator, setDragIndicator] = React.useState<'before' | 'inside' | 'after' | null>(null);

  const handleDragStart = (e: React.DragEvent) => { e.stopPropagation(); setDraggedBlockId(block.id); e.dataTransfer.setData('text/plain', block.id); e.dataTransfer.effectAllowed = 'move'; };
  
  const handleDragOver = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // If hovering in the gutter area, bubble to parent for hierarchical D&D
    if (x < gutterWidth) {
      if (dragIndicator) setDragIndicator(null);
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedBlockId || draggedBlockId === block.id) return;
    
    const y = e.clientY - rect.top;
    const canHaveChildren = block.type === 'event' || block.type === 'group' || block.type === 'function';
    
    if (y < rect.height * 0.3) {
      setDragIndicator('before');
    } else if (canHaveChildren && x > gutterWidth + 20) {
      setDragIndicator('inside');
    } else {
      setDragIndicator('after');
    }
  };

  const handleDragLeave = () => {
    setDragIndicator(null);
  };

  const handleDrop = (e: React.DragEvent) => { 
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;

    // Bubble to parent if dropping in the gutter
    if (x < gutterWidth) return;

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
    marginLeft: '0', 
    opacity: isDragged ? 0.4 : 1, 
    transition: 'opacity 0.2s', 
    marginBottom: '0px',
    width: '100%',
    paddingTop: '2px'
  };

  const addLinkStyle: React.CSSProperties = { background: 'none', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer', padding: '8px 12px', textAlign: 'left', opacity: 0.8, transition: 'all 0.2s' };
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
        left: `${gutterWidth + (isInside ? INDENT_STEP : 0)}px`,
        right: '0',
        height: '3px',
        backgroundColor: '#2ecc71',
        zIndex: 100,
        borderRadius: '2px'
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
        style={{ ...itemStyleWrapper, display: 'grid', gridTemplateColumns: `${gutterWidth}px 1fr`, opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), cursor: 'pointer', marginBottom: depth > 0 ? '0px' : '2px' }}
      >
        <DragIndicatorLine />
        <div style={{ color: isSelected ? '#fff' : '#555', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
          {blockIndices.get(block.id)}
        </div>
        <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '12px', backgroundColor: isSelected ? '#004b7e' : '#252526', border: isSelected ? '1px solid #007acc' : '1px solid #333', borderRadius: '2px' }}>
          <div style={{ color: isLocal ? '#e67e22' : '#3498db', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', width: '40px', userSelect: 'none' }}>{isLocal ? 'Local' : 'Global'}</div>
          <div style={{ flex: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontSize: '12px' }}>
            <VariableIcon size={14} color={isLocal ? '#e67e22' : '#3498db'} /> 
            <span>{block.variable.name}</span>
            <span style={{ color: '#888' }}>=</span>
            <span style={{ color: block.variable.type === 'string' ? '#e67e22' : '#2ecc71' }}>{block.variable.type === 'string' ? `"${block.variable.initialValue}"` : String(block.variable.initialValue)}</span>
            {block.variable.isConstant && <span style={{ fontSize: '9px', backgroundColor: '#444', padding: '1px 4px', borderRadius: '2px', color: '#aaa' }}>CONST</span>}
          </div>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>
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
        style={{ ...itemStyleWrapper, display: 'flex', flexDirection: 'column', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: depth > 0 ? '0px' : '6px', overflow: 'visible' }}
      >
        <DragIndicatorLine />
        <div style={{ display: 'grid', gridTemplateColumns: `${gutterWidth}px calc(50% - ${gutterWidth}px) 50%` }}>
          <div style={{ color: isSelected ? '#fff' : '#555', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5px 0 8px' }}>
            <span>{blockIndices.get(block.id)}</span>
            {block.children.length > 0 && (
              <span 
                onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !isExpanded }); }}
                style={{ width: '20px', height: '20px', cursor: 'pointer', transition: 'all 0.1s', transform: isExpanded ? 'rotate(90deg)' : 'none', fontSize: '9px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', marginRight: '-5px' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
              >
                ▶
              </span>
            )}
          </div>
          <div style={{ backgroundColor: '#2d2d2d', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', border: isSelected ? '1px solid #9b59b6' : '1px solid #333', borderRight: '1px solid #333', borderRadius: '4px 0 0 0', gridColumn: '2 / 4' }}>
            <Zap size={14} color="#9b59b6" />
            <div style={{ fontWeight: 'bold', color: '#9b59b6', fontSize: '12px' }}>Function: {block.functionName}</div>
            <div style={{ color: '#888', fontSize: '10px' }}>({paramsSummary})</div>
            {block.functionReturnType && block.functionReturnType !== 'none' && (
              <span style={{ fontSize: '10px', backgroundColor: '#333', padding: '1px 4px', borderRadius: '2px', color: '#8e44ad', border: '1px solid #8e44ad' }}>RETURNS {block.functionReturnType.toUpperCase()}</span>
            )}
            <button onClick={(e) => { e.stopPropagation(); onOpenFunctionEditor(eventSheetId, block); }} style={{ ...iconButtonStyle, color: '#9b59b6', marginLeft: 'auto' }} title="Edit Function Properties">
              <Edit2 size={14} />
            </button>
            {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: `${gutterWidth}px calc(50% - ${gutterWidth}px) 50%` }}>
          <div />
          <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ padding: '0', backgroundColor: '#2d2d2d', border: isSelected ? '1px solid #9b59b6' : '1px solid #333', borderTop: 'none', borderRight: '1px solid #333', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            {block.conditions.map((c, i) => (
              <ConditionItem key={c.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={c} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="condition" />
            ))}
            <div 
              style={addLinkStyle} 
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.opacity = '0.8'; }}
            >
              + Add condition
            </div>
          </div>
          <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ padding: '0', backgroundColor: '#252526', border: isSelected ? '1px solid #9b59b6' : '1px solid #333', borderTop: 'none', borderLeft: 'none', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
            {block.actions.map((a, i) => (
              <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={a} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="action" />
            ))}
            <div 
              style={addLinkStyle}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.opacity = '1'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.opacity = '0.8'; }}
            >
              + Add action
            </div>
          </div>
        </div>

        {isExpanded && block.children.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '4px 0 0 0', borderTop: '1px solid #333', position: 'relative' }}>
            <div style={{ position: 'absolute', left: `${gutterWidth + INDENT_STEP / 2 - 10}px`, top: 0, bottom: 0, width: '2px', backgroundColor: '#444', zIndex: 0 }} />
            {block.children.map((child) => (
              <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onOpenGroupDialog={onOpenGroupDialog} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'include') {
    const includedSheet = useEditorStore.getState().project.eventSheets.find(s => s.id === block.includeSheetId);
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, display: 'grid', gridTemplateColumns: `${gutterWidth}px 1fr`, opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: depth > 0 ? '0px' : '2px' }}>
        <DragIndicatorLine />
        <div style={{ color: isSelected ? '#fff' : '#555', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
          {blockIndices.get(block.id)}
        </div>
        <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: isSelected ? '#004b7e' : '#252526', border: isSelected ? '1px solid #007acc' : '1px solid #333', borderRadius: '2px' }}>
          <FilePlus size={14} color="#2ecc71" />
          <div style={{ fontWeight: 'bold', flex: 1, fontSize: '12px' }}>Include sheet: <span style={{ color: '#2ecc71' }}>{includedSheet?.name || 'Unknown'}</span></div>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>
      </div>
    );
  }

  if (block.type === 'comment') {
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, display: 'grid', gridTemplateColumns: `${gutterWidth}px 1fr`, color: '#000', fontStyle: 'italic', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: depth > 0 ? '0px' : '2px' }}>
        <DragIndicatorLine />
        <div style={{ color: isSelected ? '#fff' : '#888', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', paddingLeft: '8px' }}>
          {blockIndices.get(block.id)}
        </div>
        <div style={{ flex: 1, padding: '8px 12px', display: 'flex', backgroundColor: isSelected ? '#333' : '#feffc1', border: isSelected ? '1px solid #007acc' : '1px solid #dcdde1', borderRadius: '2px' }}>
          <div style={{ flex: 1 }}>
            <input value={block.commentText} onChange={(e) => updateEventBlock(eventSheetId, block.id, { commentText: e.target.value })} style={{ backgroundColor: 'transparent', border: 'none', color: isSelected ? '#fff' : '#000', fontStyle: 'italic', outline: 'none', width: '100%', fontSize: '12px' }} />
          </div>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
        </div>
      </div>
    );
  }

  if (block.type === 'group') {
    const isExpanded = searchTerm ? true : block.groupExpanded;
    return (
      <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, borderRadius: '4px', overflow: 'visible', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: depth > 0 ? '0px' : '2px' }}>
        <DragIndicatorLine />
        <div style={{ display: 'grid', gridTemplateColumns: `${gutterWidth}px 1fr`, cursor: 'pointer' }}>
          <div style={{ color: isSelected ? '#fff' : '#555', fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 5px 0 8px' }}>
            <span>{blockIndices.get(block.id)}</span>
            <span 
              onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !isExpanded }); }}
              style={{ width: '20px', height: '20px', cursor: 'pointer', transition: 'all 0.1s', transform: isExpanded ? 'rotate(90deg)' : 'none', fontSize: '9px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', marginRight: '-5px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
            >
              ▶
            </span>
          </div>
          <div 
            style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: isSelected ? '#007acc' : '#2d2d2d', border: isSelected ? '1px solid #005a9e' : '1px solid #333', borderRadius: '2px', cursor: 'default' }} 
            onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !isExpanded }); }}
          >
            <div style={{ fontWeight: 'bold', flex: 1, userSelect: 'none', color: '#fff', fontSize: '12px' }}>
              {block.groupName}
            </div>
            {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" />}
          </div>
        </div>
        {isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', position: 'relative' }}>
            <div style={{ position: 'absolute', left: `${gutterWidth + INDENT_STEP / 2 - 10}px`, top: 0, bottom: 0, width: '2px', backgroundColor: '#444', zIndex: 0 }} />
            {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onOpenGroupDialog={onOpenGroupDialog} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="event-block-item-container" data-block-id={block.id} draggable onDragStart={handleDragStart} onDragEnd={() => setDraggedBlockId(null)} onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onClick={(e) => { e.stopPropagation(); setSelectedEventBlocks([block.id]); }} onContextMenu={(e) => onContextMenu(e, block.id)} style={{ ...itemStyleWrapper, display: 'flex', flexDirection: 'column', opacity: isDisabled ? 0.4 : (isDragged ? 0.3 : 1), marginBottom: depth > 0 ? '0px' : '4px', overflow: 'visible' }}>
      <DragIndicatorLine />
      <div style={{ display: 'grid', gridTemplateColumns: `${gutterWidth}px calc(50% - ${gutterWidth}px) 50%`, minHeight: '35px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: isSelected ? '#fff' : '#555', padding: '0 5px 0 8px', fontWeight: 'bold' }}>
          <span>{blockIndices.get(block.id)}</span>
          {block.children.length > 0 && (
            <span 
              onClick={(e) => { e.stopPropagation(); updateEventBlock(eventSheetId, block.id, { groupExpanded: !isExpanded }); }}
              style={{ width: '20px', height: '20px', cursor: 'pointer', transition: 'all 0.1s', transform: isExpanded ? 'rotate(90deg)' : 'none', fontSize: '9px', color: '#666', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px', marginRight: '-5px' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#666'; }}
            >
              ▶
            </span>
          )}
        </div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('condition', block.id); }} style={{ padding: '0', backgroundColor: '#2d2d2d', border: isSelected ? '1px solid #007acc' : '1px solid #333', borderRight: '1px solid #333', borderRadius: '3px 0 0 3px', minWidth: '300px', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          {block.bookmarked && <Bookmark size={14} fill="#f1c40f" color="#f1c40f" style={{ position: 'absolute', right: '4px', top: '4px', zIndex: 5 }} />}
          {isDisabled && <Ghost size={14} style={{ position: 'absolute', right: '24px', top: '4px', color: '#666' }} />}
          {block.conditions.map((c, i) => (
            <React.Fragment key={c.id}>
              {block.isOrBlock && i > 0 && <div style={{ fontSize: '11px', color: '#888', textAlign: 'center', margin: '3px 0', fontWeight: 'bold', backgroundColor: '#222' }}>— OR —</div>}
              <ConditionItem project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={c} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="condition" />
            </React.Fragment>
          ))}
          <div 
            style={addLinkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.opacity = '0.8'; }}
          >
            + Add condition
          </div>
        </div>
        <div onClick={(e) => { e.stopPropagation(); onOpenBrowser('action', block.id); }} style={{ padding: '0', backgroundColor: '#252526', border: isSelected ? '1px solid #007acc' : '1px solid #333', borderLeft: 'none', borderRadius: '0 3px 3px 0', minWidth: '300px', display: 'flex', flexDirection: 'column' }}>
          {block.actions.map((a, i) => (
            <ActionItem key={a.id} project={useEditorStore.getState().project} eventSheetId={eventSheetId} blockId={block.id} item={a} index={i+1} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onContextMenu={onContextMenu} searchTerm={searchTerm} setDraggedLogicItem={setDraggedLogicItem} draggedLogicItem={draggedLogicItem} type="action" />
          ))}
          <div 
            style={addLinkStyle}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.opacity = '0.8'; }}
          >
            + Add action
          </div>
        </div>
      </div>
      {isExpanded && block.children.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', marginTop: '0px', position: 'relative', paddingBottom: 0 }}>
          <div style={{ position: 'absolute', left: `${gutterWidth + INDENT_STEP / 2 - 10}px`, top: 0, bottom: 0, width: '2px', backgroundColor: '#333', zIndex: 0 }} />
          {block.children.map((child) => <EventBlockItem key={child.id} eventSheetId={eventSheetId} block={child} onOpenBrowser={onOpenBrowser} onOpenParamEditor={onOpenParamEditor} onOpenVariableEditor={onOpenVariableEditor} onOpenFunctionEditor={onOpenFunctionEditor} onOpenGroupDialog={onOpenGroupDialog} onContextMenu={onContextMenu} draggedBlockId={draggedBlockId} setDraggedBlockId={setDraggedBlockId} draggedLogicItem={draggedLogicItem} setDraggedLogicItem={setDraggedLogicItem} depth={depth + 1} searchTerm={searchTerm} blockIndices={blockIndices} />)}
        </div>
      )}
    </div>
  );
};
