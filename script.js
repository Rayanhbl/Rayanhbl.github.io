/****************************************************
 * Pac‑Man Saint‑Valentin — Rayan & Yasmine
 * Version complète (responsive, net, fond via CSS)
 * - Intro → lance nobodynew
 * - OUI : Burst de cœurs → [3,2,1] → Poème + Loving Machine
 * - NON : Screamer vidéo 0216.mp4
 * - Trail de cœurs pendant les déplacements
 * - Scroll bloqué, ZQSD/Flèches, focus canvas
 * - Pas de bouton "Rejouer" à la fin du poème
 ****************************************************/

/* ------------------------------
   Sélecteurs & éléments DOM
------------------------------ */
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const audioToggleBtn = document.getElementById("audioToggle");
const bgMusic = document.getElementById("bg-music");     // nobodynew
const yesMusic = document.getElementById("yes-music");   // Loving Machine

const introOverlay = document.getElementById("introOverlay");

const screamerScreen = document.getElementById("screamerScreen");
const screamerVideo = document.getElementById("screamerVideo");
const restartBtn = document.getElementById("restartBtn");

const countdownScreen = document.getElementById("countdownScreen");
const countdownNumber = document.getElementById("countdownNumber");
const poemContainer = document.getElementById("poemContainer");

const containerDiv = document.querySelector(".container");

/* ------------------------------
   Base logique & responsive
------------------------------ */
const BASE_W = 500;
const BASE_H = 400;

let W = BASE_W;
let H = BASE_H;
let scaleX = 1, scaleY = 1;

