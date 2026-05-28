/* ─────────────────────────────────────────────────────────────────
   Lagrange-multiplier interactive prototype.

   Three problems share the same machinery:
     1. fence    — maximize  f = xy        s.t.  2x + 2y = c
     2. line     — minimize  f = x²+y²     s.t.  ax + by = c
     3. ellipse  — extremize f = x²+y²     s.t.  (x/a)² + (y/b)² = c

   For every problem we expose:
     • f, g, ∇f, ∇g                       (numeric functions)
     • a 1-D constraint curve { x, y }    (for the red line/curve)
     • a level curve of f at a given fval (for the gray tangent set)
     • project(x, y, c)                   (snap a free 2-D point onto g = c)
     • optimum(c)                         (closed-form critical point + λ)
     • fStar(c) and shadowRange()         (for the bottom-right shadow plot)
   ───────────────────────────────────────────────────────────────── */

'use strict';

// ── Trace indices, declared once so updates stay in sync. ────────
const T2D_CONTOUR    = 0;
const T2D_CONSTRAINT = 1;
const T2D_LEVEL      = 2;
const T2D_OPT        = 3;
const T2D_POINT      = 4;

const T3D_SURFACE    = 0;
const T3D_LIFTED     = 1;
const T3D_OPT        = 2;
const T3D_POINT      = 3;

const TSH_CURVE      = 0;
const TSH_OPT        = 1;
const TSH_TANGENT    = 2;
const TSH_CURRENT    = 3;

const TBAR_GRADF     = 0;
const TBAR_LAMGRADG  = 1;

// ── Color palette (kept in sync with styles.css) ─────────────────
const COLOR = {
  gradF:       '#e87700',
  gradG:       '#2680eb',
  constraint:  '#c41f1f',
  level:       '#5a5a5a',
  optimum:     '#168644',
  surface:     'Viridis',
  contour: [
    [0.00, '#f3f6fb'],
    [0.25, '#dceaf8'],
    [0.50, '#b3deff'],
    [0.75, '#6cb6ec'],
    [1.00, '#2680eb'],
  ],
  pointFill:   '#ffffff',
  pointStroke: '#1a1a1a',
  shadowCurve: '#2680eb',
  tangent:     '#e87700',
};

