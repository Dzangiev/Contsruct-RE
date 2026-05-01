import { Project } from '../model/project';

export function serializeProject(project: Project): string {
  return JSON.stringify(project, null, 2);
}

export function deserializeProject(json: string): Project {
  const project = JSON.parse(json) as Project;
  
  // In the future, we will add migration logic here
  // if (project.schemaVersion < CURRENT_SCHEMA_VERSION) { ... }
  
  return project;
}