function setCanvasSizeToViewport() {
    const cssTargetW = Math.min(window.innerWidth * 0.96, 1100);
    const cssTargetH = cssTargetW * (BASE_H / BASE_W);

    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssTargetW}px`;
    canvas.style.height = `${cssTargetH}px`;
    canvas.width = Math.round(cssTargetW * dpr);
    canvas.height = Math.round(cssTargetH * dpr);

    scaleX = (canvas.width / dpr) / BASE_W;
    scaleY = (canvas.height / dpr) / BASE_H;

    W = BASE_W * scaleX;
    H = BASE_H * scaleY;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ------------------------------
   Joueur & paramètres adaptatifs
------------------------------ */
const playerBase = { x: 24, y: 24, r: 9, color: "#FFD54F", speed: 2.0 };
const player = { ...playerBase };

function adaptPlayer() {
    player.x = playerBase.x * scaleX;
    player.y = playerBase.y * scaleY;
    player.r = Math.max(7, playerBase.r * Math.min(scaleX, scaleY));
    player.speed = Math.max(1.6, playerBase.speed * Math.min(scaleX, scaleY));
}

let keys = {
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    z: false, q: false, s: false, d: false
};

/* ------------------------------
   Sorties (adaptatives)
------------------------------ */
const exitYesBase = { x: BASE_W - 90, y: BASE_H - 60, w: 74, h: 36, color: "#00E676", label: "OUI!!!!!" };
const exitNoBase = { x: BASE_W - 90, y: 20, w: 74, h: 36, color: "#FF5252", label: "NON?" };
let exitYes = { ...exitYesBase }, exitNo = { ...exitNoBase };

function adaptExits() {
    exitYes = {
        x: exitYesBase.x * scaleX, y: exitYesBase.y * scaleY,
        w: exitYesBase.w * scaleX, h: exitYesBase.h * scaleY,
        color: exitYesBase.color, label: exitYesBase.label
    };
    exitNo = {
        x: exitNoBase.x * scaleX, y: exitNoBase.y * scaleY,
        w: exitNoBase.w * scaleX, h: exitNoBase.h * scaleY,
        color: exitNoBase.color, label: exitNoBase.label
    };
}

/* ------------------------------
   Labyrinthe SOLVABLE (zigzag), scalable
------------------------------ */
const T_BASE = 8;
const zigzagDefs = [
    { y: 64, openOn: 'left' },
    { y: 120, openOn: 'right' },
    { y: 176, openOn: 'left' },
    { y: 232, openOn: 'right' },
    { y: 288, openOn: 'left' },
    { y: 336, openOn: 'right', widerRight: true },
];
const postsBase = [
    { x: 260, y: 92, w: T_BASE, h: 20 },
    { x: 200, y: 148, w: T_BASE, h: 20 },
    { x: 300, y: 204, w: T_BASE, h: 20 },
    { x: 240, y: 260, w: T_BASE, h: 20 },
    { x: 340, y: 316, w: T_BASE, h: 20 },
];

let walls = [];

function buildWalls() {
    const T = T_BASE * Math.min(scaleX, scaleY);
    const gap = 56 * scaleX;
    const gapRightExtra = 80 * scaleX;

    const w = [];
    // Bordures
    w.push({ x: 0, y: 0, w: W, h: T });
    w.push({ x: 0, y: H - T, w: W, h: T });
    w.push({ x: 0, y: 0, w: T, h: H });
    w.push({ x: W - T, y: 0, w: T, h: H });

    // Zigzag horizontal
    zigzagDefs.forEach(def => {
        const y = def.y * scaleY;
        const wider = def.widerRight ? gapRightExtra : gap;
        if (def.openOn === 'left') {
            w.push({ x: gap, y, w: W - gap - T, h: T });
        } else {
            const endW = W - wider - T;
            w.push({ x: T, y, w: endW - T, h: T });
        }
    });

    // Poteaux (anti-raccourcis)
    postsBase.forEach(p => {
        w.push({ x: p.x * scaleX, y: p.y * scaleY, w: p.w * Math.min(scaleX, scaleY), h: p.h * scaleY });
    });

    walls = w;
}

/* ------------------------------
   Poème (ligne par ligne)
------------------------------ */
const poemLines = [
    "Rayan est timide",
    "il garde ses mots au fond du cœur",
    "mais ses yeux parlent pour lui",
    "Il aime les cheveux de Yasmine",
    "quand ils dansent doucement autour de son visage",
    "comme s’ils connaissaient déjà ses pensées",
    "Il aime ses yeux plus que tout",
    "parce qu’ils brillent quand elle sourit",
    "et parce qu’il pourrait s’y perdre longtemps",
    "Rayan la regarde souvent",
    "trop souvent peut-être",
    "mais toujours avec douceur",
    "Il ne veut rien d’autre",
    "que marcher à ses côtés",
    "et finir sa vie avec elle",
    "Seulement",
    "avec amour",
];
const PER_LINE_MS = 3500;

/* ------------------------------
   Particules de cœurs (trail + burst)
------------------------------ */
const HEART_COLOR = "#ff6b9f";
const HEART_TRAIL_RATE = 0.018;   // cœurs / px parcouru (trail)
const HEART_BASE_SIZE = 8;        // taille de base (scalée)
const HEART_LIFE = 1000;          // ms
let hearts = [];
let lastPos = null;               // dernière position joueur pour le trail
let yesTransitionAt = null;       // timestamp pour lancer la séquence YES après le burst (~450ms)

function spawnHeart(x, y, vx, vy, size, life) {
    hearts.push({
        x, y,
        vx, vy,
        size,
        life,
        born: performance.now(),
        rot: Math.random() * Math.PI,
        rotSpeed: (Math.random() * 2 - 1) * 0.06
    });
}

function emitTrail() {
    if (!lastPos) { lastPos = { x: player.x, y: player.y }; return; }

    const dx = player.x - lastPos.x;
    const dy = player.y - lastPos.y;
    const dist = Math.hypot(dx, dy);
    const n = Math.floor(dist * (HEART_TRAIL_RATE * (1 + Math.min(scaleX, scaleY))));

    for (let i = 0; i < n; i++) {
        const t = n <= 1 ? 1 : i / (n - 1);
        const emitX = lastPos.x + dx * t;
        const emitY = lastPos.y + dy * t;
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.2 + Math.random() * 0.6;
        spawnHeart(
            emitX, emitY,
            Math.cos(ang) * spd, Math.sin(ang) * spd - 0.1,
            HEART_BASE_SIZE * (0.8 + Math.random() * 0.7) * Math.min(scaleX, scaleY),
            HEART_LIFE * (0.7 + Math.random() * 0.6)
        );
    }
    lastPos.x = player.x; lastPos.y = player.y;
}

function spawnYesBurst() {
    const N = 60;
    for (let i = 0; i < N; i++) {
        const ang = (i / N) * Math.PI * 2 + Math.random() * 0.25;
        const spd = 1.2 + Math.random() * 1.6;
        spawnHeart(
            player.x, player.y,
            Math.cos(ang) * spd, Math.sin(ang) * spd,
            HEART_BASE_SIZE * (1.2 + Math.random() * 1.1) * Math.min(scaleX, scaleY),
            HEART_LIFE * (1.1 + Math.random() * 0.6)
        );
    }
}

function updateHearts(dtFrames) {
    // dtFrames ≈ multiplicateur vs 60fps (1 = 60fps)
    const now = performance.now();
    const g = 0.01 * dtFrames; // légère gravité
    hearts.forEach(h => {
        h.vy += g;
        h.x += h.vx * dtFrames;
        h.y += h.vy * dtFrames;
        h.rot += h.rotSpeed;
    });
    hearts = hearts.filter(h => (now - h.born) < h.life);
}

function drawHearts() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = HEART_COLOR;
    const now = performance.now();

    hearts.forEach(h => {
        const t = (now - h.born) / h.life; // 0 → 1
        const alpha = 1 - t;
        const scale = 0.9 + 0.2 * (1 - t);

        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(h.rot);
        ctx.scale(scale, scale);

        const s = h.size;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.35);
        ctx.bezierCurveTo(s * 0.9, -s * 0.3, s * 0.5, -s, 0, -s * 0.45);
        ctx.bezierCurveTo(-s * 0.5, -s, -s * 0.9, -s * 0.3, 0, s * 0.35);
        ctx.closePath();
        ctx.fillStyle = HEART_COLOR;
        ctx.fill();

        ctx.restore();
    });

    ctx.restore();
}

/* ------------------------------
   État & boucles
------------------------------ */
let running = false;
let rafId = null;
let lastFrame = null;

/* ------------------------------
   Utilitaires de rendu & collision
------------------------------ */
function rect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}
function circle(x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}
function drawLabelBox(box, textColor = "#111") {
    rect(box.x, box.y, box.w, box.h, box.color);
    ctx.fillStyle = textColor;
    ctx.font = `bold ${Math.max(12, 16 * Math.min(scaleX, scaleY))}px Poppins, Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(box.label, box.x + box.w / 2, box.y + box.h / 2);
}
function intersectsCircleRect(cx, cy, cr, rx, ry, rw, rh) {
    const testX = Math.max(rx, Math.min(cx, rx + rw));
    const testY = Math.max(ry, Math.min(cy, ry + rh));
    const distX = cx - testX;
    const distY = cy - testY;
    return (distX * distX + distY * distY) <= cr * cr;
}

