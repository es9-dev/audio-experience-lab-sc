// inject CSS styles
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
            .sc-layer { 
                position: absolute; top: -150%; left: -150%; width: 400%; height: 400%; 
                background-repeat: repeat; will-change: transform;
            }
            /* Specific Layer Styles */
            .base-layer .sc-layer { background-size: auto 5%; filter: blur(65px) contrast(80%) brightness(10%) saturate(200%); }
            .glow-layer .sc-layer { 
                background-size: auto 8%; 
                filter: contrast(150%) saturate(400%) hue-rotate(15deg) blur(75px); 
                mix-blend-mode: overlay; 
            }
            #sc-glow-mask {
                position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                -webkit-mask-image: linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
                mask-image: linear-gradient(0deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
            }
            #sc-glow-container { width: 100%; height: 100%; filter: brightness(0.05); will-change: filter; }
            
            /* The cross-fade states */
            .bg-hidden { opacity: 0; }
            .bg-visible { opacity: 1; }

            #wrapper, #content, .l-container, .l-main, .fullHero { background: transparent !important; }
        </style>
        
        <div id="bg-set-a" class="sc-layer-container bg-visible">
            <div class="base-layer"><div class="sc-layer"></div></div>
            <div id="sc-glow-mask"><div id="sc-glow-container"><div class="glow-layer"><div class="sc-layer"></div></div></div></div>
        </div>
        <div id="bg-set-b" class="sc-layer-container bg-hidden">
            <div class="base-layer"><div class="sc-layer"></div></div>
            <div id="sc-glow-mask"><div id="sc-glow-container"><div class="glow-layer"><div class="sc-layer"></div></div></div></div>
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
                
                // Determine which set is currently hidden
                const nextSet = currentSet === 'a' ? 'b' : 'a';
                const nextEl = document.getElementById(`bg-set-${nextSet}`);
                const currentEl = document.getElementById(`bg-set-${currentSet}`);

                // 1. Update the hidden set's images
                nextEl.querySelectorAll('.sc-layer').forEach(l => {
                    l.style.backgroundImage = `url("${highRes}")`;
                });

                // 2. Perform the cross-fade
                nextEl.classList.replace('bg-hidden', 'bg-visible');
                currentEl.classList.replace('bg-visible', 'bg-hidden');

                currentSet = nextSet;
                console.log("[AEL] Cross-fade initiated to: ", highRes);
            }
        }
    }
};

// Initialization logic
const observer = new MutationObserver(() => {
    if (document.body) {
        initCanvas();
        observer.disconnect();
    }
});
observer.observe(document.documentElement, { childList: true });

setInterval(checkArtwork, 200);