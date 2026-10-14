// 《一滴墨》MV：曲子的音符表直接驱动流体。墨和彩墨都按吸光度存（r,g,b 三个通道各吸多少光），叠在一起会变深，像真颜料。
// 小提琴 = 一支笔，音高定高低；鼓 = 打进流体的冲击；16 秒砸进来时颜色从墨里炸出来。逐帧顺序推进。
const FPS = 30, SUB = 2, DT = 1 / (FPS * SUB);
const SIM = [480, 270], DYE = [1920, 1080];
const S0 = +(new URLSearchParams(location.search).get('start') || 0);  // 片头对应曲子第几秒
const cv = document.getElementById('c');
const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');

// 颜料的吸光度（paper·exp(-A) 得到颜色），从纸墨色板反推
const INK = [1.25, 1.17, 1.06], CLAY = [0.28, 0.93, 1.35], INDIGO = [1.21, 1.03, 0.72], OCHRE = [0.21, 0.40, 0.94];
const CHORD = { Dm: INDIGO, Bb: CLAY, F: OCHRE, C: CLAY, Gm: INDIGO, A: OCHRE };

const VS = `#version 300 es
in vec2 p; out vec2 vUv; out vec2 vL; out vec2 vR; out vec2 vT; out vec2 vB; uniform vec2 tx;
void main(){ vUv=p*.5+.5; vL=vUv-vec2(tx.x,0.); vR=vUv+vec2(tx.x,0.); vT=vUv+vec2(0.,tx.y); vB=vUv-vec2(0.,tx.y); gl_Position=vec4(p,0.,1.); }`;
const LIB = `
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vn2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vn2(p);p*=2.03;a*=.5;}return s;}
`;
const FS = {
  splat: `
uniform sampler2D uT; uniform vec2 uPt; uniform vec4 uVal; uniform float uR, uAsp;
void main(){ vec2 d=vUv-uPt; d.x*=uAsp; o=texture(uT,vUv)+uVal*exp(-dot(d,d)/uR); }`,
  // 径向冲击：从 uPt 往外推（uAmt<0 往里吸）
  burst: `
uniform sampler2D uV; uniform vec2 uPt; uniform float uAmt, uR, uAsp, uSwirl;
void main(){ vec2 d=vUv-uPt; d.x*=uAsp; float r=length(d); vec2 n=d/(r+1e-4);
  float k=exp(-r*r/uR); vec2 v=texture(uV,vUv).xy+k*(uAmt*n+uSwirl*vec2(-n.y,n.x)); o=vec4(v,0.,1.); }`,
  forces: `
uniform sampler2D uV, uD; uniform float uDt, uN, uT, uPull, uG; uniform vec2 uC;
void main(){ vec2 v=texture(uV,vUv).xy; vec3 a=texture(uD,vUv).rgb; float m=a.r+a.g+a.b;
  float ang=6.2832*fbm(vUv*vec2(5.,2.8)+vec2(uT*.15,-uT*.1));
  v+=uDt*uN*min(m,1.5)*vec2(cos(ang),sin(ang));
  v.y-=uDt*uG*min(m,2.);
  vec2 d=(uC-vUv)*vec2(1.7778,1.); v+=uDt*uPull*d*smoothstep(.0,.15,length(d));
  o=vec4(v,0.,1.); }`,
  curl: `
uniform sampler2D uV;
void main(){ o=vec4(.5*(texture(uV,vR).y-texture(uV,vL).y-texture(uV,vT).x+texture(uV,vB).x),0.,0.,1.); }`,
  vort: `
uniform sampler2D uV, uC; uniform float uDt, uK;
void main(){ float L=texture(uC,vL).x,R=texture(uC,vR).x,T=texture(uC,vT).x,B=texture(uC,vB).x,C=texture(uC,vUv).x;
  vec2 f=.5*vec2(abs(T)-abs(B),abs(R)-abs(L)); f/=length(f)+1e-4; f*=uK*C; f.y*=-1.;
  o=vec4(texture(uV,vUv).xy+f*uDt,0.,1.); }`,
  div: `
uniform sampler2D uV;
void main(){ vec2 C=texture(uV,vUv).xy; float L=texture(uV,vL).x,R=texture(uV,vR).x,T=texture(uV,vT).y,B=texture(uV,vB).y;
  if(vL.x<0.)L=-C.x; if(vR.x>1.)R=-C.x; if(vT.y>1.)T=-C.y; if(vB.y<0.)B=-C.y;
  o=vec4(.5*(R-L+T-B),0.,0.,1.); }`,
  scale: `
uniform sampler2D uT; uniform float uK;
void main(){ o=texture(uT,vUv)*uK; }`,
  jacobi: `
uniform sampler2D uP, uDv;
void main(){ o=vec4((texture(uP,vL).x+texture(uP,vR).x+texture(uP,vB).x+texture(uP,vT).x-texture(uDv,vUv).x)*.25,0.,0.,1.); }`,
  grad: `
uniform sampler2D uP, uV;
void main(){ vec2 v=texture(uV,vUv).xy-vec2(texture(uP,vR).x-texture(uP,vL).x,texture(uP,vT).x-texture(uP,vB).x);
  o=vec4(v,0.,1.); }`,
  advect: `
uniform sampler2D uV, uS; uniform vec2 uVtx; uniform float uDt, uDiss;
void main(){ vec2 c=vUv-uDt*texture(uV,vUv).xy*uVtx; o=texture(uS,c)/(1.+uDiss*uDt); }`,
  // 纸：颜料按吸光度叠；浓淡交界处挤出深边（彩墨的边），薄处被纸纹吃掉一点
  display: `
uniform sampler2D uD; uniform vec2 uStx;
float S(vec2 p){vec3 a=texture(uD,p).rgb;return a.r+a.g+a.b;}
void main(){ vec2 uv=vUv; vec3 A=texture(uD,uv).rgb; float m=A.r+A.g+A.b;
  float e=length(vec2(S(uv+vec2(uStx.x,0.))-S(uv-vec2(uStx.x,0.)),S(uv+vec2(0.,uStx.y))-S(uv-vec2(0.,uStx.y))));
  float grain=fbm(uv*vec2(220.,124.));
  float thin=1.-smoothstep(.05,.6,m);
  A/=1.+.3*max(0.,m-1.2);  // 很浓的地方留一点透光，不压成纯黑
  vec3 Ae=A*(1.+2.2*clamp(e*3.,0.,1.))*(1.-.45*thin*grain);
  float g=fbm(uv*vec2(48.,27.))*.06+h2(floor(uv*vec2(1920.,1080.)))*.03;
  vec3 paper=vec3(.969,.949,.902)*(1.-.04*fbm(uv*vec2(3.,2.)))-g*.5;
  o=vec4(paper*exp(-Ae*1.15),1.); }`,
};

