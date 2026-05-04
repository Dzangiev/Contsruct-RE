import { Project, Layout, Layer, ObjectType, Instance, ObjectTypeKind, EventSheet, Behavior, InstanceVariable, Family, ProjectFolder } from './project';
import { PLUGIN_DEFINITIONS } from './definitions';
import { generateId } from '../utils/id';
import { syncObjectTypeRenaming, syncInstanceVariableRenaming } from './eventUpdates';

/**
 * Adds a new layout to the project.
 */
export function addLayout(project: Project, name: string): Project {
  const layoutId = generateId();
  const layerId = generateId();
  const eventSheetId = generateId();
  
  const newLayout: Layout = {
    id: layoutId,
    name,
    width: 1708,
    height: 960,
    layers: [{
      id: layerId,
      name: 'Layer 0',
      visible: true,
      locked: false,
      opacity: 1,
      parallaxX: 1,
      parallaxY: 1,
    }],
    instances: [],
    eventSheetId,
  };

  const newEventSheet: EventSheet = {
    id: eventSheetId,
    name: `${name} events`,
    events: [],
    includes: [],
  };

  return {
    ...project,
    layouts: [...project.layouts, newLayout],
    eventSheets: [...project.eventSheets, newEventSheet],
  };
}

/**
 * Renames an existing layout.
 */
export function renameLayout(project: Project, layoutId: string, newName: string): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => l.id === layoutId ? { ...l, name: newName } : l),
  };
}

/**
 * Adds a new layer to a specific layout.
 */
export function addLayer(project: Project, layoutId: string, name: string): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      const newLayer: Layer = {
        id: generateId(),
        name,
        visible: true,
        locked: false,
        opacity: 1,
        parallaxX: 1,
        parallaxY: 1,
      };
      return { ...l, layers: [...l.layers, newLayer] };
    }),
  };
}

/**
 * Updates properties of a layer.
 */
export function updateLayer(
  project: Project,
  layoutId: string,
  layerId: string,
  updates: Partial<Omit<Layer, 'id'>>
): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      return {
        ...l,
        layers: l.layers.map(layer => layer.id === layerId ? { ...layer, ...updates } : layer),
      };
    }),
  };
}

/**
 * Adds a new object type to the project.
 */
export function addObjectType(project: Project, name: string, kind: ObjectTypeKind, id: string = generateId()): Project {
  const pluginDef = PLUGIN_DEFINITIONS.find(p => p.kind === kind);
  const defaultWidth = pluginDef?.defaultWidth ?? 64;
  const defaultHeight = pluginDef?.defaultHeight ?? 64;
  const properties: Record<string, any> = {};

  if (pluginDef) {
    pluginDef.propertyDefinitions.forEach(p => {
      properties[p.name] = p.defaultValue;
    });
  }

  const newObjectType: ObjectType = {
    id,
    name,
    kind,
    pluginId: kind,
    defaultWidth,
    defaultHeight,
    properties,
    instanceVariables: [],
    behaviors: [],
    animations: kind === ObjectTypeKind.Sprite ? [{
      id: generateId(),
      name: 'Animation 1',
      speed: 5,
      loop: true,
      repeatCount: 0,
      frames: [{
        id: generateId(),
        assetId: '', // Empty initially
        duration: 1,
        originX: 0.5,
        originY: 0.5,
        imagePoints: []
      }]
    }] : []
  };
  return {
    ...project,
    objectTypes: [...project.objectTypes, newObjectType],
  };
}

/**
 * Updates an instance variable definition.
 */
