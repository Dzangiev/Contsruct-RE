import { create } from 'zustand';
import { Project, createEmptyProject, ObjectTypeKind, EventBlock, Condition, Action } from '../model/project';
import { EditorState, createInitialEditorState, ToolType, ClipboardData } from '../editor/editorState';
import * as projectUpdates from '../model/projectUpdates';
import * as eventUpdates from '../model/eventUpdates';
import * as editorUpdates from '../editor/editorState';
import { generateId } from '../utils/id';

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
  addObjectType: (name: string, kind: ObjectTypeKind, id?: string) => void;
  updateObjectType: (objectTypeId: string, updates: any) => void;
  addInstance: (layoutId: string, objectTypeId: string, layerId: string, x: number, y: number, id?: string) => void;
  cloneInstance: (layoutId: string, instanceId: string) => void;
  updateInstance: (layoutId: string, instanceId: string, updates: any) => void;
  updateInstanceSilently: (layoutId: string, instanceId: string, updates: any) => void;
  removeInstance: (layoutId: string, instanceId: string) => void;
  reorderInstance: (layoutId: string, instanceId: string, direction: 'front' | 'back' | 'forward' | 'backward') => void;
  addInstanceVariable: (objectTypeId: string, name: string, type: 'number' | 'string' | 'boolean', initialValue: any) => void;
  updateInstanceVariable: (objectTypeId: string, variableId: string, updates: any) => void;
  removeInstanceVariable: (objectTypeId: string, variableId: string) => void;
  addBehavior: (objectTypeId: string, type: string, name: string, defaultProperties?: Record<string, any>) => void;
  removeBehavior: (objectTypeId: string, behaviorId: string) => void;
  updateBehavior: (objectTypeId: string, behaviorId: string, updates: any) => void;
  updateLayout: (layoutId: string, updates: any) => void;
  updateProjectSettings: (updates: any) => void;

  // Event Sheet Actions
  addEventBlock: (eventSheetId: string, parentBlockId: string | null, type: 'event' | 'group' | 'comment' | 'variable' | 'function' | 'include') => string;
  updateEventBlock: (eventSheetId: string, blockId: string, updates: any) => void;
  removeEventBlock: (eventSheetId: string, blockId: string) => void;
  moveEventBlock: (eventSheetId: string, blockId: string, targetParentId: string | null, targetIndex: number, afterBlockId?: string, beforeBlockId?: string) => void;
  addCondition: (eventSheetId: string, blockId: string, type: string, params?: any[], targetObjectTypeId?: string) => void;
  updateCondition: (eventSheetId: string, blockId: string, conditionId: string, updates: any) => void;
  removeCondition: (eventSheetId: string, blockId: string, conditionId: string) => void;
  moveCondition: (eventSheetId: string, sourceBlockId: string, conditionId: string, targetBlockId: string, targetIndex: number) => void;
  addAction: (eventSheetId: string, blockId: string, type: string, params?: any[], targetObjectTypeId?: string) => void;
  updateAction: (eventSheetId: string, blockId: string, actionId: string, updates: any) => void;
  removeAction: (eventSheetId: string, blockId: string, actionId: string) => void;
  moveAction: (eventSheetId: string, sourceBlockId: string, actionId: string, targetBlockId: string, targetIndex: number) => void;
  addKeyboardMovementTemplate: (eventSheetId: string, objectTypeId: string) => void;
  toggleConditionInverted: (eventSheetId: string, blockId: string, conditionId: string) => void;
  toggleOrBlock: (eventSheetId: string, blockId: string) => void;

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
  setGridSettings: (gridSizeW?: number, gridSizeH?: number, snapToGrid?: boolean, showGrid?: boolean) => void;
  setGridSettingsDialogOpen: (isOpen: boolean) => void;
  setRulerSettings: (showRulers: boolean) => void;
  setMousePosition: (x: number, y: number) => void;
  
  // Sprite Editor
  openSpriteEditor: (objectTypeId: string) => void;
  closeSpriteEditor: () => void;
  
  // Clipboard
  copySelected: () => void;
  cutSelected: () => void;
  pasteSelected: (eventSheetId: string, targetParentId: string | null) => void;
  pasteLogicItem: (eventSheetId: string, targetBlockId: string, targetIndex: number) => void;
  pasteInstances: () => void;
  
  // History
  commitProject: () => void;

  // Dialogs
  showDialog: (options: { title: string, message?: string, type: 'prompt' | 'confirm' | 'alert', defaultValue?: string }) => Promise<string | boolean | undefined>;
  closeDialog: () => void;
  dialogState: { isOpen: boolean, title: string, message?: string, type: 'prompt' | 'confirm' | 'alert', defaultValue?: string, resolve: (val: any) => void } | null;
}

