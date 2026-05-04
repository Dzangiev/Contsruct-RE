import { Instance } from '../../model/project';
import { IBehavior, BehaviorContext, BehaviorResult } from './types';

export class EightDirectionBehavior implements IBehavior {
  tick(inst: Instance, props: Record<string, any>, context: BehaviorContext): BehaviorResult {
    const { dt, keysDown, behaviorsState } = context;
    const state = { ...behaviorsState };
    
    const maxSpeed = Number(state.maxSpeed ?? props.maxSpeed ?? 200);
    let dx = 0, dy = 0;
    
    if (keysDown.has('ArrowLeft')) dx -= 1;
    if (keysDown.has('ArrowRight')) dx += 1;
    if (keysDown.has('ArrowUp')) dy -= 1;
    if (keysDown.has('ArrowDown')) dy += 1;
    
    let updatedInstance = { ...inst };
    
    if (dx !== 0 || dy !== 0) {
      const mag = Math.sqrt(dx * dx + dy * dy);
      updatedInstance.x += (dx / mag) * maxSpeed * dt;
      updatedInstance.y += (dy / mag) * maxSpeed * dt;
      if (props.directions === '8-way') {
        updatedInstance.angle = Math.atan2(dy, dx) * (180 / Math.PI);
      }
    }
    
    return { updatedInstance, behaviorState: state };
  }
}