export function updateInstanceVariable(
  project: Project,
  objectTypeId: string,
  variableId: string,
  updates: Partial<Omit<InstanceVariable, 'id'>>
): Project {
  const ot = project.objectTypes.find(o => o.id === objectTypeId);
  if (!ot) return project;
  
  const oldVar = ot.instanceVariables.find(v => v.id === variableId);
  if (!oldVar) return project;

  const newVarName = updates.name;
  const oldVarName = oldVar.name;

  // 1. Update Project Data (Object Type and Instance Properties)
  let updatedProject = {
    ...project,
    objectTypes: project.objectTypes.map(o => {
      if (o.id !== objectTypeId) return o;
      return {
        ...o,
        instanceVariables: o.instanceVariables.map(v => v.id === variableId ? { ...v, ...updates } : v)
      };
    }),
    layouts: project.layouts.map(l => ({
      ...l,
      instances: l.instances.map(inst => {
        if (inst.objectTypeId !== objectTypeId) return inst;
        const nextProps = { ...inst.properties };
        if (newVarName && oldVarName in nextProps) {
          nextProps[newVarName] = nextProps[oldVarName];
          delete nextProps[oldVarName];
        }
        return { ...inst, properties: nextProps };
      })
    }))
  };

  // 2. Sync Logic (Expressions)
  if (newVarName && newVarName !== oldVarName) {
    updatedProject = syncInstanceVariableRenaming(updatedProject, ot.name, oldVarName, newVarName);
  }

  return updatedProject;
}

/**
 * Updates properties of an object type.
 */
export function addInstanceVariable(
  project: Project,
  objectTypeId: string,
  name: string,
  type: 'number' | 'string' | 'boolean',
  initialValue: any
): Project {
  return {
    ...project,
    objectTypes: project.objectTypes.map(ot => {
      if (ot.id !== objectTypeId) return ot;
      return {
        ...ot,
        instanceVariables: [
          ...ot.instanceVariables,
          { id: generateId(), name, type, initialValue }
        ]
      };
    })
  };
}

/**
 * Removes an instance variable from an object type.
 */
export function removeInstanceVariable(
  project: Project,
  objectTypeId: string,
  variableId: string
): Project {
  return {
    ...project,
    objectTypes: project.objectTypes.map(ot => {
      if (ot.id !== objectTypeId) return ot;
      return {
        ...ot,
        instanceVariables: ot.instanceVariables.filter(v => v.id !== variableId)
      };
    })
  };
}

/**
 * Updates properties of an object type.
 */
export function updateObjectType(
  project: Project,
  objectTypeId: string,
  updates: Partial<Omit<ObjectType, 'id'>>
): Project {
  const oldOt = project.objectTypes.find(o => o.id === objectTypeId);
  const oldName = oldOt?.name;
  const newName = updates.name;

  let updatedProject = {
    ...project,
    objectTypes: project.objectTypes.map(ot => ot.id === objectTypeId ? { ...ot, ...updates } : ot),
  };

  if (oldName && newName && oldName !== newName) {
    updatedProject = syncObjectTypeRenaming(updatedProject, oldName, newName);
  }

  return updatedProject;
}

/**
 * Adds a behavior to an object type.
 */
export function addBehavior(
  project: Project,
  objectTypeId: string,
  type: string,
  name: string,
  defaultProperties: Record<string, any> = {}
): Project {
  return {
    ...project,
    objectTypes: project.objectTypes.map(ot => {
      if (ot.id !== objectTypeId) return ot;
      return {
        ...ot,
        behaviors: [
          ...ot.behaviors,
          { id: generateId(), type, name, properties: { ...defaultProperties }, disabled: false }
        ]
      };
    })
  };
}

/**
 * Removes a behavior from an object type.
 */
export function removeBehavior(project: Project, objectTypeId: string, behaviorId: string): Project {
  return {
    ...project,
    objectTypes: project.objectTypes.map(ot => {
      if (ot.id !== objectTypeId) return ot;
      return {
        ...ot,
        behaviors: ot.behaviors.filter(b => b.id !== behaviorId)
      };
    })
  };
}

/**
 * Updates properties of a behavior.
 */
