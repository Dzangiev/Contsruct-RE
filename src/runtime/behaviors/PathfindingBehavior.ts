import { Instance } from '../../model/project';
import { IBehavior, BehaviorContext, BehaviorResult } from './types';

export class PathfindingBehavior implements IBehavior {
  tick(inst: Instance, props: Record<string, any>, context: BehaviorContext): BehaviorResult {
    const { dt, behaviorsState } = context;
    const state = { ...behaviorsState };
    
    const maxSpeed = Number(state.maxSpeed ?? props.maxSpeed ?? 200);
    let updatedInstance = { ...inst };
    
    if (state.path && state.path.length > 0) {
      const waypoint = state.path[0];
      const dx = waypoint.x - (updatedInstance.x + updatedInstance.width / 2);
      const dy = waypoint.y - (updatedInstance.y + updatedInstance.height / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 5) {
        state.path.shift();
      } else {
        const moveDist = Math.min(dist, maxSpeed * dt);
        updatedInstance.x += (dx / dist) * moveDist;
        updatedInstance.y += (dy / dist) * moveDist;
      }
    }
    
    return { updatedInstance, behaviorState: state };
  }
}
