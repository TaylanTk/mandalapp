// ── MANDALA CANVAS ──────────────────────────────────────────
const canvas = document.getElementById("mandalaCanvas");
const ctx    = canvas.getContext("2d");

// UI refs
const symmetrySlider = document.getElementById("symmetry-slider");
const symmetryVal    = document.getElementById("symmetry-val");
const brushSlider    = document.getElementById("brush-slider");
const brushVal       = document.getElementById("brush-val");
const opacitySlider  = document.getElementById("opacity-slider");
const opacityVal     = document.getElementById("opacity-val");
const glowSlider     = document.getElementById("glow-slider");
const glowVal        = document.getElementById("glow-val");
const driftSlider    = document.getElementById("drift-slider");
const driftVal       = document.getElementById("drift-val");
const colorPicker    = document.getElementById("color-picker");
const rainbowMode    = document.getElementById("rainbow-mode");
const mirrorMode     = document.getElementById("mirror-mode");
const autoSpin       = document.getElementById("auto-spin");
const breathingMode  = document.getElementById("breathing-mode");
const undoBtn        = document.getElementById("undo-btn");
const clearBtn       = document.getElementById("clear-btn");
const downloadBtn    = document.getElementById("download-btn");
const generateBtn    = document.getElementById("generate-btn");
const canvasWrapper  = document.getElementById("canvas-wrapper");

let isDrawing     = false;
let lastX = 0, lastY = 0;
let hue           = 120;
let rotationAngle = 0;
let currentMode   = "line";
let currentBlend  = "source-over";
let undoStack     = [];
const MAX_UNDO    = 20;

// ── FX Presets — apply to existing canvas pixels ─────────────
function applyFX(name) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2;
    const R  = Math.min(cx, cy);

    // Snapshot current canvas (physical pixels)
    const snap = document.createElement("canvas");
    snap.width  = canvas.width;
    snap.height = canvas.height;
    snap.getContext("2d").drawImage(canvas, 0, 0);

    // Save and neutralise compositing while we apply the FX
    const prevA = ctx.globalAlpha;
    const prevC = ctx.globalCompositeOperation;
    ctx.shadowBlur = 0;

    switch (name) {
        case "neon":
            // Screen the image with itself — doubles glow / brightness
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.75;
            ctx.drawImage(snap, 0, 0, w, h);
            ctx.drawImage(snap, 0, 0, w, h);
            break;

        case "plasma": {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
            g.addColorStop(0,    "hsla(280,100%,70%,0.55)");
            g.addColorStop(0.35, "hsla(180,100%,70%,0.4)");
            g.addColorStop(0.7,  "hsla(60,100%,70%,0.3)");
            g.addColorStop(1,    "hsla(320,100%,60%,0.22)");
            ctx.globalCompositeOperation = "color-dodge";
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
        }

        case "dream": {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
            g.addColorStop(0,   "hsla(310,100%,80%,0.45)");
            g.addColorStop(0.5, "hsla(260,100%,65%,0.3)");
            g.addColorStop(1,   "hsla(200,100%,60%,0.15)");
            ctx.globalCompositeOperation = "overlay";
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
        }

        case "void":
            // Invert colours — difference with white
            ctx.globalCompositeOperation = "difference";
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
            break;

        case "chrome": {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0,   "hsla(220,30%,85%,0.5)");
            g.addColorStop(0.5, "hsla(200,50%,95%,0.35)");
            g.addColorStop(1,   "hsla(240,40%,75%,0.45)");
            ctx.globalCompositeOperation = "hard-light";
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
        }

        case "lava": {
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
            g.addColorStop(0,   "hsla(30,100%,80%,0.65)");
            g.addColorStop(0.5, "hsla(15,100%,60%,0.5)");
            g.addColorStop(1,   "hsla(0,100%,40%,0.3)");
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
        }

        case "crystal": {
            // Self-screen boost + cyan radial overlay
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.38;
            ctx.drawImage(snap, 0, 0, w, h);
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
            g.addColorStop(0,   "hsla(190,100%,85%,0.38)");
            g.addColorStop(0.6, "hsla(200,100%,70%,0.22)");
            g.addColorStop(1,   "hsla(210,100%,55%,0.1)");
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
        }

        case "echo": {
            // Screen with a hue-rotated copy of itself → rainbow colour echo
            const off = document.createElement("canvas");
            off.width = canvas.width; off.height = canvas.height;
            const offCtx = off.getContext("2d");
            offCtx.filter = "hue-rotate(120deg) saturate(160%) brightness(1.15)";
            offCtx.drawImage(snap, 0, 0);
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = 0.55;
            ctx.drawImage(off, 0, 0, w, h);
            break;
        }
    }

    ctx.globalAlpha = prevA;
    ctx.globalCompositeOperation = prevC;
    updateStyles();
    saveState();
}