export function updateBehavior(
  project: Project,
  objectTypeId: string,
  behaviorId: string,
  updates: Partial<Omit<Behavior, 'id' | 'type'>>
): Project {
  return {
    ...project,
    objectTypes: project.objectTypes.map(ot => {
      if (ot.id !== objectTypeId) return ot;
      return {
        ...ot,
        behaviors: ot.behaviors.map(b => b.id === behaviorId ? { ...b, ...updates } : b)
      };
    })
  };
}

/**
 * Adds a new instance to a layout.
 */
export function addInstance(
  project: Project,
  layoutId: string,
  objectTypeId: string,
  layerId: string,
  x: number,
  y: number,
  id: string = generateId()
): Project {
  const objectType = project.objectTypes.find(ot => ot.id === objectTypeId);
  if (!objectType) return project;

  const newInstance: Instance = {
    id,
    objectTypeId,
    layerId,
    x,
    y,
    width: objectType.defaultWidth,
    height: objectType.defaultHeight,
    angle: 0,
    opacity: 1,
    visible: true,
    properties: { ...objectType.properties },
  };

  return {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      return { ...l, instances: [...l.instances, newInstance] };
    }),
  };
}

/**
 * Updates properties of an instance.
 */
export function updateInstance(
  project: Project,
  layoutId: string,
  instanceId: string,
  updates: Partial<Omit<Instance, 'id' | 'objectTypeId'>>
): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      return {
        ...l,
        instances: l.instances.map(inst => inst.id === instanceId ? { ...inst, ...updates } : inst),
      };
    }),
  };
}

/**
 * Removes an instance from a layout.
 */
export function removeInstance(project: Project, layoutId: string, instanceId: string): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      return {
        ...l,
        instances: l.instances.filter(inst => inst.id !== instanceId),
      };
    }),
  };
}
/**
 * Moves a layer up or down in the draw order.
 */
export function moveLayer(
  project: Project,
  layoutId: string,
  layerId: string,
  direction: 'up' | 'down'
): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      const index = l.layers.findIndex(layer => layer.id === layerId);
      if (index === -1) return l;

      const newIndex = direction === 'up' ? index + 1 : index - 1;
      if (newIndex < 0 || newIndex >= l.layers.length) return l;

      const newLayers = [...l.layers];
      const [movedLayer] = newLayers.splice(index, 1);
      newLayers.splice(newIndex, 0, movedLayer!);

      return { ...l, layers: newLayers };
    }),
  };
}

/**
 * Reorders an instance in the layout's draw order.
 */
export function reorderInstance(
  project: Project,
  layoutId: string,
  instanceId: string,
  direction: 'front' | 'back' | 'forward' | 'backward'
): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      const instances = [...l.instances];
      const index = instances.findIndex(inst => inst.id === instanceId);
      if (index === -1) return l;

      const [instance] = instances.splice(index, 1);
      let newIndex = index;

      switch (direction) {
        case 'front':
          newIndex = instances.length;
          break;
        case 'back':
          newIndex = 0;
          break;
        case 'forward':
          newIndex = Math.min(instances.length, index + 1);
          break;
        case 'backward':
          newIndex = Math.max(0, index - 1);
          break;
      }

      instances.splice(newIndex, 0, instance!);
      return { ...l, instances };
    }),
  };
}

/**
 * Pastes a list of instances into a layout, generating new IDs.
 */
export function pasteInstances(
  project: Project,
  layoutId: string,
  layerId: string,
  instances: Instance[],
  offsetX: number = 32,
  offsetY: number = 32
): { project: Project, newIds: string[] } {
  const newIds: string[] = [];
  const newProject = {
    ...project,
    layouts: project.layouts.map(l => {
      if (l.id !== layoutId) return l;
      
      const newInstances = instances.map(inst => {
        const newId = generateId();
        newIds.push(newId);
        return {
          ...inst,
          id: newId,
          layerId,
          x: inst.x + offsetX,
          y: inst.y + offsetY
        };
      });
      
      return { ...l, instances: [...l.instances, ...newInstances] };
    })
  };
  return { project: newProject, newIds };
}

