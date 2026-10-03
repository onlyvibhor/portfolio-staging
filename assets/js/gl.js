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
  const cam = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, -1000, 1000);
  const items = [];
  let dead = false;

  function size() {
    // use the visual viewport so the canvas matches what the user sees on mobile browsers
    W = document.documentElement.clientWidth || window.innerWidth;
    H = window.innerHeight;
    renderer.setSize(W, H, false);
    cam.left = -W / 2; cam.right = W / 2; cam.top = H / 2; cam.bottom = -H / 2;
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
    uniform vec2 uMouse;
    uniform float uTime;
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
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                 mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
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
      vec2 uv = vUv;
      uv.y += uPar;
      uv = (uv - 0.5) / uZoom + 0.5;

      // --- translucent fluid glass lens that follows the cursor ---
      float ar = uSize.x / uSize.y;
      vec2 p = (vUv - uMouse) * vec2(ar, 1.0);       // lens space, in image-height units
      float d = length(p);
      float R = 0.30;
      float m = smoothstep(R, R * 0.55, d) * uHover; // 1 in the lens, 0 outside
      float t = uTime * 0.45;

      vec2 q = p * 5.0;
      vec2 flow = vec2(noise(q + vec2(t, 0.0)), noise(q + vec2(0.0, t) + 7.3)) - 0.5;

      // dome refraction (magnify towards the centre) + slow liquid wobble
      vec2 off = vec2(-p.x / ar, -p.y) * m * 0.30 + flow * m * 0.040;
      vec2 uvR = uv + off;

      // frosted translucency: soft blur inside the lens only
      float b = m * 0.0055;
      vec3 col = pick(uvR) * 0.4;
      col += pick(uvR + vec2( b, 0.0)) * 0.15;
      col += pick(uvR + vec2(-b, 0.0)) * 0.15;
      col += pick(uvR + vec2(0.0,  b)) * 0.15;
      col += pick(uvR + vec2(0.0, -b)) * 0.15;

      // cool glass tint, flowing between blue and cyan/mint
      vec3 cool = mix(vec3(0.18, 0.36, 1.00), vec3(0.00, 0.92, 0.85), 0.5 + 0.5 * sin(d * 9.0 - t * 2.0 + flow.x * 4.0));
      col += cool * m * 0.10;
      col = mix(col, vec3(dot(col, vec3(0.333))) + 0.03, m * 0.07);

      // liquid sheen, rim light and specular highlight
      float sheen = noise(q * 0.8 - t) * m * 0.13;
      col += vec3(0.75, 0.92, 1.0) * sheen;
      float rim = smoothstep(R * 0.50, R * 0.98, d) * (1.0 - smoothstep(R * 0.98, R * 1.10, d)) * uHover;
      col += mix(vec3(0.55, 0.85, 1.0), vec3(1.0), 0.5) * rim * 0.42;
      float spec = smoothstep(R * 0.34, 0.0, length(p - vec2(-0.32, 0.40) * R)) * m;
      col += vec3(1.0) * spec * 0.50;

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
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0 }, uVel: { value: 0 },
        uRadius: { value: 0 }, uAlpha: { value: 0 },
        uPar: { value: 0 }, uZoom: { value: 1 }
      }
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.visible = false;
    scene.add(mesh);

    const it = {
      el, mesh, mat, src, slides, vidEl, ready: false, loading: false, hover: 0,
      par: false, slideTex: [], cur: 0, slideTimer: 0, mx: 0.5, my: 0.5
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
      it.mesh.scale.set(r.width, r.height, 1);
      it.mesh.position.set(r.left + r.width / 2 - W / 2, H / 2 - (r.top + r.height / 2), 0);
      const u = it.mat.uniforms;
      u.uSize.value.set(r.width, r.height);
      u.uVel.value = vel;
      u.uTime.value = now / 1000;
      u.uRadius.value = parseFloat(getComputedStyle(it.el).borderTopLeftRadius) || 0;
      if (it.par) {
        u.uPar.value = ((r.top + r.height / 2) - H / 2) / H * -0.08;
        u.uZoom.value = 1.14;
      }
      if (fine && !reduce) {
        const inside = mouse.x >= r.left && mouse.x <= r.right && mouse.y >= r.top && mouse.y <= r.bottom;
        it.hover += ((inside ? 1 : 0) - it.hover) * 0.09;
        if (inside) {
          const tx = (mouse.x - r.left) / r.width, ty = 1 - (mouse.y - r.top) / r.height;
          if (it.hover < 0.05) { it.mx = tx; it.my = ty; }          // enter where the cursor is
          it.mx += (tx - it.mx) * 0.14; it.my += (ty - it.my) * 0.14; // liquid follow
        }
        u.uHover.value = it.hover;
        u.uMouse.value.set(it.mx, it.my);
      }
    }
    renderer.render(scene, cam);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.GL = { add, scan, items };
})();