document.querySelectorAll(".fx-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        applyFX(btn.dataset.fx);
        // Brief visual flash — removed after animation
        btn.classList.add("fx-flash");
        setTimeout(() => btn.classList.remove("fx-flash"), 280);
    });
});

// ── Brush mode picker ──
document.querySelectorAll(".mode-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentMode = btn.dataset.mode;
    });
});

// ── Color swatches ──
document.querySelectorAll(".swatch").forEach(s => {
    s.addEventListener("click", () => {
        colorPicker.value = s.dataset.color;
        document.querySelectorAll(".swatch").forEach(x => x.classList.remove("active"));
        s.classList.add("active");
        rainbowMode.checked = false;
        updateStyles();
    });
});

// ── Tooltip mouse tracking ──
document.addEventListener("mousemove", e => {
    document.documentElement.style.setProperty("--tip-x", e.clientX + "px");
    document.documentElement.style.setProperty("--tip-y", e.clientY + "px");
});

// ── Canvas setup — preserves content across resizes ──
function setupCanvas() {
    const dpi  = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    const snap = document.createElement("canvas");
    snap.width  = canvas.width;
    snap.height = canvas.height;
    if (snap.width > 0 && snap.height > 0) {
        snap.getContext("2d").drawImage(canvas, 0, 0);
    }

    canvas.width  = rect.width  * dpi;
    canvas.height = rect.height * dpi;
    ctx.scale(dpi, dpi);

    if (snap.width > 0 && snap.height > 0) {
        const prev = { a: ctx.globalAlpha, c: ctx.globalCompositeOperation };
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(snap, 0, 0, rect.width, rect.height);
        ctx.globalAlpha = prev.a;
        ctx.globalCompositeOperation = prev.c;
    }

    updateStyles();
}

function currentColor() {
    return rainbowMode.checked ? `hsl(${hue}, 100%, 58%)` : colorPicker.value;
}

function updateStyles() {
    const color = currentColor();
    ctx.lineCap   = "round";
    ctx.lineJoin  = "round";
    ctx.lineWidth = parseInt(brushSlider.value);
    ctx.globalAlpha              = parseInt(opacitySlider.value) / 100;
    ctx.globalCompositeOperation = currentBlend;
    ctx.strokeStyle = color;
    ctx.fillStyle   = color;
    ctx.shadowBlur  = parseInt(glowSlider.value);
    ctx.shadowColor = color;
}

// ── Brush strokes ──
function strokeLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function strokeCurve(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const cpX = (x1 + x2) / 2 + (-dy / len) * 28;
    const cpY = (y1 + y2) / 2 + ( dx / len) * 28;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cpX, cpY, x2, y2);
    ctx.stroke();
}

function stampDot(x, y) {
    const r = Math.max(1, parseInt(brushSlider.value) * 0.7);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function stampGeo(x, y) {
    const r = parseInt(brushSlider.value) * 2.2, inner = r * 0.48;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI / 6) - Math.PI / 2;
        const rad = i % 2 === 0 ? r : inner;
        i === 0 ? ctx.moveTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad)
                : ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function applyBrush(x1, y1, x2, y2) {
    switch (currentMode) {
        case "line":  strokeLine(x1, y1, x2, y2);  break;
        case "curve": strokeCurve(x1, y1, x2, y2); break;
        case "dot":   stampDot(x2, y2);             break;
        case "geo":   stampGeo(x2, y2);             break;
    }
}

