/*global dat:false*/
"use strict";

const MIN_Y = 0.05;
const SVG_W = 200;
const SVG_H = 100;
const SINE_EASE = 'cubic-bezier(0.445,  0.050, 0.550, 0.950)';

function Springish(args) {
  args.damping = Math.abs(args.damping);

  if(args.k - args.damping*args.damping < 0) {
    throw new Error(`Only supporting underdamped oscillations. k - damping^2 >= 0. Here: ${args.k} - ${args.damping}^2 = ${args.k - args.damping*args.damping}`);
  }

  Object.assign(this, {
    MIN_Y: MIN_Y
  }, args);
}

Object.assign(Springish.prototype, {
  // angular velocity
  omega() {
    return Math.sqrt(this.k - this.damping * this.damping);
  },

  // Amplutide at time t, decending with time
  amp(t) {
    return this.A*Math.pow(Math.E, -this.damping*t);
  },

  // damp/dt
  dAmp(t) {
    return -this.damping*this.amp(t);
  },

  // Position at time t
  y(t) {
    return this.amp(t)*Math.cos(this.omega()*t + this.offset);
  },

  // velocity at time t. dy(t)/dt
  v(t) {
    const omega = this.omega();
    return this.dAmp(t)*Math.cos(omega*t + this.offset) - omega*Math.sin(omega*t + this.offset)*this.amp(t);
  },

  // p is int. Returns time of maxima. This is the solution to v(t) = 0
  ymax(p) {
    const omega = this.omega();
    return (Math.atan(-this.damping/omega) + p * Math.PI - this.offset)/omega;
  },

  findMaximas() {
    const maximas = [];
    // Start position Oo
    maximas.push([0, this.y(0)]);
    for(var a=0; Math.abs(maximas[maximas.length-1][1]) > this.MIN_Y; a++) {
      if(this.ymax(a) >= 0) {
        maximas.push([this.ymax(a), this.y(this.ymax(a))]);
      }
    }
    return maximas;
  }
});


const generateStyles = (points, cssTemplate) => {
  const tTot = points[points.length-1][0];
  return [
    '@keyframes springish {',
    points.map((point) => {
      return `  ${(100*point[0]/tTot).toFixed(2)}% {${eval(cssTemplate)(point[1].toFixed(2))};}`;
    }).join('\n'),
    '}',
    '.springish {',
    '  animation: springish; ',
    '  animation-iteration-count: infinite;',
    `  animation-duration: ${tTot.toFixed(2)}s;`,
    `  animation-timing-function: ${SINE_EASE};`,
    '}'
  ].join('\n');
};

const createExample = () => {
  let ex = document.createElement('div');
  ex.style.width = '50px';
  ex.style.height = '50px';
  ex.style.borderRadius = '50%';
  ex.style.backgroundColor = 'orange';
  ex.className = 'springish';
  return ex;
};

const createSvg = (maximas, spr) => {
  const tTot = maximas[maximas.length-1][0];
  const svgns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgns, 'svg');
  svg.setAttribute('width', SVG_W);
  svg.setAttribute('height', SVG_H);

  const createPoint = (x, y, r, color) => {
    let shape = document.createElementNS(svgns, 'circle');
    shape.setAttributeNS(null, 'cx', x);
    shape.setAttributeNS(null, 'cy', y);
    shape.setAttributeNS(null, 'r',  r);
    shape.setAttributeNS(null, 'fill', color); 
    return shape;
  };

  const createPlot = function (f, color) {
    let path = `M${SVG_W*0/tTot} ${SVG_H*(f(0)-f(0))/(2*f(0))} `;
    for(let i=0.01; i<tTot; i+=0.01) {
      path += `L${SVG_W*i/tTot} ${SVG_H*(f(0)-f(i))/(2*f(0))} `;
    }
    const line = document.createElementNS(svgns, 'path');
    line.setAttributeNS(null, 'd', path);
    line.setAttributeNS(null, 'fill', 'none');
    line.setAttributeNS(null, 'stroke', color);
    line.setAttributeNS(null, 'stroke-width', '2');
    return line;
  };

  svg.appendChild(createPlot(spr.v.bind(spr), 'orange'));
  svg.appendChild(createPlot(spr.y.bind(spr), 'green'));

  for(let i=0; Math.abs(spr.y(spr.ymax(i))) > spr.MIN_Y; i++) {
    svg.appendChild(createPoint(SVG_W*spr.ymax(i)/tTot, SVG_H*(spr.y(0)-spr.y(spr.ymax(i)))/(2*(spr.y(0))), 5, 'blue'));
  }

  for(let i=0; i <= tTot*2; i++) {
    let t = document.createElementNS(svgns, 'text');
    t.textContent = i*0.5 + 's';
    t.setAttributeNS(null, "x", SVG_W*i*0.5/tTot);
    t.setAttributeNS(null, "y", SVG_H*(spr.y(0)+20)/(2*(spr.y(0))));
    svg.appendChild(t);
  }

  return svg;
};

const update = (spr) => {

  document.getElementById('container') && document.getElementById('container').remove();
  document.getElementById('example') && document.getElementById('example').remove();

  const maximas = spr.findMaximas();
  const css = generateStyles(maximas, spr.template);
  
  document.getElementById('demo').innerHTML = css; // set stylesheet

  const container = document.createElement('div');
  container.id = 'container';
  container.style.margin = '0 auto';
  container.style.overflow = 'hidden';
  container.style.display = 'inline-block';

  const textarea = document.createElement('textarea');
  textarea.textContent = css;
  textarea.style.width = '380px';
  textarea.style.height = '300px';
  textarea.style.float = 'left';
  container.appendChild(textarea);

  const svg = createSvg(maximas, spr);
  svg.style.float = 'left';
  svg.style.marginLeft = '20px';
  container.appendChild(svg);

  document.body.appendChild(container);

  const ex = createExample();
  ex.id = 'example';
  ex.style.margin = Math.abs(spr.y(spr.ymax(0)));
  document.body.appendChild(ex);
};

const spr = new Springish({
  A: 100,
  k: 150,
  damping: 3.5, //dampingish
  template: '(val) => \`transform: translate3d(${val}px, 0, 0) scale(${-Number(val)/100 + 1})\`',
  offset: 0.01
});

const gui = new dat.GUI();
gui.domElement.style.top = 150;
gui.domElement.style.right = 50;
gui.domElement.style.position = 'absolute';

const u = function (key, val) {
  this[key] = val;
  update(this);
};

gui.add(spr, 'A').onChange(u.bind(spr, 'A'));
gui.add(spr, 'k').onChange(u.bind(spr, 'k'));
gui.add(spr, 'damping').min(0.1).step(0.01).onChange(u.bind(spr, 'damping'));
gui.add(spr, 'template').onChange(u.bind(spr, 'template'));
gui.add(spr, 'offset').min(-Math.PI).max(Math.PI).step(0.1).onChange(u.bind(spr, 'offset'));
gui.add(spr, 'MIN_Y').onChange(u.bind(spr, 'MIN_Y'));

update(spr);
