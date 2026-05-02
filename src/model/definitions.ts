export interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'objectType' | 'layer' | 'enum';
  options?: string[]; // For enum type
  defaultValue?: any;
}

export interface PluginDefinition {
  kind: string;
  name: string;
  description: string;
  icon: string;
  defaultWidth: number;
  defaultHeight: number;
}

export const PLUGIN_DEFINITIONS: PluginDefinition[] = [
  {
    kind: 'sprite',
    name: 'Sprite',
    description: 'An object with an image, commonly used for characters, projectiles, and scenery.',
    icon: 'image',
    defaultWidth: 64,
    defaultHeight: 64
  },
  {
    kind: 'tiled-background',
    name: 'Tiled Background',
    description: 'An object that repeats its image in a grid. Useful for backgrounds and walls.',
    icon: 'grid',
    defaultWidth: 128,
    defaultHeight: 128
  },
  {
    kind: 'text',
    name: 'Text',
    description: 'Display text on the screen.',
    icon: 'type',
    defaultWidth: 100,
    defaultHeight: 20
  }
];

export interface BehaviorDefinition {
  type: string;
  name: string;
  description: string;
  defaultProperties: Record<string, any>;
}

export const BEHAVIOR_DEFINITIONS: BehaviorDefinition[] = [
  {
    type: 'platform',
    name: 'Platform',
    description: 'Standard platformer character movement with gravity, jumping, and floor collisions.',
    defaultProperties: {
      maxSpeed: 330,
      acceleration: 1500,
      deceleration: 1500,
      jumpStrength: 650,
      gravity: 1500,
      maxFallSpeed: 1000,
      jumpSustain: 0.2,
      doubleJump: false
    }
  },
  {
    type: 'bullet',
    name: 'Bullet',
    description: 'Moves the object forward at a constant speed.',
    defaultProperties: {
      speed: 400,
      acceleration: 0,
      gravity: 0,
      bounce: false,
      step: 0
    }
  },
  {
    type: 'eight-direction',
    name: '8 Direction',
    description: 'Movement in 8 directions using arrow keys.',
    defaultProperties: {
      maxSpeed: 200,
      acceleration: 600,
      deceleration: 900,
      directions: '8-way'
    }
  },
  {
    type: 'scroll-to',
    name: 'Scroll To',
    description: 'Centers the viewport on this object during preview.',
    defaultProperties: {}
  },
  {
    type: 'solid',
    name: 'Solid',
    description: 'Makes the object a solid obstacle for other behaviors like Platform.',
    defaultProperties: {}
  }
];

export interface LogicDefinition {
  type: string;
  name: string;
  description?: string;
  params: ParamDefinition[];
  category: string;
}

export const CONDITIONS: LogicDefinition[] = [
  // System Conditions
  {
    type: 'always',
    name: 'Every tick',
    description: 'Condition is always true.',
    params: [],
    category: 'System'
  },
  {
    type: 'else',
    name: 'Else',
    description: 'Runs if the preceding event was false.',
    params: [],
    category: 'System'
  },
  {
    type: 'keyDown',
    name: 'Key is down',
    description: 'True if a specific key is currently held down.',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard'
  },
  {
    type: 'keyPressed',
    name: 'On key pressed',
    description: 'True only during the frame the key was pressed.',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard'
  },
  {
    type: 'pointerDown',
    name: 'Pointer is down',
    description: 'True if the pointer (mouse/touch) is currently held down.',
    params: [],
    category: 'Pointer'
  },
  {
    type: 'pointerPressed',
    name: 'On pointer pressed',
    description: 'True only during the frame the pointer was pressed.',
    params: [],
    category: 'Pointer'
  },
  {
    type: 'pointerReleased',
    name: 'On pointer released',
    description: 'True only during the frame the pointer was released.',
    params: [],
    category: 'Pointer'
  },
  // Object Conditions
  {
    type: 'isVisible',
    name: 'Is visible',
    description: 'Check if the object is currently visible.',
    params: [],
    category: 'Appearance'
  },
  {
    type: 'comparePosition',
    name: 'Compare position',
    description: 'Compare X or Y position of the object.',
    params: [
      { name: 'Axis', type: 'enum', options: ['x', 'y'], defaultValue: 'x' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform'
  },
  {
    type: 'pointerOverObject',
    name: 'Is pointer over object',
    description: 'True if the pointer is currently over the object.',
    params: [],
    category: 'Pointer'
  },
  {
    type: 'pointerPressedOnObject',
    name: 'On pointer pressed on object',
    description: 'True only if the pointer was pressed while over the object.',
    params: [],
    category: 'Pointer'
  },
  {
    type: 'isOverlapping',
    name: 'Is overlapping another object',
    description: 'True if the object is overlapping another instance of a specific type.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Collisions'
  }
];

export const ACTIONS: LogicDefinition[] = [
  {
    type: 'destroy',
    name: 'Destroy',
    description: 'Remove the object instance from the layout.',
    params: [],
    category: 'Misc'
  },
  {
    type: 'setPosition',
    name: 'Set position',
    description: 'Move the object to a specific X and Y coordinate.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform'
  },
  {
    type: 'moveBy',
    name: 'Move by',
    description: 'Change the position relative to the current position.',
    params: [
      { name: 'DX', type: 'number', defaultValue: 10 },
      { name: 'DY', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform'
  },
  {
    type: 'setVisible',
    name: 'Set visible',
    description: 'Show or hide the object.',
    params: [{ name: 'Visible', type: 'boolean', defaultValue: true }],
    category: 'Appearance'
  },
  {
    type: 'createInstance',
    name: 'Create object',
    description: 'Create a new instance of an object type.',
    params: [
      { name: 'Object Type', type: 'objectType' },
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 },
      { name: 'Layer', type: 'layer' }
    ],
    category: 'System'
  },
  {
    type: 'callFunction',
    name: 'Call function',
    description: 'Invoke a previously defined function.',
    params: [
      { name: 'Name', type: 'string', defaultValue: 'MyFunction' },
      { name: 'Param 1', type: 'string', defaultValue: '' },
      { name: 'Param 2', type: 'string', defaultValue: '' }
    ],
    category: 'Functions'
  }
];

export function findConditionDefinition(type: string): LogicDefinition | undefined {
  return CONDITIONS.find(c => c.type === type);
}

export function findActionDefinition(type: string): LogicDefinition | undefined {
  return ACTIONS.find(a => a.type === type);
}
