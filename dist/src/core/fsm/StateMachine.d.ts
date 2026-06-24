export interface StateConfig<TState extends string, TContext, TEvent extends string = string> {
    onEnter?: (context: TContext, previousState: TState | null) => void;
    onUpdate?: (context: TContext, deltaTime: number, stateDuration: number) => void;
    onExit?: (context: TContext, nextState: TState) => void;
    autoTransition?: {
        duration: number;
        nextState: TState;
    };
    transitions?: Partial<Record<TEvent, TState>>;
}
export declare class StateMachine<TState extends string, TContext, TEvent extends string = string> {
    private _states;
    private _currentState;
    private _previousState;
    private _stateDuration;
    readonly context: TContext;
    constructor(context: TContext);
    addState(state: TState, config: StateConfig<TState, TContext, TEvent>): this;
    get currentState(): TState | null;
    get previousState(): TState | null;
    get stateDuration(): number;
    transitionTo(nextState: TState): void;
    sendEvent(event: TEvent): void;
    update(deltaTime: number): void;
}
