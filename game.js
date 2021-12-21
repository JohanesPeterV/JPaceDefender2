let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

let window_height = window.innerHeight;
let window_width = window.innerWidth;

canvas.width = window_width;
canvas.height = window_height;

canvas.style.background = "#121212";

const POP_PATH = "./assets/pop.mp3";
const IN_PATH = "./assets/in.mp3";
const SHOOT_PATH = "./assets/shoot.mp3";
const WALL_PATH = "./assets/wall.mp3";
const BG_PATH = './assets/bgMusic.mp3';
const RELOAD_PATH = './assets/reload.mp3';


const BUBBLE_RADIUS = (window_width > 900 ? window_width / 80 : window_width / 50);
const ROW_LEN = 8;
const COL_LEN = (window_width > 900 ? 38 : 24);

class Bubble {
    static colors = [
        "#355070",
        "#6d597a",
        "#e56b6f",
        "#eaac8b",
    ];

    constructor(x, y, radius, popPath) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.popPath = popPath;
        this.color = Bubble.colors[Math.floor(Math.random() * 4)];
        this.visited = false;

    }

    playPop = (volume) => {
        let shootDoc = document.createElement("audio");
        shootDoc.src = this.popPath;
        shootDoc.setAttribute("preload", "auto");
        shootDoc.setAttribute("controls", "none");
        shootDoc.style.display = "none";
        shootDoc.volume = volume;
        document.body.appendChild(shootDoc);
        shootDoc.play();
    };

    render(context) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
    }
}


class SimulatorBubble extends Bubble {
    constructor(x, y, radius, popPath, dy, dx) {
        super(x, y, radius, popPath);
        this.dy = dy;
        this.dx = dx;
        this.radius = this.radius;
        this.notedPost = [];
        this.noteCurrPos();
    }

    noteCurrPos() {

        this.notedPost.push({x: this.x, y: this.y});
    }

    update() {
        this.x += this.dx;
        this.y += this.dy;

        if (this.x + this.radius > window_width) {
            this.x = window_width - this.radius;
            this.dx = this.dx * -1;
            this.noteCurrPos();
        }
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.dx = this.dx * -1;
            this.noteCurrPos();
        }
        if (this.y - this.radius <= 0) {
            this.noteCurrPos();
            return true;
        }
        return false;
    }

}

class FallingBubble extends Bubble {
    constructor(bubble, gravity) {
        super(bubble.x, bubble.y, bubble.radius, bubble.popPath);
        this.gravity = gravity;
        this.fallSpeed = 0;
        this.color = bubble.color;
    }

    update() {
        this.fallSpeed += this.gravity;
        this.y += this.fallSpeed;
        return this.y + this.radius > window_height;
    }


}


class ParticleBubble extends Bubble {
    constructor(x, y, radius, popPath, dx, dy, color) {
        super(x, y, radius, popPath);
        this.visited = false;
        this.dx = dx;
        this.dy = dy;
        this.color = color;
        this.alpha = 1;
    }

    render(context) {
        context.save();
        context.globalAlpha = this.alpha;
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        context.fillStyle = this.color;
        context.fill();
        context.closePath();
        context.restore();
    }

    update() {

        this.alpha -= 0.03;
        this.x += this.dx;
        this.y += this.dy;
        this.dy = this.dy * 0.8;
        this.dx = this.dx * 0.8;
        return this.alpha > 0;
    }

}

const WILD_COLOR = '#8c0000'

class BubbleProjectile extends Bubble {
    constructor(x, y, radius, popPath, wallPath, inPath, wild) {
        super(x, y, radius, popPath);
        if (wild) this.color = WILD_COLOR;
        this.wallPath = wallPath;
        this.inPath = inPath;
        this.visited = false;
        this.playCollision = (volume) => {
            let shootDoc = document.createElement("audio");
            shootDoc.src = this.wallPath;
            shootDoc.setAttribute("preload", "auto");
            shootDoc.setAttribute("controls", "none");
            shootDoc.style.display = "none";
            shootDoc.volume = volume;
            document.body.appendChild(shootDoc);
            shootDoc.play();

        };
        this.playIn = (volume) => {
            let shootDoc = document.createElement("audio");
            shootDoc.src = this.inPath;
            shootDoc.setAttribute("preload", "auto");
            shootDoc.setAttribute("controls", "none");
            shootDoc.style.display = "none";
            shootDoc.volume = volume;
            document.body.appendChild(shootDoc);
            shootDoc.play();
        };
    }