// ── Problem definitions ──────────────────────────────────────────
const Problems = {
  fence: {
    name: 'Fence',
    title: 'The fence problem.',
    desc: 'You have P meters of fence. What rectangle has the largest area?',
    paramLabel: 'Perimeter P',
    paramName: 'P',
    paramMin: 20, paramMax: 200, paramDefault: 100, paramStep: 1,
    paramFormat: v => v.toFixed(0),
    cFromParam: p => p,
    f:     (x, y)        => x * y,
    gradf: (x, y)        => [y, x],
    gradg: ()            => [2, 2],
    g:     (x, y, c)     => 2 * x + 2 * y - c,

    constraintCurve(c) {
      return { x: [c / 2, 0], y: [0, c / 2] };
    },

    project(x, y, c) {
      // Line x + y = c/2  →  normal (1,1)/√2
      const d = (x + y - c / 2) / 2;
      let px = x - d, py = y - d;
      const eps = 1e-3;
      if (px < eps)       { px = eps;       py = c / 2 - eps; }
      if (py < eps)       { py = eps;       px = c / 2 - eps; }
      if (px > c / 2 - eps) { px = c / 2 - eps; py = eps; }
      if (py > c / 2 - eps) { py = c / 2 - eps; px = eps; }
      return [px, py];
    },

    domain(c) {
      const m = Math.max(c / 2 + 6, 16);
      return [0, m];
    },

    levelCurve(fval, dom) {
      // f = xy = fval  ⇒  y = fval / x  (hyperbola)
      const xs = [], ys = [];
      const lo = Math.max(dom[0], 0.3);
      const N = 240;
      for (let i = 0; i <= N; i++) {
        const x = lo + (dom[1] - lo) * i / N;
        const y = fval / x;
        if (y >= dom[0] - 1 && y <= dom[1] * 1.4) {
          xs.push(x); ys.push(y);
        } else {
          xs.push(NaN); ys.push(NaN);
        }
      }
      return { x: xs, y: ys };
    },

    optimum(c) {
      const v = c / 4;
      // ∇f = (y, x) = (v, v).  ∇g = (2, 2).  λ = v/2 = c/8.
      return { x: v, y: v, lambda: c / 8, fval: v * v };
    },

    initialPoint(c) {
      return [c / 2 - 6, 6];
    },

    fStar(c) { return c * c / 16; },
    shadowRange() { return [20, 200]; },
    geomType: 'rect',
  },

  line: {
    name: 'Line',
    title: 'Closest point on a line.',
    desc: 'Minimize f = x² + y² subject to x + 2y = c. (a = 1, b = 2)',
    paramLabel: 'Offset c',
    paramName: 'c',
    paramMin: 5, paramMax: 100, paramDefault: 40, paramStep: 1,
    paramFormat: v => v.toFixed(0),
    cFromParam: p => p,
    a: 1, b: 2,
    f:     (x, y)        => x * x + y * y,
    gradf: (x, y)        => [2 * x, 2 * y],
    gradg(_x, _y, _c)    { return [this.a, this.b]; },
    g(x, y, c)           { return this.a * x + this.b * y - c; },

    constraintCurve(c) {
      const dom = this.domain(c);
      const a = this.a, b = this.b;
      const cand = [
        [dom[0], (c - a * dom[0]) / b],
        [dom[1], (c - a * dom[1]) / b],
        [(c - b * dom[0]) / a, dom[0]],
        [(c - b * dom[1]) / a, dom[1]],
      ];
      const valid = cand.filter(([x, y]) =>
        x >= dom[0] - 1e-6 && x <= dom[1] + 1e-6 &&
        y >= dom[0] - 1e-6 && y <= dom[1] + 1e-6,
      );
      const uniq = [];
      valid.forEach(p => {
        if (!uniq.some(q => Math.abs(q[0] - p[0]) < 1e-4 && Math.abs(q[1] - p[1]) < 1e-4))
          uniq.push(p);
      });
      if (uniq.length < 2) return { x: [], y: [] };
      return { x: [uniq[0][0], uniq[1][0]], y: [uniq[0][1], uniq[1][1]] };
    },

    project(x, y, c) {
      const a = this.a, b = this.b;
      const n2 = a * a + b * b;
      const d = (a * x + b * y - c) / n2;
      return [x - a * d, y - b * d];
    },

    domain(c) {
      const m = Math.max(Math.abs(c), 20);
      return [-m * 0.5, m * 1.05];
    },

    levelCurve(fval, dom) {
      const r = Math.sqrt(Math.max(fval, 0));
      const xs = [], ys = [];
      const N = 240;
      for (let i = 0; i <= N; i++) {
        const t = 2 * Math.PI * i / N;
        const x = r * Math.cos(t), y = r * Math.sin(t);
        if (x >= dom[0] && x <= dom[1] && y >= dom[0] && y <= dom[1]) {
          xs.push(x); ys.push(y);
        } else {
          xs.push(NaN); ys.push(NaN);
        }
      }
      return { x: xs, y: ys };
    },

    optimum(c) {
      const a = this.a, b = this.b;
      const n2 = a * a + b * b;
      return { x: a * c / n2, y: b * c / n2, lambda: 2 * c / n2, fval: c * c / n2 };
    },

    initialPoint(c) {
      return [0, c / this.b];
    },

    fStar(c) {
      const a = this.a, b = this.b;
      return c * c / (a * a + b * b);
    },
    shadowRange() { return [5, 100]; },
    geomType: 'point',
  },

  ellipse: {
    name: 'Ellipse',
    title: 'Closest / farthest point on an ellipse.',
    desc: 'Extremize f = x² + y² on (x/8)² + (y/4)² = c.  λ varies around the curve.',
    paramLabel: 'Scale c',
    paramName: 'c',
    paramMin: 0.2, paramMax: 4, paramDefault: 1, paramStep: 0.05,
    paramFormat: v => v.toFixed(2),
    cFromParam: p => p,
    a: 8, b: 4,
    f:     (x, y)        => x * x + y * y,
    gradf: (x, y)        => [2 * x, 2 * y],
    gradg(x, y)          { return [2 * x / (this.a * this.a), 2 * y / (this.b * this.b)]; },
    g(x, y, c)           { return (x * x) / (this.a * this.a) + (y * y) / (this.b * this.b) - c; },

    constraintCurve(c) {
      const ra = this.a * Math.sqrt(c), rb = this.b * Math.sqrt(c);
      const xs = [], ys = [];
      const N = 200;
      for (let i = 0; i <= N; i++) {
        const t = 2 * Math.PI * i / N;
        xs.push(ra * Math.cos(t));
        ys.push(rb * Math.sin(t));
      }
      return { x: xs, y: ys };
    },

    project(x, y, c) {
      const ra = this.a * Math.sqrt(c), rb = this.b * Math.sqrt(c);
      const u = x / ra, v = y / rb;
      const r = Math.hypot(u, v) || 1e-9;
      return [ra * u / r, rb * v / r];
    },

    domain(c) {
      const ra = this.a * Math.sqrt(Math.max(c, 0.05));
      return [-ra * 1.25, ra * 1.25];
    },

    levelCurve(fval, dom) {
      const r = Math.sqrt(Math.max(fval, 0));
      const xs = [], ys = [];
      const N = 240;
      for (let i = 0; i <= N; i++) {
        const t = 2 * Math.PI * i / N;
        const x = r * Math.cos(t), y = r * Math.sin(t);
        if (x >= dom[0] && x <= dom[1] && y >= dom[0] && y <= dom[1]) {
          xs.push(x); ys.push(y);
        } else {
          xs.push(NaN); ys.push(NaN);
        }
      }
      return { x: xs, y: ys };
    },

    optimum(c) {
      // Maximum of x²+y² on the ellipse: (±a√c, 0).
      const xs = this.a * Math.sqrt(c);
      return { x: xs, y: 0, lambda: this.a * this.a, fval: this.a * this.a * c };
    },

    initialPoint(c) {
      const ra = this.a * Math.sqrt(c), rb = this.b * Math.sqrt(c);
      const t = Math.PI / 4;
      return [ra * Math.cos(t), rb * Math.sin(t)];
    },

    fStar(c) { return this.a * this.a * c; },
    shadowRange() { return [0.2, 4]; },
    geomType: 'point',
  },
};

