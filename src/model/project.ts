import { generateId } from '../utils/id';

export const SCHEMA_VERSION = 1;

export interface ProjectSettings {
  name: string;
  author: string;
  version: string;
  description: string;
  viewportWidth: number;
  viewportHeight: number;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  parallaxX: number;
  parallaxY: number;
}

export interface Instance {
  id: string;
  objectTypeId: string;
  layerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  visible: boolean;
  properties: Record<string, any>;
}

export interface Layout {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  instances: Instance[];
  eventSheetId: string | null;
  folderId?: string | null;
}

export enum ObjectTypeKind {
  Sprite = 'sprite',
  TiledBackground = 'tiled-background',
  Text = 'text',
  Plugin = 'plugin',
}

export interface InstanceVariable {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  initialValue: any;
  description?: string;
  isStatic?: boolean;
  isConstant?: boolean;
}

export interface ImagePoint {
  id: string;
  name: string;
  x: number; // 0 to 1
  y: number; // 0 to 1
}

export interface AnimationFrame {
  id: string;
  assetId: string;
  duration: number; // multiplier for animation speed
  originX: number; // 0 to 1
  originY: number; // 0 to 1
  imagePoints: ImagePoint[];
  collisionPolygon?: { x: number, y: number }[];
}

export interface Animation {
  id: string;
  name: string;
  speed: number;
  loop: boolean;
  repeatCount: number; // 0 for infinite if loop is false? Or just loop/repeat.
  frames: AnimationFrame[];
}

export interface Behavior {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
  disabled: boolean;
}

export interface ObjectType {
  id: string;
  name: string;
  kind: ObjectTypeKind;
  pluginId: string;
  defaultWidth: number;
  defaultHeight: number;
  assetId?: string; // For backward compatibility or non-animated objects
  animations: Animation[];
  properties: Record<string, any>;
  instanceVariables: InstanceVariable[];
  behaviors: Behavior[];
  folderId?: string | null;
}

export interface Condition {
  id: string;
  type: string;
  targetObjectTypeId?: string;
  params: any[];
  inverted: boolean;
  disabled?: boolean;
}

export interface Action {
  id: string;
  type: string;
  targetObjectTypeId?: string;
  params: any[];
  disabled?: boolean;
}

export interface GlobalVariable {
  id: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  initialValue: any;
  description?: string;
  isStatic?: boolean;
  isConstant?: boolean;
  comment?: string;
}

export interface EventBlock {
  id: string;
  type: 'event' | 'group' | 'comment' | 'variable' | 'function' | 'include';
  disabled: boolean;
  conditions: Condition[];
  actions: Action[];
  children: EventBlock[];
  groupName?: string;
  groupExpanded?: boolean;
  commentText?: string;
  variable?: GlobalVariable;
  functionName?: string;
  functionDescription?: string;
  functionParams?: { name: string, type: 'string' | 'number' | 'any', defaultValue: any }[];
  functionReturnType?: 'none' | 'string' | 'number' | 'any';
  functionPassPicking?: boolean;
  includeSheetId?: string;
  color?: string;
  bookmarked?: boolean;
  isOrBlock?: boolean;
}

export interface EventSheet {
  id: string;
  name: string;
  events: EventBlock[];
  includes: string[];
  folderId?: string | null;
}

export interface Family {
  id: string;
  name: string;
  objectTypeIds: string[];
  instanceVariables: InstanceVariable[];
  behaviors: Behavior[];
  folderId?: string | null;
}

export interface ProjectFolder {
  id: string;
  name: string;
  type: 'objectType' | 'layout' | 'eventSheet' | 'family';
  parentId: string | null;
  expanded: boolean;
}

export interface Project {
  schemaVersion: number;
  settings: ProjectSettings;
  layouts: Layout[];
  objectTypes: ObjectType[];
  families: Family[];
  eventSheets: EventSheet[];
  globalVariables: GlobalVariable[];
  folders: ProjectFolder[];
}

export function createEmptyProject(name: string = 'New Project'): Project {
  const defaultLayoutId = generateId();
  const defaultLayerId = generateId();
  const defaultEventSheetId = generateId();

  return {
    schemaVersion: SCHEMA_VERSION,
    settings: {
      name,
      author: '',
      version: '1.0.0',
      description: '',
      viewportWidth: 854,
      viewportHeight: 480,
    },
    layouts: [
      {
        id: defaultLayoutId,
        name: 'Layout 1',
        width: 1708,
        height: 960,
        layers: [
          {
            id: defaultLayerId,
            name: 'Layer 0',
            visible: true,
            locked: false,
            opacity: 1,
            parallaxX: 1,
            parallaxY: 1,
          },
        ],
        instances: [],
        eventSheetId: defaultEventSheetId,
      },
    ],
    objectTypes: [],
    families: [],
    eventSheets: [
      {
        id: defaultEventSheetId,
        name: 'Event sheet 1',
        events: [],
        includes: [],
      },
    ],
    globalVariables: [],
    folders: [],
  };
}
