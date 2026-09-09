"use strict";
let snakeX = 15;
let snakeY = 6;
let snakeLength = 3;
let score = 0;
let direction = 0;
let gameOver = 0;
let foodX = 20;
let foodY = 6;
let textStyle = create_style();
style_set_text_font(textStyle, 20);
style_set_text_color(textStyle, 0xFFFFFF);
let headStyle = create_style();
style_set_bg_color(headStyle, 0x00FF00);
style_set_bg_opa(headStyle, 255);
style_set_radius(headStyle, 4);
let bodyStyle = create_style();
style_set_bg_color(bodyStyle, 0x00AA00);
style_set_bg_opa(bodyStyle, 255);
style_set_radius(bodyStyle, 3);
let foodStyle = create_style();
style_set_bg_color(foodStyle, 0xFF4444);
style_set_bg_opa(foodStyle, 255);
style_set_radius(foodStyle, 7);
let title = create_label(28, 3);
obj_add_style(title, textStyle, 0);
label_set_text(title, "Snake AI");
let scoreLabel = create_label(350, 3);
obj_add_style(scoreLabel, textStyle, 0);
let field = draw_rect(26, 28, 484, 196, 0x222222);
let make_segment = function(style) {
  let handle = create_label(-30, -30);
  obj_add_style(handle, style, 0);
  obj_set_size(handle, 14, 14);
  label_set_text(handle, "");
  return handle;
};
let head = make_segment(headStyle);
let food = make_segment(foodStyle);
let body = null;
for (let i = 0; i < 10; i++) {
  let handle = make_segment(bodyStyle);
  body = {x: -1, y: -1, handle: handle, next: body};
}
let status = create_label(125, 105);
obj_add_style(status, textStyle, 0);
label_set_text(status, "");
let occupied = function(x, y) {
  if (x === snakeX && y === snakeY) return 1;
  let index = 0;
  let found = 0;
  for (let node = body; node; node = node.next) {
    if (index < snakeLength - 1 && node.x === x && node.y === y) {
      found = 1;
      break;
    }
    index++;
  }
  return found;
};
let spawn_food = function() {
  // Bounded search guarantees an empty cell, including the snake's body.
  let start = random(360);
  for (let i = 0; i < 360; i++) {
    let cell = (start + i) % 360;
    let x = cell % 30;
    let y = (cell - x) / 30;
    if (!occupied(x, y)) {
      foodX = x;
      foodY = y;
      break;
    }
  }
  move_obj(food, 28 + foodX * 16, 30 + foodY * 16);
};
let restart = function(event) {
  snakeX = 15;
  snakeY = 6;
  snakeLength = 3;
  direction = 0;
  score = 0;
  gameOver = 0;
  let index = 0;
  for (let node = body; node; node = node.next) {
    node.x = 14 - index;
    node.y = 6;
    if (index < 2) move_obj(node.handle, 28 + node.x * 16, 126);
    else move_obj(node.handle, -30, -30);
    index++;
  }
  move_obj(head, 268, 126);
  label_set_text(scoreLabel, "Score: 0");
  label_set_text(status, "");
  spawn_food();
};
let game_update = function() {
  if (gameOver) return 0;
  let best = -1;
  let bestDistance = 999;
  let nextX = snakeX;
  let nextY = snakeY;
  for (let candidate = 0; candidate < 4; candidate++) {
    let x = snakeX;
    let y = snakeY;
    if (candidate === 0) x++;
    if (candidate === 1) y++;
    if (candidate === 2) x--;
    if (candidate === 3) y--;
    if (candidate === (direction + 2) % 4) continue;
    if (x < 0 || x >= 30 || y < 0 || y >= 12) continue;
    if (occupied(x, y)) continue;
    let dx = foodX - x;
    let dy = foodY - y;
    if (dx < 0) dx = 0 - dx;
    if (dy < 0) dy = 0 - dy;
    let distance = dx + dy;
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
      nextX = x;
      nextY = y;
    }
  }
  if (best < 0) {
    gameOver = 1;
    label_set_text(status, "Game over - press to restart");
    return 0;
  }
  direction = best;
  let eating = nextX === foodX && nextY === foodY;
  if (eating) {
    score++;
    if (snakeLength < 11) snakeLength++;
    label_set_text(scoreLabel, "Score: " + numberToString(score));
  }
  let oldX = snakeX;
  let oldY = snakeY;
  let index = 0;
  for (let node = body; node; node = node.next) {
    let x = node.x;
    let y = node.y;
    node.x = oldX;
    node.y = oldY;
    oldX = x;
    oldY = y;
    if (index < snakeLength - 1) move_obj(node.handle, 28 + node.x * 16, 30 + node.y * 16);
    index++;
  }
  snakeX = nextX;
  snakeY = nextY;
  move_obj(head, 28 + snakeX * 16, 30 + snakeY * 16);
  if (eating) spawn_food();
};
restart(0);
on_button("restart");
create_timer("game_update", 200);
