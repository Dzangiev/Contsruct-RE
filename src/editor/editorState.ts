import { Project } from '../model/project';

export type ToolType = 'select' | 'place' | 'pan';

export interface ClipboardData {
  type: 'blocks' | 'logicItems' | 'instances';
  data: any[];
}

export interface EditorState {
  activeLayoutId: string | null;
  activeLayerId: string | null;
  selectedInstanceIds: string[];
  tool: ToolType;
  zoom: number;
  panX: number;
  panY: number;
  placementObjectTypeId: string | null;
  selectedObjectTypeId: string | null;
  selectedFamilyId: string | null;
  currentTab: 'layout' | 'eventSheet';
  previewMode: boolean;
  selectedEventBlockIds: string[];
  selectedLogicItemIds: string[]; // for conditions or actions
  clipboard: ClipboardData | null;
  
  // Grid settings
  gridSizeW: number;
  gridSizeH: number;
  gridOffsetX: number;
  gridOffsetY: number;
  gridColor: string;
  gridOpacity: number;
  snapToGrid: boolean;
  showGrid: boolean;
  showRulers: boolean;
  mousePosition: { x: number, y: number };
  spriteEditor: { objectTypeId: string, isOpen: boolean } | null;
  tilemapEditor: { objectTypeId: string, isOpen: boolean } | null;
  gridSettingsDialogOpen: boolean;
  showWatchers: boolean;
  highlightedInstanceIds: string[];
  
  // Debugger / Runtime Sync
  runtimeState: {
    instances: any[];
    variables: Record<string, any>;
    fps: number;
  } | null;
}

/**
 * Creates the initial editor state based on the project.
 */
export function createInitialEditorState(project: Project): EditorState {
  const firstLayout = project.layouts[0] || null;
  const firstLayer = firstLayout?.layers[0] || null;

  return {
    activeLayoutId: firstLayout?.id || null,
    activeLayerId: firstLayer?.id || null,
    selectedInstanceIds: [],
    tool: 'select',
    zoom: 1,
    panX: 0,
    panY: 0,
    placementObjectTypeId: null,
    selectedObjectTypeId: null,
    selectedFamilyId: null,
    currentTab: 'layout',
    previewMode: false,
    selectedEventBlockIds: [],
    selectedLogicItemIds: [],
    clipboard: null,
    gridSizeW: 32,
    gridSizeH: 32,
    gridOffsetX: 0,
    gridOffsetY: 0,
    gridColor: '#ffffff',
    gridOpacity: 0.1,
    snapToGrid: true,
    showGrid: true,
    showRulers: false,
    mousePosition: { x: 0, y: 0 },
    spriteEditor: null,
    tilemapEditor: null,
    gridSettingsDialogOpen: false,
    showWatchers: true,
    highlightedInstanceIds: [],
    runtimeState: null,
  };
}

/**
 * Toggles the preview mode.
 */
export function setPreviewMode(state: EditorState, previewMode: boolean): EditorState {
  return {
    ...state,
    previewMode,
  };
}

/**
 * Changes the current editor tab.
 */
export function setTab(state: EditorState, tab: 'layout' | 'eventSheet'): EditorState {
  return {
    ...state,
    currentTab: tab,
  };
}

/**
 * Updates the active layout and optionally the active layer.
 * Clears selection when changing layouts.
 */
export function setActiveLayout(state: EditorState, layoutId: string, layerId?: string): EditorState {
  return {
    ...state,
    activeLayoutId: layoutId,
    activeLayerId: layerId !== undefined ? layerId : state.activeLayerId,
    selectedInstanceIds: [],
    selectedObjectTypeId: null,
    selectedFamilyId: null,
  };
}

/**
 * Updates the active layer within the current layout.
 */
export function setActiveLayer(state: EditorState, layerId: string): EditorState {
  return {
    ...state,
    activeLayerId: layerId,
  };
}

/**
 * Sets the currently selected instances.
 */
export function setSelectedInstances(state: EditorState, instanceIds: string[]): EditorState {
  return {
    ...state,
    selectedInstanceIds: instanceIds,
    selectedObjectTypeId: instanceIds.length > 0 ? null : state.selectedObjectTypeId,
  };
}

/**
 * Sets the currently selected object type.
 * Clears instance selection when selecting an object type.
 */
export function setSelectedObjectType(state: EditorState, objectTypeId: string | null): EditorState {
  return {
    ...state,
    selectedObjectTypeId: objectTypeId,
    selectedFamilyId: objectTypeId ? null : state.selectedFamilyId,
    selectedInstanceIds: objectTypeId ? [] : state.selectedInstanceIds,
  };
}

/**
 * Sets the currently selected family.
 */
export function setSelectedFamily(state: EditorState, familyId: string | null): EditorState {
  return {
    ...state,
    selectedFamilyId: familyId,
    selectedObjectTypeId: familyId ? null : state.selectedObjectTypeId,
    selectedInstanceIds: familyId ? [] : state.selectedInstanceIds,
  };
}

/**
 * Changes the active tool.
 */
export function setTool(
  state: EditorState,
  tool: ToolType,
  placementObjectTypeId: string | null = null
): EditorState {
  return {
    ...state,
    tool,
    placementObjectTypeId: tool === 'place' ? placementObjectTypeId : null,
  };
}

/**
 * Updates viewport transformation.
 */
export function setView(state: EditorState, zoom: number, panX: number, panY: number): EditorState {
  return {
    ...state,
    zoom,
    panX,
    panY,
  };
}

/**
 * Sets the currently selected event blocks.
 */
export function setSelectedEventBlocks(state: EditorState, blockIds: string[]): EditorState {
  return {
    ...state,
    selectedEventBlockIds: blockIds,
    selectedLogicItemIds: [],
  };
}

/**
 * Sets the currently selected logic items (conditions/actions).
 */
export function setSelectedLogicItems(state: EditorState, itemIds: string[]): EditorState {
  return {
    ...state,
    selectedLogicItemIds: itemIds,
    selectedEventBlockIds: [],
  };
}

/**
 * Updates grid settings.
 */
export function setGridSettings(
  state: EditorState, 
  gridSizeW?: number, 
  gridSizeH?: number,
  snapToGrid?: boolean, 
  showGrid?: boolean,
  gridOffsetX?: number,
  gridOffsetY?: number,
  gridColor?: string,
  gridOpacity?: number
): EditorState {
  return {
    ...state,
    gridSizeW: gridSizeW !== undefined ? gridSizeW : state.gridSizeW,
    gridSizeH: gridSizeH !== undefined ? gridSizeH : state.gridSizeH,
    gridOffsetX: gridOffsetX !== undefined ? gridOffsetX : state.gridOffsetX,
    gridOffsetY: gridOffsetY !== undefined ? gridOffsetY : state.gridOffsetY,
    gridColor: gridColor !== undefined ? gridColor : state.gridColor,
    gridOpacity: gridOpacity !== undefined ? gridOpacity : state.gridOpacity,
    snapToGrid: snapToGrid !== undefined ? snapToGrid : state.snapToGrid,
    showGrid: showGrid !== undefined ? showGrid : state.showGrid,
  };
}

/**
 * Updates ruler settings.
 */
export function setRulerSettings(
  state: EditorState,
  showRulers: boolean
): EditorState {
  return {
    ...state,
    showRulers,
  };
}
