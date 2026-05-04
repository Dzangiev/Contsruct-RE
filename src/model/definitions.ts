export interface ParamDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum' | 'objectType' | 'layer' | 'instanceVariable' | 'globalVariable' | 'functionName' | 'color' | 'any' | 'asset';
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
  propertyDefinitions: PropertyDefinition[];
}

export const PLUGIN_DEFINITIONS: PluginDefinition[] = [
  {
    kind: 'sprite',
    name: 'Sprite',
    description: 'An object with an image, commonly used for characters, projectiles, and scenery.',
    icon: 'image',
    defaultWidth: 64,
    defaultHeight: 64,
    propertyDefinitions: [
      { name: 'color', type: 'string', defaultValue: '#ffffff' }
    ]
  },
  {
    kind: 'tiled-background',
    name: 'Tiled Background',
    description: 'An object that repeats its image in a grid. Useful for backgrounds and walls.',
    icon: 'grid',
    defaultWidth: 128,
    defaultHeight: 128,
    propertyDefinitions: [
      { name: 'color', type: 'string', defaultValue: '#ffffff' },
      { name: 'tileWidth', type: 'number', defaultValue: 32 },
      { name: 'tileHeight', type: 'number', defaultValue: 32 }
    ]
  },
  {
    kind: 'text',
    name: 'Text',
    description: 'Display text on the screen.',
    icon: 'type',
    defaultWidth: 100,
    defaultHeight: 20,
    propertyDefinitions: [
      { name: 'text', type: 'string', defaultValue: 'Text' },
      { name: 'color', type: 'string', defaultValue: '#ffffff' },
      { name: 'fontSize', type: 'number', defaultValue: 12 },
      { name: 'fontFace', type: 'string', defaultValue: 'Arial' },
      { name: 'horizontalAlign', type: 'enum', options: ['left', 'center', 'right'], defaultValue: 'left' },
      { name: 'verticalAlign', type: 'enum', options: ['top', 'center', 'bottom'], defaultValue: 'top' }
    ]
  },
  {
    kind: 'particles',
    name: 'Particles',
    description: 'Emits small images or pixels to create effects like fire, smoke, and sparks.',
    icon: 'sparkles',
    defaultWidth: 32,
    defaultHeight: 32,
    propertyDefinitions: [
      { name: 'rate', type: 'number', defaultValue: 10 },
      { name: 'lifeTime', type: 'number', defaultValue: 2 },
      { name: 'speed', type: 'number', defaultValue: 100 },
      { name: 'spread', type: 'number', defaultValue: 360 },
      { name: 'gravity', type: 'number', defaultValue: 0 },
      { name: 'color', type: 'string', defaultValue: '#ff9900' },
      { name: 'startSize', type: 'number', defaultValue: 4 },
      { name: 'endSize', type: 'number', defaultValue: 0 }
    ]
  },
  {
    kind: 'audio',
    name: 'Audio',
    description: 'Play sound effects and background music.',
    icon: 'volume-2',
    defaultWidth: 0,
    defaultHeight: 0,
    propertyDefinitions: []
  }
];

export interface PropertyDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  options?: string[];
  defaultValue: any;
}

export interface BehaviorDefinition {
  type: string;
  name: string;
  description: string;
  propertyDefinitions: PropertyDefinition[];
}

