import { describe, it, expect } from 'vitest';
import { createEmptyProject, SCHEMA_VERSION } from './project';

describe('Project Model', () => {
  it('should create an empty project with default values', () => {
    const projectName = 'Test Project';
    const project = createEmptyProject(projectName);

    expect(project.schemaVersion).toBe(SCHEMA_VERSION);
    expect(project.settings.name).toBe(projectName);
    expect(project.layouts.length).toBe(1);
    expect(project.layouts[0].name).toBe('Layout 1');
    expect(project.layouts[0].layers.length).toBe(1);
    expect(project.layouts[0].layers[0].name).toBe('Layer 0');
    expect(project.eventSheets.length).toBe(1);
    expect(project.eventSheets[0].id).toBe(project.layouts[0].eventSheetId);
  });

  it('should be JSON serializable', () => {
    const project = createEmptyProject();
    const json = JSON.stringify(project);
    const parsed = JSON.parse(json);

    expect(parsed).toEqual(project);
  });
});
