export declare const WireframeVS_300 = "#version 300 es\nin vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;\nvoid main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }";
export declare const WireframeFS_300 = "#version 300 es\nprecision highp float; uniform vec4 u_color; out vec4 c;\nvoid main() { c = u_color; }";
export declare const WireframeVS_100 = "\nattribute vec3 a_position; uniform mat4 u_vp; uniform mat4 u_model;\nvoid main() { gl_Position = u_vp * u_model * vec4(a_position, 1.0); }";
export declare const WireframeFS_100 = "\nprecision highp float; uniform vec4 u_color;\nvoid main() { gl_FragColor = u_color; }";