// ── Draw ──
function draw(e) {
    if (!isDrawing) return;
    const sym  = parseInt(symmetrySlider.value);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const cx = rect.width / 2,       cy = rect.height / 2;

    if (rainbowMode.checked) { hue = (hue + 1.8) % 360; updateStyles(); }

    for (let i = 0; i < sym; i++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(i * (Math.PI * 2 / sym));
        applyBrush(lastX - cx, lastY - cy, x - cx, y - cy);
        if (mirrorMode.checked) {
            ctx.scale(1, -1);
            applyBrush(lastX - cx, lastY - cy, x - cx, y - cy);
        }
        ctx.restore();
    }
    lastX = x; lastY = y;
}

// ── Animate (spin + drift) ──
function animate() {
    if (autoSpin.checked) {
        rotationAngle += 0.15;
        canvas.style.transform = `rotate(${rotationAngle}deg)`;
    } else {
        canvas.style.transform = "none";
        rotationAngle = 0;
    }
    const drift = parseFloat(driftSlider.value);
    if (drift > 0 && rainbowMode.checked) {
        hue = (hue + drift * 0.04) % 360;
        updateStyles();
    }
    requestAnimationFrame(animate);
}

// ── Generate Mandala ────────────────────────────────────────
function generateMandala() {
    const rect = canvas.getBoundingClientRect();
    const cx   = rect.width  / 2;
    const cy   = rect.height / 2;
    const R    = Math.min(cx, cy) * 0.88;

    // Reset compositing cleanly
    const prevA = ctx.globalAlpha, prevC = ctx.globalCompositeOperation;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Random symmetry
    const symOpts = [6, 8, 10, 12, 16];
    const sym = symOpts[Math.floor(Math.random() * symOpts.length)];
    symmetrySlider.value = sym;
    symmetryVal.textContent = sym;

    // Random color palette
    const baseH = Math.random() * 360;
    const scheme = Math.floor(Math.random() * 3);
    let pal;
    if (scheme === 0) {       // complementary
        pal = [baseH, (baseH+30)%360, (baseH+180)%360, (baseH+210)%360];
    } else if (scheme === 1) { // triadic
        pal = [baseH, (baseH+120)%360, (baseH+240)%360];
    } else {                   // analogous
        pal = [baseH, (baseH+30)%360, (baseH+60)%360, (baseH+90)%360];
    }
    const col = (i, l = 62) => `hsl(${pal[i % pal.length]},100%,${l}%)`;

    // ── Helpers ──
    function sty(color, lw, blur, alpha = 0.85) {
        ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = color;
        ctx.lineWidth = lw;
        ctx.shadowBlur = blur;
        ctx.globalAlpha = alpha;
        ctx.lineCap = ctx.lineJoin = "round";
    }

    // Draw fn at every symmetry angle (no mirror — each shape is already symmetric)
    function withSym(fn) {
        for (let i = 0; i < sym; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(i * Math.PI * 2 / sym);
            fn();
            ctx.restore();
        }
    }

    // Ring radii spaced evenly from inner to outer
    const numRings = 3 + Math.floor(Math.random() * 4);
    const radii = Array.from({ length: numRings }, (_, i) =>
        R * 0.12 + (R * 0.84) * (i / Math.max(numRings - 1, 1))
    );

    // ── 1. Thin spokes ──
    sty(col(0), 0.35, 6, 0.22);
    for (let i = 0; i < sym; i++) {
        const a = i * Math.PI * 2 / sym;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
    }

    // ── 2. Concentric guide circles ──
    radii.forEach((r, ri) => {
        sty(col(ri), 0.4, 5, 0.3);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
    });

    // ── 3. Decorative ring patterns ──
    const patterns = ["petals", "dots", "arcs", "triangles", "diamonds", "flower"];
    const shuffled = [...patterns].sort(() => Math.random() - 0.5);

    radii.forEach((r, ri) => {
        const pattern = shuffled[ri % shuffled.length];
        const c2 = col(ri + 1);
        const pr = r * (0.11 + Math.random() * 0.06);

        switch (pattern) {
            case "petals":
                sty(c2, 0.5, 13, 0.62);
                withSym(() => {
                    // Radially elongated ellipse — petal shape
                    ctx.beginPath();
                    ctx.ellipse(r, 0, pr * 1.5, pr * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha *= 0.7;
                    ctx.stroke();
                });
                break;

            case "flower":
                sty(c2, 0.5, 14, 0.65);
                withSym(() => {
                    // Teardrop petal via bezier
                    const w = pr * 0.55;
                    ctx.beginPath();
                    ctx.moveTo(r - pr, 0);
                    ctx.bezierCurveTo(r - pr,  w, r + pr,  w, r + pr, 0);
                    ctx.bezierCurveTo(r + pr, -w, r - pr, -w, r - pr, 0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha *= 0.6;
                    ctx.stroke();
                });
                break;

            case "dots":
                sty(c2, 0, 16, 0.88);
                withSym(() => {
                    ctx.beginPath();
                    ctx.arc(r, 0, pr * 0.42, 0, Math.PI * 2);
                    ctx.fill();
                    // Smaller dot between spokes
                    ctx.beginPath();
                    ctx.arc(
                        r * Math.cos(Math.PI / sym),
                        r * Math.sin(Math.PI / sym),
                        pr * 0.25, 0, Math.PI * 2
                    );
                    ctx.fill();
                });
                break;

            case "arcs":
                sty(c2, 0.85, 11, 0.72);
                withSym(() => {
                    const span = (Math.PI / sym) * 0.78;
                    ctx.beginPath();
                    ctx.arc(0, 0, r, -span, span);
                    ctx.stroke();
                });
                break;

            case "triangles":
                sty(c2, 0.5, 10, 0.68);
                withSym(() => {
                    ctx.beginPath();
                    ctx.moveTo(r - pr, -pr * 0.62);
                    ctx.lineTo(r + pr,  0);
                    ctx.lineTo(r - pr,  pr * 0.62);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha *= 0.65;
                    ctx.stroke();
                });
                break;

            case "diamonds":
                sty(c2, 0.5, 10, 0.68);
                withSym(() => {
                    ctx.beginPath();
                    ctx.moveTo(r,       -pr);
                    ctx.lineTo(r + pr,   0);
                    ctx.lineTo(r,        pr);
                    ctx.lineTo(r - pr,   0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha *= 0.65;
                    ctx.stroke();
                });
                break;
        }
    });

    // ── 4. Center ornament ──
    sty(col(0, 68), 1.2, 32, 0.95);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.028, 0, Math.PI * 2);
    ctx.fill();

    sty(col(1, 64), 0.6, 16, 0.72);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.09, 0, Math.PI * 2);
    ctx.stroke();

    // ── 5. Outer border (double ring) ──
    sty(col(0), 0.7, 9, 0.58);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    sty(col(pal.length - 1), 0.32, 4, 0.32);
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.962, 0, Math.PI * 2);
    ctx.stroke();

    // Restore user's drawing state
    ctx.globalAlpha = prevA;
    ctx.globalCompositeOperation = prevC;
    updateStyles();
    saveState();
}

