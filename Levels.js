//  ___                      __       
// |   |  .-----.--.--.-----|  .-----.
// |.  |  |  -__|  |  |  -__|  |__ --|
// |.  |__|_____|\___/|_____|__|_____|
// |:  1   |                          
// |::.. . |                          
// `-------'                                                            
const LEVELS = {
    1: {
        name: "Level 1",
        cellSize: 56,
        grid: [
            "########",
            "#S....F#",
            "#.####.#",
            "#.#..#.#",
            "#.#..#.#",
            "#.#..#.#",
            "#......#",
            "########",
        ],
        lasers: [
            { row: 3, col: 3, dir: "down", interval: 1400, speed: 240 },
        ]
    },
    2: {
        name: "Level 2",
        cellSize: 60,
        grid: [
            "############",
            "#S........F#",
            "#.###..##..#",
            "#....##....#",
            "#.##....##.#",
            "#..##..##..#",
            "#....##....#",
            "############",
        ],
        lasers: [
            { row: 0, col: 1, dir: "down", interval: 1400, speed: 230 },
            { row: 6, col: 11, dir: "left", interval: 1500, speed: 230 },
        ],
    },
    3: {
        name: "Level 3",
        cellSize: 58,
        grid: [
            "#############",
            "#S..........#",
            "#.###...##..#",
            "#....##.....#",
            "#.##.....##.#",
            "#..##...##..#",
            "#....###....#",
            "#..##...##..#",
            "#..........F#",
            "#############",
        ],
        lasers: [
            { row: 0, col: 1, dir: "down", interval: 1300, speed: 240 },
            { row: 0, col: 11, dir: "down", interval: 1500, speed: 240 },
            { row: 3, col: 12, dir: "left", interval: 1400, speed: 250 },
        ],
    },
    4: {
        name: "Level 4",
        cellSize: 54,
        grid: [
            "##############",
            "#S...........#",
            "#.####....##.#",
            "#....#..#....#",
            "#.##.#..#.##.#",
            "#.##....#.##.#",
            "#....#..#....#",
            "#.##....#.##.#",
            "#....#..#....#",
            "#...........F#",
            "##############",
        ],
        lasers: [
            { row: 0, col: 1, dir: "down", interval: 1300, speed: 240 },
            { row: 0, col: 12, dir: "down", interval: 1500, speed: 240 },
            { row: 5, col: 8, dir: "left", interval: 1200, speed: 260 },
        ],
    },
    5: {
        name: "Level 5",
        cellSize: 48,
        grid: [
            "###############",
            "#S............#",
            "#.####...###..#",
            "#....#...#....#",
            "#.##.#.#.#.##.#",
            "#.##...#...##.#",
            "#....#...#....#",
            "#.##.#.#.#.##.#",
            "#.##...#...##.#",
            "#....#...#....#",
            "#............F#",
            "###############",
        ],
        lasers: [
            { row: 0, col: 1, dir: "down", interval: 1200, speed: 250 },
            { row: 0, col: 13, dir: "down", interval: 1300, speed: 250 },
            { row: 3, col: 14, dir: "left", interval: 1400, speed: 260 },
            { row: 6, col: 0, dir: "right", interval: 1500, speed: 260 },
        ],
    },
};
const LEVEL_COUNT = Object.keys(LEVELS).length;
function getLevel(id) {
    const level = LEVELS[id];
    if (!level) throw new Error(`Level ${id} not found`);
    return level;
}

//  ___                                       
// |   |  .-----.----.-----.-----.----.-----.
// |.  |  |  _  |  __|  _  |  -__|  -__|__ --|
// |.  |__|   __|____|___  |_____|_____|_____|
// |:  1   |__|      |_____|                  
// |::.. . |                                  
// `-------'                                  
const PROGRESS_KEY = "twistedWorld_unlockedLevel";
const Progress = {
    get() {
        const stored = parseInt(localStorage.getItem(PROGRESS_KEY), 10);
        if (Number.isFinite(stored) && stored >= 1) return stored;
        return 1;
    },
    unlock(levelId) {
        const capped = Math.min(levelId, LEVEL_COUNT);
        if (capped > this.get()) {
            localStorage.setItem(PROGRESS_KEY, String(capped));
        }
    },
    isUnlocked(levelId) {
        return levelId <= this.get();
    },
};
