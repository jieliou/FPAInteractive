let metaballShader;
let balls = [];
let intervalId;
let shrinkTimeoutId;
let countdown = 5;
let originalBigBallSize = 100; 
let shrinkStartTime = null;
let shrinking = false;

function setup() {
  let canvas = createCanvas(800, 800, WEBGL);
  canvas.parent('p5-canvas'); // 将Canvas附加到特定的div
    
  createMetaballShader();

  let bigBall = new Ball(width / 2, height / 2, originalBigBallSize, true);
  let smallBall = new Ball(random(width), random(height), 20);

  balls.push(bigBall);
  balls.push(smallBall);

  updateShaderUniforms();
}

function draw() {
  background(0);
  if (shrinking) {
    let elapsedTime = (millis() - shrinkStartTime) / 2000;
    elapsedTime = constrain(elapsedTime, 0, 1);
    metaballShader.setUniform('elapsedTime', elapsedTime);
    if (elapsedTime >= 1) {
      shrinking = false;
    }
  }
  updateShaderUniforms();
  quad(-1, -1, 1, -1, 1, 1, -1, 1);
  for (const ball of balls) {
    ball.update(balls);
  }
}

function createBall() {
  if (balls.length >= 100) {
    clearInterval(intervalId);
    if (!shrinkTimeoutId) {
      console.log("Reached 100 balls, starting countdown");
      shrinkTimeoutId = setInterval(() => {
        countdown--;
        console.log(`Countdown: ${countdown}`);
        if (countdown <= 0) {
          clearInterval(shrinkTimeoutId);
          shrinkTimeoutId = null;
          countdown = 5; // Reset countdown
          shrinkBigBall();
        }
      }, 1000);
    }
  } else {
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      let x = mouseX;
      let y = height - mouseY;

      let newBall = new Ball(x, y, 20);
      balls.push(newBall);

      updateShaderUniforms();
    }
  }
}

function shrinkBigBall() {
  for (let ball of balls) {
    if (ball.isBig) {
      ball.shrinking = true;
      break;
    }
  }
  

  createMetaballShader();
  shrinkStartTime = millis();
  shrinking = true;
  balls = balls.filter(ball => ball.isBig);

  updateShaderUniforms();
  
  
  console.log("Shrunk Big Ball and cleared other balls");
}

function mousePressed() {
  if (mouseButton === LEFT) {
    createBall();
    intervalId = setInterval(createBall, 100);
  }
}

function mouseReleased() {
  if (mouseButton === LEFT) {
    clearInterval(intervalId);
  }
}

class Ball {
  constructor(x, y, r, isBig = false) {
    this.pos = createVector(x, y);
    this.vel = createVector();
    this.acc = createVector();
    this.r = r;
    this.isBig = isBig;
    this.targetR = r;
    this.shrinking = false;
  }

  applyForce(force) {
    this.acc.add(force);
  }

  update(balls) {
    if (!this.isBig) {
      let force = p5.Vector.sub(balls[0].pos, this.pos);
      let distance = force.mag();
      let forceMag = 0.1 * (1 - distance / width);
      forceMag = constrain(forceMag, 0, 0.5);
      force.setMag(forceMag);
      this.applyForce(force);

      this.vel.add(this.acc);
      this.pos.add(this.vel);
      this.acc.set(0, 0);

      let damping = 0.999;
      this.vel.mult(damping);

      if (distance < balls[0].r) {
        this.vel.mult(0.99);
      }
    }
  }
}

function createMetaballShader() {
  metaballShader =
    createShader(
      `attribute vec3 aPosition;
      uniform float width;
      uniform float height;
      varying highp vec2 vPos;
      void main() {
        gl_Position = vec4(aPosition, 1.0);
        vPos = vec2(
          (gl_Position.x + 1.0) / 2.0 * width,
          (gl_Position.y + 1.0) / 2.0 * height);
      }`,
      `precision highp float;
      #define BALLS 100
      uniform float xs[BALLS];
      uniform float ys[BALLS];
      uniform float rs[BALLS];
      uniform float elapsedTime;
      varying highp vec2 vPos;
      void main() {
        float sum = 0.0;
        for (int i = 0; i < BALLS; i++) {
          float radius = rs[i];
          if (i == 0) {
            radius = mix(rs[i], ${originalBigBallSize}.0, elapsedTime);
          }
          float dx = xs[i] - vPos.x;
          float dy = ys[i] - vPos.y;
          float d = length(vec2(dx, dy));
          sum += radius / d;
        }
        if (sum > 11.0) {
          gl_FragColor = vec4(vec3(1.0), 0.0);
        } else {
          gl_FragColor = vec4(vec3(0.0), 1.0);
        }
      }`
    );
  shader(metaballShader);
}

function updateShaderUniforms() {
  metaballShader.setUniform('width', width);
  metaballShader.setUniform('height', height);
  metaballShader.setUniform('xs', balls.map(b => b.pos.x));
  metaballShader.setUniform('ys', balls.map(b => b.pos.y));
  metaballShader.setUniform('rs', balls.map(b => b.r));
  if (shrinking) {
    metaballShader.setUniform('elapsedTime', (millis() - shrinkStartTime) / 2000);
  }
}
