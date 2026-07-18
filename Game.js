//  _______                      
// |   _   .---.-.--------.-----.
// |.  |___|  _  |        |  -__|
// |.  |   |___._|__|__|__|_____|
// |:  1   |                     
// |::.. . |                     
// `-------'                     
const Game = (() => {
    const CANVAS_W = 960;              
    const CANVAS_H = 720;
    const ROTATION_DURATION = 550;     
    const GRAVITY_SCALE = 0.001;      
    const COLORS = {
        platformFill: "#3B4B65",
        platformOutline: "#eaf2ff",
        ball: "#5C6E8C",
        ballOutline: "#eaf2ff",
        finish: "#eaf2ff",
        laser: "#3B4B65",
        laserOutline: "#eaf2ff",
        laserGlow: "rgba(59,75,101,0.7)",
    };
    const DIR_VECTORS = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
    };
    let canvas, ctx;
    let engine, world;
    let ballBody;
    let level, cellSize, cols, rows;
    let currentLevelId = null;
    let offsetX, offsetY;             
    let rotationCenter;              
    let terrainPath;               
    let finishCenter;           
    let spawnCenter;                  
    let shadowSpeedSmooth = 0;    
    let lasers = [];                   
    let projectiles = [];              
    let viewAngle = 0;                 
    let isRotating = false;
    let rotFrom = 0, rotTo = 0, rotStart = 0;
    let gameActive = false;
    let isPaused = false; 
    let levelWon = false;
    let lastTime = 0;
    let accumulator = 0;
    let rafId = null;
    const FIXED_DT = 1000 / 60;
    const MAX_SUBSTEPS = 5;
    const ballSound = new Audio("Assets/Sounds/ball.wav");
    let lastBallSoundTime = 0;
    const BALL_SOUND_COOLDOWN = 250;  
    const BALL_SOUND_MIN_SPEED = 0.6; 
    function playBallSound() {
        const now = performance.now();
        if (now - lastBallSoundTime < BALL_SOUND_COOLDOWN) return;
        lastBallSoundTime = now;
        const sound = ballSound.cloneNode();
        sound.currentTime = 0;
        if (window.Sfx && typeof window.Sfx.apply === "function") {
            window.Sfx.apply(sound);
        }
        sound.play().catch(() => {});
    }
    function isSolid(grid, r, c) {
        if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return false;
        return grid[r][c] === "#";
    }
    function findMarker(grid, ch) {
        for (let r = 0; r < grid.length; r++) {
            const c = grid[r].indexOf(ch);
            if (c !== -1) return { r, c };
        }
        return null;
    }
    const CORNER_RADIUS = 10;
    function buildTerrainPaths(grid, size) {
        const rows = grid.length, cols = grid[0].length;
        const segments = [];
        for (let r = 0; r <= rows; r++) {
            let runStart = null;
            for (let c = 0; c <= cols; c++) {
                const above = isSolid(grid, r - 1, c);
                const below = isSolid(grid, r, c);
                const isEdge = above !== below; 
                if (isEdge && runStart === null) runStart = c;
                if ((!isEdge || c === cols) && runStart !== null) {
                    segments.push({ a: { x: runStart * size, y: r * size }, b: { x: c * size, y: r * size } });
                    runStart = null;
                }
            }
        }
        for (let c = 0; c <= cols; c++) {
            let runStart = null;
            for (let r = 0; r <= rows; r++) {
                const left = isSolid(grid, r, c - 1);
                const right = isSolid(grid, r, c);
                const isEdge = left !== right;
                if (isEdge && runStart === null) runStart = r;
                if ((!isEdge || r === rows) && runStart !== null) {
                    segments.push({ a: { x: c * size, y: runStart * size }, b: { x: c * size, y: r * size } });
                    runStart = null;
                }
            }
        }
        const key = (p) => `${p.x},${p.y}`;
        const adjacency = new Map();
        const addAdj = (p, seg) => {
            const k = key(p);
            if (!adjacency.has(k)) adjacency.set(k, []);
            adjacency.get(k).push(seg);
        };
        segments.forEach((seg) => { addAdj(seg.a, seg); addAdj(seg.b, seg); });

        const other = (seg, p) => (key(seg.a) === key(p) ? seg.b : seg.a);
        const visited = new Set();
        const segId = (seg) => segments.indexOf(seg);
        const loops = [];
        segments.forEach((startSeg) => {
            if (visited.has(segId(startSeg))) return;
            const loop = [startSeg.a];
            let currentPoint = startSeg.b;
            let currentSeg = startSeg;
            visited.add(segId(currentSeg));
            loop.push(currentPoint);
            while (key(currentPoint) !== key(startSeg.a)) {
                const candidates = adjacency.get(key(currentPoint)) || [];
                const nextSeg = candidates.find((s) => !visited.has(segId(s)));
                if (!nextSeg) break;
                visited.add(segId(nextSeg));
                currentPoint = other(nextSeg, currentPoint);
                currentSeg = nextSeg;
                loop.push(currentPoint);
            }
            loops.push(loop);
        });
        const path = new Path2D();
        loops.forEach((loop) => {
            const pts = loop.slice(0, -1);
            const n = pts.length;
            if (n < 3) return;
            const last = pts[n - 1];
            const first = pts[0];
            path.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
            for (let i = 0; i < n; i++) {
                const curr = pts[i];
                const next = pts[(i + 1) % n];
                const prev = pts[(i - 1 + n) % n];
                const lenPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
                const lenNext = Math.hypot(next.x - curr.x, next.y - curr.y);
                const r = Math.min(CORNER_RADIUS, lenPrev / 2, lenNext / 2);
                path.arcTo(curr.x, curr.y, next.x, next.y, r);
            }
            path.closePath();
        });
        return path;
    }
    function buildPhysicsBodies(grid, size) {
        const bodies = [];
        for (let r = 0; r < grid.length; r++) {
            const row = grid[r];
            let c = 0;
            while (c < row.length) {
                if (row[c] === "#") {
                    const start = c;
                    while (c < row.length && row[c] === "#") c++;
                    const widthCells = c - start;
                    const w = widthCells * size;
                    const x = start * size + w / 2;
                    const y = r * size + size / 2;
                    bodies.push(
                        Matter.Bodies.rectangle(x, y, w, size, {
                            isStatic: true,
                            friction: 0.6,
                            restitution: 0.05,
                            label: "platform",
                        })
                    );
                } else {
                    c++;
                }
            }
        }
        return bodies;
    }
    function buildLevel(levelId) {
        currentLevelId = levelId;
        level = getLevel(levelId);
        cellSize = level.cellSize;
        rows = level.grid.length;
        cols = level.grid[0].length;
        offsetX = (CANVAS_W - cols * cellSize) / 2;
        offsetY = (CANVAS_H - rows * cellSize) / 2;
        rotationCenter = { x: (cols * cellSize) / 2, y: (rows * cellSize) / 2 };
        terrainPath = buildTerrainPaths(level.grid, cellSize);
        const spawn = findMarker(level.grid, "S");
        const finish = findMarker(level.grid, "F");
        finishCenter = {
            x: finish.c * cellSize + cellSize / 2,
            y: finish.r * cellSize + cellSize / 2,
        };
        spawnCenter = {
            x: spawn.c * cellSize + cellSize / 2,
            y: spawn.r * cellSize + cellSize / 2,
        };
        lasers = (level.lasers || []).map((turret) => ({
            ...turret,
            x: turret.col * cellSize + cellSize / 2,
            y: turret.row * cellSize + cellSize / 2,
            nextFire: performance.now() + (turret.interval || 1500),
        }));
        projectiles = [];
        engine = Matter.Engine.create();
        world = engine.world;
        engine.world.gravity.x = 0;
        engine.world.gravity.y = 1;
        engine.world.gravity.scale = GRAVITY_SCALE;
        const platforms = buildPhysicsBodies(level.grid, cellSize);
        const ballRadius = cellSize * 0.36;
        ballBody = Matter.Bodies.circle(
            spawn.c * cellSize + cellSize / 2,
            spawn.r * cellSize + cellSize / 2,
            ballRadius,
            {
                restitution: 0.5,
                friction: 0.15,
                frictionAir: 0.0015,
                density: 0.002,
                label: "ball",
            }
        );
        Matter.World.add(world, [...platforms, ballBody]);
        Matter.Events.on(engine, "collisionStart", (event) => {
            event.pairs.forEach((pair) => {
                const { bodyA, bodyB } = pair;
                const hitPlatform =
                    (bodyA === ballBody && bodyB.label === "platform") ||
                    (bodyB === ballBody && bodyA.label === "platform");
                if (hitPlatform && ballBody.speed > BALL_SOUND_MIN_SPEED) {
                    playBallSound();
                }
            });
        });
        viewAngle = 0;
        isRotating = false;
        levelWon = false;
        shadowSpeedSmooth = 0;
        renderLevelCounter(levelId);
        document.querySelector(".game-wrap").classList.remove("level-won");
        document.getElementById("winBanner").classList.remove("show");
    }
    function renderLevelCounter(levelId) {
        const digitsEl = document.getElementById("levelDigits");
        digitsEl.innerHTML = "";
        String(levelId).split("").forEach((digit) => {
            const img = document.createElement("img");
            img.src = `Assets/LevelCounter/${digit}.png`;
            img.alt = digit;
            img.className = "level-digit";
            digitsEl.appendChild(img);
        });
    }
    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function triggerRotation(direction = 1) {
        if (!gameActive || isRotating || levelWon) return;
        isRotating = true;
        rotFrom = viewAngle;
        rotTo = rotFrom + (Math.PI / 2) * direction;
        rotStart = performance.now();
    }
    function updateRotation(now) {
        if (!isRotating) return;
        const t = Math.min(1, (now - rotStart) / ROTATION_DURATION);
        viewAngle = rotFrom + (rotTo - rotFrom) * easeInOutCubic(t);
        if (t >= 1) {
            const TWO_PI = Math.PI * 2;
            viewAngle = ((rotTo % TWO_PI) + TWO_PI) % TWO_PI;
            isRotating = false;
        }
    }
    function updateGravity() {
        engine.world.gravity.x = Math.sin(viewAngle);
        engine.world.gravity.y = Math.cos(viewAngle);
        engine.world.gravity.scale = GRAVITY_SCALE;
    }
    function checkWin() {
        if (levelWon) return;
        const dx = ballBody.position.x - finishCenter.x;
        const dy = ballBody.position.y - finishCenter.y;
        if (Math.hypot(dx, dy) < cellSize * 0.45) {
            levelWon = true;
            Progress.unlock(currentLevelId + 1);
            document.querySelector(".game-wrap").classList.add("level-won");
            document.getElementById("winBanner").classList.add("show");
        }
    }
    function respawnBall() {
        Matter.Body.setPosition(ballBody, spawnCenter);
        Matter.Body.setVelocity(ballBody, { x: 0, y: 0 });
        Matter.Body.setAngularVelocity(ballBody, 0);
        viewAngle = 0;
        isRotating = false;
        shadowSpeedSmooth = 0;
    }
    function spawnProjectile(turret) {
        const dirVec = DIR_VECTORS[turret.dir] || DIR_VECTORS.down;
        const speed = turret.speed || 240;
        projectiles.push({
            x: turret.x + dirVec.x * cellSize * 0.5,
            y: turret.y + dirVec.y * cellSize * 0.5,
            vx: dirVec.x * speed,
            vy: dirVec.y * speed,
        });
    }
    function updateLasers(now, frameDelta) {
        if (!lasers.length && !projectiles.length) return;

        lasers.forEach((turret) => {
            if (now >= turret.nextFire) {
                spawnProjectile(turret);
                turret.nextFire = now + (turret.interval || 1500);
            }
        });
        const dt = frameDelta / 1000;
        const projectileR = cellSize * 0.14;
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            const gc = Math.floor(p.x / cellSize);
            const gr = Math.floor(p.y / cellSize);
            if (gr < 0 || gr >= rows || gc < 0 || gc >= cols || isSolid(level.grid, gr, gc)) {
                projectiles.splice(i, 1);
                continue;
            }
            const dx = p.x - ballBody.position.x;
            const dy = p.y - ballBody.position.y;
            if (Math.hypot(dx, dy) < projectileR + ballBody.circleRadius) {
                projectiles.splice(i, 1);
                respawnBall();
            }
        }
    }
    function renderLasers() {
        lasers.forEach((turret) => {
            const bodyR = cellSize * 0.28;
            ctx.save();
            ctx.translate(turret.x, turret.y);
            ctx.save();
            ctx.shadowColor = COLORS.laserGlow;
            ctx.shadowBlur = 14;
            ctx.beginPath();
            ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.laser;
            ctx.fill();
            ctx.restore();
            ctx.lineWidth = 3;
            ctx.strokeStyle = COLORS.laserOutline;
            ctx.beginPath();
            ctx.arc(0, 0, bodyR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
        const projectileR = cellSize * 0.14;
        projectiles.forEach((p) => {
            ctx.save();
            ctx.shadowColor = COLORS.laserGlow;
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(p.x, p.y, projectileR, 0, Math.PI * 2);
            ctx.fillStyle = COLORS.laser;
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = COLORS.laserOutline;
            ctx.stroke();
            ctx.restore();
        });
    }
    function render() {
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.save();
        ctx.translate(offsetX + rotationCenter.x, offsetY + rotationCenter.y);
        ctx.rotate(viewAngle);
        ctx.translate(-rotationCenter.x, -rotationCenter.y);
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(0, 0, cols * cellSize, rows * cellSize);
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.55)";
        ctx.shadowBlur = 22;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        ctx.fillStyle = COLORS.platformFill;
        ctx.fill(terrainPath, "evenodd");
        ctx.restore();
        ctx.strokeStyle = COLORS.platformOutline;
        ctx.lineWidth = 5;
        ctx.lineJoin = "round";
        ctx.stroke(terrainPath);
        renderLasers();
        const finishR = cellSize * 0.32;
        const spinAngle = (performance.now() / 900) % (Math.PI * 2);
        ctx.save();
        ctx.shadowColor = "rgba(59,75,101,0.65)";
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(finishCenter.x, finishCenter.y, finishR * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59,75,101,0.25)";
        ctx.fill();
        ctx.strokeStyle = "#eaf2ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        ctx.save();
        ctx.translate(finishCenter.x, finishCenter.y);
        ctx.rotate(spinAngle);
        ctx.beginPath();
        ctx.setLineDash([finishR * 0.55, finishR * 0.45]);
        ctx.arc(0, 0, finishR, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.finish;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
        const gdx = Math.sin(viewAngle);
        const gdy = Math.cos(viewAngle);
        const rBall = ballBody.circleRadius;
        const fallSpeed = Math.max(0, ballBody.velocity.x * gdx + ballBody.velocity.y * gdy);
        const targetT = Math.min(1, fallSpeed / 6);
        shadowSpeedSmooth += (targetT - shadowSpeedSmooth) * 0.15;
        const shadowOffset = rBall * (0.25 + shadowSpeedSmooth * 0.9);
        const shadowR = rBall * (1.25 - shadowSpeedSmooth * 0.35);
        const shadowAlpha = 0.42 - shadowSpeedSmooth * 0.22;
        const shadowX = ballBody.position.x + gdx * shadowOffset;
        const shadowY = ballBody.position.y + gdy * shadowOffset;
        const fallAngle = Math.atan2(gdy, gdx);
        ctx.save();
        ctx.translate(shadowX, shadowY);
        ctx.rotate(fallAngle);
        ctx.scale(0.4, 1);
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowR);
        grad.addColorStop(0, `rgba(0,0,0,${shadowAlpha.toFixed(3)})`);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, shadowR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(ballBody.position.x, ballBody.position.y);
        ctx.rotate(ballBody.angle);
        const r = ballBody.circleRadius;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.ball;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = COLORS.ballOutline;
        ctx.stroke();
        ctx.restore();
        ctx.restore();
    }
    function loop(now) {
        if (!gameActive) return;
        const frameDelta = Math.min(200, lastTime ? now - lastTime : FIXED_DT);
        lastTime = now;
        accumulator += frameDelta;
        updateRotation(now);
        updateGravity();
        if (!levelWon) {
            updateLasers(now, frameDelta);
            let substeps = 0;
            while (accumulator >= FIXED_DT && substeps < MAX_SUBSTEPS) {
                Matter.Engine.update(engine, FIXED_DT);
                accumulator -= FIXED_DT;
                substeps++;
            }
            checkWin();
        } else {
            accumulator = 0;
        }
        render();
        rafId = requestAnimationFrame(loop);
    }
    const HOLD_THRESHOLD = 380; 
    let holdTimer = null;
    let holdTriggered = false;
    function beginPress() {
        if (isPaused) return; 
        if (holdTimer !== null) return; 
        holdTriggered = false;
        holdTimer = setTimeout(() => {
            holdTriggered = true;
            holdTimer = null;
            triggerRotation(-1); 
        }, HOLD_THRESHOLD);
    }
    function endPress() {
        if (holdTimer !== null) {
            clearTimeout(holdTimer);
            holdTimer = null;
            if (!holdTriggered) triggerRotation(1); 
        }
        holdTriggered = false;
    }
    function onKeyDown(e) {
        if (e.repeat) return;
        beginPress();
    }
    function onKeyUp() {
        endPress();
    }
    function onPointerDown(e) {
        if (e.target.closest(".icon-button, .game-button")) return;
        beginPress();
    }
    function onPointerUp() {
        endPress();
    }
    function resizeCanvas() {
        canvas.width = CANVAS_W;
        canvas.height = CANVAS_H;
    }
    function start(levelId) {
        canvas = document.getElementById("gameCanvas");
        ctx = canvas.getContext("2d");
        resizeCanvas();
        document.getElementById("lobbyScreen").classList.remove("active");
        document.getElementById("gameScreen").classList.add("active");
        buildLevel(levelId);
        gameActive = true;
        isPaused = false;
        lastTime = 0;
        accumulator = 0;
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        document.querySelector(".game-wrap").addEventListener("pointerdown", onPointerDown);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
        rafId = requestAnimationFrame(loop);
    }
    function stop() {
        gameActive = false;
        if (rafId) cancelAnimationFrame(rafId);
        if (holdTimer !== null) {
            clearTimeout(holdTimer);
            holdTimer = null;
        }
        holdTriggered = false;
        window.removeEventListener("keydown", onKeyDown);
        window.removeEventListener("keyup", onKeyUp);
        const wrap = document.querySelector(".game-wrap");
        if (wrap) wrap.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        document.getElementById("gameScreen").classList.remove("active");
        document.getElementById("lobbyScreen").classList.add("active");
        if (typeof window.refreshLevelSelect === "function") window.refreshLevelSelect();
    }
    function closeWinBannerThen(callback) {
        const wrap = document.querySelector(".game-wrap");
        document.getElementById("winBanner").classList.remove("show");
        if (wrap) wrap.classList.remove("level-won");
        setTimeout(callback, 480);
    }
    function restart(levelId) {
        buildLevel(levelId);
    }
    document.addEventListener("DOMContentLoaded", () => {
        const backBtn = document.getElementById("backToLobby");
        const backConfirmBanner = document.getElementById("backConfirmBanner");
        const backConfirmYes = document.getElementById("backConfirmYes");
        const backConfirmNo = document.getElementById("backConfirmNo");
        function showBackConfirm() {
            if (backConfirmBanner) backConfirmBanner.classList.add("show");
        }
        function hideBackConfirm() {
            if (backConfirmBanner) backConfirmBanner.classList.remove("show");
        }

        backBtn.addEventListener("click", () => {
            if (typeof playPop === "function") playPop();
            if (typeof triggerBounce === "function") triggerBounce(backBtn, "clicked", "backIconClick");
            setTimeout(() => {
                isPaused = true;
                if (rafId) {
                    cancelAnimationFrame(rafId);
                    rafId = null;
                }
                showBackConfirm();
            }, 180);
        });
        if (backConfirmYes) {
            backConfirmYes.addEventListener("click", () => {
                if (typeof playPop === "function") playPop();
                hideBackConfirm();
                isPaused = false;
                stop(); 
            });
        }
        if (backConfirmNo) {
            backConfirmNo.addEventListener("click", () => {
                if (typeof playPop === "function") playPop();
                hideBackConfirm();
                isPaused = false;
                if (gameActive && !rafId) {
                    rafId = requestAnimationFrame(loop);
                }
            });
        }
        document.getElementById("lobbyButton").addEventListener("click", () => closeWinBannerThen(stop));
    });
    return { start, stop, restart };
})();
