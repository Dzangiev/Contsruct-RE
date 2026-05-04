import { describe, it, expect } from 'vitest';
import { createEmptyProject, ObjectTypeKind } from './project';
import * as updates from './projectUpdates';

describe('Project Update Helpers', () => {
  it('should add a layout', () => {
    const project = createEmptyProject();
    const updated = updates.addLayout(project, 'New Layout');
    
    expect(updated.layouts.length).toBe(2);
    expect(updated.layouts[1].name).toBe('New_Layout');
    expect(updated.eventSheets.length).toBe(2);
    expect(updated.eventSheets[1].id).toBe(updated.layouts[1].eventSheetId);
    expect(updated).not.toBe(project); // Immutable
  });

  it('should rename a layout', () => {
    const project = createEmptyProject();
    const layoutId = project.layouts[0].id;
    const updated = updates.renameLayout(project, layoutId, 'Renamed');
    
    expect(updated.layouts[0].name).toBe('Renamed');
    expect(updated).not.toBe(project);
  });

  it('should add a layer', () => {
    const project = createEmptyProject();
    const layoutId = project.layouts[0].id;
    const updated = updates.addLayer(project, layoutId, 'Background');
    
    expect(updated.layouts[0].layers.length).toBe(2);
    expect(updated.layouts[0].layers[1].name).toBe('Background');
  });

  it('should update a layer', () => {
    const project = createEmptyProject();
    const layoutId = project.layouts[0].id;
    const layerId = project.layouts[0].layers[0].id;
    const updated = updates.updateLayer(project, layoutId, layerId, { opacity: 0.5, locked: true });
    
    expect(updated.layouts[0].layers[0].opacity).toBe(0.5);
    expect(updated.layouts[0].layers[0].locked).toBe(true);
  });

  it('should add an object type', () => {
    const project = createEmptyProject();
    const updated = updates.addObjectType(project, 'Player', ObjectTypeKind.Sprite);
    
    expect(updated.objectTypes.length).toBe(1);
    expect(updated.objectTypes[0].name).toBe('Player');
  });

  it('should update an object type', () => {
    const project = createEmptyProject();
    const withOT = updates.addObjectType(project, 'Player', ObjectTypeKind.Sprite);
    const otId = withOT.objectTypes[0].id;
    const updated = updates.updateObjectType(withOT, otId, { defaultWidth: 128 });
    
    expect(updated.objectTypes[0].defaultWidth).toBe(128);
  });

  it('should add an instance', () => {
    const project = createEmptyProject();
    const withOT = updates.addObjectType(project, 'Player', ObjectTypeKind.Sprite);
    const otId = withOT.objectTypes[0].id;
    const layoutId = withOT.layouts[0].id;
    const layerId = withOT.layouts[0].layers[0].id;
    
    const updated = updates.addInstance(withOT, layoutId, otId, layerId, 100, 200);
    
    expect(updated.layouts[0].instances.length).toBe(1);
    expect(updated.layouts[0].instances[0].objectTypeId).toBe(otId);
    expect(updated.layouts[0].instances[0].x).toBe(100);
    expect(updated.layouts[0].instances[0].y).toBe(200);
  });

  it('should update an instance', () => {
    const project = createEmptyProject();
    const withOT = updates.addObjectType(project, 'Player', ObjectTypeKind.Sprite);
    const withInst = updates.addInstance(
      withOT,
      withOT.layouts[0].id,
      withOT.objectTypes[0].id,
      withOT.layouts[0].layers[0].id,
      0, 0
    );
    const instId = withInst.layouts[0].instances[0].id;
    
    const updated = updates.updateInstance(withInst, withInst.layouts[0].id, instId, { x: 50 });
    
    expect(updated.layouts[0].instances[0].x).toBe(50);
  });

  it('should remove an instance', () => {
    const project = createEmptyProject();
    const withOT = updates.addObjectType(project, 'Player', ObjectTypeKind.Sprite);
    const withInst = updates.addInstance(
      withOT,
      withOT.layouts[0].id,
      withOT.objectTypes[0].id,
      withOT.layouts[0].layers[0].id,
      0, 0
    );
    const instId = withInst.layouts[0].instances[0].id;
    
    const updated = updates.removeInstance(withInst, withInst.layouts[0].id, instId);
    
    expect(updated.layouts[0].instances.length).toBe(0);
  });
});