export const BEHAVIOR_DEFINITIONS: BehaviorDefinition[] = [
  {
    type: 'platform',
    name: 'Platform',
    description: 'Standard platformer character movement with gravity, jumping, and floor collisions.',
    propertyDefinitions: [
      { name: 'maxSpeed', type: 'number', defaultValue: 330 },
      { name: 'acceleration', type: 'number', defaultValue: 1500 },
      { name: 'deceleration', type: 'number', defaultValue: 1500 },
      { name: 'jumpStrength', type: 'number', defaultValue: 650 },
      { name: 'gravity', type: 'number', defaultValue: 1500 },
      { name: 'maxFallSpeed', type: 'number', defaultValue: 1000 },
      { name: 'jumpSustain', type: 'number', defaultValue: 0.2 },
      { name: 'doubleJump', type: 'boolean', defaultValue: false }
    ]
  },
  {
    type: 'bullet',
    name: 'Bullet',
    description: 'Moves the object forward at a constant speed.',
    propertyDefinitions: [
      { name: 'speed', type: 'number', defaultValue: 400 },
      { name: 'acceleration', type: 'number', defaultValue: 0 },
      { name: 'gravity', type: 'number', defaultValue: 0 },
      { name: 'bounce', type: 'boolean', defaultValue: false }
    ]
  },
  {
    type: 'eight-direction',
    name: '8 Direction',
    description: 'Movement in 8 directions using arrow keys.',
    propertyDefinitions: [
      { name: 'maxSpeed', type: 'number', defaultValue: 200 },
      { name: 'acceleration', type: 'number', defaultValue: 600 },
      { name: 'deceleration', type: 'number', defaultValue: 900 },
      { name: 'directions', type: 'enum', options: ['4-way', '8-way', 'Left/Right'], defaultValue: '8-way' }
    ]
  },
  {
    type: 'scroll-to',
    name: 'Scroll To',
    description: 'Centers the viewport on this object during preview.',
    propertyDefinitions: []
  },
  {
    type: 'solid',
    name: 'Solid',
    description: 'Makes the object a solid obstacle for other behaviors like Platform.',
    propertyDefinitions: [
      { name: 'tags', type: 'string', defaultValue: '' }
    ]
  },
  {
    type: 'physics',
    name: 'Physics',
    description: 'Simulates realistic physics using the Matter.js engine.',
    propertyDefinitions: [
      { name: 'isStatic', type: 'boolean', defaultValue: false },
      { name: 'density', type: 'number', defaultValue: 0.001 },
      { name: 'friction', type: 'number', defaultValue: 0.1 },
      { name: 'restitution', type: 'number', defaultValue: 0.2 },
      { name: 'frictionAir', type: 'number', defaultValue: 0.01 },
      { name: 'fixedRotation', type: 'boolean', defaultValue: false }
    ]
  },
  {
    type: 'pathfinding',
    name: 'Pathfinding',
    description: 'Allows the object to find and follow a path around Solid obstacles.',
    propertyDefinitions: [
      { name: 'maxSpeed', type: 'number', defaultValue: 200 },
      { name: 'acceleration', type: 'number', defaultValue: 600 },
      { name: 'deceleration', type: 'number', defaultValue: 600 },
      { name: 'rotateSpeed', type: 'number', defaultValue: 180 },
      { name: 'cellSide', type: 'number', defaultValue: 32 }
    ]
  }
];

export interface LogicDefinition {
  type: string;
  name: string;
  description?: string;
  params: ParamDefinition[];
  category: string;
  target: 'system' | 'object' | 'both';
  requiredKind?: string | string[];
  behaviorType?: string;
  isTrigger?: boolean;
}

