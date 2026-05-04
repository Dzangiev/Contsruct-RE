import { Instance, Project } from '../../model/project';
import { IBehavior, BehaviorContext, BehaviorResult } from './types';

export class PlatformBehavior implements IBehavior {
  tick(inst: Instance, props: Record<string, any>, context: BehaviorContext): BehaviorResult {
    const { dt, keysDown, keysPressed, instances, project, behaviorsState } = context;
    const state = { ...behaviorsState };

    const maxSpeed = Number(state.maxSpeed ?? props.maxSpeed ?? 330);
    const acceleration = Number(state.acceleration ?? props.acceleration ?? 1500);
    const deceleration = Number(state.deceleration ?? props.deceleration ?? 1500);
    const gravity = Number(state.gravity ?? props.gravity ?? 1500);
    const jumpStrength = Number(state.jumpStrength ?? props.jumpStrength ?? 650);

    if (state.vx === undefined) { 
      state.vx = 0; 
      state.vy = 0; 
      state.onFloor = false; 
    }

    // 1. Horizontal Movement
    let targetVx = 0;
    if (keysDown.has('ArrowLeft')) targetVx -= 1;
    if (keysDown.has('ArrowRight')) targetVx += 1;
    targetVx *= maxSpeed;

    if (targetVx !== 0) {
      if (state.vx < targetVx) state.vx = Math.min(targetVx, state.vx + acceleration * dt);
      else if (state.vx > targetVx) state.vx = Math.max(targetVx, state.vx - acceleration * dt);
    } else {
      if (state.vx > 0) state.vx = Math.max(0, state.vx - deceleration * dt);
      else if (state.vx < 0) state.vx = Math.min(0, state.vx - deceleration * dt);
    }

    // 2. Vertical Movement
    state.vy += gravity * dt;
    if (keysPressed.has('ArrowUp') && state.onFloor) {
      state.vy = -jumpStrength;
      state.onFloor = false;
    }

    // 3. Collision Resolution
    const solids = instances.filter(o => {
      if (o.id === inst.id) return false;
      const ot_o = project.objectTypes.find(type => type.id === o.objectTypeId);
      return (
        ot_o?.behaviors.some(b => b.type === 'solid' && !b.disabled) || 
        project.families.some(f => f.objectTypeIds.includes(o.objectTypeId) && f.behaviors.some(b => b.type === 'solid' && !b.disabled))
      );
    });

    const checkCollision = (tx: number, ty: number, width: number, height: number) => {
      return solids.some(s => {
        return tx < s.x + s.width && 
               tx + width > s.x && 
               ty < s.y + s.height && 
               ty + height > s.y;
      });
    };

    let updatedInstance = { ...inst };

    // X Pass
    let newX = updatedInstance.x + state.vx * dt;
    if (checkCollision(newX, updatedInstance.y, updatedInstance.width, updatedInstance.height)) {
      const step = state.vx > 0 ? 1 : -1;
      while (checkCollision(updatedInstance.x + step, updatedInstance.y, updatedInstance.width, updatedInstance.height) === false && Math.abs(updatedInstance.x - newX) > 1) {
        updatedInstance.x += step;
      }
      state.vx = 0;
    } else {
      updatedInstance.x = newX;
    }

    // Y Pass
    let newY = updatedInstance.y + state.vy * dt;
    let onFloor = false;
    if (checkCollision(updatedInstance.x, newY, updatedInstance.width, updatedInstance.height)) {
      if (state.vy > 0) {
        const step = 1;
        while (checkCollision(updatedInstance.x, updatedInstance.y + step, updatedInstance.width, updatedInstance.height) === false && updatedInstance.y < newY) {
          updatedInstance.y += step;
        }
        onFloor = true;
      } else if (state.vy < 0) {
        const step = -1;
        while (checkCollision(updatedInstance.x, updatedInstance.y + step, updatedInstance.width, updatedInstance.height) === false && updatedInstance.y > newY) {
          updatedInstance.y += step;
        }
      }
      state.vy = 0;
    } else {
      updatedInstance.y = newY;
    }

    state.onFloor = onFloor;
    return { updatedInstance, behaviorState: state };
  }
}
