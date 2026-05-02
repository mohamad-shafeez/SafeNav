// ==========================================
// bg-canvas.js — SafeNav Network Background
// Adaptive: mobile-optimized, DPR aware, 30fps on mobile
// ==========================================
(function () {
    const canvas = document.getElementById('animated-bg');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const isMobile = window.innerWidth < 768;
    const DPR = Math.min(window.devicePixelRatio || 1, isMobile ? 1 : 2);

    const CONFIG = {
        nodeCount:    isMobile ? 36 : 70,
        connectDist:  isMobile ? 100 : 140,
        nodeSpeed:    0.3,
        mousePull:    isMobile ? 0 : 90,
        mouseStrength:0.014,
        flickerColors:['#ef4444','#f97316','#fbbf24'],
    };

    let mouse = { x: -9999, y: -9999 };
    let nodes = [], radars = [];
    let W = 0, H = 0, bgGrad;

    function resize() {
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width  = Math.round(W * DPR);
        canvas.height = Math.round(H * DPR);
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        bgGrad = ctx.createLinearGradient(0, 0, W, H);
        bgGrad.addColorStop(0, '#0f172a');
        bgGrad.addColorStop(1, '#020617');
    }
    resize();

    let rsz;
    window.addEventListener('resize', () => { clearTimeout(rsz); rsz = setTimeout(() => { resize(); init(); }, 220); }, { passive: true });

    function makeNode() {
        return {
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - 0.5) * CONFIG.nodeSpeed * 2,
            vy: (Math.random() - 0.5) * CONFIG.nodeSpeed * 2,
            r: Math.random() * 1.8 + 1.4,
            flicker: Math.random() < 0.013,
            fc: CONFIG.flickerColors[Math.floor(Math.random() * 3)],
            fp: Math.random() * Math.PI * 2,
            alpha: Math.random() * 0.4 + 0.35,
        };
    }

    function init() { nodes = Array.from({ length: CONFIG.nodeCount }, makeNode); }
    init();

    function spawnRadar() {
        const n = nodes[Math.floor(Math.random() * nodes.length)];
        radars.push({ x: n.x, y: n.y, r: 0, maxR: isMobile ? 120 : 175, speed: 1.6 });
        setTimeout(spawnRadar, 3500 + Math.random() * 2000);
    }
    spawnRadar();

    if (!isMobile) {
        window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    }

    const TARGET = isMobile ? 30 : 60;
    const FRAME  = 1000 / TARGET;
    let last = 0;

    function loop(t) {
        requestAnimationFrame(loop);
        if (t - last < FRAME - 1) return;
        last = t;

        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, W, H);

        const cd2 = CONFIG.connectDist * CONFIG.connectDist;
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i], b = nodes[j];
                const dx = a.x - b.x, dy = a.y - b.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < cd2) {
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = 'rgba(56,189,248,' + ((1 - Math.sqrt(d2) / CONFIG.connectDist) * 0.22) + ')';
                    ctx.lineWidth = 0.8;
                    ctx.stroke();
                }
            }
        }

        radars = radars.filter(r => {
            r.r += r.speed;
            if (r.r >= r.maxR) return false;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(56,189,248,' + (0.6 * (1 - r.r / r.maxR)) + ')';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            return true;
        });

        nodes.forEach(n => {
            const fa = n.flicker ? 0.5 + 0.5 * Math.sin(t * 0.0025 + n.fp) : n.alpha;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
            ctx.fillStyle = n.flicker ? n.fc : ('rgba(56,189,248,' + fa + ')');
            ctx.fill();

            if (n.flicker) {
                const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4);
                g.addColorStop(0, 'rgba(239,68,68,0.25)');
                g.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2);
                ctx.fillStyle = g;
                ctx.fill();
            }

            if (!isMobile) {
                const dx = mouse.x - n.x, dy = mouse.y - n.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < CONFIG.mousePull && d > 0) { n.vx += dx / d * CONFIG.mouseStrength; n.vy += dy / d * CONFIG.mouseStrength; }
            }

            const spd = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
            const max = CONFIG.nodeSpeed * 2;
            if (spd > max) { n.vx = n.vx / spd * max; n.vy = n.vy / spd * max; }

            n.x += n.vx; n.y += n.vy;
            if (n.x < -12) n.x = W + 12; if (n.x > W + 12) n.x = -12;
            if (n.y < -12) n.y = H + 12; if (n.y > H + 12) n.y = -12;
        });
    }
    requestAnimationFrame(loop);
})();