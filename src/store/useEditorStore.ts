import { create } from 'zustand';
import { Project, createEmptyProject, ObjectTypeKind, EventBlock } from '../model/project';
import { EditorState, createInitialEditorState, ToolType, ClipboardData } from '../editor/editorState';
import * as projectUpdates from '../model/projectUpdates';
import * as eventUpdates from '../model/eventUpdates';
import * as editorUpdates from '../editor/editorState';

interface EditorStore {
  project: Project;
  editorState: EditorState;
  
  // History
  history: Project[];
  historyIndex: number;
  pushHistory: (project: Project) => void;
  undo: () => void;
  redo: () => void;

  // Project Actions
  addLayout: (name: string) => void;
  renameLayout: (layoutId: string, newName: string) => void;
  addLayer: (layoutId: string, name: string) => void;
  updateLayer: (layoutId: string, layerId: string, updates: any) => void;
  moveLayer: (layoutId: string, layerId: string, direction: 'up' | 'down') => void;
  addObjectType: (name: string, kind: ObjectTypeKind) => void;
  updateObjectType: (objectTypeId: string, updates: any) => void;
  addInstance: (layoutId: string, objectTypeId: string, layerId: string, x: number, y: number, id?: string) => void;
  updateInstance: (layoutId: string, instanceId: string, updates: any) => void;
  removeInstance: (layoutId: string, instanceId: string) => void;
  addInstanceVariable: (objectTypeId: string, name: string, type: 'number' | 'string' | 'boolean', initialValue: any) => void;
  removeInstanceVariable: (objectTypeId: string, variableId: string) => void;

  // Event Sheet Actions
  addEventBlock: (eventSheetId: string, parentBlockId: string | null, type: 'event' | 'group' | 'comment' | 'variable') => void;
  updateEventBlock: (eventSheetId: string, blockId: string, updates: any) => void;
  removeEventBlock: (eventSheetId: string, blockId: string) => void;
  moveEventBlock: (eventSheetId: string, blockId: string, targetParentId: string | null, targetIndex: number) => void;
  addCondition: (eventSheetId: string, blockId: string, type: string, params?: any[], targetObjectTypeId?: string) => void;
  updateCondition: (eventSheetId: string, blockId: string, conditionId: string, updates: any) => void;
  removeCondition: (eventSheetId: string, blockId: string, conditionId: string) => void;
  moveCondition: (eventSheetId: string, sourceBlockId: string, conditionId: string, targetBlockId: string, targetIndex: number) => void;
  addAction: (eventSheetId: string, blockId: string, type: string, params?: any[], targetObjectTypeId?: string) => void;
  updateAction: (eventSheetId: string, blockId: string, actionId: string, updates: any) => void;
  removeAction: (eventSheetId: string, blockId: string, actionId: string) => void;
  moveAction: (eventSheetId: string, sourceBlockId: string, actionId: string, targetBlockId: string, targetIndex: number) => void;
  addKeyboardMovementTemplate: (eventSheetId: string, objectTypeId: string) => void;

  // Editor Actions
  setActiveLayout: (layoutId: string, layerId?: string) => void;
  setActiveLayer: (layerId: string) => void;
  setSelectedInstances: (instanceIds: string[]) => void;
  setSelectedObjectType: (objectTypeId: string | null) => void;
  setTool: (tool: ToolType, placementObjectTypeId?: string | null) => void;
  setView: (zoom: number, panX: number, panY: number) => void;
  setTab: (tab: 'layout' | 'eventSheet') => void;
  setPreviewMode: (previewMode: boolean) => void;
  setSelectedEventBlocks: (blockIds: string[]) => void;
  setSelectedLogicItems: (itemIds: string[]) => void;
  
  // Clipboard
  copySelected: () => void;
  cutSelected: () => void;
  pasteSelected: (eventSheetId: string, targetParentId: string | null) => void;
}

