import React from 'react';
import { useEditorStore } from '../../../store/useEditorStore';
import { findConditionDefinition, findActionDefinition } from '../../../model/definitions';
import { LogicItemContent } from './LogicItemContent';
import { LogicItemProps } from './types';

export const ConditionItem: React.FC<LogicItemProps> = ({ 
  project, eventSheetId, blockId, item: condition, index, onOpenBrowser, onOpenParamEditor, onContextMenu, searchTerm, setDraggedLogicItem, draggedLogicItem 
}) => {
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
            onOpenBrowser('condition', blockId, condition.targetObjectTypeId, condition.type, condition.id);
          }
        }
      }} 
      onContextMenu={(e) => onContextMenu(e, blockId, condition.id)}
      className={`logic-item-hover ${isSelected ? 'selected' : ''}`}
      style={{ opacity: (draggedLogicItem?.itemId === condition.id) ? 0.3 : 1, width: '100%' }}
    >
      <LogicItemContent item={condition} def={def} project={project} type="condition" searchTerm={searchTerm} isSelected={isSelected} />
    </div>
  );
};

export const ActionItem: React.FC<LogicItemProps> = ({ 
  project, eventSheetId, blockId, item: action, index, onOpenBrowser, onOpenParamEditor, onContextMenu, searchTerm, setDraggedLogicItem, draggedLogicItem 
}) => {
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
            onOpenBrowser('action', blockId, action.targetObjectTypeId, action.type, action.id);
          }
        }
      }} 
      onContextMenu={(e) => onContextMenu(e, blockId, action.id)}
      className={`logic-item-hover ${isSelected ? 'selected' : ''}`}
      style={{ opacity: (draggedLogicItem?.itemId === action.id) ? 0.3 : 1, width: '100%' }}
    >
      <LogicItemContent item={action} def={def} project={project} type="action" searchTerm={searchTerm} isSelected={isSelected} />
    </div>
  );
};
