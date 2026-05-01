import { create } from 'zustand';
import { Project, createEmptyProject, ObjectTypeKind } from '../model/project';
import { EditorState, createInitialEditorState, ToolType } from '../editor/editorState';
import * as projectUpdates from '../model/projectUpdates';
import * as eventUpdates from '../model/eventUpdates';
import * as editorUpdates from '../editor/editorState';

interface EditorStore {
  project: Project;
  editorState: EditorState;

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

  // Event Sheet Actions
  addEventBlock: (eventSheetId: string, parentBlockId: string | null, type: 'event' | 'group' | 'comment' | 'variable') => void;
  updateEventBlock: (eventSheetId: string, blockId: string, updates: any) => void;
  removeEventBlock: (eventSheetId: string, blockId: string) => void;
  addCondition: (eventSheetId: string, blockId: string, type: string, params?: any[], targetObjectTypeId?: string) => void;
  updateCondition: (eventSheetId: string, blockId: string, conditionId: string, updates: any) => void;
  removeCondition: (eventSheetId: string, blockId: string, conditionId: string) => void;
  addAction: (eventSheetId: string, blockId: string, type: string, params?: any[], targetObjectTypeId?: string) => void;
  updateAction: (eventSheetId: string, blockId: string, actionId: string, updates: any) => void;
  removeAction: (eventSheetId: string, blockId: string, actionId: string) => void;
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
}

const initialProject = createEmptyProject();

export const useEditorStore = create<EditorStore>((set) => ({
  project: initialProject,
  editorState: createInitialEditorState(initialProject),

  // Project Actions
  addLayout: (name) => set((state) => ({
    project: projectUpdates.addLayout(state.project, name)
  })),
  renameLayout: (layoutId, newName) => set((state) => ({
    project: projectUpdates.renameLayout(state.project, layoutId, newName)
  })),
  addLayer: (layoutId, name) => set((state) => ({
    project: projectUpdates.addLayer(state.project, layoutId, name)
  })),
  updateLayer: (layoutId, layerId, updates) => set((state) => ({
    project: projectUpdates.updateLayer(state.project, layoutId, layerId, updates)
  })),
  moveLayer: (layoutId, layerId, direction) => set((state) => ({
    project: projectUpdates.moveLayer(state.project, layoutId, layerId, direction)
  })),
  addObjectType: (name, kind) => set((state) => ({
    project: projectUpdates.addObjectType(state.project, name, kind)
  })),
  updateObjectType: (objectTypeId, updates) => set((state) => ({
    project: projectUpdates.updateObjectType(state.project, objectTypeId, updates)
  })),
  addInstance: (layoutId, objectTypeId, layerId, x, y, id) => set((state) => ({
    project: projectUpdates.addInstance(state.project, layoutId, objectTypeId, layerId, x, y, id)
  })),
  updateInstance: (layoutId, instanceId, updates) => set((state) => ({
    project: projectUpdates.updateInstance(state.project, layoutId, instanceId, updates)
  })),
  removeInstance: (layoutId, instanceId) => set((state) => ({
    project: projectUpdates.removeInstance(state.project, layoutId, instanceId)
  })),

  // Event Sheet Actions
  addEventBlock: (eventSheetId, parentBlockId, type) => set((state) => ({
    project: eventUpdates.addEventBlock(state.project, eventSheetId, parentBlockId, type)
  })),
  updateEventBlock: (eventSheetId, blockId, updates) => set((state) => ({
    project: eventUpdates.updateEventBlock(state.project, eventSheetId, blockId, updates)
  })),
  removeEventBlock: (eventSheetId, blockId) => set((state) => ({
    project: eventUpdates.removeEventBlock(state.project, eventSheetId, blockId)
  })),
  addCondition: (eventSheetId, blockId, type, params, targetObjectTypeId) => set((state) => ({
    project: eventUpdates.addCondition(state.project, eventSheetId, blockId, type, params, targetObjectTypeId)
  })),
  updateCondition: (eventSheetId, blockId, conditionId, updates) => set((state) => ({
    project: eventUpdates.updateCondition(state.project, eventSheetId, blockId, conditionId, updates)
  })),
  removeCondition: (eventSheetId, blockId, conditionId) => set((state) => ({
    project: eventUpdates.removeCondition(state.project, eventSheetId, blockId, conditionId)
  })),
  addAction: (eventSheetId, blockId, type, params, targetObjectTypeId) => set((state) => ({
    project: eventUpdates.addAction(state.project, eventSheetId, blockId, type, params, targetObjectTypeId)
  })),
  updateAction: (eventSheetId, blockId, actionId, updates) => set((state) => ({
    project: eventUpdates.updateAction(state.project, eventSheetId, blockId, actionId, updates)
  })),
  removeAction: (eventSheetId, blockId, actionId) => set((state) => ({
    project: eventUpdates.removeAction(state.project, eventSheetId, blockId, actionId)
  })),
  addKeyboardMovementTemplate: (eventSheetId, objectTypeId) => set((state) => ({
    project: eventUpdates.addKeyboardMovementTemplate(state.project, eventSheetId, objectTypeId)
  })),

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
}));
