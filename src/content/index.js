// inject CSS styles
const initCanvas = () => {
if (document.getElementById('sc-master-bg')) return;
    // original userstyle theme configuration
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = chrome.runtime.getURL("src/content/css/glass-theme.css");
};

// Initialization logic
const observer = new MutationObserver(() => {
    if (document.body) {
        initCanvas();
        observer.disconnect();
    }
});
observer.observe(document.documentElement, { childList: true });