// ── App state ────────────────────────────────────────────────────
const state = {
  problemKey: 'fence',
  problem: Problems.fence,
  c: Problems.fence.paramDefault,
  point: [0, 0],          // current draggable point (in data coords, on the constraint)
  domain: [0, 60],        // recomputed on problem / param change
};

// ── DOM handles ──────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── Helpers ──────────────────────────────────────────────────────

function buildContourGrid(problem, dom, c, N) {
  N = N || 80;
  const xs = new Array(N), ys = new Array(N);
  const lo = dom[0], hi = dom[1];
  for (let i = 0; i < N; i++) {
    xs[i] = lo + (hi - lo) * i / (N - 1);
    ys[i] = lo + (hi - lo) * i / (N - 1);
  }
  const z = new Array(N);
  for (let j = 0; j < N; j++) {
    const row = new Array(N);
    for (let i = 0; i < N; i++) {
      row[i] = problem.f(xs[i], ys[j]);
    }
    z[j] = row;
  }
  return { x: xs, y: ys, z };
}

function liftedConstraint(problem, c) {
  const curve = problem.constraintCurve(c);
  if (curve.x.length < 50) {
    // densify a line into many points so the lifted curve is smooth
    const N = 200;
    const xs = [], ys = [];
    const x0 = curve.x[0], x1 = curve.x[curve.x.length - 1];
    const y0 = curve.y[0], y1 = curve.y[curve.y.length - 1];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      xs.push(x0 + (x1 - x0) * t);
      ys.push(y0 + (y1 - y0) * t);
    }
    const zs = xs.map((x, i) => problem.f(x, ys[i]));
    return { x: xs, y: ys, z: zs };
  }
  const zs = curve.x.map((x, i) => problem.f(x, curve.y[i]));
  return { x: curve.x, y: curve.y, z: zs };
}

// Lagrange-projection definition of λ:  λ = (∇f · ∇g) / |∇g|².
// This minimises |∇f − λ∇g| and gives the correct stationary-point sign.
function computeLambda(gf, gg) {
  const dot = gf[0] * gg[0] + gf[1] * gg[1];
  const n2  = gg[0] * gg[0] + gg[1] * gg[1];
  return n2 > 0 ? dot / n2 : 0;
}

function fmt(v, d) {
  d = d == null ? 2 : d;
  if (!isFinite(v)) return '—';
  if (Math.abs(v) >= 10000) return v.toExponential(d);
  return v.toFixed(d);
}

// ── Plot initialisation ──────────────────────────────────────────

function init2D() {
  const { problem, c, domain } = state;
  const grid = buildContourGrid(problem, domain, c);
  const constraint = problem.constraintCurve(c);
  const opt = problem.optimum(c);

  const traces = [
    // 0: filled contour
    {
      type: 'contour',
      x: grid.x, y: grid.y, z: grid.z,
      colorscale: COLOR.contour,
      showscale: false,
      contours: {
        coloring: 'fill',
        showlines: true,
      },
      line: { color: 'rgba(20,40,80,0.18)', width: 1 },
      hoverinfo: 'skip',
    },
    // 1: constraint line / curve
    {
      type: 'scatter',
      mode: 'lines',
      x: constraint.x, y: constraint.y,
      line: { color: COLOR.constraint, width: 4 },
      name: 'g(x,y) = c',
      hoverinfo: 'skip',
    },
    // 2: current level curve of f
    {
      type: 'scatter',
      mode: 'lines',
      x: [], y: [],
      line: { color: COLOR.level, width: 2, dash: 'dash' },
      name: 'f(x,y) = current',
      hoverinfo: 'skip',
    },
    // 3: optimum marker (translucent halo)
    {
      type: 'scatter',
      mode: 'markers',
      x: [opt.x], y: [opt.y],
      marker: {
        size: 16,
        color: 'rgba(22,134,68,0.18)',
        line: { color: COLOR.optimum, width: 2 },
        symbol: 'circle',
      },
      name: 'optimum',
      hoverinfo: 'skip',
    },
    // 4: draggable point
    {
      type: 'scatter',
      mode: 'markers',
      x: [state.point[0]], y: [state.point[1]],
      marker: {
        size: 14,
        color: COLOR.pointFill,
        line: { color: COLOR.pointStroke, width: 2 },
      },
      name: 'P',
      hoverinfo: 'skip',
    },
  ];

  const layout = layout2D();
  Plotly.newPlot('plot2d', traces, layout, {
    displayModeBar: false,
    responsive: true,
    staticPlot: false,
  });
}

function layout2D() {
  return {
    margin: { l: 50, r: 16, t: 16, b: 44 },
    xaxis: {
      title: { text: 'x', standoff: 6 },
      range: state.domain,
      fixedrange: true,
      zeroline: false,
      gridcolor: '#eef1f5',
    },
    yaxis: {
      title: { text: 'y', standoff: 6 },
      range: state.domain,
      fixedrange: true,
      zeroline: false,
      gridcolor: '#eef1f5',
      scaleanchor: 'x',
      scaleratio: 1,
    },
    showlegend: false,
    hovermode: false,
    dragmode: false,
    paper_bgcolor: '#ffffff',
    plot_bgcolor:  '#ffffff',
    annotations: arrowAnnotations(),
  };
}