/* ------------------------------
   Dessin
------------------------------ */
function draw() {
    // fond du canvas (le "vrai" fond est en CSS body)
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#16121f");
    g.addColorStop(1, "#0e0b14");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // murs
    walls.forEach(w => rect(w.x, w.y, w.w, w.h, "#3b2d6b"));

    // sorties
    drawLabelBox(exitYes, "#07210F");
    drawLabelBox(exitNo, "#2B0707");

    // joueur
    circle(player.x, player.y, player.r, player.color);
}

/* ------------------------------
   Déplacements & collisions
------------------------------ */
function update(dtFrames) {
    let vx = 0, vy = 0;
    if (keys.ArrowUp || keys.z) vy -= player.speed;
    if (keys.ArrowDown || keys.s) vy += player.speed;
    if (keys.ArrowLeft || keys.q) vx -= player.speed;
    if (keys.ArrowRight || keys.d) vx += player.speed;

    const nextX = player.x + vx;
    if (!walls.some(w => intersectsCircleRect(nextX, player.y, player.r, w.x, w.y, w.w, w.h))) {
        player.x = nextX;
    }
    const nextY = player.y + vy;
    if (!walls.some(w => intersectsCircleRect(player.x, nextY, player.r, w.x, w.y, w.w, w.h))) {
        player.y = nextY;
    }

    // Détection des sorties
    if (!yesTransitionAt && intersectsCircleRect(player.x, player.y, player.r, exitYes.x, exitYes.y, exitYes.w, exitYes.h)) {
        // Explosion de cœurs puis transition YES différée (~450ms)
        spawnYesBurst();
        yesTransitionAt = performance.now() + 450;
    } else if (intersectsCircleRect(player.x, player.y, player.r, exitNo.x, exitNo.y, exitNo.w, exitNo.h)) {
        triggerNoSequence();
        return;
    }

    // Trail de cœurs si on bouge
    if (vx !== 0 || vy !== 0) emitTrail();
    else lastPos = { x: player.x, y: player.y };
}