    update() {
        this.x += this.dx;
        this.y += this.dy;
        if (this.x + this.radius > window_width) {
            this.x = window_width - this.radius;
            this.dx = this.dx * -1;
            this.playCollision(1);
        }
        if (this.x - this.radius <= 0) {
            this.x = this.radius;
            this.dx = this.dx * -1;
            this.playCollision(1);
        }
        if (this.y - this.radius <= 0) {
            return true;
        }
        return false;
    }
}

let popup = document.getElementById('popup-page');
let scoreDiv = document.getElementById('score-div');
let comboDiv = document.getElementById('combo-div');

class GameManager {
    static flag = false;

    constructor(bubbleWidth, bubbleHeight, columnLength, rowLength) {
        this.bubbleWidth = bubbleWidth;
        this.bubbleHeight = bubbleHeight;
        this.columnLength = columnLength;
        this.rowLength = rowLength;
        this.xStart = window_width / 2 - ((columnLength * bubbleWidth) / 2) + bubbleWidth / 4;
        this.yStart = bubbleHeight / 2;
        this.initBubbles();

        this.currPlayer = new JPaceDefender(
            window_width / 2,
            window_height,
            window_width / 30,
            "#C8E6C9",
            11,
            SHOOT_PATH
        );
        this.offSet = 0;
        this.point = 0;
        this.floodFlag = 0;
        this.fallingBubbles = [];
        this.time = 0;
        this.combo = 0;
        this.maxCombo = 0;

        this.particleBubbles = [];

        this.pointTxt = document.getElementById('point-value');
        this.maxComboTxt = document.getElementById('combo-value');
        this.timeTxt = document.getElementById('time-value');
        this.currComboTxt = document.getElementById('curr-combo-value');
        this.multiplierTxt = document.getElementById('multiplier-value');
        this.wildTxt = document.getElementById('wild-value');

        this.pointScore = document.getElementById('point-score');
        this.comboScore = document.getElementById('combo-score');
        this.timeScore = document.getElementById('time-score');
        this.hasStarted = false;
    }

    startGame() {
        let thisManager = this;
        let timerFunction = function () {
            if (thisManager.time++ % Math.floor((COL_LEN / 3)) === 0) thisManager.addBubbles();
            if (thisManager.time % 2) thisManager.currPlayer.wildAmmo++;
        };
        setInterval(timerFunction, 1000);
        this.hasStarted = true;
        this.currPlayer.steadyUp();
    }

    setInfoValues() {
        this.pointTxt.textContent = this.point;
        this.maxComboTxt.textContent = this.maxCombo;
        this.timeTxt.textContent = this.time;
        this.currComboTxt.textContent = this.combo;
        this.multiplierTxt.textContent = this.getMultiplier().toString();
        this.wildTxt.textContent = this.currPlayer.wildAmmo;
    }

    playBg() {
        if (GameManager.flag) return;
        GameManager.flag = true;
        let bgMusic = document.createElement("audio");
        bgMusic.src = BG_PATH;
        bgMusic.setAttribute("preload", "auto");
        bgMusic.setAttribute("controls", "none");
        bgMusic.style.display = "none";
        bgMusic.id = "bg-music";
        document.body.appendChild(bgMusic);
        document.getElementById("bg-music").volume = 0.3;
        document.getElementById("bg-music").loop = true;

        bgMusic.play();

    }

    lastRowEmpty() {
        let empty = true;
        for (let i = 0; i < this.columnLength; i++) {
            empty = empty && !this.bubbles[i][this.rowLength];
        }
        return empty;
    }