const initialProject = createEmptyProject();

export const useEditorStore = create<EditorStore>((set, get) => ({
  project: initialProject,
  editorState: {
    ...createInitialEditorState(initialProject),
    spriteEditor: null
  },
  
  history: [initialProject],
  historyIndex: 0,

  pushHistory: (newProject) => {
    const { history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newProject))); 
    if (newHistory.length > 50) newHistory.shift(); 
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
  addObjectType: (name, kind, id) => {
    const next = projectUpdates.addObjectType(get().project, name, kind, id);
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
  cloneInstance: (layoutId, instanceId) => {
    const layout = get().project.layouts.find(l => l.id === layoutId);
    const source = layout?.instances.find(i => i.id === instanceId);
    if (source) {
      const newId = generateId();
      const next = projectUpdates.addInstance(get().project, layoutId, source.objectTypeId, source.layerId, source.x + 32, source.y + 32, newId);
      set({ project: next });
      get().pushHistory(next);
    }
  },
  updateInstance: (layoutId, instanceId, updates) => {
    const next = projectUpdates.updateInstance(get().project, layoutId, instanceId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  updateInstanceSilently: (layoutId, instanceId, updates) => {
    const next = projectUpdates.updateInstance(get().project, layoutId, instanceId, updates);
    set({ project: next });
  },
  removeInstance: (layoutId, instanceId) => {
    const next = projectUpdates.removeInstance(get().project, layoutId, instanceId);
    set({ project: next });
    get().pushHistory(next);
  },
  reorderInstance: (layoutId, instanceId, direction) => {
    const next = projectUpdates.reorderInstance(get().project, layoutId, instanceId, direction);
    set({ project: next });
    get().pushHistory(next);
  },
  addInstanceVariable: (objectTypeId, name, type, initialValue) => {
    const next = projectUpdates.addInstanceVariable(get().project, objectTypeId, name, type, initialValue);
    set({ project: next });
    get().pushHistory(next);
  },
  updateInstanceVariable: (objectTypeId, variableId, updates) => {
    const next = projectUpdates.updateInstanceVariable(get().project, objectTypeId, variableId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  removeInstanceVariable: (objectTypeId, variableId) => {
    const next = projectUpdates.removeInstanceVariable(get().project, objectTypeId, variableId);
    set({ project: next });
    get().pushHistory(next);
  },
  addBehavior: (objectTypeId, type, name, defaultProperties) => {
    const next = projectUpdates.addBehavior(get().project, objectTypeId, type, name, defaultProperties);
    set({ project: next });
    get().pushHistory(next);
  },
  removeBehavior: (objectTypeId, behaviorId) => {
    const next = projectUpdates.removeBehavior(get().project, objectTypeId, behaviorId);
    set({ project: next });
    get().pushHistory(next);
  },
  updateBehavior: (objectTypeId, behaviorId, updates) => {
    const next = projectUpdates.updateBehavior(get().project, objectTypeId, behaviorId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  updateLayout: (layoutId, updates) => {
    const next = projectUpdates.updateLayout(get().project, layoutId, updates);
    set({ project: next });
    get().pushHistory(next);
  },
  updateProjectSettings: (updates) => {
    const next = projectUpdates.updateProjectSettings(get().project, updates);
    set({ project: next });
    get().pushHistory(next);
  },

  // Event Sheet Actions
  addEventBlock: (eventSheetId, parentBlockId, type) => {
    const blockId = generateId();
    const next = eventUpdates.addEventBlock(get().project, eventSheetId, parentBlockId, type, blockId);
    set({ project: next });
    get().pushHistory(next);
    return blockId;
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
  moveEventBlock: (eventSheetId, blockId, targetParentId, targetIndex, afterBlockId, beforeBlockId) => {
    const next = eventUpdates.moveEventBlock(get().project, eventSheetId, blockId, targetParentId, targetIndex, afterBlockId, beforeBlockId);
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
  toggleConditionInverted: (eventSheetId, blockId, conditionId) => {
    const { project } = get();
    const es = project.eventSheets.find(s => s.id === eventSheetId);
    const findCond = (blocks: EventBlock[]): any => {
      for (const b of blocks) {
        if (b.id === blockId) return b.conditions.find(c => c.id === conditionId);
        const f = findCond(b.children);
        if (f) return f;
      }
    };
    const cond = es ? findCond(es.events) : null;
    if (cond) {
      const next = eventUpdates.updateCondition(project, eventSheetId, blockId, conditionId, { inverted: !cond.inverted });
      set({ project: next });
      get().pushHistory(next);
    }
  },
  toggleOrBlock: (eventSheetId, blockId) => {
    const { project } = get();
    const es = project.eventSheets.find(s => s.id === eventSheetId);
    const findBlock = (blocks: EventBlock[]): EventBlock | undefined => {
      for (const b of blocks) {
        if (b.id === blockId) return b;
        const f = findBlock(b.children);
        if (f) return f;
      }
    };
    const block = es ? findBlock(es.events) : null;
    if (block) {
      const next = eventUpdates.updateEventBlock(project, eventSheetId, blockId, { isOrBlock: !block.isOrBlock });
      set({ project: next });
      get().pushHistory(next);
    }
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
  setGridSettings: (gridSizeW, gridSizeH, snapToGrid, showGrid) => {
    set(state => ({ editorState: editorUpdates.setGridSettings(state.editorState, gridSizeW, gridSizeH, snapToGrid, showGrid) }));
  },
  setGridSettingsDialogOpen: (isOpen) => set((state) => ({
    editorState: { ...state.editorState, gridSettingsDialogOpen: isOpen }
  })),
  setRulerSettings: (showRulers) => set((state) => ({
    editorState: editorUpdates.setRulerSettings(state.editorState, showRulers)
  })),
  setMousePosition: (x, y) => set((state) => ({
    editorState: { ...state.editorState, mousePosition: { x, y } }
  })),

  // Clipboard
  copySelected: () => {
    const { editorState, project } = get();
    const { selectedInstanceIds, activeLayoutId, selectedEventBlockIds: blockIds, selectedLogicItemIds: logicIds } = editorState;
    
    if (selectedInstanceIds.length > 0 && activeLayoutId) {
      const layout = project.layouts.find(l => l.id === activeLayoutId);
      if (layout) {
        const instances = layout.instances.filter(i => selectedInstanceIds.includes(i.id));
        set({ editorState: { ...editorState, clipboard: { type: 'instances', data: JSON.parse(JSON.stringify(instances)) } } });
      }
    } else if (blockIds.length > 0) {
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
    } else if (logicIds.length > 0) {
      const items: any[] = [];
      project.eventSheets.forEach(es => {
        const findLogic = (list: EventBlock[]) => {
          list.forEach(b => {
            logicIds.forEach(lId => {
              const [blockId, itemId] = lId.split(':');
              if (b.id === blockId) {
                const c = b.conditions.find(c => c.id === itemId);
                if (c) items.push({ type: 'condition', data: c });
                const a = b.actions.find(a => a.id === itemId);
                if (a) items.push({ type: 'action', data: a });
              }
            });
            findLogic(b.children);
          });
        };
        findLogic(es.events);
      });
      set({ editorState: { ...editorState, clipboard: { type: 'logicItems', data: JSON.parse(JSON.stringify(items)) } } });
    }
  },
  cutSelected: () => {
    get().copySelected();
    const { editorState, project } = get();
    const { selectedInstanceIds, activeLayoutId, selectedEventBlockIds: blockIds, selectedLogicItemIds: logicIds } = editorState;
    let nextProject = project;
    
    if (selectedInstanceIds.length > 0 && activeLayoutId) {
      selectedInstanceIds.forEach(id => {
        nextProject = projectUpdates.removeInstance(nextProject, activeLayoutId, id);
      });
      set({ project: nextProject, editorState: { ...editorState, selectedInstanceIds: [] } });
    } else {
      project.eventSheets.forEach(es => {
        blockIds.forEach(id => { nextProject = eventUpdates.removeEventBlock(nextProject, es.id, id); });
        logicIds.forEach(lId => {
          const [blockId, itemId] = lId.split(':');
          nextProject = eventUpdates.removeCondition(nextProject, es.id, blockId, itemId);
          nextProject = eventUpdates.removeAction(nextProject, es.id, blockId, itemId);
        });
      });
      set({ project: nextProject, editorState: { ...editorState, selectedEventBlockIds: [], selectedLogicItemIds: [] } });
    }
    get().pushHistory(nextProject);
  },
  pasteSelected: (eventSheetId, targetParentId) => {
    const { editorState, project } = get();
    const cb = editorState.clipboard;
    if (cb && cb.type === 'blocks') {
      const next = eventUpdates.pasteEventBlocks(project, eventSheetId, targetParentId, cb.data);
      set({ project: next });
      get().pushHistory(next);
    } else if (cb && cb.type === 'instances' && editorState.activeLayoutId && editorState.activeLayerId) {
      const { project: next, newIds } = projectUpdates.pasteInstances(project, editorState.activeLayoutId, editorState.activeLayerId, cb.data);
      set({ project: next, editorState: { ...editorState, selectedInstanceIds: newIds } });
      get().pushHistory(next);
    }
  },
  pasteLogicItem: (eventSheetId, targetBlockId, targetIndex) => {
    const { editorState, project } = get();
    const cb = editorState.clipboard;
    if (cb && cb.type === 'logicItems') {
      let nextProject = project;
      cb.data.forEach((item: any) => {
        const cloned = { ...item.data, id: generateId() };
        if (item.type === 'condition') {
          nextProject = eventUpdates.addCondition(nextProject, eventSheetId, targetBlockId, cloned.type, cloned.params, cloned.targetObjectTypeId);
        } else {
          nextProject = eventUpdates.addAction(nextProject, eventSheetId, targetBlockId, cloned.type, cloned.params, cloned.targetObjectTypeId);
        }
      });
      set({ project: nextProject });
      get().pushHistory(nextProject);
    }
  },
  pasteInstances: () => {
    const { editorState, project } = get();
    const cb = editorState.clipboard;
    if (cb && cb.type === 'instances' && editorState.activeLayoutId && editorState.activeLayerId) {
      const { project: next, newIds } = projectUpdates.pasteInstances(project, editorState.activeLayoutId, editorState.activeLayerId, cb.data);
      set({ project: next, editorState: { ...editorState, selectedInstanceIds: newIds } });
      get().pushHistory(next);
    }
  },
  
  // Sprite Editor
  openSpriteEditor: (objectTypeId) => set((state) => ({
    editorState: { ...state.editorState, spriteEditor: { objectTypeId, isOpen: true } }
  })),
  closeSpriteEditor: () => set((state) => ({
    editorState: { ...state.editorState, spriteEditor: null }
  })),
 
  commitProject: () => {
    get().pushHistory(get().project);
  },

  dialogState: null,
  showDialog: (options) => {
    return new Promise((resolve) => {
      set({ dialogState: { ...options, isOpen: true, resolve } });
    });
  },
  closeDialog: () => {
    const { dialogState } = get();
    if (dialogState) {
      dialogState.resolve(undefined);
      set({ dialogState: null });
    }
  }
}));
