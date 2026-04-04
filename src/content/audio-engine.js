'use strict';

const GUI_CONFIG = {
    "fftSize": 4096,
    "peakDecay": 0.99, // Note: This is also technically frame-dependent, normalized below
    "masterVolumeInfluence": 1,
    "subWeight": 0.25,
    "drumWeight": 0.25,
    "midWeight": 0.25,
    "highWeight": 0.15,
    "subSmooth": 0.3,
    "drumSmooth": 0.75,
    "midSmooth": 0.6,
    "highSmooth": 0.3,
    "minBrightness": 0.05,
    "maxBrightness": 2.1
};

let audioCtx, analyser, dataArray;
let curSub = 0, curDrum = 0, curMid = 0, curHigh = 0;
let pkSub = 10, pkDrum = 10, pkMid = 10, pkHigh = 10;
let currentRotation = 0;
let lastTime = 0;

const PASSIVE_SPEED = 0.02;
const ACTIVE_SPEED_MULT = 0.6;

// Helper to convert 0-1 GUI smoothing to 1.0-0.02 Math smoothing
const lerpSmooth = (val) => 1.0 - (val * 0.98);

// Monkeypatch AudioContext
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

    // Normalize Peak Decay: Math.pow(decay, dt) ensures decay is constant over time
    const adjDecay = Math.pow(GUI_CONFIG.peakDecay, dt);
    pkSub = Math.max(avgS, pkSub * adjDecay, 5);
    pkDrum = Math.max(avgD, pkDrum * adjDecay, 5);
    pkMid = Math.max(avgM, pkMid * adjDecay, 5);
    pkHigh = Math.max(avgH, pkHigh * adjDecay, 5);

    const blend = GUI_CONFIG.masterVolumeInfluence;
    const calcNorm = (avg, peak) => ((avg/255) * blend) + ((avg/peak) * (1-blend));

    const rawS = calcNorm(avgS, pkSub);
    const rawD = calcNorm(avgD, pkDrum);
    const rawM = calcNorm(avgM, pkMid);
    const rawH = calcNorm(avgH, pkHigh);

    // Normalize Smoothing: Using 1 - Math.pow(1 - lerp, dt)
    const getAdjSmooth = (val) => 1 - Math.pow(1 - lerpSmooth(val), dt);
    
    const sF = getAdjSmooth(GUI_CONFIG.subSmooth);
    const dF = getAdjSmooth(GUI_CONFIG.drumSmooth);
    const mF = getAdjSmooth(GUI_CONFIG.midSmooth);
    const hF = getAdjSmooth(GUI_CONFIG.highSmooth);

    curSub = (rawS * sF) + (curSub * (1 - sF));
    curDrum = (rawD * dF) + (curDrum * (1 - dF));
    curMid = (rawM * mF) + (curMid * (1 - mF));
    curHigh = (rawH * hF) + (curHigh * (1 - hF));

    let factor = (curSub * GUI_CONFIG.subWeight) + 
                 (curDrum * GUI_CONFIG.drumWeight) + 
                 (curMid * GUI_CONFIG.midWeight) + 
                 (curHigh * GUI_CONFIG.highWeight);
    
    let audioFactor = Math.min(1, Math.max(0, factor));

    // Normalize Rotation
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