// ── Events ──
canvas.addEventListener("mousedown",  startDrawing);
canvas.addEventListener("mousemove",  draw);
window.addEventListener("mouseup",    stopDrawing);

canvas.addEventListener("touchstart", e => { e.preventDefault(); startDrawing(e.touches[0]); }, { passive: false });
canvas.addEventListener("touchmove",  e => { e.preventDefault(); draw(e.touches[0]); },         { passive: false });
window.addEventListener("touchend",   stopDrawing);

function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
    updateStyles();
}
function stopDrawing() {
    if (isDrawing) { saveState(); isDrawing = false; }
}

// ── Undo / State ──
function saveState() {
    if (undoStack.length >= MAX_UNDO) undoStack.shift();
    undoStack.push(canvas.toDataURL());
}

function restoreClean(dataURL) {
    const img = new Image();
    img.onload = () => {
        const dpi  = window.devicePixelRatio || 1;
        const prev = { a: ctx.globalAlpha, c: ctx.globalCompositeOperation };
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width / dpi, canvas.height / dpi);
        ctx.globalAlpha = prev.a;
        ctx.globalCompositeOperation = prev.c;
    };
    img.src = dataURL;
}

function undo() {
    if (undoStack.length <= 1) {
        const prev = { a: ctx.globalAlpha, c: ctx.globalCompositeOperation };
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = prev.a; ctx.globalCompositeOperation = prev.c;
        undoStack = [];
        return;
    }
    undoStack.pop();
    restoreClean(undoStack[undoStack.length - 1]);
}

