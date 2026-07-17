//  ___          __    __          
// |   |  .-----|  |--|  |--.--.--.
// |.  |  |  _  |  _  |  _  |  |  |
// |.  |__|_____|_____|_____|___  |
// |:  1   |                |_____|
// |::.. . |                       
// `-------'                       
                                 
//  _______ _______ _______ _______ _______ _______ __   __ 
// |       |   _   |       |   _   |   _   |       |  | |  |
// |    _  |  |_|  |    ___|  |_|  |  |_|  |       |  |_|  |
// |   |_| |       |   |___|       |       |       |       |
// |    ___|       |    ___|       |       |      _|       |
// |   |   |   _   |   |___|   _   |   _   |     |_ |     | 
// |___|   |__| |__|_______|__| |__|__| |__|_______||_______|
// ===================== POPUP: POLITICA DE CONFIDENȚIALITATE =====================
//
// Ce face secțiunea asta de cod, pas cu pas:
//
// 1) Prima dată când cineva deschide jocul în browser-ul lui, vrem să-i
//    arătăm un popup care îl anunță despre politica de confidențialitate
//    și îl trimite (printr-un link) către documentul complet de pe GitHub.
//
// 2) Popup-ul TREBUIE închis manual, apăsând butonul "OK" — nu se poate
//    închide dând click pe lângă el (spre deosebire de panourile de
//    "level select" / "settings" de mai sus, care se închid la click în
//    afara lor). Asta pentru că vrem să fim siguri că userul a interacționat
//    conștient cu el, nu doar l-a ignorat.
//
// 3) Odată apăsat "OK", NU mai vrem să enervăm jucătorul arătându-i din
//    nou popup-ul de fiecare dată când redeschide jocul. Așa că salvăm
//    un "flag" (o simplă valoare true/false) în localStorage — exact
//    aceeași tehnică pe care Levels.js o folosește deja pentru a ține
//    minte progresul jucătorului între vizite (vezi obiectul `Progress`).
//
// 4) Vizual, popup-ul folosește EXACT aceleași clase CSS ca popup-ul de
//    "Level Complete!" (.win-banner, .win-card, .win-title, .game-button),
//    definite deja în style.css. Nu am scris CSS nou pentru fundal, blur,
//    animația de apariție a cardului, culori sau fonturi — toate astea
//    vin "gratis" din regulile existente. Singurul lucru stilizat separat
//    e paragraful de text și link-ul din interior (clasele .privacy-text
//    și .privacy-link), pentru că popup-ul de win nu avea nevoie de text
//    liber, doar de un titlu.

// Cheia sub care ținem minte în localStorage dacă userul a apăsat deja OK.
// (localStorage e o mică "bază de date" oferită de browser, care rămâne
// salvată chiar și după ce închizi tab-ul sau calculatorul — spre
// deosebire de variabilele normale din JS, care se pierd la refresh.)
const PRIVACY_KEY = "twistedWorld_privacyAccepted";

// Link-ul "raw" către fișierul de pe GitHub — spre deosebire de link-ul
// normal (github.com/.../blob/...), care întoarce o pagină HTML întreagă,
// "raw.githubusercontent.com" întoarce STRICT conținutul fișierului, ca
// text simplu (markdown), exact cum e scris în repo. E linkul potrivit
// pentru a fi citit programatic cu fetch(), nu pentru a fi deschis de om.
const PRIVACY_MD_URL = "https://raw.githubusercontent.com/Adium1000/Twisted-World/main/PrivacyPolicy.md";

// Referințe către elementele din DOM pe care le-am adăugat în index.html:
// - privacyBanner:  containerul mare, semi-transparent, care acoperă tot ecranul
// - privacyContent: locul gol unde injectăm textul luat din PrivacyPolicy.md
// - privacyOkButton: butonul pe care userul trebuie să-l apese ca să continue
const privacyBanner = document.getElementById("privacyBanner");
const privacyContent = document.getElementById("privacyContent");
const privacyOkButton = document.getElementById("privacyOkButton");

// Mică funcție "ajutătoare" (helper) care verifică în localStorage dacă
// jucătorul a acceptat deja politica de confidențialitate cândva în trecut.
// localStorage.getItem() întoarce mereu un string (sau null dacă nu există
// cheia), de-asta comparăm direct cu string-ul "true", nu cu booleanul true.
function hasAcceptedPrivacy() {
    return localStorage.getItem(PRIVACY_KEY) === "true";
}

// Funcție care marchează, în localStorage, faptul că userul tocmai a
// apăsat OK. Data viitoare când `hasAcceptedPrivacy()` va fi apelată
// (adică la următoarea vizită / refresh), va întoarce true, iar popup-ul
// nu va mai fi afișat.
function acceptPrivacyPolicy() {
    localStorage.setItem(PRIVACY_KEY, "true");
}

