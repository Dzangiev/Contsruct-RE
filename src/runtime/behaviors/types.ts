import { Instance, Project, Layout } from '../../model/project';

export interface BehaviorContext {
  dt: number;
  project: Project;
  layout: Layout;
  instances: Instance[];
  keysDown: Set<string>;
  keysPressed: Set<string>;
  pointerPos: { x: number; y: number };
  behaviorsState: Record<string, any>; // state for this specific behavior on this instance
}

export interface BehaviorResult {
  updatedInstance: Instance;
  behaviorState: Record<string, any>;
}

export interface IBehavior {
  tick(inst: Instance, props: Record<string, any>, context: BehaviorContext): BehaviorResult;
}