    addBubbles() {
        this.offSet++;
        if (this.lastRowEmpty()) this.rowLength++;
        for (let i = 0; i < this.columnLength; i++) {
            let coordinate = this.getBubbleCoordinate(i, this.rowLength);
            this.bubbles[i].unshift(new Bubble(
                coordinate.x,
                coordinate.y,
                BUBBLE_RADIUS,
                POP_PATH
                )
            );
        }
    }

    initBubbles() {
        this.bubbles = [];
        for (let i = 0; i < this.columnLength; i++) {
            this.bubbles.push([]);
            for (let t = 0; t < this.rowLength; t++) {
                let coordinate = this.getBubbleCoordinate(i, t);
                this.bubbles[i][t] = new Bubble(
                    coordinate.x,
                    coordinate.y,
                    BUBBLE_RADIUS,
                    POP_PATH
                );
            }
        }
    }

    getBubbleCoordinate(column, row) {
        let bubbleX = this.xStart + column * this.bubbleWidth;
        if ((row + this.offSet) % 2) {
            bubbleX += this.bubbleWidth / 2;
        }
        let bubbleY = row * (this.bubbleHeight - this.bubbleHeight / 9) + this.yStart;
        return {x: bubbleX, y: bubbleY};
    }

    getGridPosition(x, y) {
        let gridY = Math.floor((y - this.yStart) / (this.bubbleHeight - this.bubbleHeight / 9));
        let xOffset = 0;
        if ((gridY + this.offSet) % 2) {
            xOffset = this.bubbleWidth / 2;
        }
        let gridx = Math.floor(((x - xOffset) - this.xStart) / this.bubbleWidth);

        return {x: gridx, y: gridY};
    }

    isValid(x, y) {

        return (x < this.columnLength && x >= 0 && y >= 0);
    }

    wildFloodFill(x, y) {
        if (this.isValid(x, y) === false) return;
        let currBubble = this.bubbles[x][y];
        if (currBubble === undefined || !currBubble || currBubble.visited) return;

        currBubble.visited = true;
        this.floodFlag = 3;

        this.wildFill(x - 1, y);
        this.wildFill(x + 1, y);
        if ((y + this.offSet) % 2) {
            this.wildFill(x, y - 1);
            this.wildFill(x + 1, y - 1);
            this.wildFill(x, y + 1);
            this.wildFill(x + 1, y + 1);
        } else {
            this.wildFill(x, y - 1);
            this.wildFill(x - 1, y - 1);
            this.wildFill(x, y + 1);
            this.wildFill(x - 1, y + 1);
        }
        // currBubble.visited=false;
        this.floodFillPop.push({x: x, y: y});

    }

    wildFill(x, y) {
        if (this.isValid(x, y) === false) return;
        let currBubble = this.bubbles[x][y];
        if (currBubble === undefined || !currBubble || currBubble.visited) return;

        currBubble.visited = true;
        this.floodFlag = 3;

        this.floodFill(x - 1, y, currBubble.color);
        this.floodFill(x + 1, y, currBubble.color);
        if (this.isOdd(y)) {
            this.floodFill(x, y - 1, currBubble.color);
            this.floodFill(x + 1, y - 1, currBubble.color);
            this.floodFill(x, y + 1, currBubble.color);
            this.floodFill(x + 1, y + 1, currBubble.color);
        } else {
            this.floodFill(x, y - 1, currBubble.color);
            this.floodFill(x - 1, y - 1, currBubble.color);
            this.floodFill(x, y + 1, currBubble.color);
            this.floodFill(x - 1, y + 1, currBubble.color);
        }
        // currBubble.visited=false;
        this.floodFillPop.push({x: x, y: y});

    }


