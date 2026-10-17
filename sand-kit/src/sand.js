// 沙画：灯箱上的一层沙，底下透光。沙按厚度存（单位约等于像素高），薄处透出琥珀色的光，厚处发黑。
// 动作：撒（加沙）、指尖划（中间清空、沙推到两边起棱）、手掌抹（把沙摊匀）；每步都按休止角让陡坡往下滑。
const FPS = 30, SUB = 2;
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const gl = cv.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false });
gl.getExtension('EXT_color_buffer_float');
gl.getExtension('OES_texture_float_linear');

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position=vec4(p,0.,1.); }`;
const LIB = `
uniform sampler2D uH; uniform float uSeed;
uint hx(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;}
float h1(vec2 p){uvec2 u=floatBitsToUint(p);return float(hx(u.x^hx(u.y+0x9e3779b9u))>>8)/16777216.;}  // 整数哈希：sin 哈希在大坐标上会成片返回 0
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h1(i),h1(i+vec2(1,0)),f.x),mix(h1(i+vec2(0,1)),h1(i+vec2(1,1)),f.x),f.y);}
float S(vec2 px){return texture(uH,px/vec2(${W}.,${H}.)).r;}
`;
const FS = {
  // 撒：一团高斯形的沙，颗粒疏密不匀，外圈溅出零星沙粒
  pour: `
uniform vec2 uP; uniform float uR, uAmt, uSplash;
void main(){ vec2 x=gl_FragCoord.xy; float h=S(x); float d=length(x-uP);
  float core=uAmt*exp(-d*d/(uR*uR))*(.35+1.3*h1(x+uSeed));
  float sp=(h1(x+vec2(uSeed,-uSeed))<uSplash*exp(-d*d/(9.*uR*uR))?1.:0.)*uAmt*2.5;
  o=vec4(h+core+sp,0.,0.,1.); }`,
  // 指尖划过：线段 uA→uB，半径 uR 内清掉 uHard 那么多，清掉的沙按法线方向堆到外沿 uK 宽的一圈上
  carve: `
uniform vec2 uA, uB; uniform float uR, uK, uHard;
float cut(float r){return uHard*(1.-smoothstep(uR*.5,uR,r));}
void main(){ vec2 x=gl_FragCoord.xy; float h=S(x); vec2 ab=uB-uA;
  float t=clamp(dot(x-uA,ab)/max(dot(ab,ab),1e-4),0.,1.); vec2 q=uA+ab*t; vec2 dv=x-q; float d=length(dv);
  vec2 n=d>1e-3?dv/d:vec2(1.,0.);
  if(d<uR){ o=vec4(h*(1.-cut(d)),0.,0.,1.); return; }
  if(d<uR+uK){ float g=0.; for(int i=0;i<10;i++){ float r=uR*(float(i)+.5)/10.; g+=S(q+n*r)*cut(r); } g*=uR/10.;
    float p=2.*(uR+uK-d)/(uK*uK);  // 三角形分布，紧贴沟边最高
    // 只往两边堆，不往指尖前面堆：否则每一步都把前面那堆再推一遍，越滚越大，一路犁过去
    float fw=(t>=.9999)?.5*(1.-dot(n,normalize(ab+vec2(1e-5,0.)))):1.;
    o=vec4(h+g*p*fw,0.,0.,1.); return; }
  o=vec4(h,0.,0.,1.); }`,
  // 手掌抹：胶囊形区域里做守恒扩散，沙被摊匀
  spread: `
uniform vec2 uA, uB; uniform float uR, uD;
float w(vec2 x){ vec2 ab=uB-uA; float t=clamp(dot(x-uA,ab)/max(dot(ab,ab),1e-4),0.,1.); float d=length(x-uA-ab*t);
  return 1.-smoothstep(uR*.6,uR,d); }
void main(){ vec2 x=gl_FragCoord.xy; float h=S(x); float wx=w(x); float acc=0.;
  for(int i=0;i<4;i++){ vec2 o2=i==0?vec2(1,0):i==1?vec2(-1,0):i==2?vec2(0,1):vec2(0,-1);
    acc+=.5*(wx+w(x+o2))*(S(x+o2)-h); }
  o=vec4(h+uD*acc,0.,0.,1.); }`,
  // 手掌推：掌下只留一层 uL 厚的沙（按垂直方向的噪声分出一道道掌纹），多出来的跟着手往前推，停手处堆成一道
  drag: `