// Arată popup-ul. Adăugăm doar clasa "show" — restul (fade-in, blur pe
// fundal, animația de "pop" a cardului cu efect de bounce) sunt deja
// definite în style.css pentru orice element cu clasa .win-banner.
function showPrivacyPopup() {
    if (!privacyBanner) return; // siguranță: dacă lipsește din HTML, nu crăpăm scriptul
    privacyBanner.classList.add("show");
}

// Ascunde popup-ul, scoțând clasa "show". Tranziția CSS (opacity, blur,
// vizibilitate) se ocupă singură de partea de animație la dispariție.
function hidePrivacyPopup() {
    if (!privacyBanner) return;
    privacyBanner.classList.remove("show");
}

// Transformă câteva sintaxe simple de markdown (link-uri gen [text](url))
// în HTML real. Escapăm mai întâi orice caracter special (&, <, >), ca să
// nu injectăm accidental HTML arbitrar din fișierul extern — practică de
// bază de siguranță ori de câte ori bagi text venit de pe internet direct
// în pagină cu innerHTML.
function markdownInlineToHtml(rawText) {
    const escaped = rawText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // [label](url) -> <a href="url">label</a>
    return escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="privacy-link">${label}</a>`;
    });
}

// Ia textul brut (markdown) din PrivacyPolicy.md și îl desparte în
// paragrafe, ca să le putem afișa frumos în popup, unul sub altul.
//
// Regula simplă folosită: în markdown, un rând gol desparte două
// paragrafe. Deci despărțim conținutul după orice linie goală
// (regex-ul /\n\s*\n/), iar apoi:
//   - dacă un "bloc" începe cu "#" (adică e un titlu markdown, ex.
//     "# Privacy Policy"), îl SĂRIM — deja avem propriul titlu, în
//     engleză, în .win-title, nu vrem să apară de două ori.
//   - altfel, liniile "rupte" din interiorul aceluiași paragraf sunt
//     unite cu spațiu, ca să formeze un singur bloc de text continuu.
function renderPrivacyMarkdown(markdown) {
    if (!privacyContent) return;
    privacyContent.innerHTML = ""; // golim mesajul de "Loading…"
    const blocks = markdown.trim().split(/\n\s*\n/);
    blocks.forEach((block) => {
        const trimmed = block.trim();
        if (!trimmed || trimmed.startsWith("#")) return; // sărim titlul markdown
        const joinedLine = trimmed.replace(/\s*\n\s*/g, " ");
        const paragraph = document.createElement("p");
        paragraph.className = "privacy-text";
        paragraph.innerHTML = markdownInlineToHtml(joinedLine);
        privacyContent.appendChild(paragraph);
    });
}

// Dă efectiv fetch la fișierul .md brut și, când răspunsul ajunge, îl
// randează în popup. Dacă ceva merge prost (fără internet, GitHub e jos,
// etc.), afișăm un mesaj de rezervă în engleză, ca userul să nu rămână
// blocat uitându-se la "Loading…" la infinit — poate oricum apăsa OK.
function loadPrivacyPolicy() {
    if (!privacyContent) return;
    fetch(PRIVACY_MD_URL)
        .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch PrivacyPolicy.md");
            return response.text();
        })
        .then(renderPrivacyMarkdown)
        .catch(() => {
            privacyContent.innerHTML = "";
            const fallback = document.createElement("p");
            fallback.className = "privacy-text";
            fallback.textContent = "Could not load the Privacy Policy right now.";
            privacyContent.appendChild(fallback);
        });
}

// Când userul apasă "OK":
//   1. Salvăm acceptul în localStorage (ca să nu mai vadă popup-ul din nou)
//   2. Ascundem popup-ul, ca să poată folosi lobby-ul normal
if (privacyOkButton) {
    privacyOkButton.addEventListener("click", () => {
        acceptPrivacyPolicy();
        hidePrivacyPopup();
    });
}

// Verificarea finală, executată imediat ce acest fișier (Lobby.js) rulează.
// Notă: <script src="Lobby.js"> e plasat la finalul lui <body> în
// index.html, deci DOM-ul e deja complet încărcat în acest punct — nu mai
// avem nevoie să așteptăm evenimentul "DOMContentLoaded" ca să găsim
// elementele de mai sus.
//
// Dacă userul NU a acceptat niciodată politica (prima rulare a jocului
// pe acest browser, sau localStorage a fost șters), afișăm popup-ul
// imediat, peste tot restul lobby-ului (grație z-index-ului din CSS), și
// pornim fetch-ul către PrivacyPolicy.md ca să umplem conținutul.
if (!hasAcceptedPrivacy()) {
    showPrivacyPopup();
    loadPrivacyPolicy();
}

const playButton = document.getElementById("playButton");
const settingsButton = document.getElementById("settingsButton");
const popSound = new Audio("Assets/Sounds/pop.wav");

//  _______ _______ _______ 
// |     __|    ___|     __|
// |__     |    ___|__     |
// |_______|_______|_______|
// volume settings (0-5)
const SFX_KEY = "twistedWorld_sfxVolume";
const SFX_MAX = 5;
const Sfx = {
    get() {
        const stored = parseInt(localStorage.getItem(SFX_KEY), 10);
        if (Number.isFinite(stored) && stored >= 0 && stored <= SFX_MAX) return stored;
        return SFX_MAX;
    },
    set(value) {
        const clamped = Math.max(0, Math.min(SFX_MAX, value));
        localStorage.setItem(SFX_KEY, String(clamped));
        return clamped;
    },
    apply(audioEl) {
        audioEl.volume = this.get() / SFX_MAX;
    },
};
window.Sfx = Sfx;

[playButton, settingsButton].forEach((btn) => {
    btn.addEventListener("animationend", (e) => {
        if (e.animationName === "buttonIntro") {
            btn.classList.add("ready");
            btn.classList.remove("intro-1", "intro-2");
        }
    });
});
function playPop() {
    const sound = popSound.cloneNode();
    sound.currentTime = 0;
    Sfx.apply(sound);
    sound.play().catch(() => {});
}
function triggerBounce(el, className, animationName) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    el.addEventListener("animationend", (e) => {
        if (e.animationName === animationName) el.classList.remove(className);
    }, { once: true });
}
function bounceButton(btn) {
    if (!btn.classList.contains("ready")) return; 
    triggerBounce(btn, "clicked", "buttonClick");
}
function handleButtonClick(btn) {
    playPop();
    bounceButton(btn);
}
const levelSelectPanel = document.getElementById("levelSelect");
const levelSelectRow = document.getElementById("levelSelectRow");
function renderLevelSelect() {
    levelSelectRow.innerHTML = "";
    for (let i = 1; i <= LEVEL_COUNT; i++) {
        const unlocked = Progress.isUnlocked(i);
        const item = document.createElement("button");
        item.type = "button";
        item.className = "level-select-item" + (unlocked ? "" : " locked");
        item.disabled = !unlocked;
        item.setAttribute("aria-label", `Level ${i}${unlocked ? "" : " (locked)"}`);
        const img = document.createElement("img");
        img.src = `Assets/LevelCounter/${i}.png`;
        img.alt = String(i);
        img.className = "level-digit-select";
        item.appendChild(img);
        if (unlocked) {
            item.addEventListener("click", () => {
                playPop();
                triggerBounce(item, "pressed", "buttonClick");
                setTimeout(() => Game.start(i), 250);
            });
        }
        levelSelectRow.appendChild(item);
    }
}
window.refreshLevelSelect = renderLevelSelect;
renderLevelSelect();
playButton.addEventListener("click", () => {
    handleButtonClick(playButton);
    setTimeout(() => {
        const opening = !levelSelectPanel.classList.contains("open");
        settingsSelectPanel.classList.remove("open");
        if (opening) renderLevelSelect(); 
        levelSelectPanel.classList.toggle("open", opening);
    }, 350); 
});
document.addEventListener("pointerdown", (e) => {
    if (levelSelectPanel.classList.contains("open") &&
        !levelSelectPanel.contains(e.target) && !playButton.contains(e.target)) {
        levelSelectPanel.classList.remove("open");
    }
    if (settingsSelectPanel.classList.contains("open") &&
        !settingsSelectPanel.contains(e.target) && !settingsButton.contains(e.target)) {
        settingsSelectPanel.classList.remove("open");
    }
});

//  _______ _______ _______ _____   _______ _______ _______ 
// |     __|    ___|     __|     |_|     __|    ___|_     _|
// |__     |    ___|__     |       |__     |    ___| |   |  
// |_______|_______|_______|_______|_______|_______| |___|  
const settingsSelectPanel = document.getElementById("settingsSelect");
const settingsSelectRow = document.getElementById("settingsSelectRow");
function renderSettingsSelect() {
    settingsSelectRow.innerHTML = "";

    const icon = document.createElement("img");
    icon.src = "Assets/Lobby/sfx.png";
    icon.alt = "SFX Volume";
    icon.className = "sfx-icon";
    settingsSelectRow.appendChild(icon);

    const item = document.createElement("button");
    item.type = "button";
    item.className = "level-select-item";
    item.setAttribute("aria-label", "SFX Volume");
    const digit = document.createElement("img");
    digit.src = `Assets/LevelCounter/${Sfx.get()}.png`;
    digit.alt = String(Sfx.get());
    digit.className = "level-digit-select";
    item.appendChild(digit);
    item.addEventListener("click", () => {
        const next = Sfx.get() >= SFX_MAX ? 0 : Sfx.get() + 1;
        Sfx.set(next);
        digit.src = `Assets/LevelCounter/${next}.png`;
        digit.alt = String(next);
        playPop();
        triggerBounce(item, "pressed", "buttonClick");
    });
    settingsSelectRow.appendChild(item);
}
settingsButton.addEventListener("click", () => {
    handleButtonClick(settingsButton);
    setTimeout(() => {
        const opening = !settingsSelectPanel.classList.contains("open");
        levelSelectPanel.classList.remove("open");
        if (opening) renderSettingsSelect();
        settingsSelectPanel.classList.toggle("open", opening);
    }, 350);
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