export const CONDITIONS: LogicDefinition[] = [
  // System Conditions
  {
    type: 'always',
    name: 'Every tick',
    description: 'Condition is always true.',
    params: [],
    category: 'System',
    target: 'system'
  },
  {
    type: 'onStartOfLayout',
    name: 'On start of layout',
    description: 'Runs once when the layout starts.',
    params: [],
    category: 'System',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'compareGlobalVariable',
    name: 'Compare variable',
    description: 'Compare the value of a global variable.',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'else',
    name: 'Else',
    description: 'Runs if the preceding event was false.',
    params: [],
    category: 'System',
    target: 'system'
  },
  {
    type: 'keyDown',
    name: 'Key is down',
    description: 'True if a specific key is currently held down.',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard',
    target: 'system'
  },
  {
    type: 'keyPressed',
    name: 'On key pressed',
    description: 'True only during the frame the key was pressed.',
    params: [{ name: 'Key', type: 'string', defaultValue: 'Space' }],
    category: 'Keyboard',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'pointerDown',
    name: 'Pointer is down',
    description: 'True if the pointer (mouse/touch) is currently held down.',
    params: [],
    category: 'Pointer',
    target: 'system'
  },
  {
    type: 'pointerPressed',
    name: 'On pointer pressed',
    description: 'True only during the frame the pointer was pressed.',
    params: [],
    category: 'Pointer',
    target: 'system',
    isTrigger: true
  },
  {
    type: 'pointerReleased',
    name: 'On pointer released',
    description: 'True only during the frame the pointer was released.',
    params: [],
    category: 'Pointer',
    target: 'system',
    isTrigger: true
  },
  // Picking (System)
  {
    type: 'pickAll',
    name: 'Pick all',
    description: 'Resets the selection for an object type to all available instances.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Picking',
    target: 'system'
  },
  {
    type: 'pickRandom',
    name: 'Pick random (System)',
    description: 'Picks one random instance of an object type from all available instances.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Picking',
    target: 'system'
  },
  // Object Conditions
  {
    type: 'isVisible',
    name: 'Is visible',
    description: 'Check if the object is currently visible.',
    params: [],
    category: 'Appearance',
    target: 'object'
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
    category: 'Transform',
    target: 'object'
  },
  {
    type: 'pointerOverObject',
    name: 'Is pointer over object',
    description: 'True if the pointer is currently over the object.',
    params: [],
    category: 'Pointer',
    target: 'object'
  },
  {
    type: 'pointerPressedOnObject',
    name: 'On pointer pressed on object',
    description: 'True only if the pointer was pressed while over the object.',
    params: [],
    category: 'Pointer',
    target: 'object',
    isTrigger: true
  },
  // Animation Conditions
  {
    type: 'isAnimPlaying',
    name: 'Is animation playing',
    description: 'True if the specified animation is currently playing.',
    params: [{ name: 'Animation', type: 'string', defaultValue: '""' }],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'compareAnimFrame',
    name: 'Compare frame',
    description: 'Compare the current animation frame index.',
    params: [
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Frame', type: 'number', defaultValue: 0 }
    ],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'onAnimFinished',
    name: 'On animation finished',
    description: 'Runs when the current animation reaches its end.',
    params: [{ name: 'Animation', type: 'string', defaultValue: '""' }],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite',
    isTrigger: true
  },
  {
    type: 'onAnimFrameChanged',
    name: 'On frame changed',
    description: 'Runs whenever the animation frame switches.',
    params: [],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite',
    isTrigger: true
  },
  {
    type: 'isOverlapping',
    name: 'Is overlapping another object',
    description: 'True if the object is overlapping another instance of a specific type.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Collisions',
    target: 'object'
  },
  {
    type: 'onCollision',
    name: 'On collision with another object',
    description: 'True only during the frame the object first overlaps another instance of a specific type.',
    params: [{ name: 'Object Type', type: 'objectType' }],
    category: 'Collisions',
    target: 'object',
    isTrigger: true
  },
  {
    type: 'compareInstanceVariable',
    name: 'Compare instance variable',
    description: 'Compare the value of an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Comparison', type: 'enum', options: ['<', '<=', '==', '>=', '>'], defaultValue: '==' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'compareText',
    name: 'Compare text',
    description: 'Compare the current text of the object.',
    params: [
      { name: 'Comparison', type: 'enum', options: ['==', '!=', 'includes'], defaultValue: '==' },
      { name: 'Value', type: 'string', defaultValue: '""' }
    ],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  // Picking (Object)
  {
    type: 'pickRandom',
    name: 'Pick random',
    description: 'Picks one random instance from the current selection of this object type.',
    params: [],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickNearest',
    name: 'Pick nearest',
    description: 'Picks the instance of this object type nearest to a specific position.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickFarthest',
    name: 'Pick farthest',
    description: 'Picks the instance of this object type farthest from a specific position.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickByUID',
    name: 'Pick by unique ID',
    description: 'Picks the instance with a specific unique ID (string).',
    params: [{ name: 'UID', type: 'string', defaultValue: '""' }],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'pickByIndex',
    name: 'Pick by index',
    description: 'Picks an instance by its zero-based index in the current selection.',
    params: [{ name: 'Index', type: 'number', defaultValue: 0 }],
    category: 'Picking',
    target: 'object'
  },
  {
    type: 'physicsIsStatic',
    name: 'Is static',
    description: 'True if the object is currently set to be physically static.',
    params: [],
    category: 'Physics',
    target: 'object',
    behaviorType: 'physics'
  }
];

export const ACTIONS: LogicDefinition[] = [
  {
    type: 'destroy',
    name: 'Destroy',
    description: 'Remove the object instance from the layout.',
    params: [],
    category: 'Misc',
    target: 'object'
  },
  {
    type: 'setPosition',
    name: 'Set position',
    description: 'Move the object to a specific X and Y coordinate.',
    params: [
      { name: 'X', type: 'number', defaultValue: 0 },
      { name: 'Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    target: 'object'
  },
  {
    type: 'moveBy',
    name: 'Move by',
    description: 'Change the position relative to the current position.',
    params: [
      { name: 'DX', type: 'number', defaultValue: 10 },
      { name: 'DY', type: 'number', defaultValue: 0 }
    ],
    category: 'Transform',
    target: 'object'
  },
  {
    type: 'setVisible',
    name: 'Set visible',
    description: 'Show or hide the object.',
    params: [{ name: 'Visible', type: 'boolean', defaultValue: true }],
    category: 'Appearance',
    target: 'object'
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
    category: 'System',
    target: 'system'
  },
  {
    type: 'setVariable',
    name: 'Set variable',
    description: 'Set the value of a global variable.',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 0 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'addVariable',
    name: 'Add to variable',
    description: 'Add a value to a global or local variable.',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'subtractVariable',
    name: 'Subtract from variable',
    description: 'Subtract a value from a global or local variable.',
    params: [
      { name: 'Variable', type: 'globalVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'setInstanceVariable',
    name: 'Set instance variable',
    description: 'Set the value of an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 100 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'addInstanceVariable',
    name: 'Add to instance variable',
    description: 'Add a value to an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'subtractInstanceVariable',
    name: 'Subtract from instance variable',
    description: 'Subtract a value from an instance variable.',
    params: [
      { name: 'Variable', type: 'instanceVariable', defaultValue: '' },
      { name: 'Value', type: 'number', defaultValue: 1 }
    ],
    category: 'Instance Variables',
    target: 'object'
  },
  {
    type: 'log',
    name: 'Log to console',
    description: 'Output a message to the runtime debug console.',
    params: [
      { name: 'Message', type: 'string', defaultValue: '"Hello World"' },
      { name: 'Type', type: 'enum', options: ['info', 'warn', 'error'], defaultValue: 'info' }
    ],
    category: 'System',
    target: 'system'
  },
  {
    type: 'callFunction',
    name: 'Call function',
    description: 'Execute the logic inside a named function.',
    params: [
      { name: 'Function', type: 'functionName', defaultValue: '' }
    ],
    category: 'Functions',
    target: 'system'
  },
  {
    type: 'setReturnValue',
    name: 'Set return value',
    description: 'Set the value that this function will return to its caller.',
    params: [
      { name: 'Value', type: 'any', defaultValue: '0' }
    ],
    category: 'Functions',
    target: 'system'
  },
  {
    type: 'setText',
    name: 'Set text',
    description: 'Change the text displayed by the object.',
    params: [{ name: 'Text', type: 'string', defaultValue: '"Hello"' }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'appendText',
    name: 'Append text',
    description: 'Add text to the end of the existing text.',
    params: [{ name: 'Text', type: 'string', defaultValue: '" World"' }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'setTextColor',
    name: 'Set text color',
    description: 'Change the color of the text.',
    params: [{ name: 'Color', type: 'color', defaultValue: '"#ffffff"' }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'setFontSize',
    name: 'Set font size',
    description: 'Change the size of the font.',
    params: [{ name: 'Size', type: 'number', defaultValue: 12 }],
    category: 'Text',
    target: 'object',
    requiredKind: 'text'
  },
  {
    type: 'applyPhysicsForce',
    name: 'Apply force',
    description: 'Apply a physical force to the object.',
    params: [
      { name: 'Force X', type: 'number', defaultValue: 0 },
      { name: 'Force Y', type: 'number', defaultValue: -0.1 }
    ],
    category: 'Physics',
    target: 'object',
    behaviorType: 'physics'
  },
  {
    type: 'setPhysicsVelocity',
    name: 'Set velocity',
    description: 'Set the linear velocity of the object.',
    params: [
      { name: 'Velocity X', type: 'number', defaultValue: 0 },
      { name: 'Velocity Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Physics',
    target: 'object',
    behaviorType: 'physics'
  },
  {
    type: 'findPath',
    name: 'Find path to',
    description: 'Calculate a path to the target coordinates and start moving.',
    params: [
      { name: 'Target X', type: 'number', defaultValue: 0 },
      { name: 'Target Y', type: 'number', defaultValue: 0 }
    ],
    category: 'Pathfinding',
    target: 'object',
    behaviorType: 'pathfinding'
  },
  {
    type: 'setPathfindingMaxSpeed',
    name: 'Set max speed',
    description: 'Change the maximum movement speed.',
    params: [{ name: 'Speed', type: 'number', defaultValue: 200 }],
    category: 'Pathfinding',
    target: 'object',
    behaviorType: 'pathfinding'
  },
  {
    type: 'setPathfindingAcceleration',
    name: 'Set acceleration',
    description: 'Change the acceleration rate.',
    params: [{ name: 'Acceleration', type: 'number', defaultValue: 600 }],
    category: 'Pathfinding',
    target: 'object',
    behaviorType: 'pathfinding'
  },
  // Animation Actions
  {
    type: 'setAnim',
    name: 'Set animation',
    description: 'Change the current animation.',
    params: [
      { name: 'Animation', type: 'string', defaultValue: '"Animation 1"' },
      { name: 'From', type: 'enum', options: ['current frame', 'beginning'], defaultValue: 'beginning' }
    ],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'setAnimFrame',
    name: 'Set frame',
    description: 'Set the current animation frame index.',
    params: [{ name: 'Frame', type: 'number', defaultValue: 0 }],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'setAnimPlaying',
    name: 'Set playing',
    description: 'Start or stop the animation playback.',
    params: [{ name: 'Playing', type: 'boolean', defaultValue: true }],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite'
  },
  {
    type: 'setAnimSpeed',
    name: 'Set speed',
    description: 'Change the playback speed (FPS).',
    params: [{ name: 'Speed', type: 'number', defaultValue: 10 }],
    category: 'Animations',
    target: 'object',
    requiredKind: 'sprite'
  },
  // Audio Actions
  {
    type: 'audioPlay',
    name: 'Play',
    description: 'Play an audio asset.',
    params: [
      { name: 'Audio', type: 'asset' },
      { name: 'Looping', type: 'boolean', defaultValue: false },
      { name: 'Volume', type: 'number', defaultValue: 100 },
      { name: 'Tag', type: 'string', defaultValue: '""' }
    ],
    category: 'Audio',
    target: 'object',
    requiredKind: 'audio'
  },
  {
    type: 'audioStop',
    name: 'Stop',
    description: 'Stop playing audio with a specific tag.',
    params: [
      { name: 'Tag', type: 'string', defaultValue: '""' }
    ],
    category: 'Audio',
    target: 'object',
    requiredKind: 'audio'
  },
  {
    type: 'audioStopAll',
    name: 'Stop all',
    description: 'Stop all sounds currently playing.',
    params: [],
    category: 'Audio',
    target: 'object',
    requiredKind: 'audio'
  },
  {
    type: 'audioSetVolume',
    name: 'Set volume',
    description: 'Set the volume for a specific tag.',
    params: [
      { name: 'Tag', type: 'string', defaultValue: '""' },
      { name: 'Volume', type: 'number', defaultValue: 100 }
    ],
    category: 'Audio',
    target: 'object',
    requiredKind: 'audio'
  }
];

export interface EffectDefinition {
  type: string;
  name: string;
  description: string;
  propertyDefinitions: PropertyDefinition[];
}

export const EFFECT_DEFINITIONS: EffectDefinition[] = [
  {
    type: 'blur',
    name: 'Blur',
    description: 'Blurs the object or layer.',
    propertyDefinitions: [
      { name: 'intensity', type: 'number', defaultValue: 5 }
    ]
  },
  {
    type: 'grayscale',
    name: 'Grayscale',
    description: 'Converts colors to shades of gray.',
    propertyDefinitions: [
      { name: 'amount', type: 'number', defaultValue: 1 }
    ]
  },
  {
    type: 'brightness-contrast',
    name: 'Brightness/Contrast',
    description: 'Adjust the brightness and contrast.',
    propertyDefinitions: [
      { name: 'brightness', type: 'number', defaultValue: 1 },
      { name: 'contrast', type: 'number', defaultValue: 1 }
    ]
  },
  {
    type: 'hue-rotate',
    name: 'Hue Rotate',
    description: 'Rotates the color hue.',
    propertyDefinitions: [
      { name: 'angle', type: 'number', defaultValue: 0 }
    ]
  },
  {
    type: 'sepia',
    name: 'Sepia',
    description: 'Applies a sepia (vintage) tone.',
    propertyDefinitions: [
      { name: 'amount', type: 'number', defaultValue: 1 }
    ]
  }
];

export interface StateDefinition {
  id: string;
  name: string;
  description?: string;
  isInitial?: boolean;
}

export function findConditionDefinition(type: string): LogicDefinition | undefined {
  return CONDITIONS.find(c => c.type === type);
}

export function findActionDefinition(type: string): LogicDefinition | undefined {
  return ACTIONS.find(a => a.type === type);
}