uniform vec2 uA, uB; uniform float uR, uL, uAsp, uStreak;  // uAsp：掌在前进方向上有多扁，默认 1.6；横着的一条掌沿用 12
vec2 m;
float ex(vec2 y){ vec2 r=y-uA; float along=dot(r,m), perp=dot(r,vec2(-m.y,m.x));
  float w=1.-smoothstep(.45,1.,length(vec2(along*(uAsp>0.?uAsp:1.6),perp))/uR);
  float st=uStreak>0.?uStreak:1.;  // 掌纹和大块厚薄的强度，1 是原样
  float L=uL*mix(1.,.25+1.5*vn(vec2(perp*.08,3.1))*(.5+.5*vn(vec2(perp*.35,9.7))),st)*mix(1.,.35+1.3*vn(y*.006),st);  // 掌纹 × 大块的厚薄
  return w*max(0.,S(y)-L); }
void main(){ vec2 x=gl_FragCoord.xy; vec2 d=uB-uA; m=normalize(d+vec2(1e-4,0.));
  o=vec4(S(x)-ex(x)+ex(x-d),0.,0.,1.); }`,
  // 休止角：比邻格高出阈值的部分往下滑；阈值按「一对格子」取随机，保证守恒，边缘才不规整
  slide: `
uniform float uT, uRate;
float jit(vec2 a){return .55+.9*h1(floor(a)*.731);}
void main(){ vec2 x=gl_FragCoord.xy; float h=S(x); float dh=0.;
  const vec2 OFF[8]=vec2[8](vec2(1,0),vec2(-1,0),vec2(0,1),vec2(0,-1),vec2(1,1),vec2(-1,-1),vec2(1,-1),vec2(-1,1));
  for(int i=0;i<8;i++){ vec2 o2=OFF[i];
    float L=length(o2); float hn=S(x+o2); float T=uT*L*.5*(jit(x)+jit(x+o2));
    dh+=uRate/L*(max(0.,hn-h-T)-max(0.,h-hn-T)); }
  o=vec4(max(h+dh,0.),0.,0.,1.); }`,
  // 满屏铺沙：厚薄按大块噪声起伏
  fill: `
uniform float uAmt;
void main(){ vec2 x=gl_FragCoord.xy; o=vec4(S(x)+uAmt*(.7+.6*vn(x*.004+3.)+.25*vn(x*.03)),0.,0.,1.); }`,
  // 手掌按：杏仁形（上尖下圆）里的沙压到 uCap 那么厚，形外一圈刮掉大半；每步只做 uK 那么多，按下去是渐渐的
  press: `
uniform vec2 uP; uniform float uA, uB, uCap, uK, uRing;
void main(){ vec2 x=gl_FragCoord.xy; float h=S(x); vec2 r=(x-uP)/vec2(uA,uB);
  float k=1.-.28*pow(max(0.,r.y),2.);  // GL 的 y 向上，r.y>0 是画面上半，收窄成尖
  float e=length(vec2(r.x/k,r.y));
  float inside=1.-smoothstep(.92,1.02,e), ring=smoothstep(.92,1.02,e)*(1.-smoothstep(1.02,1.3,e));
  float cap=uCap*(.85+.3*vn(x*.05))*mix(1.,.6+.8*vn(x*.0025+5.),uRing<.5&&uA>1000.?1.:0.);  // 按平整片时留出大块的明暗
  float t=mix(h,min(h,cap),inside); t=mix(t,t*.35,ring*uRing);
  o=vec4(mix(h,t,uK),0.,0.,1.); }`,
  // 抹开一块三角：从 uO 往外，前沿 uFront 以内的沙每步抹掉 30%，前沿带一点不规则
  wipeTri: `
uniform vec2 uA, uB, uC, uO; uniform float uFront;
float ed(vec2 p, vec2 a, vec2 b){ vec2 e=b-a; vec2 n=normalize(vec2(e.y,-e.x)); return dot(p-a,n); }
void main(){ vec2 x=gl_FragCoord.xy; float h=S(x);
  float s0=sign(ed(uC,uA,uB));
  float d=min(min(s0*ed(x,uA,uB),s0*ed(x,uB,uC)),s0*ed(x,uC,uA));
  float inside=smoothstep(2.,7.,d);
  float front=1.-smoothstep(-12.,12.,length(x-uO)-uFront*(.9+.2*vn(x*.02)));
  o=vec4(h*(1.-.3*inside*front),0.,0.,1.); }`,
  // 沙帘：一道前沿从左扫到右，前沿后面一条带子里落沙，前沿前面零星溅出沙粒
  curtain: `
