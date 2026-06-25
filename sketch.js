// ─────────────────────────────────────────────────────────
//  sketch.js  —  Gesture Paint core
//  Tools: pen (index finger up), eraser (open hand), pause (fist)
// ─────────────────────────────────────────────────────────

// ── State ──────────────────────────────────────────────────
let video;
let mpHands;
let mpCamera;
let handResults = [];

let drawingLayer;          // p5.Graphics — the persistent drawing surface
let isModelLoaded = false;

// Current gesture: 'pen' | 'eraser' | 'none'
let currentTool = 'none';

// Last fingertip position (in canvas coords)
let lastX = -1;
let lastY = -1;

// Visual feedback: brief "lift" when switching tools
let toolSwitchCooldown = 0;   // counts down frames after a tool change
const COOLDOWN_FRAMES = 12;   // ~12 frames at 60fps ≈ 0.2s dead zone

const PEN_SIZE    = 8;
const ERASER_SIZE = 60;

// ── p5 setup ───────────────────────────────────────────────
function setup() {
    // Mount canvas inside #canvas-area
    let canvasParent = document.getElementById('canvas-area');
    let w = canvasParent.offsetWidth;
    let h = canvasParent.offsetHeight;

    let cnv = createCanvas(w, h);
    cnv.parent('canvas-area');

    // Drawing layer matches the canvas size
    drawingLayer = createGraphics(w, h);
    drawingLayer.clear();

    // Webcam — native 640×480, will be scaled to canvas
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    // MediaPipe Hands
    mpHands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    mpHands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.6
    });
    mpHands.onResults((results) => {
        handResults = results.multiHandLandmarks;
    });

    // Camera utils feeds frames to MediaPipe
    mpCamera = new Camera(video.elt, {
        onFrame: async () => { await mpHands.send({ image: video.elt }); },
        width: 640,
        height: 480
    });
    mpCamera.start();

    // Mark model ready after a short warm-up
    setTimeout(() => {
        isModelLoaded = true;
        setStatus('ready');
        document.getElementById('save-btn').disabled = false;
    }, 2500);

    // Wire up toolbar buttons
    document.getElementById('clear-btn').addEventListener('click', clearDrawing);
    document.getElementById('save-btn').addEventListener('click', triggerSave);
}

// ── p5 draw loop ───────────────────────────────────────────
function draw() {
    // ── Mirror the video feed ──────────────────────────────
    push();
    translate(width, 0);
    scale(-1, 1);
    image(video, 0, 0, width, height);
    pop();

    // ── Process hand landmarks if model is ready ───────────
    if (isModelLoaded && handResults && handResults.length > 0) {
        let landmarks = handResults[0];

        // Detect gesture
        let detectedTool = detectGesture(landmarks);

        // If tool changed, start cooldown and reset last position
        if (detectedTool !== currentTool) {
            currentTool = detectedTool;
            toolSwitchCooldown = COOLDOWN_FRAMES;
            lastX = -1;
            lastY = -1;
            updateToolUI(currentTool);
        }

        // Decrement cooldown
        if (toolSwitchCooldown > 0) toolSwitchCooldown--;

        // Get index fingertip (landmark 8) — mirrored X
        let tip = landmarks[8];
        let tipX = (1 - tip.x) * width;   // mirror
        let tipY = tip.y * height;

        // Draw if tool is active and cooldown has passed
        if (toolSwitchCooldown === 0 && currentTool !== 'none') {
            applyTool(tipX, tipY);
        } else {
            // Reset stroke tracking when not drawing
            lastX = -1;
            lastY = -1;
        }

        // Draw fingertip cursor on top
        drawCursor(tipX, tipY);

    } else if (isModelLoaded) {
        // No hand in frame — reset
        if (currentTool !== 'none') {
            currentTool = 'none';
            lastX = -1;
            lastY = -1;
            updateToolUI('none');
        }
    }

    // ── Composite the drawing layer on top of video ────────
    image(drawingLayer, 0, 0);

    // ── Loading overlay ────────────────────────────────────
    if (!isModelLoaded) {
        fill(0, 0, 0, 120);
        noStroke();
        rect(0, 0, width, height);
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(16);
        textFont('Courier New');
        text('loading hand model...', width / 2, height / 2);
    }
}

