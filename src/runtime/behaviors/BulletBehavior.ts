import { Instance } from '../../model/project';
import { IBehavior, BehaviorContext, BehaviorResult } from './types';

export class BulletBehavior implements IBehavior {
  tick(inst: Instance, props: Record<string, any>, context: BehaviorContext): BehaviorResult {
    const { dt, behaviorsState } = context;
    const state = { ...behaviorsState };
    
    const speed = Number(state.speed ?? props.speed ?? 400);
    const angleRad = inst.angle * (Math.PI / 180);
    
    const updatedInstance = {
      ...inst,
      x: inst.x + Math.cos(angleRad) * speed * dt,
      y: inst.y + Math.sin(angleRad) * speed * dt
    };
    
    return { updatedInstance, behaviorState: state };
  }
}