function arrowAnnotations() {
  // Both arrows are normalised to a common visual length so alignment is
  // visually obvious. Magnitudes are reported numerically in the readouts.
  const [x, y] = state.point;
  const { problem, c, domain } = state;
  const gf = problem.gradf(x, y);
  const gg = problem.gradg(x, y, c);
  const mf = Math.hypot(gf[0], gf[1]) || 1e-9;
  const mg = Math.hypot(gg[0], gg[1]) || 1e-9;
  const L = (domain[1] - domain[0]) * 0.13;

  const fx2 = x + (gf[0] / mf) * L;
  const fy2 = y + (gf[1] / mf) * L;
  const gx2 = x + (gg[0] / mg) * L;
  const gy2 = y + (gg[1] / mg) * L;

  return [
    {
      x: fx2, y: fy2, ax: x, ay: y,
      xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
      showarrow: true,
      arrowhead: 3, arrowsize: 1.4, arrowwidth: 3.5,
      arrowcolor: COLOR.gradF,
      standoff: 6,
    },
    {
      x: gx2, y: gy2, ax: x, ay: y,
      xref: 'x', yref: 'y', axref: 'x', ayref: 'y',
      showarrow: true,
      arrowhead: 3, arrowsize: 1.4, arrowwidth: 3.5,
      arrowcolor: COLOR.gradG,
      standoff: 6,
    },
    // text labels — placed just past each arrow tip
    {
      x: fx2, y: fy2,
      xref: 'x', yref: 'y',
      text: '<b>∇f</b>',
      showarrow: false,
      font: { color: COLOR.gradF, size: 14 },
      xshift: 10 * (gf[0] / mf),
      yshift: 10 * (gf[1] / mf),
    },
    {
      x: gx2, y: gy2,
      xref: 'x', yref: 'y',
      text: '<b>∇g</b>',
      showarrow: false,
      font: { color: COLOR.gradG, size: 14 },
      xshift: 10 * (gg[0] / mg),
      yshift: 10 * (gg[1] / mg),
    },
  ];
}

function init3D() {
  const { problem, c, domain } = state;
  const grid = buildContourGrid(problem, domain, c, 50);
  const lift = liftedConstraint(problem, c);
  const opt = problem.optimum(c);
  const optZ = problem.f(opt.x, opt.y);

  const traces = [
    {
      type: 'surface',
      x: grid.x, y: grid.y, z: grid.z,
      colorscale: COLOR.surface,
      showscale: false,
      opacity: 0.92,
      contours: { z: { show: true, color: 'rgba(0,0,0,0.15)', width: 1 } },
      hoverinfo: 'skip',
      lighting: { ambient: 0.7, diffuse: 0.7, specular: 0.05 },
    },
    {
      type: 'scatter3d',
      mode: 'lines',
      x: lift.x, y: lift.y, z: lift.z,
      line: { color: COLOR.constraint, width: 7 },
      name: 'constraint (lifted)',
      hoverinfo: 'skip',
    },
    {
      type: 'scatter3d',
      mode: 'markers',
      x: [opt.x], y: [opt.y], z: [optZ],
      marker: { size: 6, color: COLOR.optimum, symbol: 'diamond' },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter3d',
      mode: 'markers',
      x: [state.point[0]], y: [state.point[1]],
      z: [problem.f(state.point[0], state.point[1])],
      marker: { size: 7, color: COLOR.pointStroke, line: { color: 'white', width: 1 } },
      hoverinfo: 'skip',
    },
  ];

  const layout = {
    margin: { l: 0, r: 0, t: 8, b: 0 },
    showlegend: false,
    paper_bgcolor: '#ffffff',
    scene: {
      xaxis: { title: 'x', backgroundcolor: '#fafbfd', gridcolor: '#e6e9ef', zerolinecolor: '#cbd1d9' },
      yaxis: { title: 'y', backgroundcolor: '#fafbfd', gridcolor: '#e6e9ef', zerolinecolor: '#cbd1d9' },
      zaxis: { title: 'f(x,y)', backgroundcolor: '#fafbfd', gridcolor: '#e6e9ef', zerolinecolor: '#cbd1d9' },
      camera: { eye: { x: 1.5, y: 1.6, z: 1.1 } },
      aspectmode: 'auto',
    },
  };

  Plotly.newPlot('plot3d', traces, layout, {
    displayModeBar: false,
    responsive: true,
  });
}

function initBarChart() {
  const traces = [
    {
      type: 'bar',
      x: ['x-component', 'y-component'],
      y: [0, 0],
      marker: { color: COLOR.gradF },
      name: '∇f',
      hoverinfo: 'y',
    },
    {
      type: 'bar',
      x: ['x-component', 'y-component'],
      y: [0, 0],
      marker: { color: COLOR.gradG },
      name: 'λ∇g',
      hoverinfo: 'y',
    },
  ];
  const layout = {
    margin: { l: 36, r: 8, t: 6, b: 32 },
    barmode: 'group',
    showlegend: false,
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    xaxis: { fixedrange: true, tickfont: { size: 11 } },
    yaxis: { fixedrange: true, zerolinecolor: '#cbd1d9', tickfont: { size: 10 } },
  };
  Plotly.newPlot('bar-chart', traces, layout, { displayModeBar: false, responsive: true });
}