    floodFill(x, y, color) {
        //beda ganjil/genap beda arah floodFillnya
        if (this.isValid(x, y) === false) return;
        let currBubble = this.bubbles[x][y];
        if (!currBubble || currBubble.visited) return;
        if (currBubble.color !== color) {
            this.floodFillRemnants.push({x: x, y: y});
            return;
        }
        currBubble.visited = true;
        this.floodFlag++;
        this.floodFill(x - 1, y, color);
        this.floodFill(x + 1, y, color);
        if ((y + this.offSet) % 2) {
            this.floodFill(x, y - 1, color);
            this.floodFill(x + 1, y - 1, color);
            this.floodFill(x, y + 1, color);
            this.floodFill(x + 1, y + 1, color);
        } else {
            this.floodFill(x, y - 1, color);
            this.floodFill(x - 1, y - 1, color);
            this.floodFill(x, y + 1, color);
            this.floodFill(x - 1, y + 1, color);
        }
        // currBubble.visited=false;
        this.floodFillPop.push({x: x, y: y});

    }

    topFloodFill(x, y) {

        if (this.isValid(x, y) === false) return false;
        let currBubble = this.bubbles[x][y];
        if (currBubble === undefined || !currBubble || currBubble.visited) return false;
        currBubble.visited = true;
        this.floodFillPop.push({x: x, y: y});

        if ((y + this.offSet) % 2) {
            return (this.topFloodFill(x, y - 1) ||
                this.topFloodFill(x + 1, y - 1) ||
                this.topFloodFill(x, y + 1) ||
                this.topFloodFill(x + 1, y + 1) ||
                this.topFloodFill(x - 1, y) ||
                this.topFloodFill(x + 1, y) || y === 0);
        } else {
            return (this.topFloodFill(x, y - 1) ||
                this.topFloodFill(x - 1, y - 1) ||
                this.topFloodFill(x, y + 1) ||
                this.topFloodFill(x - 1, y + 1) ||
                this.topFloodFill(x - 1, y) ||
                this.topFloodFill(x + 1, y) || y === 0);
        }
        return false;

    }

    popFloodFill() {
        for (let i = 0; i < this.floodFillPop.length; i++) {
            let currPop = this.bubbles[this.floodFillPop[i].x][this.floodFillPop[i].y];

            if (!currPop) continue;
            let currX = this.floodFillPop[i].x;
            let currY = this.floodFillPop[i].y;
            let coordinate = this.getBubbleCoordinate(currX, currY);
            this.createPopBubbleParticles(coordinate.x, coordinate.y, currPop.color);
            currPop.playPop(0.6);
            this.bubbles[currX][currY] = null;
        }
    }

    cleanFloodFill() {
        for (let i = 0; i < this.floodFillPop.length; i++) {
            if (this.bubbles[this.floodFillPop[i].x][this.floodFillPop[i].y])
                this.bubbles[this.floodFillPop[i].x][this.floodFillPop[i].y].visited = false;
        }
        for (let i = 0; i < this.floodFillRemnants.length; i++) {
            if (this.bubbles[this.floodFillRemnants[i].x][this.floodFillRemnants[i].y])
                this.bubbles[this.floodFillRemnants[i].x][this.floodFillRemnants[i].y].visited = false;
        }
    }

    clearFloodFillCache() {
        this.floodFlag = 0;
        this.floodFillPop = [];
    }

    render(context) {
        this.currPlayer.render(context);
        for (let j = 0; j < this.rowLength; j++) {
            for (let i = 0; i < this.columnLength; i++) {
                let bubble = this.bubbles[i][j];
                if (!bubble) continue;
                let coord = this.getBubbleCoordinate(i, j);
                bubble.y = coord.y;
                bubble.x = coord.x;
                bubble.render(context);
            }
        }
        this.renderBubbleParticles(context);

        this.renderFallingBubbles(context);
    }

