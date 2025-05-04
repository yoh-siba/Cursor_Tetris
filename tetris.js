const canvas = document.getElementById("tetris");
const context = canvas.getContext("2d");
const scoreElement = document.getElementById("score");
const levelElement = document.getElementById("level");
const startButton = document.getElementById("startButton");

context.scale(30, 30);

const colors = [
  null,
  "#FF0D72",
  "#0DC2FF",
  "#0DFF72",
  "#F538FF",
  "#FF8E0D",
  "#FFE138",
  "#3877FF",
];

const pieces = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  [
    [4, 4],
    [4, 4],
  ],
  [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
];

let score = 0;
let level = 1;
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let gameOver = false;
let isGameStarted = false;
let lockDelay = 0;
const LOCK_DELAY_TIME = 500;
let flashingRows = [];
let flashCounter = 0;
const FLASH_DURATION = 500;
const FLASH_INTERVAL = 100;

const arena = createMatrix(10, 20);
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
};

function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
  arenaSweep();
}

function rotate(matrix) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  matrix.reverse();

  let offset = 1;
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(matrix);
      rotate(matrix);
      rotate(matrix);
      player.pos.x = Math.floor(
        (arena[0].length - player.matrix[0].length) / 2
      );
      return;
    }
  }
  lockDelay = 0;
}

function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    lockDelay += 16;
    if (lockDelay >= LOCK_DELAY_TIME) {
      merge(arena, player);
      playerReset();
      arenaSweep();
      updateScore();
      lockDelay = 0;
    }
  } else {
    lockDelay = 0;
  }
  dropCounter = 0;
}

function hardDrop() {
  while (!collide(arena, player)) {
    player.pos.y++;
  }
  player.pos.y--;
  merge(arena, player);
  playerReset();
  arenaSweep();
  updateScore();
  lockDelay = 0;
}

function playerMove(dir) {
  const newX = player.pos.x + dir;
  if (newX >= 0 && newX < arena[0].length) {
    const oldX = player.pos.x;
    player.pos.x = newX;
    if (collide(arena, player)) {
      player.pos.x = oldX;
    } else {
      lockDelay = 0;
    }
  }
}

function playerReset() {
  const pieces = "ILJOTSZ";
  player.matrix = createPiece(
    pieces[Math.floor(Math.random() * pieces.length)]
  );
  player.pos.y = 0;
  player.pos.x = Math.floor((arena[0].length - player.matrix[0].length) / 2);
  if (collide(arena, player)) {
    gameOver = true;
  }
}

function createPiece(type) {
  if (type === "I") return pieces[1];
  if (type === "L") return pieces[2];
  if (type === "J") return pieces[3];
  if (type === "O") return pieces[4];
  if (type === "T") return pieces[5];
  if (type === "S") return pieces[6];
  if (type === "Z") return pieces[7];
}

function arenaSweep() {
  let rowsCleared = 0;
  flashingRows = [];

  for (let y = arena.length - 1; y >= 0; y--) {
    let isRowFull = true;
    for (let x = 0; x < arena[y].length; x++) {
      if (arena[y][x] === 0) {
        isRowFull = false;
        break;
      }
    }

    if (isRowFull) {
      flashingRows.push(y);
      rowsCleared++;
    }
  }

  if (rowsCleared > 0) {
    flashCounter = 0;
    setTimeout(clearRows, FLASH_DURATION);
  }
}

function clearRows() {
  flashingRows.sort((a, b) => b - a);
  for (const y of flashingRows) {
    arena.splice(y, 1);
    arena.unshift(new Array(10).fill(0));
  }

  let points = 10;
  for (let i = 1; i < flashingRows.length; i++) {
    points *= 2;
  }
  player.score += points;
  updateScore();

  flashingRows = [];
}

function getDropPosition() {
  let dropY = player.pos.y;
  while (!collide(arena, { ...player, pos: { ...player.pos, y: dropY + 1 } })) {
    dropY++;
  }
  return dropY;
}

function updateScore() {
  scoreElement.textContent = player.score;
  level = Math.floor(player.score / 100) + 1;
  levelElement.textContent = level;
  dropInterval = 1000 - (level - 1) * 100;
  if (dropInterval < 100) dropInterval = 100;
}

function draw() {
  context.fillStyle = "#000";
  context.fillRect(0, 0, canvas.width, canvas.height);

  if (isGameStarted) {
    drawMatrix(arena, { x: 0, y: 0 });

    if (flashingRows.length > 0) {
      flashCounter += 16;
      const isVisible = Math.floor(flashCounter / FLASH_INTERVAL) % 2 === 0;
      if (isVisible) {
        context.globalAlpha = 1.0;
        for (const y of flashingRows) {
          for (let x = 0; x < arena[y].length; x++) {
            if (arena[y][x] !== 0) {
              context.fillStyle = "#FFFFFF";
              context.fillRect(x, y, 1, 1);
            }
          }
        }
      }
    }

    const dropY = getDropPosition();
    context.globalAlpha = 0.3;
    drawMatrix(player.matrix, { x: player.pos.x, y: dropY });
    context.globalAlpha = 1.0;
    drawMatrix(player.matrix, player.pos);
  }
}

function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

function startGame() {
  if (!isGameStarted) {
    isGameStarted = true;
    startButton.style.display = "none";
    playerReset();
    update();
  }
}

startButton.addEventListener("click", startGame);

function update(time = 0) {
  if (!isGameStarted) return;
  if (gameOver) {
    context.fillStyle = "white";
    context.font = "1px Arial";
    context.fillText("GAME OVER", 5, 5);
    return;
  }

  const deltaTime = time - lastTime;
  lastTime = time;
  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }
  draw();
  requestAnimationFrame(update);
}

document.addEventListener("keydown", (event) => {
  if (!isGameStarted) return;
  if (gameOver) return;

  if (event.keyCode === 37) {
    playerMove(-1);
  } else if (event.keyCode === 39) {
    playerMove(1);
  } else if (event.keyCode === 40) {
    playerDrop();
  } else if (event.keyCode === 32) {
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix);
    while (collide(arena, player)) {
      player.pos.x += offset;
      offset = -(offset + (offset > 0 ? 1 : -1));
      if (offset > player.matrix[0].length) {
        rotate(player.matrix);
        rotate(player.matrix);
        rotate(player.matrix);
        player.pos.x = pos;
        return;
      }
    }
  } else if (event.keyCode === 38) {
    hardDrop();
  }
});

playerReset();
update();
