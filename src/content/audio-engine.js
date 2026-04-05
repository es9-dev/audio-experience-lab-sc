'use strict';

const GUI_CONFIG = {
    "fftSize": 4096,
    "masterVolumeInfluence": .3,
    "compression": 1,           // 0.5 = Square Root (Lifts the floor, reduces flashiness)
    "subWeight": 0.25,
    "drumWeight": 0.25,
    "midWeight": 0.25,
    "highWeight": 0.15,
    "subSmooth": 0.3,
    "drumSmooth": 0.75,
    "midSmooth": 0.6,
    "highSmooth": 0.3,
    "minBrightness": 0.2,         // Slightly higher base for a "warmer" idle state
    "maxBrightness": 1.5
};

let audioCtx, analyser, dataArray;
let curSub = 0, curDrum = 0, curMid = 0, curHigh = 0;
let currentRotation = 0;
let lastTime = 0;

const PASSIVE_SPEED = 0.02;
const ACTIVE_SPEED_MULT = 0.6;

const lerpSmooth = (val) => 1.0 - (val * 0.98);

// Monkeypatch AudioContext to capture the stream
const OriginalAudioContext = window.AudioContext || window.webkitAudioContext;
window.AudioContext = window.webkitAudioContext = function(...args) {
    const context = new OriginalAudioContext(...args);
    const orgCreateMedia = context.createMediaElementSource;
    context.createMediaElementSource = function(el) {
        const src = orgCreateMedia.call(this, el);
        if (!analyser) {
            audioCtx = context;
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = GUI_CONFIG.fftSize;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            requestAnimationFrame(updateVisuals);
        }
        src.connect(analyser);
        return src;
    };
    return context;
};

const updateVisuals = (timestamp) => {
    if (!analyser) return;

    if (!lastTime) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 16.666; 
    lastTime = timestamp;

    analyser.getByteFrequencyData(dataArray);
    const binCount = dataArray.length;

    let sSum = 0, dSum = 0, mSum = 0, hSum = 0;
    for (let i = 0; i < binCount; i++) {
        if (i < binCount * 0.015) sSum += dataArray[i];
        else if (i < binCount * 0.08) dSum += dataArray[i];
        else if (i < binCount * 0.35) mSum += dataArray[i];
        else hSum += dataArray[i];
    }

    const avgS = sSum / (binCount * 0.015) || 0;
    const avgD = dSum / (binCount * 0.065) || 0;
    const avgM = mSum / (binCount * 0.27) || 0;
    const avgH = hSum / (binCount * 0.65) || 0;

    // Linear Normalization (The "Smooth" way)
    // We normalize against 255 (the max byte value)
    const rawS = avgS / 255;
    const rawD = avgD / 255;
    const rawM = avgM / 255;
    const rawH = avgH / 255;

    // Time-normalized Smoothing
    const getAdjSmooth = (val) => 1 - Math.pow(1 - lerpSmooth(val), dt);
    const sF = getAdjSmooth(GUI_CONFIG.subSmooth);
    const dF = getAdjSmooth(GUI_CONFIG.drumSmooth);
    const mF = getAdjSmooth(GUI_CONFIG.midSmooth);
    const hF = getAdjSmooth(GUI_CONFIG.highSmooth);

    curSub = (rawS * sF) + (curSub * (1 - sF));
    curDrum = (rawD * dF) + (curDrum * (1 - dF));
    curMid = (rawM * mF) + (curMid * (1 - mF));
    curHigh = (rawH * hF) + (curHigh * (1 - hF));

    // Weighted Factor
    let factor = (curSub * GUI_CONFIG.subWeight) + 
                 (curDrum * GUI_CONFIG.drumWeight) + 
                 (curMid * GUI_CONFIG.midWeight) + 
                 (curHigh * GUI_CONFIG.highWeight);
    
    // Applying the Power Curve (The "Soft Floor")
    // This makes it less "flashy" by lifting the quiet parts 
    // and reducing the distance (Abstand) between low and high energy.
    let audioFactor = Math.pow(Math.max(0, factor), GUI_CONFIG.compression);
    audioFactor = Math.min(1, audioFactor);

    // Apply Rotation
    const speed = (PASSIVE_SPEED + (audioFactor * ACTIVE_SPEED_MULT)) * dt;
    currentRotation = (currentRotation + speed) % 360;
    
    document.querySelectorAll('.sc-layer').forEach(l => {
        l.style.transform = `rotate(${currentRotation}deg)`;
    });

    // Apply Brightness
    const glowContainers = document.querySelectorAll('#sc-glow-container');
    if (glowContainers.length > 0) {
        const b = GUI_CONFIG.minBrightness + (audioFactor * (GUI_CONFIG.maxBrightness - GUI_CONFIG.minBrightness));
        glowContainers.forEach(glow => {
            glow.style.filter = `brightness(${b})`;
        });
    }

    requestAnimationFrame(updateVisuals);
};

const initializeDisplay = () => {
    document.querySelectorAll('.sc-layer').forEach(l => {
        l.style.transform = `rotate(0deg)`;
    });
};

initializeDisplay();
window.addEventListener('mousedown', () => audioCtx?.resume());