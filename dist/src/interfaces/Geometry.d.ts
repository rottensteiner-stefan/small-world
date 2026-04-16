import { GeometryDataInterface } from './GeometryData.js';
/**
 * Interface for all geometry types (Cube, Sphere, Plane, etc.).
 * Geometries are responsible for generating raw vertex and index data.
 */
export interface Geometry {
    /**
     * Returns the raw geometry data ready for GPU upload.
     * @returns The geometry data interface.
     */
    getGeometryData(): GeometryDataInterface;
}