/* ------------------------------
   Boucle (dtFrames)
------------------------------ */
function loop(ts) {
    if (!running) return;

    if (lastFrame == null) lastFrame = ts;
    // dtFrames ~ multiplicateur vs 60fps (clamp pour éviter les gros sauts)
    const dt = Math.max(0.5, Math.min(2.0, (ts - lastFrame) / 16.6667));
    lastFrame = ts;

    update(dt);
    draw();
    updateHearts(dt);
    drawHearts();

    // Laisser voir le burst avant de lancer la séquence YES
    if (yesTransitionAt && performance.now() >= yesTransitionAt) {
        yesTransitionAt = null;
        lastPos = null;   // évite un trail direct à la reprise
        triggerYesSequence();
        return;           // la séquence YES stoppe le jeu
    }

    rafId = requestAnimationFrame(loop);
}

/* ------------------------------
   YES : [3,2,1] + poème + Loving Machine
------------------------------ */
function triggerYesSequence() {
    stopGameLoop();

    containerDiv.style.display = "none";
    countdownScreen.classList.remove("hidden");
    screamerScreen.classList.add("hidden");

    countdownNumber.style.display = "block";
    poemContainer.style.display = "none";
    countdownNumber.textContent = "3";

    // Nettoyage particules
    hearts = [];
    lastPos = null;

    // Musique
    safePause(bgMusic);

    let count = 3;
    const tick = setInterval(() => {
        count--;
        if (count > 0) {
            countdownNumber.textContent = String(count);
        } else {
            clearInterval(tick);
            countdownNumber.style.display = "none";
            safePlay(yesMusic);
            showPoemLines();
        }
    }, 1000);
}

function showPoemLines() {
    poemContainer.style.display = "block";
    poemContainer.textContent = "";

    let index = 0;
    function displayNextLine() {
        if (index < poemLines.length) {
            poemContainer.textContent = poemLines[index];
            index++;
            setTimeout(displayNextLine, PER_LINE_MS);
        } else {
            // Pas de bouton Rejouer ici (fin du poème)
            // Tu peux stopper la musique si tu veux :
            // safePause(yesMusic);
        }
    }
    displayNextLine();
}

/* ------------------------------
   NON : screamer vidéo 0216.mp4
------------------------------ */
function triggerNoSequence() {
    stopGameLoop();

    containerDiv.style.display = "none";
    countdownScreen.classList.add("hidden");
    screamerScreen.classList.remove("hidden");
    restartBtn.style.display = "none";

    // Nettoyage particules
    hearts = [];
    lastPos = null;

    safePause(bgMusic);
    safePause(yesMusic);

    try { screamerVideo.pause(); screamerVideo.currentTime = 0; } catch (e) { }
    const p = screamerVideo.play();
    if (p && typeof p.then === "function") p.catch(() => { });
}