    update() {
        if (this.rowLength * (this.bubbleHeight - this.bubbleHeight / 9) - this.yStart > window_height) {
            this.hasLost = true;
            popup.style.display = 'flex';
            scoreDiv.style.display = 'none';
            comboDiv.style.display = 'none';
            this.pointScore.textContent = this.point;
            this.comboScore.textContent = this.maxCombo;
            this.timeScore.textContent = this.time;
            return;

        }

        let updates = this.currPlayer.update();
        let tempLen = updates.length;
        for (let i = 0; i < tempLen; i++) {
            if (updates[i]) {
                this.snapBubble(i);
            }
        }
        this.updateFallingBubbles();
        this.updateBubbleParticles();
        let currPredictionBubble = this.currPlayer.predictionBubble;
        if (currPredictionBubble) {
            let deadEnd = false;
            for (let t = 0; currPredictionBubble.notedPost.length < 5 && t < 100 && !deadEnd; t++) {
                currPredictionBubble.update();
                for (let i = 0; i < this.columnLength; i++) {
                    for (let j = 0; j < this.rowLength; j++) {
                        let currBubble = this.bubbles[i][j];
                        if (!currBubble) {
                            continue;
                        }
                        let coordinate = this.getBubbleCoordinate(i, j);
                        let halfWidth = this.bubbleWidth / 2;
                        let halfHeight = this.bubbleHeight / 2;
                        if (this.circleIntersection(
                            currPredictionBubble.x + halfWidth,
                            currPredictionBubble.y + halfHeight,
                            halfWidth,
                            coordinate.x + halfWidth,
                            coordinate.y + halfHeight,
                            halfWidth
                        )) {
                            currPredictionBubble.noteCurrPos();
                            deadEnd = true;
                        }
                    }
                }
            }
        }
        if (this.currPlayer.projectiles.length > 0) {
            for (let i = 0; i < this.columnLength; i++) {
                for (let j = 0; j < this.rowLength; j++) {
                    let currBubble = this.bubbles[i][j];
                    if (!currBubble) {
                        continue;
                    }
                    let coordinate = this.getBubbleCoordinate(i, j);
                    let halfWidth = this.bubbleWidth / 2;
                    let halfHeight = this.bubbleHeight / 2;
                    let currLen = this.currPlayer.projectiles.length;
                    for (let p = 0; p < currLen; p++) {
                        if (this.circleIntersection(
                            this.currPlayer.projectiles[p].x + halfWidth,
                            this.currPlayer.projectiles[p].y + halfHeight,
                            halfWidth,
                            coordinate.x + halfWidth,
                            coordinate.y + halfHeight,
                            halfWidth
                        )) {
                            this.snapBubble(p);
                            break;
                        }
                    }
                }
            }
        }
        this.setInfoValues();
    }

    renderFallingBubbles(context) {
        for (let i = 0; i < this.fallingBubbles.length; i++) {
            this.fallingBubbles[i].render(context);
        }
    }

    updateFallingBubbles() {
        let fallen;
        for (let i = 0; i < this.fallingBubbles.length; i++) {
            if (this.fallingBubbles[i].update()) {
                this.createPopBubbleParticles(this.fallingBubbles[i].x, this.fallingBubbles[i].y, this.fallingBubbles[i].color);
                this.fallingBubbles[i].playPop(0.6);

                this.point += 0.2 * this.getMultiplier();
                this.fallingBubbles.splice(i, 1);
                i--;
            }
        }

    }

    getMultiplier() {
        let multi = (1 + Math.floor((this.combo / 5)));
        return (multi > 5 ? 5 : multi);
    }

    updateBubbleParticles() {
        for (let i = 0; i < this.particleBubbles.length; i++) {
            if (!this.particleBubbles[i].update()) {
                this.particleBubbles.splice(i, 1);
                i--;
            }
        }
    }

    renderBubbleParticles(context) {
        for (let i = 0; i < this.particleBubbles.length; i++) {
            this.particleBubbles[i].render(context);
        }
    }

    createPopBubbleParticles(x, y, color) {
        let loopLen = BUBBLE_RADIUS * 2;
        for (let i = 0; i < loopLen; i++) {
            this.particleBubbles.push(new ParticleBubble(x, y, Math.random() * 2, POP_PATH, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, color));
        }
    }

