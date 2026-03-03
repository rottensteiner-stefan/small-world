export class Line {
    constructor(public start:[number,number,number], public dir:[number,number,number], public len:number) {}
    getPrimitiveData() {
        const end = [this.start[0]+this.dir[0]*this.len, this.start[1]+this.dir[1]*this.len, this.start[2]+this.dir[2]*this.len];
        return { vertices: new Float32Array([...this.start, ...end]), indices: new Uint16Array([0, 1]) };
    }
}
