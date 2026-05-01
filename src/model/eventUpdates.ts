import { Project, EventSheet, EventBlock, Condition, Action } from './project';
import { generateId } from '../utils/id';

/**
 * Recursive helper to update a block within a list of blocks.
 */
function updateInTree(blocks: EventBlock[], id: string, updater: (block: EventBlock) => EventBlock): EventBlock[] {
  return blocks.map(block => {
    if (block.id === id) return updater(block);
    if (block.children.length > 0) {
      return { ...block, children: updateInTree(block.children, id, updater) };
    }
    return block;
  });
}

/**
 * Recursive helper to remove a block from the tree.
 */
function removeFromTree(blocks: EventBlock[], id: string): EventBlock[] {
  return blocks
    .filter(block => block.id !== id)
    .map(block => ({
      ...block,
      children: removeFromTree(block.children, id)
    }));
}

/**
 * Adds a new event block to an event sheet.
 */
export function addEventBlock(
  project: Project, 
  eventSheetId: string, 
  parentBlockId: string | null, 
  type: 'event' | 'group' | 'comment' | 'variable'
): Project {
  const blockId = generateId();
  const newBlock: EventBlock = {
    id: blockId,
    type,
    disabled: false,
    conditions: [],
    actions: [],
    children: [],
  };

  let updatedProject = project;

  if (type === 'variable') {
    const varId = generateId();
    newBlock.variable = {
      id: varId,
      name: 'Variable' + (project.globalVariables.length + 1),
      type: 'number',
      initialValue: 0,
      comment: ''
    };
    updatedProject = {
      ...project,
      globalVariables: [...project.globalVariables, newBlock.variable]
    };
  }

  return {
    ...updatedProject,
    eventSheets: updatedProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      if (!parentBlockId) {
        return { ...es, events: [...es.events, newBlock] };
      }
      return {
        ...es,
        events: updateInTree(es.events, parentBlockId, p => ({
          ...p,
          children: [...p.children, newBlock]
        }))
      };
    })
  };
}

/**
 * Updates an event block's properties.
 */
export function updateEventBlock(
  project: Project,
  eventSheetId: string,
  blockId: string,
  updates: Partial<Omit<EventBlock, 'id' | 'conditions' | 'actions' | 'children'>>
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({ ...b, ...updates }))
      };
    })
  };
}

/**
 * Removes an event block from an event sheet.
 */
export function removeEventBlock(
  project: Project,
  eventSheetId: string,
  blockId: string
): Project {
  // Find the block to see if it has a variable
  const findBlock = (blocks: EventBlock[]): EventBlock | undefined => {
    for (const b of blocks) {
      if (b.id === blockId) return b;
      const found = findBlock(b.children);
      if (found) return found;
    }
    return undefined;
  };

  const eventSheet = project.eventSheets.find(es => es.id === eventSheetId);
  const blockToRemove = eventSheet ? findBlock(eventSheet.events) : undefined;
  
  let updatedProject = project;
  if (blockToRemove?.type === 'variable' && blockToRemove.variable) {
    updatedProject = {
      ...project,
      globalVariables: project.globalVariables.filter(v => v.id !== blockToRemove.variable?.id)
    };
  }

  return {
    ...updatedProject,
    eventSheets: updatedProject.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: removeFromTree(es.events, blockId)
      };
    })
  };
}

/**
 * Adds a condition to an event block.
 */
export function addCondition(
  project: Project,
  eventSheetId: string,
  blockId: string,
  type: string,
  params: any[] = [],
  targetObjectTypeId?: string
): Project {
  const newCondition: Condition = {
    id: generateId(),
    type,
    params,
    inverted: false,
    targetObjectTypeId
  };

  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          conditions: [...b.conditions, newCondition]
        }))
      };
    })
  };
}

/**
 * Updates a condition within an event block.
 */
export function updateCondition(
  project: Project,
  eventSheetId: string,
  blockId: string,
  conditionId: string,
  updates: Partial<Omit<Condition, 'id'>>
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          conditions: b.conditions.map(c => c.id === conditionId ? { ...c, ...updates } : c)
        }))
      };
    })
  };
}

/**
 * Removes a condition from an event block.
 */
export function removeCondition(
  project: Project,
  eventSheetId: string,
  blockId: string,
  conditionId: string
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          conditions: b.conditions.filter(c => c.id !== conditionId)
        }))
      };
    })
  };
}

/**
 * Adds an action to an event block.
 */
export function addAction(
  project: Project,
  eventSheetId: string,
  blockId: string,
  type: string,
  params: any[] = [],
  targetObjectTypeId?: string
): Project {
  const newAction: Action = {
    id: generateId(),
    type,
    params,
    targetObjectTypeId
  };

  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          actions: [...b.actions, newAction]
        }))
      };
    })
  };
}

/**
 * Updates an action within an event block.
 */
export function updateAction(
  project: Project,
  eventSheetId: string,
  blockId: string,
  actionId: string,
  updates: Partial<Omit<Action, 'id'>>
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          actions: b.actions.map(a => a.id === actionId ? { ...a, ...updates } : a)
        }))
      };
    })
  };
}

/**
 * Removes an action from an event block.
 */
export function removeAction(
  project: Project,
  eventSheetId: string,
  blockId: string,
  actionId: string
): Project {
  return {
    ...project,
    eventSheets: project.eventSheets.map(es => {
      if (es.id !== eventSheetId) return es;
      return {
        ...es,
        events: updateInTree(es.events, blockId, b => ({
          ...b,
          actions: b.actions.filter(a => a.id !== actionId)
        }))
      };
    })
  };
}

/**
 * Adds a keyboard movement template (4 events) to an event sheet.
 */
export function addKeyboardMovementTemplate(
  project: Project,
  eventSheetId: string,
  objectTypeId: string,
  speed: number = 200
): Project {
  let nextProject = project;

  const directions = [
    { key: 'ArrowLeft', dx: `-(dt * ${speed})`, dy: 0 },
    { key: 'ArrowRight', dx: `dt * ${speed}`, dy: 0 },
    { key: 'ArrowUp', dx: 0, dy: `-(dt * ${speed})` },
    { key: 'ArrowDown', dx: 0, dy: `dt * ${speed}` }
  ];

  for (const dir of directions) {
    const blockId = generateId();
    const newBlock: EventBlock = {
      id: blockId,
      type: 'event',
      disabled: false,
      conditions: [{
        id: generateId(),
        type: 'keyDown',
        params: [dir.key],
        inverted: false
      }],
      actions: [{
        id: generateId(),
        type: 'moveBy',
        params: [dir.dx, dir.dy],
        targetObjectTypeId: objectTypeId
      }],
      children: []
    };

    nextProject = {
      ...nextProject,
      eventSheets: nextProject.eventSheets.map(es => {
        if (es.id !== eventSheetId) return es;
        return { ...es, events: [...es.events, newBlock] };
      })
    };
  }

  return nextProject;
}
