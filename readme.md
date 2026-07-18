![Logo](.github/Devlogging/logo.png)

Twisted World is a one-key puzzle platformer where gravity is your only tool. Rotate the world, avoid obstacles, and guide the ball to the finish
`Not compatible with Phones or small screens`

![How to play](.github/Devlogging/1.png)

This is the most detailed guide for my game (For sure you can skip this)

### Welcome to Twisted World! 

In this game you objective is to guide the Ball in the Finnish Portal

REFERANCE BALL: ![ball](.github/ball.png)

REFERANCE PORTAL: ![portal](.github/portal.png)

---

1. Lobby

To play any level first click on the play button, then the level picker will show, from here you can choose the levels

img

! The grayed levels are locked because you need to pass the biggest number of non-grayed level first

2. Settings

More like setting :3
From here you can change the sfx volume

3. In Game gameplay

Here is the fun part, the ball itself can't move, instead you move the platformer by pressing any key

Short Press - Rotate to right 
Long Press - Rotate to left

---


![LevelCreator](.github/Devlogging/2.png)

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


![PrivacyPolicy](.github/Devlogging/3.png)

Read `PrivacyPolicy.md` from the `/` 

![Credits](.github/Devlogging/4.png)

1. [patorjk](https://patorjk.com/software/taag/#p=display&f=Cricket)
2. [flamingtext](https://www.flamingtext.com/)