function compile(fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB; out vec4 o;
${LIB}${fs}`]]) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, 'p'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}
const P = Object.fromEntries(Object.entries(FS).map(([k, v]) => [k, compile(v)]));
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

function target([w, h]) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, w, h, 0, gl.RGBA, gl.FLOAT, null);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  return { t, f, w, h };
}
const pair = s => { const a = target(s), b = target(s); return { r: a, w: b, swap() { [this.r, this.w] = [this.w, this.r]; } }; };
const vel = pair(SIM), dye = pair(DYE), prs = pair(SIM), div = target(SIM), curl = target(SIM);

let unit = 0;
function run(name, out, uni) {
  const { p, u } = P[name]; gl.useProgram(p); unit = 0;
  const [w, h] = out ? [out.w, out.h] : [cv.width, cv.height];
  gl.uniform2f(u.tx, 1 / w, 1 / h);
  for (const [k, v] of Object.entries(uni)) {
    if (!u[k]) continue;
    if (v && v.t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, v.t); gl.uniform1i(u[k], unit++); }
    else if (typeof v === 'number') gl.uniform1f(u[k], v);
    else gl[`uniform${v.length}f`](u[k], ...v);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null); gl.viewport(0, 0, w, h);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
const ASP = 16 / 9;
const paint = (pt, pig, amt, r) => { run('splat', dye.w, { uT: dye.r, uPt: pt, uVal: [pig[0] * amt, pig[1] * amt, pig[2] * amt, 0], uR: r, uAsp: ASP }); dye.swap(); };
const push = (pt, v, r) => { run('splat', vel.w, { uT: vel.r, uPt: pt, uVal: [v[0], v[1], 0, 0], uR: r, uAsp: ASP }); vel.swap(); };
const burst = (pt, amt, r, swirl = 0) => { run('burst', vel.w, { uV: vel.r, uPt: pt, uAmt: amt, uR: r, uAsp: ASP, uSwirl: swirl }); vel.swap(); };

// ── 音符表 → 画面事件 ──
const get = url => { const x = new XMLHttpRequest(); x.open('GET', url, false); x.send(); return JSON.parse(x.responseText); };
const EV = get('events.json').map(([i, note, s, d, v]) => ({ i, note, s, d, v }));
const MIDI = n => { const m = n.match(/^([A-G])(#?)(-?\d)$/); return 12 * (+m[3] + 1) + { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0); };
const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ev = (i, a, b) => EV.filter(e => (i instanceof RegExp ? i.test(e.i) : e.i === i) && e.s >= a && e.s < b);
const CENTER = [0.5, 0.52];
// 各段和弦（每 2 秒一个），给底鼓和长和弦上色
const PROG = [[16, 'Dm Bb F C'], [32, 'Dm Bb A Dm'], [40, 'Bb C Dm A'], [48, 'Bb C Dm Dm Gm A Bb A'], [64, 'Dm Bb F C Dm Bb F C']];
const chordAt = s => { const [s0, p] = PROG.filter(([a]) => a <= s).pop() || PROG[0]; const c = p.split(' '); return c[Math.floor((s - s0) / 2) % c.length]; };
const colorAt = s => CHORD[chordAt(s)];

// 笔：小提琴独奏的音高 → 高度；每 8 秒一行谱，从左写到右
const solo = EV.filter(e => e.i === 'vsolo').sort((a, b) => a.s - b.s);
const pitchY = m => Math.min(0.88, Math.max(0.14, 0.3 + 0.45 * (m - 64) / 20));
function penAt(s) {
  let k = solo.findIndex(e => e.s > s); if (k < 0) k = solo.length; const cur = solo[Math.max(0, k - 1)];
  const nx = solo[k] || cur, a = cur.s, b = nx.s;
  const g = sm(b - Math.min(0.1, (b - a) * 0.5), b, s);  // 换音前一小段滑过去，像换把
  const y = pitchY(MIDI(cur.note)) * (1 - g) + pitchY(MIDI(nx.note)) * g;
  const x = 0.1 + 0.8 * (s % 8) / 8;
  const on = s >= cur.s - 0.02 && s < cur.s + cur.d + 0.08;
  return { x, y, on, v: cur.v, att: Math.exp(-(s - cur.s) * 5), line: Math.floor(s / 8) };
}
const PEN_OFF = [[78, 84]];  // 齐奏停顿和落 D 时笔不写

const once = [], spans = [];
const at = (s, f) => once.push([s, f]);
const span = (a, b, f) => spans.push([a, b, f]);  // 每个模拟小步都调用 f(进度 0..1)

// 一滴墨：从上方落下，重力只开一小会儿，靠落点前的托力停在中心附近
const drop = (s0, amt, rad) => {
  at(s0, () => { paint([0.5, 0.8], INK, amt, rad); push([0.5, 0.8], [0, -200], 0.001); });
  span(s0, s0 + 0.32, () => { G = 2600; });
  at(s0 + 0.55, () => push([0.5, 0.5], [0, 420], 0.006));
};
const harpSplash = (a, b, land) => ev('harp', a, b).forEach((e, k) => at(Math.max(e.s, land), () => {
  const ang = -0.6 + 1.2 * (k % 4) / 3 + Math.PI * (k % 2), p = [CENTER[0] + 0.08 * Math.cos(ang), CENTER[1] + 0.1 * Math.sin(ang)];
  paint(p, INK, 0.8 * e.v, 0.00005); burst(p, 120 * e.v, 0.0004);
}));
const fade = (a, b, k) => span(a, b, () => { FADE *= Math.pow(k, DT / (b - a)); });

// 0–16 水墨引子
drop(0, 2.2, 0.00032); harpSplash(0, 1, 0.5); at(0.5, () => burst(CENTER, 200, 0.004, 100));
drop(7.5, 1.6, 0.00026); harpSplash(8, 9, 8.05); at(8.05, () => burst(CENTER, 260, 0.004, 120));
ev('sc', 0, 16).forEach(e => at(e.s, () => { const p = [0.08 + 0.84 * (e.s % 8) / 8, 0.14 + 0.02 * hash(e.s)]; paint(p, INK, 0.5 * e.v, 0.00004); burst(p, 60 * e.v, 0.0003); }));
ev('sv', 0, 16).forEach(e => at(e.s, () => paint([0.08 + 0.84 * (e.s % 8) / 8, 0.86 + 0.04 * (MIDI(e.note) - 62) / 10], INK, 0.35 * e.v, 0.00003)));
const pullTo = (a, b, k) => span(a, b, p => { PULL = k * sm(0, 1, p); });
pullTo(14.2, 15.95, 260); pullTo(46.2, 47.95, 220);
const tomRing = (a, b) => ev(/^t\d$/, a, b).forEach((e, k, all) => at(e.s, () => {
  const ang = Math.PI * (1 - k / Math.max(1, all.length - 1)), p = [CENTER[0] + 0.16 * Math.cos(ang), CENTER[1] + 0.2 * Math.sin(ang)];
  burst(p, 260 * e.v, 0.0008); paint(p, colorAt(e.s + 0.5), 0.5, 0.00008);
}));
tomRing(15, 16.1); tomRing(31, 32.1); tomRing(62.9, 64.1);

// 砸进来：几个偏开的冲击 + 六瓣颜色甩出去（一个大冲击会炸成正圆盘）
const bloomBurst = (c, size, pigs) => {
  for (let k = 0; k < 7; k++) {
    const a = 6.2832 * (k / 7 + 0.13 * hash(k + c[0] * 9)), r = Math.max(0.8, size) * (0.03 + 0.06 * hash(k + 9));
    burst([c[0] + r * Math.cos(a), c[1] + 1.6 * r * Math.sin(a)], size * (700 + 900 * hash(k + 3)), 0.003 + 0.006 * hash(k + 5), 400 * (hash(k + 7) - 0.5));
  }
  pigs.forEach((pig, k) => {
    const a = 6.2832 * (k / pigs.length + 0.08) + 0.5 * hash(k + 20 + c[1] * 7);
    for (let j = 1; j < 5; j++) {  // 正中心不上颜色，否则会缩成一个深色圆球
      const r = Math.max(0.8, size) * (0.02 + 0.035 * j), p = [c[0] + r * Math.cos(a + 0.15 * j), c[1] + 1.7 * r * Math.sin(a + 0.15 * j)];
      paint(p, pig, (1.7 - 0.3 * j) * Math.min(1, size + 0.3), 0.0005 + 0.0003 * hash(k * 4 + j)); push(p, [900 * size * Math.cos(a), 900 * size * Math.sin(a)], 0.0008);
    }
  });
};
const ALL = [INDIGO, CLAY, OCHRE, CLAY, INDIGO, OCHRE];
// 炸开的几种形式（size≈力度，pigs=用哪几种颜色）。纵向乘 1.7 补画面宽高比
const pol = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + 1.7 * r * Math.sin(a)];
// 旋臂：颜色顺着几条螺旋臂甩出去
const spiral = (c, size, pigs, turn = 1) => pigs.forEach((pig, j) => {
  const a0 = 6.2832 * j / pigs.length + hash(j + c[0]);
  for (let t = 1; t < 8; t++) {
    const a = a0 + turn * t * 0.5, r = size * (0.015 + 0.022 * t), p = pol(c, r, a);
    paint(p, pig, (1.4 - 0.12 * t) * Math.min(1, size + 0.3), 0.00035);
    push(p, [size * (-1000 * turn * Math.sin(a) + 450 * Math.cos(a)), size * 1.7 * (1000 * turn * Math.cos(a) + 450 * Math.sin(a))], 0.0007);
  }
});
// 扇泼：从 c 朝 dir 方向泼出一扇
const fan = (c, size, pigs, dir) => {
  for (let k = 0; k < 9; k++) {
    const a = dir + (k - 4) * 0.13 + 0.05 * (hash(k + c[1]) - 0.5);
    for (let t = 0; t < 6; t++) {
      const r = 0.02 + 0.035 * t, p = pol(c, r, a);
      push(p, [1500 * size * (1 - t / 7) * Math.cos(a), 1500 * size * (1 - t / 7) * Math.sin(a)], 0.0006);
      if (t > 0 && t < 3 && k % 2 === 0) paint(p, pigs[(k / 2 + t) % pigs.length], 0.7 * size, 0.0002);  // 色只点在偶数条上，全点会在源头堆成黑团
    }
  }
};
// 皇冠：一圈小水花同时往外溅
const crown = (c, size, pigs) => {
  const n = 13;
  for (let k = 0; k < n; k++) {
    const a = 6.2832 * (k + 0.3 * hash(k)) / n, p = pol(c, size * 0.13, a);
    paint(p, pigs[k % pigs.length], 1.3 * size, 0.00012); burst(p, 500 * size, 0.0006);
    push(pol(c, size * 0.15, a), [700 * size * Math.cos(a), 1.7 * 700 * size * Math.sin(a)], 0.0005);
  }
  burst(c, 300 * size, 0.004);
};
// 对撞：两股颜色从两侧冲向 c，撞处挤出深边
const collide = (c, size, A, B, ang = 0) => {
  for (let t = 0; t < 7; t++) for (const [side, pig] of [[-1, A], [1, B]]) {
    const r = 0.04 + 0.04 * t, p = [c[0] + side * r * Math.cos(ang), c[1] + side * 1.7 * r * Math.sin(ang) + 0.012 * side];
    push(p, [-side * 1600 * size * Math.cos(ang), -side * 1600 * size * Math.sin(ang)], 0.0009);
    if (t < 5) paint(p, pig, 1.1 * size, 0.0004);
  }
};
// 切割：一刀切过 c，刀口上下反向错开，卷出一排浪花
const slash = (c, size, pigs, ang) => {
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  for (let t = -6; t <= 6; t++) {
    const p = [c[0] + 0.035 * t * Math.cos(ang), c[1] + 0.035 * t * Math.sin(ang)];
    for (const sd of [-1, 1]) push([p[0] + sd * 0.012 * nx, p[1] + sd * 0.02 * ny], [sd * 1500 * size * Math.cos(ang), sd * 1500 * size * Math.sin(ang)], 0.0003);
    paint(p, pigs[(t + 6) % pigs.length], 1.0 * size, 0.0002);
  }
};
// 升腾：从下往上冲一柱，顶上翻成蘑菇
const plume = (c, size, pigs) => {
  for (let t = 0; t < 8; t++) {
    const p = [c[0] + 0.01 * Math.sin(t * 2.1), c[1] - 0.3 + 0.04 * t];
    push(p, [0, 1700 * size * (1 - t / 10)], 0.0012);
    if (t < 4) paint(p, pigs[t % pigs.length], 1.1 * size, 0.00025);
  }
};
at(16, () => bloomBurst(CENTER, 1, ALL));

// 摇滚段的鼓：底鼓 = 冲击 + 当前和弦色；军鼓 = 横着抽一道；踩镲 = 上方细点
const rockDrums = (a, b) => {
  ev('kick', a, b).forEach((e, k) => at(e.s, () => {
    const p = [0.22 + 0.56 * hash(k * 3.1 + a), 0.28 + 0.44 * hash(k * 7.7 + a)];
    burst(p, 1100 * e.v * e.v, 0.009, 0);
    for (let j = 0; j < 3; j++) {  // 颜色点在冲击外圈，让旋涡拉成旋臂（点在正中会留成一个圆片）
      const a2 = 6.2832 * (j / 3 + hash(k + j * 0.37)); paint([p[0] + 0.035 * Math.cos(a2), p[1] + 0.06 * Math.sin(a2)], colorAt(e.s), (s >= 48 && s < 64 ? 1.5 : 1.1) * e.v, 0.0003);
    }
  }));
  ev('snare', a, b).forEach((e, k) => at(e.s, () => {
    const y = 0.25 + 0.5 * hash(k * 5.3 + a), dir = k % 2 ? 1 : -1;
    for (let j = 0; j < 5; j++) {
      const p = [0.5 + dir * (0.3 - 0.12 * j), y + 0.02 * j];
      push(p, [dir * -1400 * e.v, 120 * (j - 2)], 0.0008); paint(p, INDIGO, 0.25 * e.v, 0.00012);
    }
  }));
  ev('hat', a, b).forEach((e, k) => at(e.s, () => paint([0.1 + 0.8 * hash(k * 1.7 + a), 0.82 + 0.1 * hash(k * 9.1 + a)], OCHRE, 0.5 * e.v, 0.00004)));
};
rockDrums(16.01, 32);

// 32–40 中段：颜色被水冲淡；底鼓心跳 = 中心轻轻一跳；竖琴 = 零星墨点
at(32, () => crown(CENTER, 0.7, [INDIGO, OCHRE]));
fade(32.2, 35, 0.22);
ev('kick', 32.1, 40).forEach((e, k) => at(e.s, () => { burst(CENTER, 260 * e.v, 0.01, 60); if (k % 2 === 0) paint([CENTER[0] + 0.06 * Math.cos(k), CENTER[1] + 0.1 * Math.sin(k)], INDIGO, 0.3 * e.v, 0.00015); }));
ev('harp', 32, 40).forEach((e, k) => at(e.s, () => { const p = [0.15 + 0.7 * hash(k * 2.3), 0.2 + 0.6 * hash(k * 4.9)]; paint(p, INK, 0.6 * e.v, 0.00005); burst(p, 80, 0.0003); }));

// 40–48 半速：每个长和弦一大团颜色慢慢洇开；军鼓照抽；末尾滚奏一路抽向中心
ev('gl', 40, 48).filter(e => e.d > 1).filter((e, k, arr) => arr.findIndex(x => x.s === e.s) === k).forEach((e, k) => at(e.s, () => {
  const p = [[0.3, 0.6], [0.7, 0.42], [0.35, 0.35], [0.66, 0.66]][k % 4], pig = colorAt(e.s + 0.1);
  for (let j = 0; j < 5; j++) {
    const a = 6.2832 * (j / 5 + hash(k + j)), q = [p[0] + 0.05 * Math.cos(a), p[1] + 0.08 * Math.sin(a)];
    paint(q, pig, 0.55, 0.004 + 0.002 * hash(j + k)); burst(q, 160, 0.01, 40);
  }
}));
at(40, () => bloomBurst(CENTER, 0.5, [CLAY]));
rockDrums(40.5, 46.9);
ev('snare', 46.9, 48).forEach((e, k, all) => at(e.s, () => { const a = 6.2832 * k / all.length, p = [CENTER[0] + 0.3 * Math.cos(a), CENTER[1] + 0.4 * Math.sin(a)]; push(p, [-900 * Math.cos(a) * e.v, -900 * Math.sin(a) * e.v], 0.0015); }));

// 48–64 高潮：每小节一记镲 = 一次开花；鼓照抽，颜色最满
// 高潮每小节一记镲，每次换一种炸法
const HI_FORMS = [
  (c, v, col) => bloomBurst(c, 0.8 * v, [col, CLAY, OCHRE]),
  (c, v, col) => collide(c, 0.9 * v, col, OCHRE, 0.15),
  (c, v, col) => spiral(c, 0.9 * v, col === INDIGO ? [INDIGO, OCHRE] : [col, OCHRE, CLAY], 1),
  (c, v, col) => fan([0.12, c[1]], 1.0 * v, col === INDIGO ? [INDIGO, CLAY] : [col, OCHRE], 0.1),
  (c, v, col) => crown(c, 1.0 * v, [col, OCHRE, CLAY]),
  (c, v, col) => slash(c, 1.0 * v, [col, OCHRE], -0.35),
  (c, v, col) => plume([c[0], 0.55], 0.9 * v, col === INDIGO ? [INDIGO, OCHRE] : [col, OCHRE]),
  (c, v, col) => { spiral(c, 0.75 * v, [CLAY, OCHRE], -1); bloomBurst(c, 0.45 * v, [INDIGO]); },
];
ev('crash', 48, 64).forEach((e, k) => at(e.s, () => HI_FORMS[k % HI_FORMS.length]([0.32 + 0.36 * hash(k * 3.3), 0.4 + 0.2 * hash(k * 5.1)], e.v, colorAt(e.s))));
rockDrums(48.01, 64);

// 64–78 主题回来：先冲淡一半再上色
fade(63.6, 64.2, 0.5);
at(64, () => bloomBurst(CENTER, 0.9, ALL));
ev('crash', 64.5, 78).forEach((e, k) => at(e.s, () => { const c = [0.35 + 0.3 * hash(k + 70), 0.4 + 0.2 * hash(k + 80)], col = colorAt(e.s);
  [() => collide(c, 0.6 * e.v, col, OCHRE, -0.2), () => fan([0.88, c[1]], 0.7 * e.v, [col, OCHRE], Math.PI - 0.1), () => crown(c, 0.7 * e.v, [col, OCHRE])][k % 3](); }));
rockDrums(64.01, 78);

// 78–80 齐奏三下：左、中、右，然后整幅画定住
ev('crash', 78, 80).forEach((e, k) => at(e.s, () => [() => fan([0.1, 0.45], 0.8, [CLAY, OCHRE], 0.15), () => fan([0.9, 0.55], 0.8, [INDIGO, OCHRE], Math.PI + 0.15), () => crown([0.5, 0.5], 0.8, [CLAY, OCHRE, INDIGO])][k]()));
span(79.62, 79.98, () => { FREEZE = 0.8; });
// 80 落在 D：最后一次开花，然后慢慢褪回纸色
at(80, () => { bloomBurst(CENTER, 1.0, ALL); spiral(CENTER, 0.7, [OCHRE, CLAY, INDIGO], 1); });
fade(81, 84.6, 0.04);
// 84 起尾声：竖琴几粒墨点，小提琴在白纸上写最后一句；最后一滴墨落在中心
ev('harp', 84, 85).forEach((e, k) => at(e.s, () => { const p = [0.2 + 0.15 * k, 0.72 - 0.04 * k]; paint(p, INK, 0.5 * e.v, 0.00004); burst(p, 60, 0.0003); }));
drop(86.7, 1.4, 0.00022); at(87.25, () => burst(CENTER, 160, 0.004, 80));
once.sort((a, b) => a[0] - b[0]);

let s = S0, frame = -1, qi = 0, last = null, G = 0, PULL = 0, FADE = 1, FREEZE = 1;
function step() {
  while (qi < once.length && once[qi][0] < s + DT) { if (once[qi][0] >= S0 - 0.5) once[qi][1](); qi++; }
  G = 0; PULL = 0; FADE = 1; FREEZE = 1;
  for (const [a, b, f] of spans) if (s >= a && s < b) f((s - a) / (b - a));
  const calm = s < 16 || (s >= 32 && s < 40) || s >= 84;
  if (s >= 0.4 && !PEN_OFF.some(([a, b]) => s >= a && s < b)) {
    const p = penAt(s);
    if (last && p.line !== last.line) last = null;  // 换行
    const amt = (calm ? 1.1 : 1.4) * p.v * (p.on ? 0.85 + 0.35 * p.att : 0.45);
    const pts = last ? [[(p.x + last.x) / 2, (p.y + last.y) / 2], [p.x, p.y]] : [[p.x, p.y]];  // 每小步补一个中点，线不断成珠子
    for (const q of pts) paint(q, INK, amt / pts.length, calm ? 0.000022 : 0.00003);
    last = p;
  }
  if (FADE < 1) { run('scale', dye.w, { uT: dye.r, uK: FADE }); dye.swap(); }
  if (FREEZE < 1) { run('scale', vel.w, { uT: vel.r, uK: FREEZE }); vel.swap(); }
  run('forces', vel.w, { uV: vel.r, uD: dye.r, uDt: DT, uN: calm ? 40 : 110, uT: s, uPull: PULL, uC: CENTER, uG: G }); vel.swap();
  run('curl', curl, { uV: vel.r });
  run('vort', vel.w, { uV: vel.r, uC: curl, uDt: DT, uK: calm ? 10 : 26 }); vel.swap();
  run('div', div, { uV: vel.r });
  run('scale', prs.w, { uT: prs.r, uK: 0.8 }); prs.swap();
  for (let i = 0; i < 30; i++) { run('jacobi', prs.w, { uP: prs.r, uDv: div }); prs.swap(); }
  run('grad', vel.w, { uP: prs.r, uV: vel.r }); vel.swap();
  run('advect', vel.w, { uV: vel.r, uS: vel.r, uVtx: [1 / SIM[0], 1 / SIM[1]], uDt: DT, uDiss: calm ? 0.5 : 0.9 }); vel.swap();
  const hot = (s >= 48 && s < 64) || (s >= 78 && s < 81);  // 高潮和收尾重击褪得更快，不然颜色越叠越浑
  run('advect', dye.w, { uV: vel.r, uS: dye.r, uVtx: [1 / SIM[0], 1 / SIM[1]], uDt: DT, uDiss: calm ? 0.01 : hot ? 0.14 : 0.06 }); dye.swap();
  s += DT;
}

window.renderTo = f => {
  if (f < frame) throw new Error('frames must go forward');
  while (frame < f) { for (let i = 0; i < SUB; i++) step(); frame++; }
  run('display', null, { uD: dye.r, uStx: [1 / DYE[0], 1 / DYE[1]] });
  gl.finish();
  return cv.toDataURL('image/jpeg', 0.94);
};
window.ready = true;