// ── Slider listeners ──
symmetrySlider.addEventListener("input", () => symmetryVal.textContent = symmetrySlider.value);
brushSlider.addEventListener("input",    () => { brushVal.textContent   = brushSlider.value;   updateStyles(); });
opacitySlider.addEventListener("input",  () => { opacityVal.textContent = opacitySlider.value; updateStyles(); });
glowSlider.addEventListener("input",     () => { glowVal.textContent    = glowSlider.value;    updateStyles(); });
driftSlider.addEventListener("input",    () => driftVal.textContent = driftSlider.value);
colorPicker.addEventListener("input",    updateStyles);

breathingMode.addEventListener("change", () => {
    canvasWrapper.classList.toggle("breathing", breathingMode.checked);
});

undoBtn.addEventListener("click", undo);

clearBtn.addEventListener("click", () => {
    const prev = { a: ctx.globalAlpha, c: ctx.globalCompositeOperation };
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = prev.a; ctx.globalCompositeOperation = prev.c;
    undoStack = [];
    saveState();
});

downloadBtn.addEventListener("click", () => {
    const link    = document.createElement("a");
    link.download = "indri-mandala.png";
    link.href     = canvas.toDataURL("image/png");
    link.click();
});

generateBtn.addEventListener("click", generateMandala);

window.addEventListener("resize", setupCanvas);
setupCanvas();
saveState();
requestAnimationFrame(animate);


// ── BACKGROUND: PSYCHEDELIC FLOWER OF LIFE ───────────────────
const bgCanvas = document.getElementById("bg-canvas");
const bgCtx    = bgCanvas.getContext("2d");

function resizeBgCanvas() {
    bgCanvas.width  = window.innerWidth;
    bgCanvas.height = window.innerHeight;
}

function animateBg(timestamp) {
    const t  = timestamp / 1000;
    const w  = bgCanvas.width, h = bgCanvas.height;
    const cx = w / 2, cy = h / 2;
    const diag = Math.sqrt(cx * cx + cy * cy);

    bgCtx.fillStyle = "#000";
    bgCtx.fillRect(0, 0, w, h);

    const layers = [
        { R: 72,  speed:  0.038, hueOff: 0,   alpha: 0.55, lw: 0.4,  blur: 5 },
        { R: 66,  speed: -0.024, hueOff: 140,  alpha: 0.45, lw: 0.35, blur: 4 },
        { R: 118, speed:  0.014, hueOff: 260,  alpha: 0.28, lw: 0.3,  blur: 3 },
    ];

    for (const layer of layers) {
        const h2 = (t * 28 + layer.hueOff) % 360;
        const R  = layer.R * (1 + 0.04 * Math.sin(t * 0.5 + layer.hueOff * 0.02));
        const dx = R, dy = R * Math.sqrt(3) / 2;
        const cr = Math.ceil(diag / dx) + 2;
        const rr = Math.ceil(diag / dy) + 2;

        bgCtx.save();
        bgCtx.translate(cx, cy);
        bgCtx.rotate(t * layer.speed);
        bgCtx.strokeStyle = `hsla(${h2}, 100%, 65%, ${layer.alpha})`;
        bgCtx.lineWidth   = layer.lw;
        bgCtx.shadowColor = `hsl(${h2}, 100%, 70%)`;
        bgCtx.shadowBlur  = layer.blur;

        bgCtx.beginPath();
        for (let row = -rr; row <= rr; row++) {
            for (let col = -cr; col <= cr; col++) {
                const x = col * dx + (row % 2 !== 0 ? dx / 2 : 0);
                const y = row * dy;
                bgCtx.moveTo(x + R, y);
                bgCtx.arc(x, y, R, 0, Math.PI * 2);
            }
        }
        bgCtx.stroke();
        bgCtx.restore();
    }

    requestAnimationFrame(animateBg);
}

resizeBgCanvas();
window.addEventListener("resize", resizeBgCanvas);
requestAnimationFrame(animateBg);
