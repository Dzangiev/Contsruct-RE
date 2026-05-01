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
}

export enum ObjectTypeKind {
  Sprite = 'sprite',
  TiledBackground = 'tiled-background',
  Text = 'text',
  Plugin = 'plugin',
}

export interface ObjectType {
  id: string;
  name: string;
  kind: ObjectTypeKind;
  pluginId: string;
  defaultWidth: number;
  defaultHeight: number;
  assetId?: string;
  properties: Record<string, any>;
}

export interface Condition {
  id: string;
  type: string;
  targetObjectTypeId?: string;
  params: any[];
  inverted: boolean;
}

export interface Action {
  id: string;
  type: string;
  targetObjectTypeId?: string;
  params: any[];
}

export interface EventBlock {
  id: string;
  type: 'event' | 'group' | 'comment';
  disabled: boolean;
  conditions: Condition[];
  actions: Action[];
  children: EventBlock[];
  groupName?: string;
  groupExpanded?: boolean;
  commentText?: string;
}

export interface EventSheet {
  id: string;
  name: string;
  events: EventBlock[];
}

export interface Project {
  schemaVersion: number;
  settings: ProjectSettings;
  layouts: Layout[];
  objectTypes: ObjectType[];
  eventSheets: EventSheet[];
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
    eventSheets: [
      {
        id: defaultEventSheetId,
        name: 'Event sheet 1',
        events: [],
      },
    ],
  };
}