function initShadowPlot() {
  const { problem, c } = state;
  const [cmin, cmax] = problem.shadowRange();
  const N = 120;
  const xs = [], ys = [];
  for (let i = 0; i <= N; i++) {
    const cc = cmin + (cmax - cmin) * i / N;
    xs.push(cc);
    ys.push(problem.fStar(cc));
  }
  const opt = problem.optimum(c);

  const traces = [
    {
      type: 'scatter', mode: 'lines',
      x: xs, y: ys,
      line: { color: COLOR.shadowCurve, width: 2.5 },
      name: 'f*(c)',
      hoverinfo: 'skip',
    },
    {
      type: 'scatter', mode: 'markers',
      x: [c], y: [problem.fStar(c)],
      marker: { size: 9, color: COLOR.optimum, line: { color: 'white', width: 1.5 } },
      name: 'f*(c)',
      hoverinfo: 'skip',
    },
    {
      type: 'scatter', mode: 'lines',
      x: [], y: [],
      line: { color: COLOR.tangent, width: 2.5, dash: 'dash' },
      name: 'tangent (slope = λ)',
      hoverinfo: 'skip',
    },
    {
      type: 'scatter', mode: 'markers',
      x: [c], y: [problem.f(state.point[0], state.point[1])],
      marker: { size: 9, color: COLOR.pointStroke, symbol: 'circle-open', line: { width: 2 } },
      name: 'f at point',
      hoverinfo: 'skip',
    },
  ];

  const layout = {
    margin: { l: 44, r: 8, t: 6, b: 32 },
    showlegend: false,
    paper_bgcolor: '#ffffff',
    plot_bgcolor: '#ffffff',
    xaxis: {
      title: { text: problem.paramName, standoff: 4 },
      fixedrange: true,
      gridcolor: '#eef1f5',
      tickfont: { size: 10 },
    },
    yaxis: {
      title: { text: 'f*', standoff: 4 },
      fixedrange: true,
      gridcolor: '#eef1f5',
      tickfont: { size: 10 },
    },
  };
  Plotly.newPlot('shadow-plot', traces, layout, { displayModeBar: false, responsive: true });
}

// ── Geometry mini-panel (SVG) ────────────────────────────────────

function drawGeom() {
  const svg = $('rect-svg');
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  const { problem, point } = state;
  const [x, y] = point;
  $('geom-title').textContent =
    problem.geomType === 'rect' ? `Rectangle (x × y)` : `Point (x, y)`;

  const W = 200, H = 150, margin = 18;

  if (problem.geomType === 'rect') {
    const ax = Math.max(Math.abs(x), 1e-3);
    const ay = Math.max(Math.abs(y), 1e-3);
    const maxDim = Math.max(ax, ay);
    const scale = (Math.min(W, H) - 2 * margin) / Math.max(maxDim, 1);
    const w = ax * scale;
    const h = ay * scale;
    const x0 = (W - w) / 2;
    const y0 = (H - h) / 2;

    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x0);
    rect.setAttribute('y', y0);
    rect.setAttribute('width', w);
    rect.setAttribute('height', h);
    rect.setAttribute('fill', '#dceaf8');
    rect.setAttribute('stroke', '#2680eb');
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '2');
    svg.appendChild(rect);

    const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tx.setAttribute('x', W / 2);
    tx.setAttribute('y', y0 + h + 12);
    tx.setAttribute('text-anchor', 'middle');
    tx.setAttribute('font-family', '-apple-system, sans-serif');
    tx.setAttribute('font-size', '11');
    tx.setAttribute('fill', '#464646');
    tx.textContent = `x = ${x.toFixed(2)}`;
    svg.appendChild(tx);

    const ty = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    ty.setAttribute('x', x0 - 8);
    ty.setAttribute('y', y0 + h / 2);
    ty.setAttribute('text-anchor', 'end');
    ty.setAttribute('dominant-baseline', 'middle');
    ty.setAttribute('font-family', '-apple-system, sans-serif');
    ty.setAttribute('font-size', '11');
    ty.setAttribute('fill', '#464646');
    ty.textContent = `y = ${y.toFixed(2)}`;
    svg.appendChild(ty);

    const area = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    area.setAttribute('x', W / 2);
    area.setAttribute('y', y0 + h / 2);
    area.setAttribute('text-anchor', 'middle');
    area.setAttribute('dominant-baseline', 'middle');
    area.setAttribute('font-family', '-apple-system, sans-serif');
    area.setAttribute('font-size', '12');
    area.setAttribute('font-weight', '600');
    area.setAttribute('fill', '#0d66d0');
    area.textContent = `A = ${(x * y).toFixed(1)}`;
    svg.appendChild(area);
  } else {
    // Point-in-plane mini map.  Show origin, the point, and a line between.
    const ax = Math.max(Math.abs(x), 1e-3);
    const ay = Math.max(Math.abs(y), 1e-3);
    const maxDim = Math.max(ax, ay) * 1.4;
    const scale = (Math.min(W, H) / 2 - margin) / maxDim;
    const cx = W / 2, cy = H / 2;
    const px = cx + x * scale, py = cy - y * scale;

    // axes
    const axesNs = (x1, y1, x2, y2) => {
      const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      ln.setAttribute('x1', x1); ln.setAttribute('y1', y1);
      ln.setAttribute('x2', x2); ln.setAttribute('y2', y2);
      ln.setAttribute('stroke', '#cbd1d9'); ln.setAttribute('stroke-width', '1');
      svg.appendChild(ln);
    };
    axesNs(margin / 2, cy, W - margin / 2, cy);
    axesNs(cx, margin / 2, cx, H - margin / 2);

    const seg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    seg.setAttribute('x1', cx); seg.setAttribute('y1', cy);
    seg.setAttribute('x2', px); seg.setAttribute('y2', py);
    seg.setAttribute('stroke', COLOR.gradF);
    seg.setAttribute('stroke-width', '2');
    svg.appendChild(seg);

    const pt = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    pt.setAttribute('cx', px); pt.setAttribute('cy', py);
    pt.setAttribute('r', 5);
    pt.setAttribute('fill', '#ffffff');
    pt.setAttribute('stroke', '#1a1a1a');
    pt.setAttribute('stroke-width', '2');
    svg.appendChild(pt);

    const origin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    origin.setAttribute('cx', cx); origin.setAttribute('cy', cy);
    origin.setAttribute('r', 2.5);
    origin.setAttribute('fill', '#1a1a1a');
    svg.appendChild(origin);

    const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tx.setAttribute('x', W / 2);
    tx.setAttribute('y', H - 4);
    tx.setAttribute('text-anchor', 'middle');
    tx.setAttribute('font-family', '-apple-system, sans-serif');
    tx.setAttribute('font-size', '11');
    tx.setAttribute('fill', '#464646');
    tx.textContent = `‖(x, y)‖² = ${(x * x + y * y).toFixed(1)}`;
    svg.appendChild(tx);
  }
}

