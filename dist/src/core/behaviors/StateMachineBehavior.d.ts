import { Behavior } from './Behavior.js';
import { StateMachine } from '../fsm/index.js';
export declare class StateMachineBehavior<TState extends string, TContext, TEvent extends string = string> extends Behavior {
    readonly stateMachine: StateMachine<TState, TContext, TEvent>;
    constructor(stateMachine: StateMachine<TState, TContext, TEvent>);
    update(deltaTime: number): void;
}