    circleIntersection(x1, y1, r1, x2, y2, r2) {
        let dx = x1 - x2;
        let dy = y1 - y2;
        let len = Math.sqrt(dx * dx + dy * dy);

        if (len < r1 + r2) {
            return true;
        }
        return false;
    }

    snapBubble(i) {
        this.currPlayer.projectiles[i].playIn(0.2);
        var centerX = this.currPlayer.projectiles[i].x + this.bubbleWidth / 2;
        var centerY = this.currPlayer.projectiles[i].y + this.bubbleHeight / 2;
        var gridPosition = this.getGridPosition(centerX, centerY);

        if (gridPosition.x < 0) {
            gridPosition.x = 0;
        }
        if (gridPosition.x >= this.columnLength) {
            gridPosition.x = this.columnLength - 1;
        }
        if (gridPosition.y < 0) {
            gridPosition.y = 0;
        }
        if (gridPosition.y >= this.rowLength) {
            gridPosition.y = this.rowLength - 1;
        }
        let addTile = false;

        if (this.bubbles[gridPosition.x][gridPosition.y]) {
            for (let newRow = gridPosition.y + 1; newRow <= this.rowLength; newRow++) {
                if (!this.bubbles[gridPosition.x][newRow]) {
                    gridPosition.y = newRow;
                    addTile = true;
                    break;
                } else {
                    if (x < this.columnLength && !this.bubbles[gridPosition.x + 1][newRow]) {
                        gridPosition.y = newRow;
                        gridPosition += 1;
                        addTile = true;
                        break;

                    } else if (x >= 0 && !this.bubbles[gridPosition.x - 1][newRow]) {
                        gridPosition.y = newRow;
                        gridPosition -= 1;
                        addTile = true;
                        break;

                    }
                }
            }
        } else {
            addTile = true;
        }
        if (addTile) {
            if (gridPosition.y >= this.rowLength) {
                this.rowLength++;
            }
            this.currPlayer.projectiles[i].dx = 0;
            this.currPlayer.projectiles[i].dy = 0;
            this.bubbles[gridPosition.x][gridPosition.y] = this.currPlayer.projectiles[i];
            this.currPlayer.projectiles.splice(i, 1);
            this.floodFlag = 0;
            this.floodFillRemnants = [];
            this.floodFillPop = [];
            if (this.bubbles[gridPosition.x][gridPosition.y].color === WILD_COLOR) {

                this.wildFloodFill(gridPosition.x, gridPosition.y);
            } else {
                this.floodFill(gridPosition.x, gridPosition.y, this.bubbles[gridPosition.x][gridPosition.y].color);
            }

            if (this.floodFlag > 2) {
                this.point += this.floodFlag * this.getMultiplier();
                this.popFloodFill();
                this.cleanFloodFill();
                this.checkRemnants();
                this.clearFloodFillCache();
                if (++this.combo > this.maxCombo) {
                    this.maxCombo = this.combo;
                }
            } else {
                this.cleanFloodFill();
                this.clearFloodFillCache();

                this.combo = 0;
            }

        }
    }

    isOdd(y) {
        return ((y + this.offSet) % 2 === 1);
    }


    checkRemnants() {
        let left = 0;
        let right = 0;

        for (let i = 0; i < this.floodFillRemnants.length; i++) {
            let currRemnant = this.floodFillRemnants[i];
            let x = currRemnant.x;
            let y = currRemnant.y;

            if (!this.bubbles[x][y]) continue;
            if (y <= 0) continue;

            let hasUpperParent = false;


            if (this.topFloodFill(x, y)) {
                hasUpperParent = true;

                this.cleanFloodFill();
                this.clearFloodFillCache();

                continue;
            }
            this.cleanFloodFill();
            this.clearFloodFillCache();


            if (hasUpperParent === false) {

                this.floodFall(x, y);
            }
        }

    }