uniform float uFront, uAmt, uBand, uDir;  // uDir=-1 时从右往左
void main(){ vec2 x0=gl_FragCoord.xy; float h=S(x0); vec2 x=uDir<-.5?vec2(${W}.-x0.x,x0.y):x0;
  float f=uFront+90.*(vn(vec2(x.y*.012,1.))-.5)+25.*(vn(vec2(x.y*.08,4.))-.5);
  float k=x.x<f?smoothstep(f-uBand,f-uBand*.6,x.x)*(1.-smoothstep(f-40.,f,x.x)):0.;
  float sp=(x.x>f-40.&&h1(x+vec2(uSeed,uSeed*.7))<.012*exp(-max(0.,x.x-f)/60.))?1.2:0.;
  o=vec4(h+uAmt*k*(.5+h1(x+uSeed))+sp,0.,0.,1.); }`,
  // 月亮：圆里的沙清空（边缘带一点不规则），清掉的沙在圆外薄薄堆一圈，月亮就有了边
  disc: `
uniform vec2 uP; uniform float uR, uK;
void main(){ vec2 x=gl_FragCoord.xy; float h=S(x); float d=length(x-uP), r=uR*(1.+.025*(vn(normalize(x-uP+1e-4)*6.+3.)-.5));
  float in_=1.-smoothstep(r-3.,r+1.,d), ring=smoothstep(r,r+4.,d)*(1.-smoothstep(r+6.,r+26.,d));
  o=vec4(h*(1.-uK*in_)+uK*.25*ring,0.,0.,1.); }`,
  // 推镜结束时把看到的那一块重采样成整张，之后显示回到 1 倍
  rebase: `
uniform vec2 uF; uniform float uZ;
void main(){ vec2 x=gl_FragCoord.xy; o=vec4(S(uF+(x-vec2(${W/2}.,${H/2}.))/uZ),0.,0.,1.); }`,
  // 灯箱：底光透过沙（每个通道吸收不同，薄处是琥珀、厚处发黑），顶上一点室内光勾出沙棱
  display: `
