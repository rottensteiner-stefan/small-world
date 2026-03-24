import { Matrix4 } from '../Matrix4.js';
import { ProjectionType } from '../../enums/ProjectionType.js';
export declare abstract class AbstractProjection {
    abstract readonly type: ProjectionType;
    protected matrix: Matrix4;
    abstract getMatrix(): Matrix4;
    abstract update(): void;
}
