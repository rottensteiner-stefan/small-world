/**
 * Represents a task queued in the ThreadPool.
 */
export interface ThreadTask<TData, TResult> {
    /** Internal task ID. */
    id: number;
    /** The stringified function to execute. */
    fnString: string;
    /** The serializable data to pass to the function. */
    data: TData;
    /** Optional objects to transfer ownership to the worker. */
    transferables: Transferable[];
    /** Resolve callback for the Promise. */
    resolve: (value: TResult) => void;
    /** Reject callback for the Promise. */
    reject: (reason: unknown) => void;
}
/**
 * A generic Web Worker pool for offloading heavy CPU tasks.
 * Uses Blob URLs to dynamically spawn workers without requiring external script files.
 *
 * @example
 * const pool = new ThreadPool();
 * const result = await pool.execute((data) => {
 *   // Heavy calculation here. Runs on a background thread!
 *   // NOTE: Cannot access variables outside this function's scope.
 *   return data.a + data.b;
 * }, { a: 10, b: 20 });
 */
export declare class ThreadPool {
    private _workers;
    private _idleWorkers;
    private _taskQueue;
    private _taskCounter;
    private _taskMap;
    /**
     * Creates a new ThreadPool.
     * @param poolSize The number of Web Workers to spawn. Defaults to navigator.hardwareConcurrency (or 4).
     */
    constructor(poolSize?: number);
    /**
     * Executes a function on a background worker thread.
     *
     * @param fn The function to execute. **WARNING:** This function is serialized to a string.
     *           It cannot access variables, imports, or context outside its own scope.
     *           Everything it needs must be passed in via the `data` parameter.
     * @param data The input data passed to the function. Must be JSON serializable.
     * @param transferables Optional array of Transferable objects to pass by reference (zero-copy).
     * @returns A Promise resolving with the function's return value.
     */
    execute<TData, TResult>(fn: (data: TData) => TResult | Promise<TResult>, data: TData, transferables?: Transferable[]): Promise<TResult>;
    /**
     * Processes the next task in the queue if an idle worker is available.
     */
    private _processQueue;
    /**
     * Handles messages returned from the Web Worker.
     */
    private _onWorkerMessage;
    /**
     * Handles fatal worker errors.
     */
    private _onWorkerError;
    /**
     * Terminates all workers and cleans up memory.
     */
    destroy(): void;
}