const initialProject = createEmptyProject();

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: initialProject,
  editorState: createInitialEditorState(initialProject),
  
  history: [initialProject],
  historyIndex: 0,

  pushHistory: (newProject) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newProject))); // Deep clone to be safe
    if (newHistory.length > 50) newHistory.shift(); // Limit history
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      set({ project: prev, historyIndex: historyIndex - 1 });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      set({ project: next, historyIndex: historyIndex + 1 });
    }
  },

  // Project Actions
  addLayout: (name) => {
    const next = projectUpdates.addLayout(get().project, name);
    set({ project: next });
    get().pushHistory(next);
  },
  renameLayout: (layoutId, newName) => {
    const next = projectUpdates.renameLayout(get().project, layoutId, newName);
    set({ project: next });
    get().pushHistory(next);
  },
  addLayer: (layoutId, name) => {
    const next = projectUpdates.addLayer(get().project, layoutId, name);
    set({ project: next });
    get().pushHistory(next);
  },
  updateLayer: (layoutId, layerId, updates) => {
    const next = projectUpdates.updateLayer(get().project, layoutId, layerId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  moveLayer: (layoutId, layerId, direction) => {
    const next = projectUpdates.moveLayer(get().project, layoutId, layerId, direction);
    set({ project: next });
    get().pushHistory(next);
  },
  addObjectType: (name, kind) => {
    const next = projectUpdates.addObjectType(get().project, name, kind);
    set({ project: next });
    get().pushHistory(next);
  },
  updateObjectType: (objectTypeId, updates) => {
    const next = projectUpdates.updateObjectType(get().project, objectTypeId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  addInstance: (layoutId, objectTypeId, layerId, x, y, id) => {
    const next = projectUpdates.addInstance(get().project, layoutId, objectTypeId, layerId, x, y, id);
    set({ project: next });
    get().pushHistory(next);
  },
  updateInstance: (layoutId, instanceId, updates) => {
    const next = projectUpdates.updateInstance(get().project, layoutId, instanceId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  removeInstance: (layoutId, instanceId) => {
    const next = projectUpdates.removeInstance(get().project, layoutId, instanceId);
    set({ project: next });
    get().pushHistory(next);
  },
  addInstanceVariable: (objectTypeId, name, type, initialValue) => {
    const next = projectUpdates.addInstanceVariable(get().project, objectTypeId, name, type, initialValue);
    set({ project: next });
    get().pushHistory(next);
  },
  removeInstanceVariable: (objectTypeId, variableId) => {
    const next = projectUpdates.removeInstanceVariable(get().project, objectTypeId, variableId);
    set({ project: next });
    get().pushHistory(next);
  },

  // Event Sheet Actions
  addEventBlock: (eventSheetId, parentBlockId, type) => {
    const next = eventUpdates.addEventBlock(get().project, eventSheetId, parentBlockId, type);
    set({ project: next });
    get().pushHistory(next);
  },
  updateEventBlock: (eventSheetId, blockId, updates) => {
    const next = eventUpdates.updateEventBlock(get().project, eventSheetId, blockId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  removeEventBlock: (eventSheetId, blockId) => {
    const next = eventUpdates.removeEventBlock(get().project, eventSheetId, blockId);
    set({ project: next });
    get().pushHistory(next);
  },
  moveEventBlock: (eventSheetId, blockId, targetParentId, targetIndex) => {
    const next = eventUpdates.moveEventBlock(get().project, eventSheetId, blockId, targetParentId, targetIndex);
    set({ project: next });
    get().pushHistory(next);
  },
  addCondition: (eventSheetId, blockId, type, params, targetObjectTypeId) => {
    const next = eventUpdates.addCondition(get().project, eventSheetId, blockId, type, params, targetObjectTypeId);
    set({ project: next });
    get().pushHistory(next);
  },
  updateCondition: (eventSheetId, blockId, conditionId, updates) => {
    const next = eventUpdates.updateCondition(get().project, eventSheetId, blockId, conditionId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  removeCondition: (eventSheetId, blockId, conditionId) => {
    const next = eventUpdates.removeCondition(get().project, eventSheetId, blockId, conditionId);
    set({ project: next });
    get().pushHistory(next);
  },
  moveCondition: (eventSheetId, sourceBlockId, conditionId, targetBlockId, targetIndex) => {
    const next = eventUpdates.moveCondition(get().project, eventSheetId, sourceBlockId, conditionId, targetBlockId, targetIndex);
    set({ project: next });
    get().pushHistory(next);
  },
  addAction: (eventSheetId, blockId, type, params, targetObjectTypeId) => {
    const next = eventUpdates.addAction(get().project, eventSheetId, blockId, type, params, targetObjectTypeId);
    set({ project: next });
    get().pushHistory(next);
  },
  updateAction: (eventSheetId, blockId, actionId, updates) => {
    const next = eventUpdates.updateAction(get().project, eventSheetId, blockId, actionId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  removeAction: (eventSheetId, blockId, actionId) => {
    const next = eventUpdates.removeAction(get().project, eventSheetId, blockId, actionId);
    set({ project: next });
    get().pushHistory(next);
  },
  moveAction: (eventSheetId, sourceBlockId, actionId, targetBlockId, targetIndex) => {
    const next = eventUpdates.moveAction(get().project, eventSheetId, sourceBlockId, actionId, targetBlockId, targetIndex);
    set({ project: next });
    get().pushHistory(next);
  },
  addKeyboardMovementTemplate: (eventSheetId, objectTypeId) => {
    const next = eventUpdates.addKeyboardMovementTemplate(get().project, eventSheetId, objectTypeId);
    set({ project: next });
    get().pushHistory(next);
  },

  // Editor Actions
  setActiveLayout: (layoutId, layerId) => set((state) => ({
    editorState: editorUpdates.setActiveLayout(state.editorState, layoutId, layerId)
  })),
  setActiveLayer: (layerId) => set((state) => ({
    editorState: editorUpdates.setActiveLayer(state.editorState, layerId)
  })),
  setSelectedInstances: (instanceIds) => set((state) => ({
    editorState: editorUpdates.setSelectedInstances(state.editorState, instanceIds)
  })),
  setSelectedObjectType: (objectTypeId) => set((state) => ({
    editorState: editorUpdates.setSelectedObjectType(state.editorState, objectTypeId)
  })),
  setTool: (tool, placementObjectTypeId) => set((state) => ({
    editorState: editorUpdates.setTool(state.editorState, tool, placementObjectTypeId)
  })),
  setView: (zoom, panX, panY) => set((state) => ({
    editorState: editorUpdates.setView(state.editorState, zoom, panX, panY)
  })),
  setTab: (tab) => set((state) => ({
    editorState: editorUpdates.setTab(state.editorState, tab)
  })),
  setPreviewMode: (previewMode) => set((state) => ({
    editorState: editorUpdates.setPreviewMode(state.editorState, previewMode)
  })),
  setSelectedEventBlocks: (blockIds) => set((state) => ({
    editorState: editorUpdates.setSelectedEventBlocks(state.editorState, blockIds)
  })),
  setSelectedLogicItems: (itemIds) => set((state) => ({
    editorState: editorUpdates.setSelectedLogicItems(state.editorState, itemIds)
  })),

  // Clipboard
  copySelected: () => {
    const { editorState, project } = get();
    const blockIds = editorState.selectedEventBlockIds;
    if (blockIds.length > 0) {
      const blocks: EventBlock[] = [];
      project.eventSheets.forEach(es => {
        const findBlocks = (list: EventBlock[]) => {
          list.forEach(b => {
            if (blockIds.includes(b.id)) blocks.push(b);
            findBlocks(b.children);
          });
        };
        findBlocks(es.events);
      });
      set({ editorState: { ...editorState, clipboard: { type: 'blocks', data: JSON.parse(JSON.stringify(blocks)) } } });
    }
  },
  cutSelected: () => {
    get().copySelected();
    const { editorState, project } = get();
    const blockIds = editorState.selectedEventBlockIds;
    let nextProject = project;
    project.eventSheets.forEach(es => {
      blockIds.forEach(id => {
        nextProject = eventUpdates.removeEventBlock(nextProject, es.id, id);
      });
    });
    set({ project: nextProject, editorState: { ...editorState, selectedEventBlockIds: [] } });
    get().pushHistory(nextProject);
  },
  pasteSelected: (eventSheetId, targetParentId) => {
    const { editorState, project } = get();
    const cb = editorState.clipboard;
    if (cb && cb.type === 'blocks') {
      const next = eventUpdates.pasteEventBlocks(project, eventSheetId, targetParentId, cb.data);
      set({ project: next });
      get().pushHistory(next);
    }
  }
}));
