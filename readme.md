![Logo](.github/Devlogging/logo.png)

Twisted World is a one-key puzzle platformer where gravity is your only tool. Rotate the world, avoid obstacles, and guide the ball to the finish
`Not compatible with Phones or small screens`

# How to Play





# Level Creator

To create your own levels:
1. Clone this repo
2. Go in the `Levels.js`
3. Here you will find levels listed like so 
``` JAVA SCRIPT
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

```

Now here is a list of all this characters mean

| Symbol | Description |
|--------|-------------|
| #      | Solid platform / wall tile |
| .      | Empty space |
| S      | Spawn point (exactly one per level) |
| F      | Finish point (exactly one per level) |


Notice:
All rows must be the same length (a rectangle). The play area is always rendered as a square, sized by (columns * cellSize) and(rows * cellSize), so keep the grid square (equal rows/cols) for the cleanest presentation.
To add a new level, just add another entry to LEVELS below and call Game.start(<id>)


# Privacy Policy

Read `PrivacyPolicy.md` from the `/` 


# Credits