/**
 * Updates properties of a layout.
 */
export function updateLayout(
  project: Project,
  layoutId: string,
  updates: Partial<Omit<Layout, 'id' | 'instances' | 'layers'>>
): Project {
  return {
    ...project,
    layouts: project.layouts.map(l => l.id === layoutId ? { ...l, ...updates } : l),
  };
}

/**
 * Updates global project settings.
 */
export function updateProjectSettings(
  project: Project,
  updates: Partial<Project['settings']>
): Project {
  return {
    ...project,
    settings: { ...project.settings, ...updates },
  };
}
/**
 * Adds a new family to the project.
 */
export function addFamily(project: Project, name: string): Project {
  const newFamily: Family = {
    id: generateId(),
    name,
    objectTypeIds: [],
    instanceVariables: [],
    behaviors: [],
  };
  return {
    ...project,
    families: [...project.families, newFamily],
  };
}

/**
 * Removes a family from the project.
 */
export function removeFamily(project: Project, familyId: string): Project {
  return {
    ...project,
    families: project.families.filter(f => f.id !== familyId),
  };
}

/**
 * Updates properties of a family.
 */
export function updateFamily(project: Project, familyId: string, updates: Partial<Omit<Family, 'id'>>): Project {
  const oldFamily = project.families.find(f => f.id === familyId);
  const oldName = oldFamily?.name;
  const newName = updates.name;

  let updatedProject = {
    ...project,
    families: project.families.map(f => f.id === familyId ? { ...f, ...updates } : f),
  };

  if (oldName && newName && oldName !== newName) {
    updatedProject = syncObjectTypeRenaming(updatedProject, oldName, newName);
  }

  return updatedProject;
}

/**
 * Adds an object type to a family.
 */
export function addFamilyObjectType(project: Project, familyId: string, objectTypeId: string): Project {
  return {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      if (f.objectTypeIds.includes(objectTypeId)) return f;
      return { ...f, objectTypeIds: [...f.objectTypeIds, objectTypeId] };
    }),
  };
}

/**
 * Removes an object type from a family.
 */
export function removeFamilyObjectType(project: Project, familyId: string, objectTypeId: string): Project {
  return {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      return { ...f, objectTypeIds: f.objectTypeIds.filter(id => id !== objectTypeId) };
    }),
  };
}

/**
 * Adds an instance variable to a family.
 */
export function addFamilyInstanceVariable(
  project: Project,
  familyId: string,
  name: string,
  type: 'number' | 'string' | 'boolean',
  initialValue: any
): Project {
  return {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      return {
        ...f,
        instanceVariables: [
          ...f.instanceVariables,
          { id: generateId(), name, type, initialValue }
        ]
      };
    })
  };
}

/**
 * Updates a family instance variable.
 */
export function updateFamilyInstanceVariable(
  project: Project,
  familyId: string,
  variableId: string,
  updates: Partial<Omit<InstanceVariable, 'id'>>
): Project {
  const family = project.families.find(f => f.id === familyId);
  if (!family) return project;

  const oldVar = family.instanceVariables.find(v => v.id === variableId);
  if (!oldVar) return project;

  const oldVarName = oldVar.name;
  const newVarName = updates.name;

  // 1. Update Family Definition
  let updatedProject = {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      return {
        ...f,
        instanceVariables: f.instanceVariables.map(v => v.id === variableId ? { ...v, ...updates } : v)
      };
    })
  };

  // 2. Sync Logic (Expressions)
  if (newVarName && newVarName !== oldVarName) {
    updatedProject = syncInstanceVariableRenaming(updatedProject, family.name, oldVarName, newVarName);
  }

  return updatedProject;
}

/**
 * Removes an instance variable from a family.
 */
export function removeFamilyInstanceVariable(project: Project, familyId: string, variableId: string): Project {
  return {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      return {
        ...f,
        instanceVariables: f.instanceVariables.filter(v => v.id !== variableId)
      };
    })
  };
}