// ── Live equation (KaTeX) ────────────────────────────────────────

function renderEquation(gf, gg, lambda) {
  if (typeof katex === 'undefined') return;
  const rx = gf[0] - lambda * gg[0];
  const ry = gf[1] - lambda * gg[1];
  const fmtN = v => {
    if (Math.abs(v) < 1e-3) return '0';
    if (Math.abs(v) < 0.01) return v.toFixed(4);
    return v.toFixed(2);
  };
  const tex =
    `\\nabla f - \\lambda \\nabla g \\;=\\; ` +
    `\\begin{pmatrix} ${fmtN(gf[0])} \\\\ ${fmtN(gf[1])} \\end{pmatrix}` +
    ` \\;-\\; ${fmtN(lambda)} \\cdot ` +
    `\\begin{pmatrix} ${fmtN(gg[0])} \\\\ ${fmtN(gg[1])} \\end{pmatrix}` +
    ` \\;=\\; \\begin{pmatrix} ${fmtN(rx)} \\\\ ${fmtN(ry)} \\end{pmatrix}`;

  try {
    katex.render(tex, $('eq-current'), { displayMode: true, throwOnError: false });
  } catch (e) {
    $('eq-current').textContent = `∇f − λ∇g ≈ (${fmtN(rx)}, ${fmtN(ry)})`;
  }
}

// ── The big update function ──────────────────────────────────────

let pendingFrame = null;
function update() {
  if (pendingFrame !== null) return;
  pendingFrame = requestAnimationFrame(() => {
    pendingFrame = null;
    doUpdate();
  });
}