    floodFall(x, y) {
        if (this.bubbles[x] === undefined) return;
        let currBubble = this.bubbles[x][y];
        if (currBubble === undefined || !currBubble || currBubble.visited) return;
        currBubble.visited = true;
        if (this.isOdd(y)) {
            this.floodFall(x, y - 1);
            this.floodFall(x + 1, y - 1);
            this.floodFall(x, y + 1);
            this.floodFall(x + 1, y + 1);
        } else {
            this.floodFall(x, y - 1);
            this.floodFall(x - 1, y - 1);
            this.floodFall(x, y + 1);
            this.floodFall(x - 1, y + 1);
        }
        this.floodFall(x - 1, y);
        this.floodFall(x + 1, y);
        this.fallingBubbles.push(new FallingBubble(currBubble, 2));
        this.bubbles[x][y] = null;
    }
}

class JPaceDefender {

    constructor(x, y, radius, color, speed, shootSound) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
        this.hasLost = false;
        this.trajectoryCircles = [];
        this.shootSound = shootSound;
        this.prepareNextProjectile();
        this.projectiles = [];
        this.wildAmmo = 3;

        this.playShoot = (volume) => {
            let shootDoc = document.createElement("audio");
            shootDoc.src = this.shootSound;
            shootDoc.setAttribute("preload", "auto");
            shootDoc.setAttribute("controls", "none");
            shootDoc.style.display = "none";
            shootDoc.volume = volume;
            document.body.appendChild(shootDoc);
            shootDoc.play();
        };
        this.playReload = (volume) => {
            let shootDoc = document.createElement("audio");
            shootDoc.src = RELOAD_PATH
            shootDoc.setAttribute("preload", "auto");
            shootDoc.setAttribute("controls", "none");
            shootDoc.style.display = "none";
            shootDoc.volume = volume;
            document.body.appendChild(shootDoc);
            shootDoc.play();
        };
        this.angle = Math.atan2(20, 30);
        let getMousePos = (e) => {
            var rect = canvas.getBoundingClientRect();
            return {
                x: Math.round((e.clientX - rect.left) / (rect.right - rect.left) * canvas.width),
                y: Math.round((e.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height)
            };
        }
        let radToDeg = (angle) => {
            return angle * (180 / Math.PI);
        }

        const velocity = {
            x: Math.cos(this.angle) * 50,
            y: Math.sin(this.angle) * 50,
        };
        this.predictionBubble = new SimulatorBubble(this.x, this.y, BUBBLE_RADIUS, POP_PATH, velocity.y, velocity.x)
        this.steady = false;
    }

    moveAngle() {
        if (!this.e) return;
        let angle = Math.atan2(this.e.clientY - this.y, this.e.clientX - this.x);
        this.angle = angle;
    }


    steadyUp() {
        window.onmousemove = (e) => {
            this.e = e;
            this.moveAngle();
        }

        window.onclick = (e) => {
            const angle = Math.atan2(e.clientY - this.y, e.clientX - this.x);
            const velocity = {
                x: Math.cos(angle) * 32,
                y: Math.sin(angle) * 32,
            };
            this.playShoot(0.6);
            let bubbleProjectile = this.nextProjectile;
            bubbleProjectile.dy = velocity.y;
            bubbleProjectile.dx = velocity.x;
            bubbleProjectile.x = this.x;
            bubbleProjectile.y = this.y;
            this.projectiles.push(bubbleProjectile);
            this.prepareNextProjectile();
        };

        window.onkeydown = (e) => {
            switch (e.key) {
                case 'a':
                    this.left = true;
                    break;
                case 'd':
                    this.right = true;
                    break;
            }
        };
        window.onkeypress = (e) => {
            switch (e.key) {
                case 'r':
                    this.prepareNextProjectile();
                    this.playReload(0.6);
                    break;
                case 'f':
                    this.prepareWildProjectile();
                    this.playReload(0.6);
                    break;
            }
        }
        window.onkeyup = (e) => {
            switch (e.key) {
                case 'a':
                    this.left = false;
                    moveAngle();
                    break;
                case 'd':
                    this.right = false;
                    moveAngle();
                    break;

            }
        };
    }