uniform float uTime, uZ; uniform vec2 uF; uniform vec3 uStream;  // 漏沙线：x、上端 y、下端 y（GL 坐标，全 0 表示没有）
vec2 M(vec2 x){return uF+(x-vec2(${W/2}.,${H/2}.))/uZ;}
float SM(vec2 x){return S(M(x));}
void main(){ vec2 x=gl_FragCoord.xy; vec2 uv=x/vec2(${W}.,${H}.);
  float h=SM(x); vec2 xs=M(x);
  if(uStream.z>0.){ float dx=abs(xs.x-uStream.x-1.5*sin(xs.y*.05+uTime*30.)); float inY=step(uStream.z,xs.y)*step(xs.y,uStream.y);
    h+=inY*(1.-smoothstep(1.,3.,dx*uZ*.6))*(h1(floor(vec2(x.x*.5,x.y*.33-uTime*900.)))<.45?3.:0.); }  // 正在下落的沙粒，每帧换一批
  float g=h1(floor(x)); float g2=vn(x*.35);
  float he=h*(.55+.6*g+.3*g2);   // 沙粒：同样厚度，每一粒透光不同
  // 薄处是一粒一粒的：每个像素按厚度决定「有没有一粒沙」，有就挡光，没有就透亮
  float cov=1.-exp(-1.1*h); float on=g<cov?1.:0.; float thin=1.-smoothstep(1.5,5.,h);
  he=mix(he,on*(1.6+1.6*g2)+.25*h,thin);
  float hx=SM(x+vec2(1.5,0.))-SM(x-vec2(1.5,0.)), hy=SM(x+vec2(0.,1.5))-SM(x-vec2(0.,1.5));
  float rough=1.-exp(-.3*h);  // 厚沙表面是一粒粒的：法线按颗粒抖一抖，不然沙丘光滑得像塑料锥
  float rel=.2*exp(-h/14.);  // 很厚的沙丘不看大坡度的明暗（会成一个半亮半暗的塑料锥），只看颗粒；薄处的沙棱照旧有起伏
  vec3 n=normalize(vec3(-hx*rel+(g-.5)*.9*rough,-hy*rel+(h1(floor(x)+vec2(7.,3.))-.5)*.9*rough,1.));
  vec2 c=(uv-vec2(.5,.52))*vec2(1.6,1.);
  vec3 back=vec3(1.,.83,.58)*(1.-.22*dot(c,c));
  vec3 Tm=exp(-vec3(.20,.34,.62)*2.2*he);  // 沙不透光：两三粒厚就几乎黑了
  float opq=1.-exp(-.9*he);
  float diff=max(dot(n,normalize(vec3(-.55,.5,.65))),0.);
  vec3 col=back*Tm+vec3(.17,.115,.07)*opq*(.25+.9*diff)*(.55+.9*g);
  col*=1.-.35*smoothstep(.45,1.15,length((uv-.5)*vec2(1.25,1.)));
  col+=(h1(x+fract(uTime)*91.)-.5)*.012;
  o=vec4(pow(max(col,0.),vec3(1./1.05)),1.); }`,
};

function compile(fs) {
  const p = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; out vec4 o;
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

function target() {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, W, H, 0, gl.RGBA, gl.FLOAT, null);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
  return { t, f };
}
let hr = target(), hw = target();
let seed = 0;
function run(name, uni, toScreen = false) {
  const { p, u } = P[name]; gl.useProgram(p);
  gl.bindFramebuffer(gl.FRAMEBUFFER, toScreen ? null : hw.f); gl.viewport(0, 0, W, H);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, hr.t); gl.uniform1i(u.uH, 0);
  if (u.uSeed) gl.uniform1f(u.uSeed, (seed = (seed + 17.37) % 1000));
  for (const [k, v] of Object.entries(uni)) {
    if (!u[k]) continue;
    Array.isArray(v) ? (v.length === 3 ? gl.uniform3fv(u[k], v) : gl.uniform2fv(u[k], v)) : gl.uniform1f(u[k], v);
  }
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  if (!toScreen) [hr, hw] = [hw, hr];
}
// 画面坐标：左上角原点、y 向下，和分镜一致；进 shader 前翻成 GL 的 y 向上
const G = ([x, y]) => [x, H - y];

// ---- 动作 ----
// 每个动作是一段时间 [a,b]，在这段时间里每个模拟小步调用一次 f(局部进度 0..1, 小步时长)
const spans = [];
const act = (a, b, f) => spans.push([a, b, f]);
const lerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const ease = t => t * t * (3 - 2 * t);
// 沿一条折线/曲线走：path(t) 返回点；每小步划一段，从上一点到当前点
function stroke(a, b, path, R, opt = {}) {
  let last = null;
  act(a, b, t => {
    const p = path(opt.ease === false ? t : ease(t));
    const r = typeof R === 'function' ? R(t) : R;
    if (last && r > 0.3) run('carve', { uA: G(last), uB: G(p), uR: r, uK: opt.K || r * 0.9, uHard: opt.hard ?? 1 });
    last = p;
  });
}
const once = [];
const at = (t, f) => once.push([t, f]);
// 指尖点一下：原地划一个极短的圈
const dot = (t, p, R, hard = 1, kk = 0.9) => at(t, () => run('carve', { uA: G(p), uB: G([p[0] + 0.5, p[1]]), uR: R, uK: R * kk, uHard: hard }));  // kk 大，挤出去的沙摊得薄，不会围成一圈黑边
function smear(a, b, path, R, D = 0.22, iters = 6) {
  let last = null;
  act(a, b, t => {
    const p = path(ease(t)); const q = last || p;
    for (let i = 0; i < iters; i++) run('spread', { uA: G(q), uB: G(p), uR: R, uD: D });
    last = p;
  });
}
function drag(a, b, path, R, L = 2.2, asp = 1.6, streak = 1) {
  let last = null;
  act(a, b, t => { const p = path(ease(t));
    if (last) {  // 一步走得太远会一下一下盖章，留下一排扇贝边；拆成每段不超过 4 像素
      const n = Math.max(1, Math.ceil(Math.hypot(p[0] - last[0], p[1] - last[1]) / 4));
      for (let i = 0; i < n; i++) run('drag', { uA: G(lerp(last, p, i / n)), uB: G(lerp(last, p, (i + 1) / n)), uR: R, uL: L, uAsp: asp, uStreak: streak });
    }
    last = p; });
}
function pour(a, b, path, R, amt, splash = 0.004) {
  act(a, b, t => run('pour', { uP: G(path(t)), uR: R, uAmt: amt, uSplash: splash }));
}
const circle = (c, r, a0, a1) => t => { const a = a0 + (a1 - a0) * t; return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; };
const poly = pts => t => { const n = pts.length - 1, k = Math.min(n - 1, Math.floor(t * n)); return lerp(pts[k], pts[k + 1], t * n - k); };
const bez = (p0, p1, p2, p3) => t => { const u = 1 - t;
  return [0, 1].map(i => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]); };

// ---- 《沙漏》 ----
// 坐标都是画面像素（左上原点、y 向下）；推镜在第 2 幅结束时 rebase，之后的坐标还是画面坐标
const C = [960, 540];
let Z = 1, F = C, STREAM = null;
const spanZ = [];

// 沙漏：第 1 幅和第 9 幅共用，构图必须一模一样
const HG = { top: 170, bot: 910, neck: 540, half: 300, neckHalf: 8 };
const hgOutline = () => poly([
  [C[0] - HG.half, HG.top], [C[0] + HG.half, HG.top], [C[0] + HG.neckHalf, HG.neck],
  [C[0] + HG.half, HG.bot], [C[0] - HG.half, HG.bot], [C[0] - HG.neckHalf, HG.neck], [C[0] - HG.half, HG.top]]);
// 两个三角从瓶颈往外抹亮（两根手指同时，上下对称）
function hgClear(a, b) {
  const L = C[0] - HG.half, R_ = C[0] + HG.half, inset = 10;
  const tri = (yBase, yNeck) => [G([L + inset * 1.6, yBase + Math.sign(yNeck - yBase) * inset]), G([R_ - inset * 1.6, yBase + Math.sign(yNeck - yBase) * inset]), G([C[0], yNeck - Math.sign(yNeck - yBase) * 14])];
  const T1 = tri(HG.top, HG.neck), T2 = tri(HG.bot, HG.neck);
  act(a, b, t => { const f = 30 + 430 * ease(t);
    run('wipeTri', { uA: T1[0], uB: T1[1], uC: T1[2], uO: G([C[0], HG.neck]), uFront: f });
    run('wipeTri', { uA: T2[0], uB: T2[1], uC: T2[2], uO: G([C[0], HG.neck]), uFront: f }); });
}

// 1｜0–7 黑场里的沙漏
at(0, () => run('fill', { uAmt: 5.5 }));
stroke(0.8, 3.8, hgOutline(), 7);
hgClear(3.8, 5.8);

// 2｜6–13 沙从瓶颈漏下，在下壶堆成丘；画面慢慢推近到这座丘
const LAND = [960, 845];
act(5.8, 12.8, t => { STREAM = [C[0], HG.neck + 6, LAND[1] - 30 - 40 * Math.min(1, t * 2)]; });
at(12.85, () => { STREAM = null; });
pour(5.9, 12.8, t => [LAND[0] + 6 * Math.sin(t * 40), LAND[1] - 30 * t], 52, 3.6, 0.004);
const FOCUS = [960, 800], ZEND = 2.4;
act(7.0, 12.8, t => { const e = ease(t); Z = 1 + (ZEND - 1) * e; F = lerp(C, FOCUS, e); });
at(12.85, () => { run('rebase', { uF: G(FOCUS), uZ: ZEND }); Z = 1; F = C; });  // 必须在推镜那段结束之后，否则同一步里又被设回 2.4 倍

// 3｜13–21 春：一掌把整片沙丘按平成一层暗；沙丘中心按出一颗薄薄透光的种子，裂开，芽卷着长出来，顶上两片亮叶
// 一道沙帘从左往右撒过去，把沙漏盖住；帘子过去以后再一掌按平
act(12.9, 14.1, t => run('curtain', { uFront: -150 + 2250 * t, uAmt: 1.6, uBand: 260 }));
act(13.6, 14.3, () => run('press', { uP: C, uA: 4000, uB: 4000, uCap: 3.4, uK: 0.12, uRing: 0 }));  // 撒一层盖住沙漏，再一掌按平
const SEED = [960, 700], SA = 110, SB = 160;
act(14.2, 14.9, () => run('press', { uP: G(SEED), uA: SA, uB: SB, uCap: 1.3, uK: 0.07, uRing: 0 }));
stroke(14.8, 15.7, t => { const a = Math.PI / 2 + t * Math.PI * 2, y = Math.sin(a);
  const k = 1 - 0.28 * Math.pow(Math.max(0, -y), 2);
  return [SEED[0] + SA * 1.04 * Math.cos(a) * k, SEED[1] + SB * 1.04 * y]; }, 4.5);
stroke(15.6, 16.4, poly([[958, 830], [966, 760], [954, 690], [962, 560]]), 4.5);
stroke(16.4, 19.0, bez([962, 560], [905, 450], [1045, 360], [975, 270]), t => 5 + 3 * t);
stroke(19.0, 20.0, bez([975, 270], [930, 210], [880, 225], [845, 205]), t => 2 + 19 * Math.sin(Math.PI * t), { K: 16 });
stroke(19.5, 20.5, bez([975, 270], [1030, 220], [1080, 240], [1115, 220]), t => 2 + 17 * Math.sin(Math.PI * t), { K: 16 });

// 4｜21–31 夏：芽长成一棵光做的树。树干从种子顶上长出来，一代一代分杈，枝梢上一粒粒点亮；种子底下扎出几条根
let rs = 7;
const rnd = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
const TREE = { root: [962, 545], top: [966, 420] };
const tips = [];
function branch(p, ang, len, w, gen, t0) {
  const q = [p[0] + Math.cos(ang) * len, p[1] + Math.sin(ang) * len];
  const bend = (rnd() - 0.5) * len * 0.35, nx = -Math.sin(ang), ny = Math.cos(ang);
  const m1 = [p[0] + (q[0] - p[0]) / 3 + nx * bend, p[1] + (q[1] - p[1]) / 3 + ny * bend];
  const m2 = [p[0] + (q[0] - p[0]) * 2 / 3 + nx * bend * 0.6, p[1] + (q[1] - p[1]) * 2 / 3 + ny * bend * 0.6];
  const dur = 0.55 + len / 260;
  stroke(t0, t0 + dur, bez(p, m1, m2, q), t => Math.max(2.2, w * (1 - 0.3 * t)), { K: Math.max(5, w) });
  if (gen >= 4) { tips.push([q, t0 + dur]); return; }
  const kids = gen < 1 ? 2 : rnd() < 0.35 ? 3 : 2;
  for (let k = 0; k < kids; k++) {
    const spread = (kids === 2 ? (k ? 1 : -1) : (k - 1)) * (0.42 + rnd() * 0.25);
    branch(q, ang + spread * 0.85 + (ang + Math.PI / 2) * 0.12 + (rnd() - 0.5) * 0.2, len * (0.68 + rnd() * 0.1), w * 0.72, gen + 1, t0 + dur - 0.1);  // 越往外越往两边摊，树冠是一把伞，不会顶出画面
  }
}
// 树干：沿着芽加粗，到 400 处分成三大枝，往两边铺开
stroke(21.0, 22.0, poly([TREE.root, [958, 480], TREE.top]), t => 9 - 2 * t, { K: 9 });
branch(TREE.top, -Math.PI / 2 - 1.05, 165, 6.5, 0, 21.9);
branch(TREE.top, -Math.PI / 2 + 1.0, 172, 6.5, 0, 22.0);
branch([963, 440], -Math.PI / 2 + 0.08, 118, 6, 1, 22.2);
// 根
for (const [dx, a] of [[-14, 0.75], [0, 0.05], [16, -0.7]]) {
  const p0 = [960 + dx, 858], ang = Math.PI / 2 + a;
  stroke(23.5, 25.2, bez(p0, [p0[0] + Math.cos(ang) * 40, p0[1] + 40], [p0[0] + Math.cos(ang) * 90, p0[1] + 80], [p0[0] + Math.cos(ang) * 150, p0[1] + 150]), t => 4 * (1 - 0.6 * t));
}
// 枝梢点亮：每个梢头周围撒一小簇光斑，按梢头长出来的先后一粒一粒点，越到后面越密
{
  const dots = [];
  for (const [q, t] of tips) for (let k = 0; k < 4; k++) {
    const r = 10 + rnd() * 34, a = rnd() * Math.PI * 2;
    dots.push([[q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.8], 4 + rnd() * rnd() * 12, t + 0.2 + rnd() * 1.6]);
  }
  for (const [p, R, t] of dots) if (p[1] > 40 && p[0] > 40 && p[0] < 1880 && R > 4.5) dot(Math.min(t, 30.4), p, R, 0.9, 6);  // kk=6、留一成沙：亮斑边缘渐变，不围黑边成珠子
}

// 5｜31–40 风：手掌从左边一道道扫过树冠，光斑被拖成横的流线；流线的右端卷起来，就是下一幅的浪尖
const CURLS = [[1330, 230, 46], [1500, 400, 58], [1290, 560, 40]];
// 风：三道窄的掌拖穿过树冠，把光斑拖成流线；再加一组细的风线（宽拖痕会像一排横木板）
[[31.0, 33.0, 200, 90, 26], [31.8, 33.8, 330, -100, 22], [32.6, 34.6, 120, 80, 18]].forEach(([a, b, y, amp, R]) =>
  drag(a, b, bez([-150, y], [500, y - amp], [1300, y + amp], [2150, y - amp * 0.4]), R, 3.1));
// 最后一阵贴着下面扫过去，把种子带走
drag(34.0, 36.2, bez([-200, 760], [600, 640], [1200, 820], [2200, 700]), 190, 2.9, 1.6, 0.4);
// 风线画在拖痕之后，不会被拖痕重新填上；细于 3 像素的沟会被两边滑下来的沙马上填平
[[35.0, 37.0, 260, 140], [35.3, 37.3, 420, -120], [35.6, 37.6, 540, 90], [35.9, 37.9, 170, -80], [36.2, 38.2, 640, 110], [36.5, 38.4, 360, -150], [36.8, 38.6, 80, 70]].forEach(([a, b, y, amp]) =>
  stroke(a, b, bez([-80, y + amp * 0.3], [450, y - amp], [1250, y + amp * 0.8], [2000, y - amp * 0.5]), t => 3 + 3.5 * Math.sin(Math.PI * t), { K: 6 }));
const curl = (c, r0, turns, dir = 1) => t => { const a = -Math.PI / 2 + dir * t * turns * Math.PI * 2, r = r0 * (1 - 0.8 * t);
  return [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)]; };
CURLS.forEach(([x, y, r], i) => stroke(36.0 + i * 0.6, 38.4 + i * 0.6, curl([x, y], r, 1.15), t => 6 - 3 * t));

// 6｜40–51 浪：卷尖往左下长出浪身，一层压一层从左往右推；46 秒最大的一个浪横过整个画面（全片高潮），浪尖甩出飞沫
function wave(a, b, base, crest, r, w) {
  // 从左下的海面起笔，一路抬升到浪尖，再卷进去
  const body = bez(base, [base[0] + (crest[0] - base[0]) * 0.45, base[1] - 20], [crest[0] - r * 2.2, crest[1] - r * 1.4], [crest[0], crest[1] - r]);
  const roll = curl(crest, r, 1.1);
  stroke(a, a + (b - a) * 0.6, body, t => w * (0.6 + 2.6 * Math.sin(Math.PI * 0.85 * t)), { K: w * 2.2 });  // 浪身是一道由细变粗再收的光
  stroke(a + (b - a) * 0.6, b, roll, t => w * 1.6 * (1 - 0.7 * t), { K: w * 1.8 });
  for (let k = 0; k < 14; k++) { const ang = -Math.PI * (0.15 + rnd() * 0.7), d = r * (1.2 + rnd() * 1.6);
    dot(b - 0.3 + rnd() * 0.8, [crest[0] + Math.cos(ang) * d + r * 0.6, crest[1] - r + Math.sin(ang) * d], 2 + rnd() * 5, 1, 3); }
}
wave(40.0, 42.4, [200, 520], [1330, 230], 46, 6);
wave(41.2, 43.6, [120, 760], [1500, 400], 58, 7);
wave(42.4, 44.6, [300, 820], [1290, 560], 40, 6);
drag(43.0, 45.2, poly([[-150, 960], [900, 930], [2150, 970]]), 90, 1.4);
wave(45.6, 48.4, [-60, 980], [1180, 300], 120, 11);    // 最大的一个
wave(47.6, 49.6, [600, 980], [1640, 640], 52, 6);
[[45.0, 47.0, 700], [46.0, 48.2, 870]].forEach(([a, b, y]) => drag(a, b, poly([[-150, y], [2150, y - 40]]), 60, 1.8));

// 7｜51–59 秋：手掌把整片海往下拉，沙退到底部成了海岸，天空只留一层薄沙透着暮色；最后一个卷合成满月，岸上几笔芦苇
// 一整个手掌横着从上往下拉：掌下留一层薄沙当暮色，多的被推到底下堆成岸
drag(51.0, 54.0, poly([[960, -80], [960, 900]]), 2000, 1.2, 20, 0.35);
const MOON = [1300, 330];
act(55.0, 56.8, t => run('disc', { uP: G(MOON), uR: 8 + 100 * ease(t), uK: 0.25 }));
[[280, 930, -0.15, 300], [330, 935, 0.05, 360], [395, 930, 0.22, 270], [1560, 935, -0.1, 250], [1615, 940, 0.14, 320]].forEach(([x, y, lean, h], i) => {
  const at_ = t => [x + lean * h * t + 14 * Math.sin(t * 3), y - h * t];
  pour(56.8 + i * 0.25, 57.9 + i * 0.25, at_, 3.6, 2.4, 0);
  pour(57.9 + i * 0.25, 58.3 + i * 0.25, t => { const p = at_(1); return [p[0] + lean * 30 * t, p[1] - 34 * t]; }, 7, 2.0, 0.01);  // 穗
});

// 8｜59–67 冬：细沙从上面落下来，天慢慢压暗，月亮的边一点点被吃掉；暗下来的天上，指尖点出一粒粒亮的雪，一排一排往下落
act(59.0, 62.2, t => { for (let k = 0; k < 6; k++) run('pour', { uP: G([rnd() * 1920, rnd() * 900]), uR: 80 + rnd() * 120, uAmt: 0.05, uSplash: 0.02 }); });
for (let row = 0; row < 9; row++) {
  const t0 = 61.6 + row * 0.6, y = 70 + row * 100;
  for (let k = 0; k < 26; k++) dot(t0 + rnd() * 0.9, [40 + rnd() * 1840, y + rnd() * 80], 3.5 + rnd() * rnd() * 9, 1, 3);
}

// 9｜67–75 回到沙漏：一道沙帘从右往左把一切盖住，再在同一个位置划出同一只沙漏，瓶颈又开始漏下一线细沙
act(67.0, 68.4, t => run('curtain', { uFront: -150 + 2250 * t, uAmt: 3.2, uBand: 260, uDir: -1 }));
act(68.2, 68.8, () => run('press', { uP: C, uA: 4000, uB: 4000, uCap: 5.5, uK: 0.1, uRing: 0 }));
stroke(68.8, 71.0, hgOutline(), 7);
hgClear(71.0, 72.6);
act(72.6, 75.0, t => { STREAM = [C[0], HG.neck + 6, LAND[1] - 30 - 40 * Math.min(1, t * 2)]; });
pour(72.7, 75.0, t => [LAND[0] + 6 * Math.sin(t * 40), LAND[1] - 30 * t * 0.3], 52, 3.6, 0.004);

once.sort((a, b) => a[0] - b[0]);
let s = 0, frame = -1, qi = 0;
function step() {
  while (qi < once.length && once[qi][0] < s + 1 / (FPS * SUB)) once[qi++][1]();
  for (const [a, b, f] of spans) if (s >= a && s < b) f((s - a) / (b - a));
  for (let i = 0; i < 4; i++) run('slide', { uT: 1.0, uRate: 0.09 });
  s += 1 / (FPS * SUB);
}
window.renderTo = f => {
  if (f < frame) throw new Error('frames must go forward');
  while (frame < f) { for (let i = 0; i < SUB; i++) step(); frame++; }
  const st = STREAM ? [STREAM[0], H - STREAM[1], H - STREAM[2]] : [0, 0, 0];
  run('display', { uTime: s, uZ: Z, uF: G(F), uStream: st }, true);
  gl.finish();
  return cv.toDataURL('image/jpeg', 0.95);
};
window.ready = true;

window.probe = (pts) => { gl.bindFramebuffer(gl.FRAMEBUFFER, hr.f); const b = new Float32Array(4);
  return pts.map(([x, y]) => { gl.readPixels(x, H - y, 1, 1, gl.RGBA, gl.FLOAT, b); return +b[0].toFixed(3); }); };