function doUpdate() {
  const { problem, c, point, domain } = state;
  const [x, y] = point;
  const gf  = problem.gradf(x, y);
  const gg  = problem.gradg(x, y, c);
  const mf  = Math.hypot(gf[0], gf[1]);
  const mg  = Math.hypot(gg[0], gg[1]);
  const dot = gf[0] * gg[0] + gf[1] * gg[1];
  const cos = (mf > 0 && mg > 0) ? dot / (mf * mg) : 0;
  const absCos = Math.abs(cos);
  const lambda = computeLambda(gf, gg);
  const fval = problem.f(x, y);
  const gval = problem.g(x, y, c);

  // ── 2D plot updates ─────────────────────────────────────────
  // point trace
  Plotly.restyle('plot2d', { x: [[x]], y: [[y]] }, [T2D_POINT]);

  // level curve
  const lev = problem.levelCurve(fval, domain);
  Plotly.restyle('plot2d', { x: [lev.x], y: [lev.y] }, [T2D_LEVEL]);

  // arrows
  Plotly.relayout('plot2d', { annotations: arrowAnnotations() });

  // ── 3D plot updates ─────────────────────────────────────────
  Plotly.restyle('plot3d',
    { x: [[x]], y: [[y]], z: [[fval]] },
    [T3D_POINT]);

  // ── alignment meter ────────────────────────────────────────
  $('align-fill').style.right = `${(1 - absCos) * 100}%`;
  $('align-value').textContent = absCos.toFixed(3);
  const meter = $('alignment-meter');
  if (absCos > 0.99) {
    if (!meter.classList.contains('aligned')) {
      meter.classList.add('aligned');
    }
  } else if (absCos < 0.985) {
    meter.classList.remove('aligned');
  }

  // ── readouts ───────────────────────────────────────────────
  $('r-x').textContent  = fmt(x);
  $('r-y').textContent  = fmt(y);
  $('r-f').textContent  = fmt(fval);
  $('r-g').textContent  = fmt(gval);
  $('r-mf').textContent = fmt(mf);
  $('r-mg').textContent = fmt(mg);
  $('r-lambda').textContent = fmt(lambda);
  $('r-cos').textContent = absCos.toFixed(3);

  // ── bar chart ──────────────────────────────────────────────
  Plotly.restyle('bar-chart',
    { y: [[gf[0], gf[1]]] }, [TBAR_GRADF]);
  Plotly.restyle('bar-chart',
    { y: [[lambda * gg[0], lambda * gg[1]]] }, [TBAR_LAMGRADG]);

  // ── geometry mini-panel ────────────────────────────────────
  drawGeom();

  // ── shadow price plot ──────────────────────────────────────
  const [cmin, cmax] = problem.shadowRange();
  const span = cmax - cmin;
  const delta = span * 0.18;
  const tx0 = Math.max(cmin, c - delta);
  const tx1 = Math.min(cmax, c + delta);
  const fc = problem.fStar(c);
  const ty0 = fc + lambda * (tx0 - c);
  const ty1 = fc + lambda * (tx1 - c);
  Plotly.restyle('shadow-plot',
    { x: [[c]], y: [[fc]] }, [TSH_OPT]);
  Plotly.restyle('shadow-plot',
    { x: [[tx0, tx1]], y: [[ty0, ty1]] }, [TSH_TANGENT]);
  Plotly.restyle('shadow-plot',
    { x: [[c]], y: [[fval]] }, [TSH_CURRENT]);

  // ── live equation ──────────────────────────────────────────
  renderEquation(gf, gg, lambda);
}

// ── React when the parameter or problem changes ─────────────────

function recomputeForProblemOrParam() {
  const { problem, c } = state;
  state.domain = problem.domain(c);
  // Re-project current point onto the new constraint (in case c changed):
  state.point = problem.project(state.point[0], state.point[1], c);

  // 2D plot: rebuild contour, constraint, optimum
  const grid = buildContourGrid(problem, state.domain, c);
  const cons = problem.constraintCurve(c);
  const opt  = problem.optimum(c);

  Plotly.react('plot2d', [
    {
      type: 'contour',
      x: grid.x, y: grid.y, z: grid.z,
      colorscale: COLOR.contour, showscale: false,
      contours: { coloring: 'fill', showlines: true },
      line: { color: 'rgba(20,40,80,0.18)', width: 1 },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter', mode: 'lines',
      x: cons.x, y: cons.y,
      line: { color: COLOR.constraint, width: 4 },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter', mode: 'lines',
      x: [], y: [],
      line: { color: COLOR.level, width: 2, dash: 'dash' },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter', mode: 'markers',
      x: [opt.x], y: [opt.y],
      marker: {
        size: 16,
        color: 'rgba(22,134,68,0.18)',
        line: { color: COLOR.optimum, width: 2 },
      },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter', mode: 'markers',
      x: [state.point[0]], y: [state.point[1]],
      marker: {
        size: 14, color: COLOR.pointFill,
        line: { color: COLOR.pointStroke, width: 2 },
      },
      hoverinfo: 'skip',
    },
  ], layout2D());

  // 3D plot: rebuild surface, lifted curve, optimum
  const grid3 = buildContourGrid(problem, state.domain, c, 50);
  const lift  = liftedConstraint(problem, c);
  const optZ  = problem.f(opt.x, opt.y);

  Plotly.react('plot3d', [
    {
      type: 'surface',
      x: grid3.x, y: grid3.y, z: grid3.z,
      colorscale: COLOR.surface, showscale: false, opacity: 0.92,
      contours: { z: { show: true, color: 'rgba(0,0,0,0.15)', width: 1 } },
      hoverinfo: 'skip',
      lighting: { ambient: 0.7, diffuse: 0.7, specular: 0.05 },
    },
    {
      type: 'scatter3d', mode: 'lines',
      x: lift.x, y: lift.y, z: lift.z,
      line: { color: COLOR.constraint, width: 7 },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter3d', mode: 'markers',
      x: [opt.x], y: [opt.y], z: [optZ],
      marker: { size: 6, color: COLOR.optimum, symbol: 'diamond' },
      hoverinfo: 'skip',
    },
    {
      type: 'scatter3d', mode: 'markers',
      x: [state.point[0]], y: [state.point[1]],
      z: [problem.f(state.point[0], state.point[1])],
      marker: { size: 7, color: COLOR.pointStroke, line: { color: 'white', width: 1 } },
      hoverinfo: 'skip',
    },
  ], {
    margin: { l: 0, r: 0, t: 8, b: 0 },
    showlegend: false,
    paper_bgcolor: '#ffffff',
    scene: {
      xaxis: { title: 'x', backgroundcolor: '#fafbfd', gridcolor: '#e6e9ef', zerolinecolor: '#cbd1d9' },
      yaxis: { title: 'y', backgroundcolor: '#fafbfd', gridcolor: '#e6e9ef', zerolinecolor: '#cbd1d9' },
      zaxis: { title: 'f(x,y)', backgroundcolor: '#fafbfd', gridcolor: '#e6e9ef', zerolinecolor: '#cbd1d9' },
      camera: { eye: { x: 1.5, y: 1.6, z: 1.1 } },
      aspectmode: 'auto',
    },
  });

  // Shadow plot: regenerate the curve (it depends only on the problem)
  const [cmin, cmax] = problem.shadowRange();
  const N = 120;
  const sx = [], sy = [];
  for (let i = 0; i <= N; i++) {
    const cc = cmin + (cmax - cmin) * i / N;
    sx.push(cc); sy.push(problem.fStar(cc));
  }
  Plotly.restyle('shadow-plot', { x: [sx], y: [sy] }, [TSH_CURVE]);
  Plotly.relayout('shadow-plot', {
    'xaxis.range': [cmin, cmax],
    'xaxis.title.text': problem.paramName,
  });
}

