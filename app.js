const IMAGE_URL = 'https://upload.wikimedia.org/wikipedia/commons/e/ea/The_Starry_Night.jpg';

let starryNight;
let baseBuffer;

const settings = {
  maxDisplayWidth: 1280,
  maxDisplayHeight: 900,
  pixelStep: 2,
  maxDisplacement: 2.4,
  noiseScale: 0.008,
  noiseTimeScale: 0.01,
  noiseStrength: 0.35,
  mainVortex: { x: 0.6, y: 0.4, radius: 260, strength: 1.0 },
  secondaryVortex: { x: 0.83, y: 0.2, radius: 180, strength: 0.75 }
};

function preload() {
  starryNight = loadImage(IMAGE_URL);
}

function setup() {
  pixelDensity(1);

  const scale = Math.min(
    settings.maxDisplayWidth / starryNight.width,
    settings.maxDisplayHeight / starryNight.height,
    1
  );

  const w = Math.floor(starryNight.width * scale);
  const h = Math.floor(starryNight.height * scale);

  createCanvas(w, h);
  noSmooth();

  baseBuffer = createGraphics(width, height);
  baseBuffer.image(starryNight, 0, 0, width, height);
}

function vortexInfluence(px, py, centerX, centerY, radius, strength) {
  const dx = px - centerX;
  const dy = py - centerY;
  const d = Math.sqrt(dx * dx + dy * dy) + 0.0001;

  const tangentAngle = atan2(dy, dx) + HALF_PI;
  const falloff = Math.exp(-Math.pow(d / radius, 1.55));
  const pull = strength * falloff;

  return {
    x: Math.cos(tangentAngle) * pull,
    y: Math.sin(tangentAngle) * pull
  };
}

function draw() {
  image(baseBuffer, 0, 0);

  loadPixels();
  const source = new Uint8ClampedArray(pixels);

  const mainCx = settings.mainVortex.x * width;
  const mainCy = settings.mainVortex.y * height;
  const secondCx = settings.secondaryVortex.x * width;
  const secondCy = settings.secondaryVortex.y * height;

  for (let y = 0; y < height; y += settings.pixelStep) {
    for (let x = 0; x < width; x += settings.pixelStep) {
      const main = vortexInfluence(
        x,
        y,
        mainCx,
        mainCy,
        settings.mainVortex.radius,
        settings.mainVortex.strength
      );

      const secondary = vortexInfluence(
        x,
        y,
        secondCx,
        secondCy,
        settings.secondaryVortex.radius,
        settings.secondaryVortex.strength
      );

      const flowNoise = (noise(
        x * settings.noiseScale,
        y * settings.noiseScale,
        frameCount * settings.noiseTimeScale
      ) - 0.5) * TWO_PI;

      let displacementX = (main.x + secondary.x) * 2.1 + Math.cos(flowNoise) * settings.noiseStrength;
      let displacementY = (main.y + secondary.y) * 2.1 + Math.sin(flowNoise) * settings.noiseStrength;

      const displacementMag = Math.sqrt(displacementX * displacementX + displacementY * displacementY);
      if (displacementMag > settings.maxDisplacement) {
        const s = settings.maxDisplacement / displacementMag;
        displacementX *= s;
        displacementY *= s;
      }

      const sampleX = constrain(Math.round(x + displacementX), 0, width - 1);
      const sampleY = constrain(Math.round(y + displacementY), 0, height - 1);
      const sourceIndex = (sampleY * width + sampleX) * 4;

      let r = source[sourceIndex];
      let g = source[sourceIndex + 1];
      let b = source[sourceIndex + 2];
      const a = source[sourceIndex + 3];

      const isStar = r > 165 && g > 140 && b < 170 && (r + g) > 350;
      if (isStar) {
        const pulse = 1 + 0.08 * Math.sin(frameCount * 0.08 + x * 0.02 + y * 0.02);
        r = constrain(r * pulse, 0, 255);
        g = constrain(g * pulse, 0, 255);
      }

      for (let oy = 0; oy < settings.pixelStep; oy += 1) {
        for (let ox = 0; ox < settings.pixelStep; ox += 1) {
          const tx = x + ox;
          const ty = y + oy;
          if (tx >= width || ty >= height) {
            continue;
          }
          const targetIndex = (ty * width + tx) * 4;
          pixels[targetIndex] = r;
          pixels[targetIndex + 1] = g;
          pixels[targetIndex + 2] = b;
          pixels[targetIndex + 3] = a;
        }
      }
    }
  }

  updatePixels();
}