screamerVideo.addEventListener("ended", () => {
    restartBtn.style.display = "inline-block";
});

/* ------------------------------
   Audio utils
------------------------------ */
function safePlay(mediaEl) {
    if (!mediaEl) return;
    const p = mediaEl.play();
    if (p && typeof p.then === "function") p.catch(() => { });
}
function safePause(mediaEl) {
    if (!mediaEl) return;
    try { mediaEl.pause(); } catch (e) { }
    try { mediaEl.currentTime = 0; } catch (e) { }
}

/* ------------------------------
   Rejouer (depuis le screamer)
------------------------------ */
function resetGameState() {
    adaptPlayer();      // remet la position/taille selon l’échelle actuelle
    containerDiv.style.display = "block";
    screamerScreen.classList.add("hidden");
    countdownScreen.classList.add("hidden");

    // Reset particules
    hearts = [];
    lastPos = null;

    safePause(yesMusic);
    try { screamerVideo.pause(); screamerVideo.currentTime = 0; } catch (e) { }

    if (audioToggleBtn.textContent.includes("Couper")) {
        safePlay(bgMusic);
    }

    startGameLoop();
    canvas.focus();
}
restartBtn.addEventListener("click", resetGameState);

/* ------------------------------
   Entrées clavier + blocage du scroll
------------------------------ */
window.addEventListener("keydown", (e) => {
    if (e.key in keys) keys[e.key] = true;
    const k = e.key.toLowerCase();
    if (["z", "q", "s", "d"].includes(k)) keys[k] = true;
});
window.addEventListener("keyup", (e) => {
    if (e.key in keys) keys[e.key] = false;
    const k = e.key.toLowerCase();
    if (["z", "q", "s", "d"].includes(k)) keys[k] = false;
});

const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "PageUp", "PageDown", "Home", "End"]);
window.addEventListener("keydown", (e) => { if (SCROLL_KEYS.has(e.key)) e.preventDefault(); }, { passive: false });

/* ------------------------------
   Écran d'accueil
------------------------------ */
function enterExperience() {
    introOverlay.classList.add("hidden");
    containerDiv.style.display = "block";
    safePlay(bgMusic);                       // nobodynew
    audioToggleBtn.textContent = "Couper musique (cruelle si tu fais ça Yasmine)";
    startGameLoop();
    canvas.focus();
}
introOverlay.addEventListener("click", enterExperience);

/* ------------------------------
   Toggle musique de fond
------------------------------ */
audioToggleBtn.addEventListener("click", () => {
    if (bgMusic.paused) {
        safePlay(bgMusic);
        audioToggleBtn.textContent = "Couper musique (cruelle si tu fais ça Yasmine";
    } else {
        safePause(bgMusic);
        audioToggleBtn.textContent = "Activer musique(bah oui t'es folle?????)";
    }
});

/* ------------------------------
   Démarrage / Arrêt boucle
------------------------------ */
function startGameLoop() {
    running = true;
    lastFrame = null; // reset pour un dt propre
    if (!rafId) rafId = requestAnimationFrame(loop);
}
function stopGameLoop() {
    running = false;
    if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

/* ------------------------------
   Resize → recalcul complet
------------------------------ */
function recomputeEverything() {
    setCanvasSizeToViewport();
    adaptPlayer();
    adaptExits();
    buildWalls();
    hearts = [];   // reset particules à la taille
    lastPos = null;
    draw();
}
window.addEventListener('resize', recomputeEverything);
window.addEventListener('orientationchange', recomputeEverything);

/* ------------------------------
   Init
------------------------------ */
(function init() {
    if (!canvas.hasAttribute("tabindex")) canvas.setAttribute("tabindex", "0");
    recomputeEverything(); // fixe tailles, murs, etc.
    // On attend le clic (écran d’accueil) pour démarrer boucle et musique
})();