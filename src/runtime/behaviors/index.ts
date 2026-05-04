import { IBehavior } from './types';
import { BulletBehavior } from './BulletBehavior';
import { EightDirectionBehavior } from './EightDirectionBehavior';
import { PlatformBehavior } from './PlatformBehavior';
import { PathfindingBehavior } from './PathfindingBehavior';

export const BEHAVIORS: Record<string, IBehavior> = {
  'bullet': new BulletBehavior(),
  'eight-direction': new EightDirectionBehavior(),
  'platform': new PlatformBehavior(),
  'pathfinding': new PathfindingBehavior()
};
