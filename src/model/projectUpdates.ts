import { Project, Layout, Layer, ObjectType, Instance, ObjectTypeKind, EventSheet } from './project';
import { generateId } from '../utils/id';

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
export function addObjectType(project: Project, name: string, kind: ObjectTypeKind): Project {
  const newObjectType: ObjectType = {
    id: generateId(),
    name,
    kind,
    pluginId: kind,
    defaultWidth: 64,
    defaultHeight: 64,
    properties: {},
    instanceVariables: [],
  };
  return {
    ...project,
    objectTypes: [...project.objectTypes, newObjectType],
  };
}

/**
 * Adds an instance variable to an object type.
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
  return {
    ...project,
    objectTypes: project.objectTypes.map(ot => ot.id === objectTypeId ? { ...ot, ...updates } : ot),
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