/**
 * Adds a behavior to a family.
 */
export function addFamilyBehavior(
  project: Project,
  familyId: string,
  type: string,
  name: string,
  defaultProperties: Record<string, any> = {}
): Project {
  return {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      return {
        ...f,
        behaviors: [
          ...f.behaviors,
          { id: generateId(), type, name, properties: { ...defaultProperties }, disabled: false }
        ]
      };
    })
  };
}

/**
 * Updates a family behavior.
 */
export function updateFamilyBehavior(
  project: Project,
  familyId: string,
  behaviorId: string,
  updates: Partial<Omit<Behavior, 'id' | 'type'>>
): Project {
  return {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      return {
        ...f,
        behaviors: f.behaviors.map(b => b.id === behaviorId ? { ...b, ...updates } : b)
      };
    })
  };
}

/**
 * Removes a behavior from a family.
 */
export function removeFamilyBehavior(project: Project, familyId: string, behaviorId: string): Project {
  return {
    ...project,
    families: project.families.map(f => {
      if (f.id !== familyId) return f;
      return {
        ...f,
        behaviors: f.behaviors.filter(b => b.id !== behaviorId)
      };
    })
  };
}

/**
 * Adds a new folder to the project.
 */
export function addFolder(project: Project, type: 'objectType' | 'layout' | 'eventSheet' | 'family' | 'globalVariable', name: string, parentId: string | null = null): Project {
  const folder: ProjectFolder = {
    id: generateId(),
    name,
    type,
    parentId,
    expanded: true
  };
  return {
    ...project,
    folders: [...project.folders, folder]
  };
}

/**
 * Updates a folder.
 */
export function updateFolder(project: Project, folderId: string, updates: Partial<ProjectFolder>): Project {
  return {
    ...project,
    folders: project.folders.map(f => f.id === folderId ? { ...f, ...updates } : f)
  };
}

/**
 * Removes a folder and moves its contents to the parent folder (or root).
 */
export function removeFolder(project: Project, folderId: string): Project {
  const folder = project.folders.find(f => f.id === folderId);
  if (!folder) return project;

  const parentId = folder.parentId;

  return {
    ...project,
    layouts: project.layouts.map(l => l.folderId === folderId ? { ...l, folderId: parentId } : l),
    objectTypes: project.objectTypes.map(ot => ot.folderId === folderId ? { ...ot, folderId: parentId } : ot),
    eventSheets: project.eventSheets.map(es => es.folderId === folderId ? { ...es, folderId: parentId } : es),
    families: project.families.map(f => f.folderId === folderId ? { ...f, folderId: parentId } : f),
    globalVariables: project.globalVariables.map(v => v.folderId === folderId ? { ...v, folderId: parentId } : v),
    folders: project.folders.filter(f => f.id !== folderId).map(f => f.parentId === folderId ? { ...f, parentId } : f)
  };
}

/**
 * Moves an entity into a folder.
 */
export function moveEntityToFolder(
  project: Project, 
  entityType: 'objectType' | 'layout' | 'eventSheet' | 'family' | 'globalVariable', 
  entityId: string, 
  folderId: string | null
): Project {
  switch (entityType) {
    case 'layout':
      return { ...project, layouts: project.layouts.map(l => l.id === entityId ? { ...l, folderId } : l) };
    case 'objectType':
      return { ...project, objectTypes: project.objectTypes.map(ot => ot.id === entityId ? { ...ot, folderId } : ot) };
    case 'eventSheet':
      return { ...project, eventSheets: project.eventSheets.map(es => es.id === entityId ? { ...es, folderId } : es) };
    case 'family':
      return { ...project, families: project.families.map(f => f.id === entityId ? { ...f, folderId } : f) };
    case 'globalVariable':
      return { ...project, globalVariables: project.globalVariables.map(v => v.id === entityId ? { ...v, folderId } : v) };
    default:
      return project;
  }
}