// ── Drag handling on the 2D plot overlay ─────────────────────────

function attachDrag() {
  const overlay = $('drag-overlay');
  const plot = $('plot2d');

  function dataAt(e) {
    const fl = plot._fullLayout;
    if (!fl || !fl.xaxis) return null;
    const rect = plot.getBoundingClientRect();
    const localX = e.clientX - rect.left;
    const localY = e.clientY - rect.top;
    const ax = fl.xaxis, ay = fl.yaxis;
    const dx = ax.p2d(localX - ax._offset);
    const dy = ay.p2d(localY - ay._offset);
    return [dx, dy];
  }

  let dragging = false;

  function moveTo(e) {
    const xy = dataAt(e);
    if (!xy) return;
    const [nx, ny] = state.problem.project(xy[0], xy[1], state.c);
    if (!isFinite(nx) || !isFinite(ny)) return;
    state.point = [nx, ny];
    update();
  }

  overlay.addEventListener('pointerdown', e => {
    dragging = true;
    overlay.setPointerCapture(e.pointerId);
    moveTo(e);
  });

  overlay.addEventListener('pointermove', e => {
    if (!dragging) return;
    moveTo(e);
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    try { overlay.releasePointerCapture(e.pointerId); } catch (_) {}
  }

  overlay.addEventListener('pointerup', endDrag);
  overlay.addEventListener('pointercancel', endDrag);
  overlay.addEventListener('lostpointercapture', endDrag);

  // Click anywhere to snap there even without dragging.
  overlay.addEventListener('click', e => {
    moveTo(e);
  });
}

// ── Snap-to-optimum animation ────────────────────────────────────

function snapToOptimum() {
  const opt = state.problem.optimum(state.c);
  const [sx, sy] = state.point;
  const start = performance.now();
  const dur = 800;
  function step(t) {
    const u = Math.min((t - start) / dur, 1);
    const e = 1 - Math.pow(1 - u, 3);
    const nx = sx + (opt.x - sx) * e;
    const ny = sy + (opt.y - sy) * e;
    state.point = state.problem.project(nx, ny, state.c);
    update();
    if (u < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Init ─────────────────────────────────────────────────────────

function setProblem(key) {
  state.problemKey = key;
  state.problem = Problems[key];
  // Reset the parameter to the problem default.
  state.c = state.problem.cFromParam(state.problem.paramDefault);
  state.domain = state.problem.domain(state.c);
  state.point = state.problem.initialPoint(state.c);

  // Update header text
  $('problem-name').textContent = state.problem.title;
  $('problem-desc').textContent = state.problem.desc;

  // Update slider
  const slider = $('P-slider');
  slider.min = state.problem.paramMin;
  slider.max = state.problem.paramMax;
  slider.step = state.problem.paramStep;
  slider.value = state.problem.paramDefault;
  $('param-label').textContent = state.problem.paramLabel;
  $('param-value').textContent = state.problem.paramFormat(state.problem.paramDefault);
}

function wireControls() {
  $('P-slider').addEventListener('input', e => {
    const v = parseFloat(e.target.value);
    state.c = state.problem.cFromParam(v);
    $('param-value').textContent = state.problem.paramFormat(v);
    recomputeForProblemOrParam();
    update();
  });

  $('problem-select').addEventListener('change', e => {
    setProblem(e.target.value);
    recomputeForProblemOrParam();
    update();
  });

  $('snap-btn').addEventListener('click', snapToOptimum);

  $('reset-btn').addEventListener('click', () => {
    state.point = state.problem.initialPoint(state.c);
    update();
  });

  // Keep plots sized properly on window resize.
  window.addEventListener('resize', () => {
    Plotly.Plots.resize('plot2d');
    Plotly.Plots.resize('plot3d');
    Plotly.Plots.resize('bar-chart');
    Plotly.Plots.resize('shadow-plot');
  });
}

function start() {
  if (typeof Plotly === 'undefined') {
    console.error('Plotly failed to load.');
    return;
  }
  setProblem('fence');
  init2D();
  init3D();
  initBarChart();
  initShadowPlot();
  attachDrag();
  wireControls();
  update();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
