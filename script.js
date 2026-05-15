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
const bgColorPicker  = document.getElementById("bg-color-picker");
const canvasContainer = document.getElementById("canvas-container");

let isDrawing     = false;
let lastX = 0, lastY = 0;
let hue           = 120;
let rotationAngle = 0;
let currentMode   = "line";
let currentBlend  = "source-over";
let undoStack     = [];
const MAX_UNDO    = 20;
let bgColor       = "#000000";

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

// ── Brush color swatches ──
document.querySelectorAll(".swatch:not(.bg-swatch)").forEach(s => {
    s.addEventListener("click", () => {
        colorPicker.value = s.dataset.color;
        document.querySelectorAll(".swatch:not(.bg-swatch)").forEach(x => x.classList.remove("active"));
        s.classList.add("active");
        rainbowMode.checked = false;
        updateStyles();
    });
});

// ── Background color swatches ──
document.querySelectorAll(".bg-swatch").forEach(s => {
    s.addEventListener("click", () => {
        bgColor = s.dataset.color;
        bgColorPicker.value = s.dataset.color;
        canvasContainer.style.background = bgColor;
        document.querySelectorAll(".bg-swatch").forEach(x => x.classList.remove("active"));
        s.classList.add("active");
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
    const sym = parseInt(symmetrySlider.value);
    const { x, y, cx, cy } = getCanvasPos(e);

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

// Extracts the hue (0-360) from a hex color string
function hexToHue(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    if (d === 0) return 0;
    let h;
    if      (max === r) h = ((g - b) / d % 6) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
    return (h < 0 ? h + 1 : h) * 360;
}

// ── Generate Mandala ────────────────────────────────────────
function generateMandala() {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    const R  = Math.min(cx, cy) * 0.88;

    const prevA = ctx.globalAlpha, prevC = ctx.globalCompositeOperation;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.clip();

    // ── Read every toolbar slider directly ──
    const sym      = parseInt(symmetrySlider.value);          // 2-32
    const brushSz  = parseInt(brushSlider.value);             // 1-20
    const opacityV = parseInt(opacitySlider.value) / 100;    // 0.05-1.0
    const glowV    = parseInt(glowSlider.value);              // 0-60
    const driftV   = parseFloat(driftSlider.value);           // 0-10

    const rnd  = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    // Color palette — hue from current picker or live rainbow hue
    const baseH = rainbowMode.checked ? hue : hexToHue(colorPicker.value);
    const pal   = Array.from({ length: 6 }, (_, i) => (baseH + i * 60) % 360);
    const col   = (i, l = 65) => `hsl(${pal[i % pal.length]},100%,${l}%)`;

    ctx.lineCap = ctx.lineJoin = "round";

    // sty: opacity slider scales every alpha, glow slider scales every blur
    function sty(color, lw, blur, alpha) {
        ctx.strokeStyle = ctx.fillStyle = ctx.shadowColor = color;
        ctx.lineWidth   = lw;
        ctx.shadowBlur  = glowV > 0 ? blur * (glowV / 15) : 0;
        if (alpha !== undefined) ctx.globalAlpha = Math.min(1, alpha * opacityV);
    }

    // withSym: drift slider adds a spiral rotation offset per ring
    const spiralStep = driftV * 0.018; // radians per ring index
    function withSym(fn, ringIdx = 0) {
        for (let i = 0; i < sym; i++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(i * Math.PI * 2 / sym + ringIdx * spiralStep);
            fn();
            ctx.restore();
        }
    }

    // dottedRing: also respects opacity + glow via sty()
    function dottedRing(r, spacing, dotR, colorIdx, lightness, blur, alpha) {
        const n = Math.max(8, Math.round(Math.PI * 2 * r / spacing));
        sty(col(colorIdx, lightness), 0, blur, alpha);
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, dotR, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Line weight tiers:
    // hair/thin always stay fine (detail lines); mid/bold/fat scale with brush size.
    // This ensures there is always a wide contrast range within every generation.
    const maxLW = Math.max(1.8, brushSz * 0.9); // brush 1→1.8px max, brush 20→18px max
    const wt = {
        hair: () => rnd(0.15, 0.42),
        thin: () => rnd(0.42, Math.max(0.72, maxLW * 0.18)),
        mid:  () => rnd(Math.max(0.72, maxLW * 0.18), Math.max(1.2, maxLW * 0.48)),
        bold: () => rnd(Math.max(1.2,  maxLW * 0.48), Math.max(2.0, maxLW * 0.78)),
        fat:  () => rnd(Math.max(2.0,  maxLW * 0.78), maxLW),
    };

    // Per-generation weight character — each run has a distinct feel
    const wBias = pick(['delicate', 'balanced', 'bold', 'mixed']);
    const pickLW = () => {
        switch (wBias) {
            case 'delicate': return pick([wt.hair, wt.hair, wt.thin, wt.thin, wt.mid])();
            case 'balanced': return pick([wt.hair, wt.thin, wt.mid,  wt.bold])();
            case 'bold':     return pick([wt.thin, wt.mid,  wt.bold, wt.bold, wt.fat])();
            default:         return pick([wt.hair, wt.thin, wt.mid,  wt.bold, wt.fat])();
        }
    };

    // Random personality (pattern selection stays random, values come from sliders)
    const numRings    = Math.round(rnd(9, 16));
    const dotSpacing  = rnd(2.0, 5.5);
    const useDblSpoke = Math.random() > 0.5;
    const useFlower   = Math.random() > 0.25;
    const usePetals   = Math.random() > 0.35;
    const useArcs     = Math.random() > 0.3;
    const useDots     = Math.random() > 0.2;
    const useWeb      = Math.random() > 0.5;
    const useEllipse  = Math.random() > 0.5;

    // Non-uniform ring spacing — sometimes clustered inward, sometimes outward
    const ringExp = rnd(0.55, 1.9);
    const radii = Array.from({ length: numRings }, (_, i) =>
        R * 0.06 + R * 0.88 * Math.pow(i / (numRings - 1), ringExp)
    );

    // ── 1. Spokes ──
    ctx.save();
    ctx.translate(cx, cy);
    sty(col(0, 65), pickLW(), 6, rnd(0.18, 0.42));
    ctx.beginPath();
    for (let i = 0; i < sym; i++) {
        const a = i * Math.PI * 2 / sym;
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    }
    ctx.stroke();
    if (useDblSpoke) {
        sty(col(1, 60), wt.hair(), 4, rnd(0.1, 0.22));
        ctx.beginPath();
        for (let i = 0; i < sym * 2; i++) {
            const a = i * Math.PI / sym;
            ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R);
        }
        ctx.stroke();
    }
    ctx.restore();

    // ── 2. Guide circles ──
    radii.forEach((r, ri) => {
        sty(col(ri, 55), wt.hair(), 2, 0.1);
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    });

    // ── 3. Flower-of-life circles ──
    if (useFlower) {
        radii.forEach((r, ri) => {
            if (r < R * 0.08 || Math.random() > 0.82) return;
            const circR = 2 * r * Math.sin(Math.PI / sym);
            sty(col(ri, 65), pickLW(), rnd(8, 20), rnd(0.35, 0.68));
            withSym(() => {
                ctx.beginPath(); ctx.arc(r, 0, circR, 0, Math.PI * 2); ctx.stroke();
            }, ri);
        });
    }

    // ── 4. Arcs ──
    if (useArcs) {
        radii.forEach((r, ri) => {
            if (Math.random() > 0.62) return;
            const span = (Math.PI / sym) * rnd(0.55, 1.0);
            sty(col(ri + 1, 68), pickLW(), rnd(6, 18), rnd(0.28, 0.68));
            withSym(() => {
                ctx.beginPath(); ctx.arc(0, 0, r, -span, span); ctx.stroke();
            }, ri);
        });
    }

    // ── 5. Bezier petals ──
    if (usePetals) {
        radii.forEach((r, ri) => {
            if (r < R * 0.1 || Math.random() > 0.58) return;
            const pr = 2 * r * Math.sin(Math.PI / sym) * rnd(0.42, 0.78);
            const w  = pr * rnd(0.32, 0.62);
            sty(col(ri + 1, 68), pickLW(), rnd(10, 22), rnd(0.38, 0.72));
            withSym(() => {
                ctx.beginPath();
                ctx.moveTo(r - pr, 0);
                ctx.bezierCurveTo(r - pr,  w, r + pr,  w, r + pr, 0);
                ctx.bezierCurveTo(r + pr, -w, r - pr, -w, r - pr, 0);
                ctx.closePath(); ctx.stroke();
            }, ri);
        });
    }

    // ── 6. Ellipses ──
    if (useEllipse) {
        radii.filter(() => Math.random() > 0.62).forEach((r, ri) => {
            const rx = r * rnd(0.07, 0.2), ry = rx * rnd(0.22, 0.58);
            sty(col(ri + 2, 66), pickLW(), rnd(8, 24), rnd(0.32, 0.68));
            withSym(() => {
                ctx.beginPath(); ctx.ellipse(r, 0, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
            }, ri);
        });
    }

    // ── 7. Web mesh ──
    if (useWeb) {
        radii.filter(() => Math.random() > 0.58).forEach((r, ri) => {
            if (r < R * 0.15) return;
            const innerR = radii[Math.max(0, ri - Math.round(rnd(1, 3)))];
            sty(col(ri + 3, 64), pickLW(), rnd(4, 14), rnd(0.22, 0.52));
            withSym(() => {
                const span = Math.PI / sym;
                ctx.beginPath();
                ctx.moveTo(Math.cos(-span) * r, Math.sin(-span) * r); ctx.lineTo(innerR, 0);
                ctx.moveTo(Math.cos( span) * r, Math.sin( span) * r); ctx.lineTo(innerR, 0);
                ctx.stroke();
            }, ri);
        });
    }

    // ── 8. Dotted rings ──
    if (useDots) {
        const dotR = rnd(0.35, 1.2) * Math.max(0.3, brushSz / 12);
        radii.forEach((r, ri) => {
            if (Math.random() > 0.55) return;
            dottedRing(r, dotSpacing, dotR, ri + 1, 72, rnd(6, 16), rnd(0.52, 0.88));
        });
        dottedRing(R, dotSpacing * 0.8, dotR * 0.85, 0, 75, rnd(6, 14), 0.72);
    }

    // ── 9. Bold accent rings — always use heavier weight for contrast ──
    [...radii.keys()]
        .filter(i => radii[i] > R * 0.2)
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.round(rnd(1, 3)))
        .forEach(ri => {
            // Accents always pull from mid/bold/fat regardless of wBias
            sty(col(ri, 68), pick([wt.mid, wt.bold, wt.fat])(), rnd(14, 30), rnd(0.42, 0.72));
            ctx.beginPath(); ctx.arc(cx, cy, radii[ri], 0, Math.PI * 2); ctx.stroke();
        });

    // ── 10. Inner ornament ──
    [0.04, 0.08, 0.13, 0.19].slice(0, Math.round(rnd(2, 4))).forEach((f, fi) => {
        sty(col(fi, 70), pickLW(), rnd(10, 20), rnd(0.42, 0.72));
        ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2); ctx.stroke();
    });
    const roseR = R * rnd(0.08, 0.14);
    sty(col(0, 70), pickLW(), rnd(10, 22), rnd(0.42, 0.68));
    for (let i = 0; i < sym; i++) {
        const a = i * Math.PI * 2 / sym;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * roseR, cy + Math.sin(a) * roseR, roseR, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Center dot
    sty(col(0, 82), 0, 24, 0.95);
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.018, 0, Math.PI * 2); ctx.fill();

    // ── 11. Outer border ──
    sty(col(0, 65), pickLW(), 10, rnd(0.45, 0.68));
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    sty(col(2, 60), wt.hair(), 4, rnd(0.18, 0.35));
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.967, 0, Math.PI * 2); ctx.stroke();

    ctx.restore(); // release circular clip region
    ctx.globalAlpha = prevA;
    ctx.globalCompositeOperation = prevC;
    updateStyles();
    saveState();
}

// ── Coordinate helper — undoes CSS rotation so drawing stays centred ──
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    // Screen-space centre stays fixed regardless of CSS rotation
    const screenCx = rect.left + rect.width  / 2;
    const screenCy = rect.top  + rect.height / 2;
    let dx = e.clientX - screenCx;
    let dy = e.clientY - screenCy;
    // Counter-rotate by the current spin angle
    if (autoSpin.checked && rotationAngle !== 0) {
        const rad = -(rotationAngle * Math.PI / 180);
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const rx = dx * cos - dy * sin;
        const ry = dx * sin + dy * cos;
        dx = rx; dy = ry;
    }
    // offsetWidth/Height are pre-transform CSS dimensions
    const cx = canvas.offsetWidth  / 2;
    const cy = canvas.offsetHeight / 2;
    return { x: cx + dx, y: cy + dy, cx, cy };
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
    const pos = getCanvasPos(e);
    lastX = pos.x;
    lastY = pos.y;
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

// ── Slider fill (CSS --fill variable drives the gradient track) ──
function updateSliderFill(slider) {
    const pct = (slider.value - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty("--fill", pct + "%");
}
document.querySelectorAll("input[type='range']").forEach(s => {
    updateSliderFill(s);
    s.addEventListener("input", () => updateSliderFill(s));
});

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
    const exportSize = 4096;
    const off = document.createElement("canvas");
    off.width = off.height = exportSize;
    const offCtx = off.getContext("2d");
    offCtx.fillStyle = bgColor;
    offCtx.fillRect(0, 0, exportSize, exportSize);
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = "high";
    offCtx.drawImage(canvas, 0, 0, exportSize, exportSize);
    const link = document.createElement("a");
    link.download = "indri-mandala.png";
    link.href = off.toDataURL("image/png");
    link.click();
});

bgColorPicker.addEventListener("input", () => {
    bgColor = bgColorPicker.value;
    canvasContainer.style.background = bgColor;
});

generateBtn.addEventListener("click", generateMandala);

// ── Startup randomizer ───────────────────────────────────────
function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if      (h < 60)  { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else              { r = c; b = x; }
    const hex = v => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function initRandomSettings() {
    const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

    // SIZE always 1
    brushSlider.value = 1;
    brushVal.textContent = 1;

    // OPACITY: 50-100
    const op = ri(50, 100);
    opacitySlider.value = op;
    opacityVal.textContent = op;

    // GLOW: 0-45
    const gl = ri(0, 45);
    glowSlider.value = gl;
    glowVal.textContent = gl;

    // SYM: sensible mandala values
    const symChoices = [4, 5, 6, 7, 8, 9, 10, 12, 16, 24];
    const sm = symChoices[Math.floor(Math.random() * symChoices.length)];
    symmetrySlider.value = sm;
    symmetryVal.textContent = sm;

    // DRIFT: 0-10 step 0.5
    const dr = Math.round(Math.random() * 20) / 2;
    driftSlider.value = dr;
    driftVal.textContent = dr;

    // COLOR: random vivid hue
    const randHex = hslToHex(Math.random() * 360, 100, 55);
    colorPicker.value = randHex;

    // BRUSH MODE: random
    const modes = ['line', 'curve', 'dot', 'geo'];
    const randMode = modes[Math.floor(Math.random() * modes.length)];
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${randMode}"]`).classList.add('active');
    currentMode = randMode;

    updateStyles();
    document.querySelectorAll("input[type='range']").forEach(updateSliderFill);
}

// ── Mobile tab switching ──
document.querySelectorAll(".m-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const target = btn.dataset.for;
        document.querySelectorAll(".m-tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".m-tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        document.querySelector(`.m-tab[data-tab="${target}"]`).classList.add("active");
    });
});

window.addEventListener("resize", setupCanvas);
setupCanvas();
initRandomSettings();
saveState();
requestAnimationFrame(animate);

