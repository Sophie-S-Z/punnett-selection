"use client";

import { useEffect, useRef } from "react";

// Original procedural culture shader. CSS remains visible without WebGL.
// Rendering stops offscreen, in hidden tabs, and under reduced motion.
export function AmbientCulture() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, powerPreference: "low-power" });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      shaders.push(shader);
      gl.shaderSource(shader, source); gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vertex = compile(gl.VERTEX_SHADER, "attribute vec2 p; varying vec2 uv; void main(){uv=p;gl_Position=vec4(p,0.,1.);}");
    const fragment = compile(gl.FRAGMENT_SHADER, `precision mediump float;
      varying vec2 uv; uniform float t; uniform vec3 teal; uniform vec3 lilac;
      void main(){vec2 q=uv;float r=length(q);float a=atan(q.y,q.x);
        float wave=sin(a*5.+t*.15)*.03+sin(a*3.-t*.11)*.025;
        float ring=exp(-abs(r-.58-wave)*85.);
        float inner=exp(-abs(r-.38+wave)*95.)*.42;
        float halo=exp(-abs(r-.57)*9.)*.16;
        float grid=pow(max(0.,sin(q.x*28.+sin(q.y*5.+t*.12)*2.)*sin(q.y*28.)),18.)*.11;
        vec3 color=mix(teal,lilac,smoothstep(-.5,.6,q.x+q.y));
        float alpha=(ring+inner+halo+grid)*(1.-smoothstep(.8,1.,r));
        float opacity=clamp(alpha*.7,0.,1.);
        gl_FragColor=vec4(color*opacity,opacity);}`);
    const program = gl.createProgram();
    const buffer = gl.createBuffer();
    const dispose = () => { if (buffer) gl.deleteBuffer(buffer); if (program) gl.deleteProgram(program); shaders.forEach(shader => gl.deleteShader(shader)); };
    if (!vertex || !fragment || !program || !buffer) { dispose(); return; }
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { dispose(); return; }
    gl.useProgram(program); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "p");
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const color = (token: string) => {
      const hex = getComputedStyle(canvas).getPropertyValue(token).trim().replace("#", "");
      return [0,2,4].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255);
    };
    gl.uniform3fv(gl.getUniformLocation(program, "teal"), color("--glow"));
    gl.uniform3fv(gl.getUniformLocation(program, "lilac"), color("--mutant"));
    const time = gl.getUniformLocation(program, "t");
    let frame = 0; let last = 0; let visible = false; let lost = false;
    const draw = (timestamp: number) => {
      if (lost) return;
      if (timestamp - last > 50 || media.matches) {
        last = timestamp;
        const size = Math.min(600, Math.max(1, Math.floor(canvas.clientWidth * Math.min(devicePixelRatio, 1.5))));
        if (canvas.width !== size || canvas.height !== size) { canvas.width = size; canvas.height = size; gl.viewport(0, 0, size, size); }
        gl.uniform1f(time, media.matches ? 0 : timestamp / 1000);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      if (visible && !document.hidden && !media.matches) frame = requestAnimationFrame(draw);
    };
    const sync = () => { cancelAnimationFrame(frame); if (visible && !document.hidden && !lost) { last = 0; frame = requestAnimationFrame(draw); } };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const onLost = () => { lost = true; cancelAnimationFrame(frame); canvas.style.opacity = "0"; };
    observer.observe(canvas); media.addEventListener("change", sync); document.addEventListener("visibilitychange", sync); canvas.addEventListener("webglcontextlost", onLost);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); media.removeEventListener("change", sync); document.removeEventListener("visibilitychange", sync); canvas.removeEventListener("webglcontextlost", onLost); dispose(); };
  }, []);
  return <div className="ambient-culture" aria-hidden="true"><span className="culture-contour contour-one" /><span className="culture-contour contour-two" /><canvas ref={canvasRef} /></div>;
}
