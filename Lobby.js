//  ___          __    __          
// |   |  .-----|  |--|  |--.--.--.
// |.  |  |  _  |  _  |  _  |  |  |
// |.  |__|_____|_____|_____|___  |
// |:  1   |                |_____|
// |::.. . |                       
// `-------'                       
                                 
const playButton = document.getElementById("playButton");
const settingsButton = document.getElementById("settingsButton");
const popSound = new Audio("Assets/Sounds/pop.wav");
[playButton, settingsButton].forEach((btn) => {
    btn.addEventListener("animationend", (e) => {
        if (e.animationName === "buttonIntro") {
            btn.classList.add("ready");
        }
    });
});
function playPop() {
    const sound = popSound.cloneNode();
    sound.currentTime = 0; 
    sound.play().catch(() => {}); 
}
function bounceButton(btn) {
    if (!btn.classList.contains("ready")) return; 

    btn.classList.remove("clicked"); 
    void btn.offsetWidth; 
    btn.classList.add("clicked"); 
    btn.addEventListener("animationend", (e) => {
        if (e.animationName === "buttonClick") btn.classList.remove("clicked");
    }, { once: true });
}
function handleButtonClick(btn) {
    playPop();
    bounceButton(btn);
}
playButton.addEventListener("click", () => {
    handleButtonClick(playButton);
    setTimeout(() => Game.start(1), 350); // let the click bounce play out first
});
settingsButton.addEventListener("click", () => {
    handleButtonClick(settingsButton);
    console.log("Settings");
});
const layerConfigs = [
    { id: "layerBack",  count: 8,  sizeRange: [30, 55]  }, 
    { id: "layerMid",   count: 10, sizeRange: [45, 80]  }, 
    { id: "layerFront", count: 7,  sizeRange: [60, 110] }, 
];
const shapeTypes = ["circle", "square", "triangle"];
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}
function createShape(sizeRange) {
    const type = shapeTypes[Math.floor(Math.random() * shapeTypes.length)]; 
    const el = document.createElement("div");
    el.className = `shape ${type}`;

    const size = randomBetween(sizeRange[0], sizeRange[1]); 
    const top = randomBetween(0, 96);  
    const left = randomBetween(0, 96); 

    el.style.top = `${top}%`;
    el.style.left = `${left}%`;

    if (type === "triangle") {
        const scale = size / 60;
        el.style.borderLeftWidth = `${26 * scale}px`;
        el.style.borderRightWidth = `${26 * scale}px`;
        el.style.borderBottomWidth = `${45 * scale}px`;
    } else {
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
    }
    const hue = randomBetween(195, 265);       
    const rot = randomBetween(-25, 25);     
    const rotSwing = randomBetween(-18, 18);  
    const dx = randomBetween(-16, 16);     
    const dy = randomBetween(-14, 14);  
    const dur = randomBetween(5, 11);          
    const delay = randomBetween(0, 6); 
    el.style.setProperty("--hue", hue.toFixed(0));
    el.style.setProperty("--rot", `${rot.toFixed(1)}deg`);
    el.style.setProperty("--rot-swing", `${rotSwing.toFixed(1)}deg`);
    el.style.setProperty("--dx", `${dx.toFixed(1)}px`);
    el.style.setProperty("--dy", `${dy.toFixed(1)}px`);
    el.style.setProperty("--dur", `${dur.toFixed(1)}s`);
    el.style.setProperty("--delay", `${delay.toFixed(1)}s`);

    return el;
}
layerConfigs.forEach(({ id, count, sizeRange }) => {
    const layerEl = document.getElementById(id);
    const inner = layerEl.querySelector(".layer-inner");
    const half = document.createElement("div");
    half.style.position = "relative";
    half.style.width = "100%";
    half.style.height = "50%";
    for (let i = 0; i < count; i++) {
        half.appendChild(createShape(sizeRange));
    }

    inner.appendChild(half);          
    inner.appendChild(half.cloneNode(true)); 
});