// ── Gesture detection ──────────────────────────────────────
// Returns 'pen' | 'eraser' | 'none'
function detectGesture(landmarks) {
    // Fingertip landmarks: 4=thumb, 8=index, 12=middle, 16=ring, 20=pinky
    // Knuckle landmarks:   3=thumb, 6=index, 10=middle, 14=ring, 18=pinky

    let indexUp  = isFingerUp(landmarks, 8, 6);
    let middleUp = isFingerUp(landmarks, 12, 10);
    let ringUp   = isFingerUp(landmarks, 16, 14);
    let pinkyUp  = isFingerUp(landmarks, 20, 18);

    let upCount = [indexUp, middleUp, ringUp, pinkyUp].filter(Boolean).length;

    // Open hand (eraser): all 4 fingers clearly up
    if (upCount === 4) return 'eraser';

    // Index only (pen): just index finger extended
    if (indexUp && !middleUp && !ringUp && !pinkyUp) return 'pen';

    // Everything else = fist/neutral = pause drawing
    return 'none';
}

// Is a fingertip higher on screen (smaller y) than its knuckle?
function isFingerUp(landmarks, tipIdx, knuckleIdx) {
    return landmarks[tipIdx].y < landmarks[knuckleIdx].y - 0.04;
}

// ── Apply tool to drawing layer ────────────────────────────
function applyTool(x, y) {
    if (currentTool === 'pen') {
        drawingLayer.stroke(0);
        drawingLayer.strokeWeight(PEN_SIZE);
        drawingLayer.strokeCap(ROUND);
        drawingLayer.noFill();

        if (lastX !== -1) {
            drawingLayer.line(lastX, lastY, x, y);
        }
        drawingLayer.fill(0);
        drawingLayer.noStroke();
        drawingLayer.ellipse(x, y, PEN_SIZE, PEN_SIZE);

    } else if (currentTool === 'eraser') {
        // Erase by painting transparent on the drawing layer
        drawingLayer.erase();
        drawingLayer.noStroke();
        drawingLayer.ellipse(x, y, ERASER_SIZE, ERASER_SIZE);
        drawingLayer.noErase();
    }

    lastX = x;
    lastY = y;
}

// ── Cursor visual ──────────────────────────────────────────
function drawCursor(x, y) {
    noFill();

    if (currentTool === 'pen') {
        // Small crosshair + dot
        stroke(255, 255, 255, 200);
        strokeWeight(1.5);
        line(x - 12, y, x + 12, y);
        line(x, y - 12, x, y + 12);
        fill(0);
        noStroke();
        ellipse(x, y, PEN_SIZE, PEN_SIZE);

    } else if (currentTool === 'eraser') {
        // Circle showing eraser size
        stroke(255, 100, 100, 180);
        strokeWeight(1.5);
        ellipse(x, y, ERASER_SIZE, ERASER_SIZE);

    } else if (currentTool === 'none') {
        // Subtle dot when paused
        fill(255, 255, 255, 80);
        noStroke();
        ellipse(x, y, 10, 10);
    }
}

// ── Toolbar UI sync ────────────────────────────────────────
function updateToolUI(tool) {
    document.querySelectorAll('.tool-card').forEach(el => el.classList.remove('active'));
    let map = { pen: 'tool-pen', eraser: 'tool-eraser', none: 'tool-none' };
    if (map[tool]) document.getElementById(map[tool]).classList.add('active');
}

function setStatus(state) {
    let dot  = document.querySelector('.status-dot');
    let text = document.getElementById('status-text');
    dot.className  = 'status-dot ' + state;
    text.textContent = state === 'ready' ? 'model ready' : 'loading model...';
}

// ── Canvas actions ─────────────────────────────────────────
function clearDrawing() {
    drawingLayer.clear();
    lastX = -1;
    lastY = -1;
}

// Called by the Save button — hands off to photostrip.js
function triggerSave() {
    // Capture: composite video frame + drawing layer into one image
    let composite = createGraphics(width, height);

    // Draw mirrored video
    composite.push();
    composite.translate(width, 0);
    composite.scale(-1, 1);
    composite.image(video, 0, 0, width, height);
    composite.pop();

    // Draw the drawing layer on top
    composite.image(drawingLayer, 0, 0);

    // Convert to dataURL and pass to photostrip
    let dataURL = composite.elt.toDataURL('image/png');
    composite.remove();

    showPhotostrip(dataURL);
}

// Resize canvas and drawing layer if window resizes
function windowResized() {
    let parent = document.getElementById('canvas-area');
    let w = parent.offsetWidth;
    let h = parent.offsetHeight;

    // Preserve existing drawing
    let temp = createGraphics(w, h);
    temp.image(drawingLayer, 0, 0, w, h);
    drawingLayer.remove();
    drawingLayer = temp;

    resizeCanvas(w, h);
}
