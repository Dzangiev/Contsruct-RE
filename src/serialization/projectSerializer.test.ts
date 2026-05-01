import { describe, it, expect } from 'vitest';
import { createEmptyProject } from '../model/project';
import { serializeProject, deserializeProject } from './projectSerializer';

describe('Project Serializer', () => {
  it('should serialize and deserialize a project correctly', () => {
    const project = createEmptyProject('Serialization Test');
    const json = serializeProject(project);
    const deserialized = deserializeProject(json);

    expect(deserialized).toEqual(project);
    expect(deserialized.settings.name).toBe('Serialization Test');
  });
});
