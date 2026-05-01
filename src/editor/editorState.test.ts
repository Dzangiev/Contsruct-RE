import { describe, it, expect } from 'vitest';
import { createEmptyProject } from '../model/project';
import { 
  createInitialEditorState, 
  setActiveLayout, 
  setActiveLayer, 
  setSelectedInstances, 
  setTool, 
  setView 
} from './editorState';

describe('Editor State', () => {
  it('should initialize correctly from a project', () => {
    const project = createEmptyProject();
    const state = createInitialEditorState(project);
    
    expect(state.activeLayoutId).toBe(project.layouts[0].id);
    expect(state.activeLayerId).toBe(project.layouts[0].layers[0].id);
    expect(state.selectedInstanceIds).toEqual([]);
    expect(state.tool).toBe('select');
    expect(state.zoom).toBe(1);
  });

  it('should update active layout and clear selection', () => {
    const project = createEmptyProject();
    let state = createInitialEditorState(project);
    state = setSelectedInstances(state, ['inst1']);
    
    const newState = setActiveLayout(state, 'layout2', 'layer2');
    
    expect(newState.activeLayoutId).toBe('layout2');
    expect(newState.activeLayerId).toBe('layer2');
    expect(newState.selectedInstanceIds).toEqual([]);
    expect(state.selectedInstanceIds).toEqual(['inst1']); // Immutable
  });

  it('should update active layer', () => {
    const project = createEmptyProject();
    const state = createInitialEditorState(project);
    const newState = setActiveLayer(state, 'layer2');
    
    expect(newState.activeLayerId).toBe('layer2');
  });

  it('should update selected instances', () => {
    const project = createEmptyProject();
    const state = createInitialEditorState(project);
    const newState = setSelectedInstances(state, ['inst1', 'inst2']);
    
    expect(newState.selectedInstanceIds).toEqual(['inst1', 'inst2']);
  });

  it('should update tool and placement object type', () => {
    const project = createEmptyProject();
    const state = createInitialEditorState(project);
    
    const placeState = setTool(state, 'place', 'ot1');
    expect(placeState.tool).toBe('place');
    expect(placeState.placementObjectTypeId).toBe('ot1');
    
    const selectState = setTool(placeState, 'select');
    expect(selectState.tool).toBe('select');
    expect(selectState.placementObjectTypeId).toBe(null);
  });

  it('should update view transformation', () => {
    const project = createEmptyProject();
    const state = createInitialEditorState(project);
    const newState = setView(state, 2, 100, 200);
    
    expect(newState.zoom).toBe(2);
    expect(newState.panX).toBe(100);
    expect(newState.panY).toBe(200);
  });
});
