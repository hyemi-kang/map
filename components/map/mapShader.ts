export const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/*
 * 画面全体に 1 枚の紙地図(シート)を描く。
 *  - inset: シートが画面の縁から内側へ入る割合。0 で画面いっぱい(ズーム後)
 *  - tilt : 机の上に置いたときの少しの傾き(ラジアン)
 *  - wear : 縁の傷み・めくれ・影の強さ。0 で無地の全面表示
 *  シートの外側は透明で、背後の木の机(DOM)が見える。
 */
export const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform sampler2D texA;
  uniform sampler2D texB;
  uniform vec4 boundsA;   // x, y, w, h (世界座標)
  uniform vec4 boundsB;
  uniform float mixT;     // 0 = A, 1 = B
  uniform vec2 center;    // 表示中心(世界座標)
  uniform float zoom;     // log(表示範囲の高さ)
  uniform float aspect;
  uniform float inset;
  uniform float tilt;
  uniform float wear;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  float fbm(vec2 p) {
    return noise(p) * 0.55 + noise(p * 2.07 + 5.3) * 0.3 + noise(p * 4.3 + 1.7) * 0.15;
  }

  vec3 sampleLayer(sampler2D t, vec4 b, vec2 world) {
    vec2 uv = (world - b.xy) / b.zw;
    uv.y = 1.0 - uv.y; // 世界座標は y が下向き、テクスチャは上向き
    return texture2D(t, clamp(uv, 0.001, 0.999)).rgb;
  }
  float insideB(vec2 world) {
    vec2 uv = (world - boundsB.xy) / boundsB.zw;
    vec2 e = smoothstep(vec2(0.0), vec2(0.02), uv) * smoothstep(vec2(0.0), vec2(0.02), 1.0 - uv);
    return e.x * e.y;
  }
  vec3 sampleScene(vec2 world) {
    float w = mixT * insideB(world);
    return mix(sampleLayer(texA, boundsA, world), sampleLayer(texB, boundsB, world), w);
  }

  float sdBox(vec2 p, vec2 b) {
    vec2 d = abs(p) - b;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  }

  void main() {
    float h = exp(zoom);
    // 画面 → シート座標 s(0..1, y は上向き)
    vec2 p = (vUv - 0.5) * vec2(aspect, 1.0);
    float c = cos(tilt), sn = sin(tilt);
    vec2 pr = vec2(c * p.x - sn * p.y, sn * p.x + c * p.y);
    float k = 1.0 - 2.0 * inset;
    vec2 s = pr / (k * vec2(aspect, 1.0)) + 0.5;
    vec2 world = center + vec2((s.x - 0.5) * aspect, 0.5 - s.y) * h;

    // シート内の座標(縦 1 = シートの高さ)
    vec2 q = (s - 0.5) * vec2(aspect, 1.0);
    vec2 hf = vec2(aspect, 1.0) * 0.5;
    float d = sdBox(q, hf);
    // 縁のゆらぎ(紙の端は少し波打ち、ところどころ欠けている)
    d += (fbm(q * 14.0) - 0.5) * 0.012 * wear + (noise(q * 90.0) - 0.5) * 0.004 * wear;
    float edgeAlpha = 1.0 - smoothstep(-0.0008, 0.0012, d);

    /* ---- 紙の内容 ---- */
    vec3 col = sampleScene(world);

    /* ---- 紙の質感 ---- */
    vec2 pp = s * vec2(aspect, 1.0);
    float fiber = noise(pp * 420.0) * 0.5 + noise(pp * 90.0) * 0.5;
    col *= 0.94 + fiber * 0.1;
    float wrinkle = fbm(pp * 6.0 + 3.0);
    col *= 0.95 + wrinkle * 0.07;
    // 折り目(縦 2 本・横 1 本)。折り目に沿って少し擦れて白っぽい
    float fold = smoothstep(0.0035, 0.0, abs(s.x - 0.333)) + smoothstep(0.0035, 0.0, abs(s.x - 0.667)) + smoothstep(0.0035, 0.0, abs(s.y - 0.5));
    float foldWide = smoothstep(0.02, 0.0, abs(s.x - 0.333)) + smoothstep(0.02, 0.0, abs(s.x - 0.667)) + smoothstep(0.03, 0.0, abs(s.y - 0.5));
    col *= 1.0 - fold * 0.1;
    col = mix(col, col * 0.97 + 0.03, foldWide * 0.5);
    // シミ
    float stain = smoothstep(0.62, 0.8, fbm(pp * 2.3 + 11.0));
    col = mix(col, col * vec3(0.86, 0.78, 0.62), stain * 0.35 * wear);

    /* ---- 縁の傷み ---- */
    float band = smoothstep(-0.05, 0.0, d) * wear;
    float grunge = fbm(q * 40.0);
    col = mix(col, col * vec3(0.62, 0.5, 0.36), band * (0.55 + 0.6 * grunge));
    float edgeLine = smoothstep(-0.012, -0.002, d) * wear;
    col = mix(col, vec3(0.93, 0.88, 0.76), edgeLine * 0.35); // 縁は毛羽立って白っぽい
    // 端が反って持ち上がっている筋(上辺・左辺はハイライト、下辺・右辺は影)
    float lift = smoothstep(-0.05, -0.012, d) * smoothstep(0.0, -0.012, d) * wear;
    float toward = dot(normalize(q + 1e-4), vec2(-0.6, 0.8));
    col += lift * 0.16 * max(toward, 0.0);
    col -= lift * 0.12 * max(-toward, 0.0);

    /* ---- めくれた角(右下: 大きい / 左上: 小さい) ---- */
    float outAlpha = edgeAlpha;
    float flapShade = 0.0;
    vec3 flapCol = vec3(0.0);
    float flapMask = 0.0;
    {
      float kk = 0.2 * wear;
      vec2 a = hf - q;                     // 右下の角からの距離
      float qd = a.x + a.y;
      if (kk > 0.0 && qd < kk) outAlpha = 0.0; // 折り返しで隠れる部分
      if (kk > 0.0 && a.x < kk && a.y < kk && qd > kk) {
        flapMask = 1.0;
        float t = (qd - kk) / kk;            // 折り目 0 → 角 1
        vec3 back = vec3(0.93, 0.89, 0.78);
        flapCol = back * (0.78 + 0.22 * smoothstep(0.0, 0.7, t)) + (1.0 - t) * 0.05;
        flapCol *= 0.96 + fbm(q * 120.0) * 0.08;
      }
      // 折り目のそばは地図側に影が落ちる
      float sh = smoothstep(0.05 * wear, 0.0, qd - kk) * step(kk, qd) * step(a.x, kk * 1.3) * step(a.y, kk * 1.3);
      col *= 1.0 - sh * 0.3;
    }
    {
      float kk = 0.1 * wear;
      vec2 a = vec2(q.x + hf.x, hf.y - q.y); // 左上の角
      float qd = a.x + a.y;
      if (kk > 0.0 && qd < kk) outAlpha = 0.0;
      if (kk > 0.0 && a.x < kk && a.y < kk && qd > kk) {
        flapMask = 1.0;
        float t = (qd - kk) / kk;
        flapCol = vec3(0.93, 0.89, 0.78) * (0.8 + 0.2 * smoothstep(0.0, 0.7, t)) + (1.0 - t) * 0.04;
      }
    }
    col = mix(col, flapCol, flapMask);
    outAlpha = max(outAlpha, flapMask * edgeAlpha);

    /* ---- 机に落ちる影 ---- */
    float shadowD = d - 0.0;
    vec2 off = vec2(0.012, -0.018) * wear;
    float dS = sdBox(q - off, hf) + (fbm(q * 14.0) - 0.5) * 0.012 * wear;
    float shadow = (1.0 - smoothstep(-0.01, 0.07, dS)) * 0.42 * wear;
    float inside = outAlpha;
    vec3 rgb = col;
    float alpha = inside + (1.0 - inside) * shadow;
    rgb = mix(vec3(0.05, 0.03, 0.02), col, inside / max(alpha, 1e-4));

    // 全画面表示のときは周辺を少し暗くして紙らしさを足す
    float vig = smoothstep(0.95, 0.35, length(p * vec2(0.7, 1.0)));
    rgb = mix(rgb * vec3(0.9, 0.84, 0.74), rgb, mix(vig, 1.0, wear));

    gl_FragColor = vec4(rgb, alpha);
    #include <colorspace_fragment>
  }
`;
