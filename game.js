(() => {
  "use strict";

  const canvas = document.getElementById("scorpion-game");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const stage = document.getElementById("game-stage");
  const overlay = document.getElementById("game-overlay");
  const overlayTitle = document.getElementById("game-overlay-title");
  const overlayCopy = document.getElementById("game-overlay-copy");
  const startButton = document.getElementById("game-start");
  const soundButton = document.getElementById("game-sound");
  const flash = document.getElementById("game-flash");
  const scoreEl = document.getElementById("game-score");
  const waveEl = document.getElementById("game-wave");
  const livesEl = document.getElementById("game-lives");
  const bestEl = document.getElementById("game-best");

  const W = canvas.width;
  const H = canvas.height;
  const keys = {};
  let playing = false;
  let score = 0;
  let wave = 1;
  let lives = 3;
  let lastTime = 0;
  let fireClock = 0;
  let spawnClock = 0;
  let enemiesDown = 0;
  let soundOn = false;
  let audio = null;
  let pointerActive = false;
  let animationId = 0;
  let best = Number(localStorage.getItem("scorpionStrikeBest") || 0);

  const player = { x: W / 2, y: H - 64, vx: 0, invincible: 0 };
  let shots = [];
  let enemies = [];
  let particles = [];
  let stars = Array.from({ length: 100 }, (_, i) => ({
    x: (i * 83.7) % W,
    y: (i * 47.3) % H,
    s: 0.5 + (i % 4) * 0.45,
    v: 10 + (i % 5) * 7
  }));

  bestEl.textContent = String(best).padStart(6, "0");

  function tone(frequency, duration, volume, type = "square") {
    if (!soundOn) return;
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    gain.gain.setValueAtTime(volume, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + duration);
  }

  function updateHud() {
    scoreEl.textContent = String(score).padStart(6, "0");
    waveEl.textContent = String(wave).padStart(2, "0");
    livesEl.textContent = "◆".repeat(Math.max(0, lives));
    bestEl.textContent = String(Math.max(best, score)).padStart(6, "0");
  }

  function reset() {
    score = 0;
    wave = 1;
    lives = 3;
    fireClock = 0;
    spawnClock = 0.25;
    enemiesDown = 0;
    shots = [];
    enemies = [];
    particles = [];
    player.x = W / 2;
    player.vx = 0;
    player.invincible = 1.5;
    updateHud();
  }

  function startGame() {
    reset();
    playing = true;
    overlay.classList.add("is-hidden");
    lastTime = performance.now();
    cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(loop);
    tone(180, 0.12, 0.04, "sawtooth");
  }

  function endGame() {
    playing = false;
    best = Math.max(best, score);
    localStorage.setItem("scorpionStrikeBest", String(best));
    updateHud();
    overlayTitle.textContent = "SIGNAL LOST";
    overlayCopy.innerHTML = `Final score: ${String(score).padStart(6, "0")}<br>Best: ${String(best).padStart(6, "0")}`;
    startButton.innerHTML = "RETRY MISSION <span>↻</span>";
    overlay.classList.remove("is-hidden");
    tone(80, 0.45, 0.07, "sawtooth");
  }

  function spawnEnemy() {
    const edge = 45;
    const armored = wave > 2 && Math.random() < Math.min(0.12 + wave * 0.025, 0.34);
    enemies.push({
      x: edge + Math.random() * (W - edge * 2),
      y: -35,
      r: armored ? 22 : 16,
      hp: armored ? 2 : 1,
      armored,
      speed: 56 + wave * 7 + Math.random() * 34,
      drift: (Math.random() - 0.5) * 70,
      phase: Math.random() * Math.PI * 2,
      t: 0
    });
  }

  function fire() {
    shots.push({ x: player.x - 13, y: player.y - 18 }, { x: player.x + 13, y: player.y - 18 });
    burst(player.x, player.y - 24, "#36e0a5", 2, 55);
    tone(520, 0.045, 0.018);
  }

  function burst(x, y, color, count = 8, speed = 140) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.35 + Math.random() * 0.65);
      particles.push({
        x, y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 0.35 + Math.random() * 0.45,
        maxLife: 0.8,
        color,
        size: 1.5 + Math.random() * 2.5
      });
    }
  }

  function hitPlayer(enemy) {
    enemies.splice(enemies.indexOf(enemy), 1);
    if (player.invincible > 0) return;
    lives -= 1;
    player.invincible = 1.6;
    burst(player.x, player.y, "#ff516d", 24, 220);
    flash.classList.remove("hit");
    void flash.offsetWidth;
    flash.classList.add("hit");
    tone(110, 0.25, 0.08, "sawtooth");
    updateHud();
    if (lives <= 0) endGame();
  }

  function update(dt) {
    for (const star of stars) {
      star.y += star.v * dt;
      if (star.y > H) { star.y = 0; star.x = Math.random() * W; }
    }

    const direction = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    player.vx += direction * 1800 * dt;
    player.vx *= Math.pow(0.0008, dt);
    player.x = Math.max(38, Math.min(W - 38, player.x + player.vx * dt));
    player.invincible = Math.max(0, player.invincible - dt);

    fireClock -= dt;
    if ((keys.Space || pointerActive) && fireClock <= 0) {
      fire();
      fireClock = Math.max(0.11, 0.2 - wave * 0.005);
    }

    spawnClock -= dt;
    if (spawnClock <= 0) {
      spawnEnemy();
      spawnClock = Math.max(0.3, 0.86 - wave * 0.045) * (0.82 + Math.random() * 0.35);
    }

    for (const shot of shots) shot.y -= 570 * dt;
    shots = shots.filter(shot => shot.y > -20);

    for (const enemy of [...enemies]) {
      enemy.t += dt;
      enemy.y += enemy.speed * dt;
      enemy.x += (enemy.drift + Math.sin(enemy.t * 3 + enemy.phase) * 38) * dt;
      if (enemy.x < enemy.r || enemy.x > W - enemy.r) enemy.drift *= -1;

      if (enemy.y > H + 30) {
        hitPlayer(enemy);
        if (!playing) return;
        continue;
      }

      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.r + 23) {
        hitPlayer(enemy);
        if (!playing) return;
      }
    }

    for (const shot of [...shots]) {
      for (const enemy of [...enemies]) {
        if (Math.hypot(shot.x - enemy.x, shot.y - enemy.y) < enemy.r + 5) {
          shots.splice(shots.indexOf(shot), 1);
          enemy.hp -= 1;
          burst(shot.x, shot.y, enemy.armored ? "#f3cf6c" : "#86f7d2", 7, 130);
          tone(enemy.hp ? 250 : 330, 0.055, 0.025);
          if (enemy.hp <= 0) {
            enemies.splice(enemies.indexOf(enemy), 1);
            score += enemy.armored ? 250 : 100;
            enemiesDown += 1;
            burst(enemy.x, enemy.y, enemy.armored ? "#f3cf6c" : "#36e0a5", 16, 185);
            const nextWave = Math.floor(enemiesDown / 12) + 1;
            if (nextWave > wave) {
              wave = nextWave;
              score += 500;
              tone(720, 0.18, 0.045, "triangle");
            }
            updateHud();
          }
          break;
        }
      }
    }

    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= Math.pow(0.06, dt);
      p.vy *= Math.pow(0.06, dt);
      p.life -= dt;
    }
    particles = particles.filter(p => p.life > 0);
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#07111f");
    gradient.addColorStop(1, "#040810");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(54,224,165,.045)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = H % 60; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    for (const star of stars) {
      ctx.globalAlpha = 0.3 + star.s * 0.2;
      ctx.fillStyle = "#b9d9e7";
      ctx.fillRect(star.x, star.y, star.s, star.s);
    }
    ctx.globalAlpha = 1;

    const horizon = ctx.createRadialGradient(W / 2, H, 0, W / 2, H, 430);
    horizon.addColorStop(0, "rgba(54,224,165,.10)");
    horizon.addColorStop(1, "rgba(54,224,165,0)");
    ctx.fillStyle = horizon;
    ctx.fillRect(0, H - 230, W, 230);
  }

  function drawPlayer() {
    if (player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.shadowColor = "#36e0a5";
    ctx.shadowBlur = 16;

    ctx.fillStyle = "#36e0a5";
    ctx.beginPath();
    ctx.moveTo(0, -25); ctx.lineTo(13, -7); ctx.lineTo(10, 19);
    ctx.lineTo(0, 25); ctx.lineTo(-10, 19); ctx.lineTo(-13, -7);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#132c31";
    ctx.beginPath();
    ctx.moveTo(0, -15); ctx.lineTo(6, 2); ctx.lineTo(0, 13); ctx.lineTo(-6, 2);
    ctx.closePath(); ctx.fill();

    ctx.strokeStyle = "#36e0a5";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-11, 0); ctx.lineTo(-27, -8); ctx.lineTo(-35, -20);
    ctx.moveTo(11, 0); ctx.lineTo(27, -8); ctx.lineTo(35, -20);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-34, -20); ctx.lineTo(-42, -14);
    ctx.moveTo(-34, -20); ctx.lineTo(-28, -27);
    ctx.moveTo(34, -20); ctx.lineTo(42, -14);
    ctx.moveTo(34, -20); ctx.lineTo(28, -27);
    ctx.stroke();

    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(8, 16);
    ctx.quadraticCurveTo(27, 29, 25, 10);
    ctx.quadraticCurveTo(24, -5, 34, -9);
    ctx.stroke();
    ctx.fillStyle = "#b6ffe6";
    ctx.beginPath(); ctx.arc(34, -10, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    const flap = Math.sin(enemy.t * 9 + enemy.phase) * 5;
    ctx.shadowColor = enemy.armored ? "#f3cf6c" : "#36e0a5";
    ctx.shadowBlur = 10;
    ctx.strokeStyle = enemy.armored ? "#f3cf6c" : "#57dcb0";
    ctx.fillStyle = enemy.armored ? "#3d3420" : "#102b2b";
    ctx.lineWidth = enemy.armored ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(0, -enemy.r); ctx.lineTo(enemy.r * 0.72, -4);
    ctx.lineTo(enemy.r * 0.45, enemy.r); ctx.lineTo(-enemy.r * 0.45, enemy.r);
    ctx.lineTo(-enemy.r * 0.72, -4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-enemy.r * 0.55, 0); ctx.lineTo(-enemy.r - 9, flap);
    ctx.moveTo(enemy.r * 0.55, 0); ctx.lineTo(enemy.r + 9, flap);
    ctx.stroke();
    ctx.fillStyle = enemy.armored ? "#ffe59a" : "#99ffe0";
    ctx.fillRect(-5, -4, 3, 5); ctx.fillRect(2, -4, 3, 5);
    ctx.restore();
  }

  function draw() {
    drawBackground();
    for (const shot of shots) {
      ctx.shadowColor = "#8affe0";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#aaffea";
      ctx.fillRect(shot.x - 2, shot.y - 10, 4, 14);
    }
    ctx.shadowBlur = 0;
    for (const enemy of enemies) drawEnemy(enemy);
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    drawPlayer();
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.033);
    lastTime = now;
    if (playing) {
      update(dt);
      draw();
      animationId = requestAnimationFrame(loop);
    }
  }

  function pointerMove(event) {
    if (!playing || !pointerActive) return;
    const rect = canvas.getBoundingClientRect();
    const target = (event.clientX - rect.left) / rect.width * W;
    player.x = Math.max(38, Math.min(W - 38, target));
    player.vx = 0;
  }

  startButton.addEventListener("click", startGame);
  soundButton.addEventListener("click", () => {
    soundOn = !soundOn;
    soundButton.textContent = `SOUND: ${soundOn ? "ON" : "OFF"}`;
    soundButton.setAttribute("aria-pressed", String(soundOn));
    if (soundOn) tone(440, 0.08, 0.025, "triangle");
  });
  window.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "Space", "KeyA", "KeyD"].includes(event.code) && playing) event.preventDefault();
    keys[event.code] = true;
  });
  window.addEventListener("keyup", event => { keys[event.code] = false; });
  stage.addEventListener("pointerdown", event => {
    if (!playing || event.target.closest("button")) return;
    pointerActive = true;
    stage.setPointerCapture?.(event.pointerId);
    pointerMove(event);
  });
  stage.addEventListener("pointermove", pointerMove);
  stage.addEventListener("pointerup", () => { pointerActive = false; });
  stage.addEventListener("pointercancel", () => { pointerActive = false; });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      keys.Space = false;
      pointerActive = false;
      lastTime = performance.now();
    }
  });

  draw();
})();
