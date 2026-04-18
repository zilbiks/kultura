const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const imageUrlInput = document.getElementById('imageUrl');
const loadBtn = document.getElementById('loadBtn');
const uploadInput = document.getElementById('uploadInput');
const intensityInput = document.getElementById('intensity');
const loopDurationInput = document.getElementById('loopDuration');
const toggleBtn = document.getElementById('toggleBtn');

const state = {
  baseImage: null,
  running: true,
  intensity: Number(intensityInput.value),
  loopDuration: Number(loopDurationInput.value),
  startTime: performance.now()
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image source.'));
    img.src = src;
  });
}

function fitCanvasToImage(img) {
  const maxW = 2048;
  const maxH = 1536;
  const scale = Math.min(maxW / img.width, maxH / img.height, 1);
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
}

function drawGlow(x, y, radius, alpha, color = '255, 220, 120') {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, `rgba(${color}, ${alpha})`);
  grad.addColorStop(1, `rgba(${color}, 0)`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkyFlow(t, amp) {
  const skyH = canvas.height * 0.66;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, skyH);
  ctx.clip();

  for (let i = 0; i < 6; i += 1) {
    const phase = t * Math.PI * 2 + i * 0.7;
    const dx = Math.sin(phase) * amp * (5 + i * 2);
    const dy = Math.cos(phase * 0.8) * amp * (2 + i * 1.3);

    ctx.globalAlpha = 0.035 + i * 0.01;
    ctx.drawImage(canvas, dx, dy, canvas.width, skyH, 0, 0, canvas.width, skyH);
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawStarsAndMoon(t, amp) {
  const stars = [
    [0.18, 0.11, 14], [0.31, 0.2, 18], [0.45, 0.1, 15], [0.57, 0.2, 13],
    [0.68, 0.12, 18], [0.77, 0.24, 14], [0.84, 0.16, 15], [0.23, 0.3, 13],
    [0.4, 0.3, 12], [0.61, 0.31, 11], [0.72, 0.3, 10]
  ];

  stars.forEach((star, i) => {
    const [nx, ny, r] = star;
    const pulse = (Math.sin((t + i * 0.11) * Math.PI * 2) + 1) * 0.5;
    const alpha = 0.08 + pulse * 0.18 * amp;
    drawGlow(canvas.width * nx, canvas.height * ny, r * (1 + amp * 1.5), alpha, '255, 213, 120');
  });

  const moonPulse = (Math.sin(t * Math.PI * 2) + 1) * 0.5;
  drawGlow(canvas.width * 0.87, canvas.height * 0.13, 70 + 18 * amp, 0.16 + moonPulse * 0.1 * amp, '255, 226, 151');
}

function drawCloudDrift(t, amp) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height * 0.64);
  ctx.clip();

  for (let i = 0; i < 5; i += 1) {
    const y = canvas.height * (0.09 + i * 0.09);
    const xBase = ((t + i * 0.17) % 1) * canvas.width;
    const width = canvas.width * 0.24;
    const height = canvas.height * 0.05;

    const grad = ctx.createLinearGradient(xBase - width, y, xBase + width, y);
    grad.addColorStop(0, 'rgba(130, 160, 255, 0)');
    grad.addColorStop(0.5, `rgba(174, 198, 255, ${0.07 * amp})`);
    grad.addColorStop(1, 'rgba(130, 160, 255, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(xBase - width * 0.3, y, width, height, Math.sin(i + t * Math.PI * 2) * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawCypressSway(t, amp) {
  const sway = Math.sin(t * Math.PI * 2) * amp * 3;
  const left = canvas.width * 0.02;
  const top = canvas.height * 0.11;
  const width = canvas.width * 0.25;
  const height = canvas.height * 0.85;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(left + width * 0.55, top);
  ctx.lineTo(left + width * 0.1, top + height * 0.65);
  ctx.lineTo(left + width * 0.18, top + height);
  ctx.lineTo(left + width * 0.95, top + height);
  ctx.lineTo(left + width * 0.85, top + height * 0.62);
  ctx.closePath();
  ctx.clip();

  ctx.globalAlpha = 0.12 * amp;
  ctx.drawImage(canvas, sway, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawVillageFlicker(t, amp) {
  const lights = [
    [0.37, 0.78, 6], [0.43, 0.8, 6], [0.48, 0.79, 5], [0.52, 0.81, 5],
    [0.57, 0.79, 6], [0.61, 0.8, 6], [0.66, 0.79, 5], [0.71, 0.8, 5]
  ];

  lights.forEach((light, i) => {
    const [nx, ny, radius] = light;
    const flicker = 0.7 + 0.3 * Math.sin((t * 1.6 + i * 0.29) * Math.PI * 2);
    drawGlow(canvas.width * nx, canvas.height * ny, radius * 2.4, 0.07 * flicker * amp, '255, 190, 110');
  });
}

function renderFrame(now) {
  if (!state.baseImage) {
    requestAnimationFrame(renderFrame);
    return;
  }

  const elapsed = (now - state.startTime) / 1000;
  const t = (elapsed % state.loopDuration) / state.loopDuration;
  const amp = state.intensity;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(state.baseImage, 0, 0, canvas.width, canvas.height);

  drawSkyFlow(t, amp);
  drawCloudDrift(t, amp);
  drawStarsAndMoon(t, amp);
  drawCypressSway(t, amp);
  drawVillageFlicker(t, amp);

  if (state.running) {
    requestAnimationFrame(renderFrame);
  }
}

async function initialize() {
  try {
    const img = await loadImage(imageUrlInput.value.trim());
    fitCanvasToImage(img);
    state.baseImage = img;
    state.startTime = performance.now();
    state.running = true;
    toggleBtn.textContent = 'Pause';
    requestAnimationFrame(renderFrame);
  } catch (error) {
    alert(`${error.message}\nTry uploading a local image file.`);
  }
}

loadBtn.addEventListener('click', initialize);

uploadInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  const localUrl = URL.createObjectURL(file);
  imageUrlInput.value = localUrl;
  await initialize();
});

intensityInput.addEventListener('input', () => {
  state.intensity = Number(intensityInput.value);
});

loopDurationInput.addEventListener('change', () => {
  const value = Number(loopDurationInput.value);
  state.loopDuration = Number.isFinite(value) ? Math.max(4, Math.min(16, value)) : 8;
});

toggleBtn.addEventListener('click', () => {
  state.running = !state.running;
  toggleBtn.textContent = state.running ? 'Pause' : 'Play';
  if (state.running) {
    state.startTime = performance.now();
    requestAnimationFrame(renderFrame);
  }
});

initialize();
