export class Circle {
    constructor(public r:number, public s:number=32) {}
    getPrimitiveData() {
        const v:number[] = []; const i:number[] = [];
        for (let s=0; s<this.s; s++) {
            const rad = (s/this.s)*Math.PI*2; v.push(Math.cos(rad)*this.r, 0, Math.sin(rad)*this.r);
            i.push(s, (s+1)%this.s);
        }
        return { vertices: new Float32Array(v), indices: new Uint16Array(i) };
    }
}
