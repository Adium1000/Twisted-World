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
        ],
    },
};

function getLevel(id) {
    const level = LEVELS[id];
    if (!level) throw new Error(`Level ${id} not found`);
    return level;
}
