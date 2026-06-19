import { AbstractExample } from '../core/index.js';
/**
 * Example 9: A classic 2.5D Jump & Run with pure code physics and collision!
 */
export declare class Example9 extends AbstractExample {
    private _player;
    private _blocks;
    private _velocity;
    private _gravity;
    private _jumpForce;
    private _moveSpeed;
    private _isGrounded;
    private _levelMap;
    protected setupScene(): Promise<void>;
    private _getAABB;
    private _checkCollision;
    protected update(deltaTime: number): void;
}
