import { EventBlock, Project } from '../../../model/project';
import { LogicDefinition } from '../../../model/definitions';

export interface EventBlockItemProps {
  eventSheetId: string;
  block: EventBlock;
  onOpenBrowser: (mode: 'condition' | 'action', blockId: string, targetObjectTypeId?: string, initialLogicTypeId?: string, editingItemId?: string) => void;
  onOpenParamEditor: (mode: 'condition' | 'action', blockId: string, itemId: string, def: any, params: any[], targetObjectTypeId?: string) => void;
  onOpenVariableEditor: (eventSheetId: string, blockId: string, variable: any) => void;
  onOpenFunctionEditor: (eventSheetId: string, block: EventBlock) => void;
  onOpenGroupDialog: (eventSheetId: string, blockId: string, block: EventBlock) => void;
  onContextMenu: (e: React.MouseEvent, blockId: string, logicItemId?: string) => void;
  draggedBlockId: string | null;
  setDraggedBlockId: (id: string | null) => void;
  draggedLogicItem: any;
  setDraggedLogicItem: (item: any) => void;
  depth?: number;
  searchTerm?: string;
  blockIndices: Map<string, number>;
}

export interface LogicItemProps {
  project: Project;
  eventSheetId: string;
  blockId: string;
  item: any;
  index: number;
  type: 'condition' | 'action';
  onOpenBrowser: any;
  onOpenParamEditor: any;
  onContextMenu: any;
  searchTerm: string;
  setDraggedLogicItem: any;
  draggedLogicItem: any;
}
