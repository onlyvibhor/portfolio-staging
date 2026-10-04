// WebGL image/video planes synced to DOM elements.
// Progressive enhancement: the DOM <img>/<video> stays visible until the texture is
// ready, and again if WebGL is unavailable, the context is lost, or a texture fails.
(function () {
  const canvas = document.getElementById('gl');
  if (!canvas || !window.THREE) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarse, premultipliedAlpha: false });
  } catch (e) { return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  let W = window.innerWidth, H = window.innerHeight;
  // perspective camera placed so the z=0 plane maps 1:1 to CSS pixels; tilting planes then gets real depth
  const CAMZ = 1100;
  const cam = new THREE.PerspectiveCamera(50, W / H, 1, 6000);
  cam.position.z = CAMZ;
  const items = [];
  let dead = false;

  function size() {
    // use the visual viewport so the canvas matches what the user sees on mobile browsers
    W = document.documentElement.clientWidth || window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    cam.fov = 2 * Math.atan(H / 2 / CAMZ) * 180 / Math.PI;
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
  }
  size();
  window.addEventListener('resize', size);
  window.addEventListener('orientationchange', () => setTimeout(size, 250));

  function disable() {
    dead = true;
    items.forEach((it) => it.el.classList.remove('gl-ready'));
    canvas.style.display = 'none';
  }
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); disable(); });

  const vert = `
    varying vec2 vUv;
    uniform float uVel;
    void main(){
      vUv = uv;
      vec3 p = position;
      p.y += uVel * sin(uv.x * 3.14159) * 0.07;
      p.x += uVel * (uv.y - 0.5) * 0.02;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }`;

  const frag = `
    precision highp float;
    uniform sampler2D uTex;
    uniform sampler2D uTex2;
    uniform vec2 uSize;
    uniform float uAsp;
    uniform float uAsp2;
    uniform float uProgress;
    uniform float uHover;
    uniform vec2 uTilt;     // (rotation about Y, rotation about X) in radians
    uniform vec2 uShift;    // parallax offset in uv units
    uniform float uRadius;
    uniform float uAlpha;
    uniform float uPar;
    uniform float uZoom;
    varying vec2 vUv;

    vec2 cover(vec2 uv, float asp){
      float pa = uSize.x / uSize.y;
      vec2 s = vec2(1.0);
      if (pa > asp) s.y = asp / pa; else s.x = pa / asp;
      return (uv - 0.5) * s + 0.5;
    }

    // image colour at uv, including the slideshow transition
    vec3 pick(vec2 uv){
      float e = uProgress * uProgress * (3.0 - 2.0 * uProgress);
      vec2 dir = vec2(0.0, 1.0);
      vec3 a = texture2D(uTex,  cover(uv + dir * e * 0.12, uAsp)).rgb;
      vec3 b = texture2D(uTex2, cover(uv - dir * (1.0 - e) * 0.12, uAsp2)).rgb;
      float wipe = smoothstep(0.0, 1.0, clamp(uProgress * 1.4 - (1.0 - vUv.y) * 0.4, 0.0, 1.0));
      return mix(a, b, wipe);
    }

    void main(){
      // depth: push the picture in a little and slide it against the tilt (parallax)
      float zoom = uZoom * (1.0 + 0.07 * uHover);
      vec2 uv = vUv + uShift * uHover;
      uv.y += uPar;
      uv = (uv - 0.5) / zoom + 0.5;
      vec3 col = pick(uv);

      // lighting: the far edge of the tilted plane falls into shade, the near edge catches light
      float edge = dot(vUv - 0.5, vec2(uTilt.x, -uTilt.y));
      col *= 1.0 - clamp(edge * 1.3, -0.16, 0.16);
      vec3 n = normalize(vec3(sin(uTilt.x), -sin(uTilt.y), cos(uTilt.x) * cos(uTilt.y)));
      vec3 L = normalize(vec3(-0.35, 0.55, 0.75));
      col *= 1.0 + (dot(n, L) - dot(vec3(0.0, 0.0, 1.0), L)) * 0.35 * uHover;

      // rounded corners + fade-in
      vec2 pp = (vUv - 0.5) * uSize;
      vec2 qq = abs(pp) - (uSize * 0.5 - uRadius);
      float sd = length(max(qq, 0.0)) + min(max(qq.x, qq.y), 0.0) - uRadius;
      float alpha = (1.0 - smoothstep(-1.0, 1.0, sd)) * uAlpha;

      gl_FragColor = vec4(col, alpha);
    }`;

  const geo = new THREE.PlaneGeometry(1, 1, 24, 24);
  const loader = new THREE.TextureLoader();
  const mouse = { x: -9999, y: -9999 };
  let vel = 0;
  if (fine) window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function prep(t) { t.minFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; }

  function add(el) {
    if (dead || el.__gl) return;
    const imgEl = el.querySelector('img');
    const vidEl = el.querySelector('video');
    const slides = el.dataset.glSlides ? el.dataset.glSlides.split(',') : null;
    const src = slides ? slides[0] : (imgEl && (imgEl.currentSrc || imgEl.src));
    if (!src && !vidEl) return;

    const mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, transparent: true,
      uniforms: {
        uTex: { value: null }, uTex2: { value: null },
        uSize: { value: new THREE.Vector2(1, 1) },
        uAsp: { value: 1 }, uAsp2: { value: 1 },
        uProgress: { value: 0 }, uHover: { value: 0 },
        uTilt: { value: new THREE.Vector2(0, 0) }, uShift: { value: new THREE.Vector2(0, 0) },
        uVel: { value: 0 },
        uRadius: { value: 0 }, uAlpha: { value: 0 },
        uPar: { value: 0 }, uZoom: { value: 1 }
      }
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);

    const it = {
      el, mesh, mat, src, slides, vidEl, ready: false, loading: false, hover: 0,
      par: false, slideTex: [], cur: 0, slideTimer: 0, nx: 0, ny: 0
    };
    el.__gl = it;
    items.push(it);
    io.observe(el);
  }

  function reveal(it) {
    it.ready = true;
    it.loading = false;
    it.el.dispatchEvent(new CustomEvent('gl:ready'));
    gsap.to(it.mat.uniforms.uAlpha, {
      value: 1, duration: 0.6, ease: 'power2.out',
      onComplete: () => { if (it.ready) it.el.classList.add('gl-ready'); }
    });
  }

  function load(it) {
    if (dead || it.ready || it.loading) return;
    it.loading = true;
    const u = it.mat.uniforms;

    if (it.vidEl) {
      const v = it.vidEl;
      v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute('playsinline', '');
      const go = () => {
        if (it.ready) return;
        const t = prep(new THREE.VideoTexture(v));
        u.uTex.value = u.uTex2.value = t;
        u.uAsp.value = u.uAsp2.value = (v.videoWidth || 16) / (v.videoHeight || 9);
        it.tex = t;
        reveal(it);
      };
      const p = v.play();
      if (p && p.catch) p.catch(() => { it.loading = false; });
      if (v.readyState >= 2) go(); else v.addEventListener('loadeddata', go, { once: true });
      return;
    }

    loader.load(it.src, (t) => {
      prep(t);
      u.uTex.value = u.uTex2.value = t;
      u.uAsp.value = u.uAsp2.value = t.image.width / t.image.height;
      it.slideTex[0] = t; it.tex = t;
      reveal(it);
      if (it.slides && it.slides.length > 1) initSlides(it);
    }, undefined, () => { it.loading = false; it.failed = true; });
  }

  function unload(it) {
    if (!it.ready || it.slides) return; // keep the hero slideshow resident
    it.ready = false;
    it.el.classList.remove('gl-ready');
    it.mesh.visible = false;
    it.mat.uniforms.uAlpha.value = 0;
    if (it.vidEl) it.vidEl.pause();
    if (it.tex) { it.tex.dispose(); it.tex = null; }
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const it = e.target.__gl;
      if (!it) return;
      if (e.isIntersecting) load(it); else unload(it);
    });
  }, { rootMargin: '150% 120% 150% 120%' });

  function initSlides(it) {
    it.slides.slice(1).forEach((s, i) => {
      loader.load(s, (t) => { it.slideTex[i + 1] = prep(t); }, undefined, () => {});
    });
    const u = it.mat.uniforms;
    function next() {
      if (dead) return;
      const n = (it.cur + 1) % it.slides.length;
      if (!it.slideTex[n]) { it.slideTimer = setTimeout(next, 500); return; }
      u.uTex2.value = it.slideTex[n];
      u.uAsp2.value = it.slideTex[n].image.width / it.slideTex[n].image.height;
      gsap.fromTo(u.uProgress, { value: 0 }, {
        value: 1, duration: reduce ? 0.01 : 1.4, ease: 'power2.inOut',
        onComplete: () => {
          it.cur = n;
          u.uTex.value = it.slideTex[n];
          u.uAsp.value = u.uAsp2.value;
          u.uProgress.value = 0;
          it.slideTimer = setTimeout(next, 2400);
        }
      });
    }
    it.slideTimer = setTimeout(next, 2800);
  }

  function scan(root) { (root || document).querySelectorAll('[data-gl]').forEach(add); }

  let last = performance.now();
  function frame(now) {
    if (dead) return;
    last = now;
    const lv = window.__lenis && !reduce ? window.__lenis.velocity || 0 : 0;
    vel += (Math.max(-1, Math.min(1, lv / 60)) - vel) * 0.12;

    for (const it of items) {
      if (!it.ready) continue;
      const r = it.el.getBoundingClientRect();
      const off = r.bottom < -50 || r.top > H + 50 || r.right < -50 || r.left > W + 50 || r.width < 2 || r.height < 2;
      if (off) { it.mesh.visible = false; continue; }
      it.mesh.visible = true;
      const u = it.mat.uniforms;
      u.uSize.value.set(r.width, r.height);
      u.uVel.value = vel;
      u.uRadius.value = parseFloat(getComputedStyle(it.el).borderTopLeftRadius) || 0;
      if (it.par) {
        u.uPar.value = ((r.top + r.height / 2) - H / 2) / H * -0.08;
        u.uZoom.value = 1.14;
      }

      // 3D hover: the plane tilts toward the cursor, lifts toward you and the picture shifts for depth
      let tx = 0, ty = 0, inside = false;
      if (fine && !reduce) {
        inside = mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom;
        if (inside) {
          tx = Math.max(-1, Math.min(1, (mouse.x - (r.left + r.width / 2)) / (r.width / 2)));
          ty = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - mouse.y) / (r.height / 2)));
        }
        it.hover += ((inside ? 1 : 0) - it.hover) * 0.10;
        it.nx += (tx - it.nx) * 0.09;
        it.ny += (ty - it.ny) * 0.09;
      }
      const MAXA = 0.24;                               // about 14 degrees
      const ry = it.nx * MAXA, rx = -it.ny * MAXA;
      const lift = 90 * it.hover;
      const sc = ((CAMZ - lift) / CAMZ) * (1 + 0.015 * it.hover);
      it.mesh.rotation.set(rx, ry, 0);
      it.mesh.scale.set(r.width * sc, r.height * sc, 1);
      it.mesh.position.set(r.left + r.width / 2 - W / 2, H / 2 - (r.top + r.height / 2), lift);
      u.uHover.value = it.hover;
      u.uTilt.value.set(ry, rx);
      u.uShift.value.set(-it.nx * 0.03, -it.ny * 0.03);
    }
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.GL = { add, scan, items };
})();