    initPredictionBubble() {
        const velocity = {
            x: Math.cos(this.angle) * 50,
            y: Math.sin(this.angle) * 50,
        };
        this.predictionBubble = new SimulatorBubble(this.x, this.y, BUBBLE_RADIUS, POP_PATH, velocity.y, velocity.x)

    }

    getPredictionPoints() {

        let centerX = this.x;
        let centerY = this.y;
        const vx = Math.cos(angle) * 16;
        const vy = Math.sin(angle) * 16;


    }

    renderTrajectory(context) {
        if (!this.predictionBubble) return;

        context.lineWidth = 2;
        context.strokeStyle = this.color;
        context.beginPath();

        let notes = this.predictionBubble.notedPost;
        context.moveTo(notes[0].x, notes[0].y);

        for (let i = 1; i < notes.length; i++) {
            context.lineTo(notes[i].x, notes[i].y);

        }
        context.stroke();

        context.closePath();

    }

    prepareNextProjectile() {
        this.nextProjectile = new BubbleProjectile(
            this.x,
            this.y,
            BUBBLE_RADIUS,
            POP_PATH,
            WALL_PATH,
            IN_PATH,
            false
        );
        this.color = this.nextProjectile.color;

    }

    prepareWildProjectile() {
        if (this.wildAmmo <= 0) return;
        this.wildAmmo--;
        this.nextProjectile = new BubbleProjectile(
            this.x,
            this.y,
            BUBBLE_RADIUS,
            POP_PATH,
            WALL_PATH,
            IN_PATH,
            true
        );
        this.color = this.nextProjectile.color;

    }

    update() {
        this.updatePosition();
        this.initPredictionBubble();
        return this.updateProjectiles();
    }

    updateProjectiles() {
        let temp = [];
        for (let i = 0; i < this.projectiles.length; i++) {
            temp.push(this.projectiles[i].update());
            if (
                this.projectiles[i].y - this.projectiles[i].radius >
                window_height
            ) {
                this.projectiles.splice(i, 1);
            }
        }
        return temp;
    }

    updatePosition() {
        // if (this.bubbleProjectile) return;
        if (this.left && this.x - this.radius > 0) {
            this.x -= this.speed;
            this.moveAngle();
        }
        if (this.right && this.x + this.radius < window_width) {
            this.x += this.speed;
            this.moveAngle();
        }
    }

    render(context) {

        context.beginPath();
        context.fillStyle = this.color;
        context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
        context.fill();
        context.closePath();

        this.renderTrajectory(context);
        this.renderProjectiles(context);
    }


    renderProjectiles(context) {
        for (let i = 0; i < this.projectiles.length; i++) {
            this.projectiles[i].render(context);
        }
    }
}

let fpsInterval, startTime, now, then, elapsed;


function startFps(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime = then;
    animate();
}

let currManager = new GameManager(
    BUBBLE_RADIUS * 2,
    BUBBLE_RADIUS * 2,
    COL_LEN,
    ROW_LEN
);
const animate = () => {
    if (currManager.hasLost) return;
    requestAnimationFrame(animate);
    now = Date.now();
    elapsed = now - then;
    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);
        window_width = window.innerWidth;
        window_height = window.innerHeight;

        ctx.fillStyle = "rgba(0,0, 0,0.25)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        currManager.render(ctx);
        currManager.update();
    }
};

startFps(60);


let playAgainBtn = document.getElementById('play-again');
popup.style.display = 'flex';
comboDiv.style.display = 'none';
scoreDiv.style.display = 'none';


let firstGame = true;
playAgainBtn.addEventListener('click', () => {
    if (currManager.hasStarted) currManager = new GameManager(
        BUBBLE_RADIUS * 2,
        BUBBLE_RADIUS * 2,
        COL_LEN,
        ROW_LEN
    );

    setTimeout(function () {
        currManager.startGame();
        if (firstGame) {
            currManager.playBg();
        }
        popup.style.display = 'none';
        comboDiv.style.display = 'block';
        scoreDiv.style.display = 'block';
        startFps(60);


    }, 100)
})

