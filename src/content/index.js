'use strict';

const initCanvas = () => {
    if (document.getElementById('sc-master-bg')) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("src/content/css/glass-theme.css");
    document.head.appendChild(link);

    const masterBg = document.createElement('div');
    masterBg.id = 'sc-master-bg';
    
    masterBg.innerHTML = `
        <style>
            #sc-master-bg { 
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
                z-index: -1; pointer-events: none; background: black; overflow: hidden;
            }
            .sc-layer-container {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                transition: opacity 0.8s ease-in-out;
            }

            .base-layer, .glow-layer {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                will-change: transform;
            }

            .sc-blur {
                position: absolute; 
                top: -150%; left: -150%; width: 400%; height: 400%; 
                background-repeat: repeat;
                pointer-events: none;
            }
            .sc-blur::after {
                content: "";
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                
                /* Create a 3px black dot every 10px */
                background-image: radial-gradient(circle, black 30%, transparent 30%, transparent 100%);
                background-size: 7.5vw 7.5vw;
                
                /* Adjust opacity to control how much the dots "eat" into the colors */
                opacity: 1; 
                
                /* Ensure it doesn't block the background-image of the parent */
                z-index: 3;
            }

            .base-layer .sc-blur { 
                filter: blur(3.385vw) contrast(90%) brightness(10%) saturate(200%); 
                background-size: auto 12.5vw;
            }
            .glow-layer .sc-blur { 
                filter: contrast(150%) saturate(400%) hue-rotate(15deg) blur(3.906vw); 
                background-size: auto 20vw;
            }

            .glow-layer { mix-blend-mode: overlay; }

            #sc-glow-mask {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                -webkit-mask-image: linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
                mask-image: linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
            }
            #sc-glow-container { width: 100%; height: 100%; filter: brightness(0.05); will-change: filter; }
            
            .bg-hidden { opacity: 0; }
            .bg-visible { opacity: 1; }

            #wrapper, #content, .l-container, .l-main, .fullHero { background: transparent !important; }
        </style>
        
        <div id="bg-set-a" class="sc-layer-container bg-visible">
            <div class="base-layer">
                <div class="sc-blur"></div>
            </div>
            <div id="sc-glow-mask">
                <div id="sc-glow-container">
                    <div class="glow-layer">
                        <div class="sc-blur"></div>
                    </div>
                </div>
            </div>
        </div>
        <div id="bg-set-b" class="sc-layer-container bg-hidden">
            <div class="base-layer">
                <div class="sc-blur"></div>
            </div>
            <div id="sc-glow-mask">
                <div id="sc-glow-container">
                    <div class="glow-layer">
                        <div class="sc-blur"></div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(masterBg);
};

let lastUrl = "";
let currentSet = 'a';

const checkArtwork = () => {
    const target = document.querySelector('.fullHero__artwork span.sc-artwork') || 
                   document.querySelector('.profileHeaderBackground__visual') ||
                   document.querySelector('.playbackSoundBadge__avatar span.sc-artwork');

    if (target) {
        const style = window.getComputedStyle(target).backgroundImage;
        if (style && style !== 'none') {
            const url = style.slice(4, -1).replace(/"/g, "");
            if (url !== lastUrl) {
                lastUrl = url;
                const highRes = url.replace('-large.', '-t500x500.').replace('-badge.', '-t500x500.');
                
                const nextSet = currentSet === 'a' ? 'b' : 'a';
                const nextEl = document.getElementById(`bg-set-${nextSet}`);
                const currentEl = document.getElementById(`bg-set-${currentSet}`);

                nextEl.querySelectorAll('.sc-blur').forEach(l => {
                    l.style.backgroundImage = `url("${highRes}")`;
                });

                nextEl.classList.replace('bg-hidden', 'bg-visible');
                currentEl.classList.replace('bg-visible', 'bg-hidden');

                currentSet = nextSet;
            }
        }
    }
};

const observer = new MutationObserver(() => {
    if (document.body) {
        initCanvas();
        observer.disconnect();
    }
});
observer.observe(document.documentElement, { childList: true });

setInterval(checkArtwork, 200);