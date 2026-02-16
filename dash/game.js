/* Enzo Dash — Dark Neon Upgrade
   Adds: neon trail, starfield, parallax, more obstacles, jump pads, slow-mo death, better FX
*/

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestEl  = document.getElementById("best");
const coinsEl = document.getElementById("coins");

const menu = document.getElementById("menu");
const over = document.getElementById("over");
const overText = document.getElementById("overText");
const shop = document.getElementById("shop");
const how = document.getElementById("how");
const tapHint = document.getElementById("tapHint");

const startBtn = document.getElementById("startBtn");
const retryBtn = document.getElementById("retryBtn");
const menuBtn  = document.getElementById("menuBtn");

const shopBtn = document.getElementById("shopBtn");
const closeShopBtn = document.getElementById("closeShopBtn");
const shopGrid = document.getElementById("shopGrid");

const howBtn = document.getElementById("howBtn");
const closeHowBtn = document.getElementById("closeHowBtn");

const creditsBtn = document.getElementById("creditsBtn");
const creditsText = document.getElementById("creditsText");

const fsBtn = document.getElementById("fsBtn");
const muteBtn = document.getElementById("muteBtn");

/* ---------- Local Storage Keys ---------- */
const LS = {
  coins: "edash_coins_v2",
  best: "edash_best_v2",
  owned: "edash_owned_v2",
  skin: "edash_skin_v2",
  mute: "edash_mute_v2",
};

function loadNum(key, fallback=0){
  const v = Number(localStorage.getItem(key));
  return Number.isFinite(v) ? v : fallback;
}
function saveNum(key, val){ localStorage.setItem(key, String(val)); }

function loadArr(key, fallback=[]){
  try{
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(v) ? v : fallback;
  }catch{ return fallback; }
}
function saveArr(key, arr){ localStorage.setItem(key, JSON.stringify(arr)); }

/* ---------- Sound (no mp3) ---------- */
const AudioCtx = window.AudioContext || window.webkitAudioContext;
const audio = new AudioCtx();
let muted = (localStorage.getItem(LS.mute)==="1");
muteBtn.textContent = muted ? "🔇" : "🔊";

async function ensureAudio(){
  try{ if(audio.state==="suspended") await audio.resume(); }catch{}
}
function beep(freq=700, dur=0.06, type="sine", vol=0.05){
  if(muted) return;
  try{
    const o=audio.createOscillator(), g=audio.createGain();
    o.type=type; o.frequency.value=freq;
    g.gain.value=vol;
    o.connect(g).connect(audio.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime+dur);
    o.stop(audio.currentTime+dur+0.01);
  }catch{}
}
const sfx = {
  jump(){ beep(720,0.05,"sine",0.05); beep(980,0.04,"sine",0.04); },
  coin(){ beep(1200,0.05,"sine",0.05); },
  pad(){ beep(420,0.06,"triangle",0.06); beep(860,0.05,"sine",0.04); },
  hit(){ beep(150,0.16,"triangle",0.07); },
  ui(){ beep(520,0.03,"sine",0.03); }
};

muteBtn.onclick = async ()=>{
  await ensureAudio();
  muted = !muted;
  localStorage.setItem(LS.mute, muted ? "1":"0");
  muteBtn.textContent = muted ? "🔇" : "🔊";
  sfx.ui();
};

/* ---------- Fullscreen ---------- */
function isFullscreen(){ return !!document.fullscreenElement; }
async function toggleFullscreen(){
  await ensureAudio();
  try{
    const frame = document.querySelector(".card") || document.body;
    if(!isFullscreen()){
      await frame.requestFullscreen?.();
    }else{
      await document.exitFullscreen?.();
    }
  }catch{}
}
fsBtn.onclick = ()=>toggleFullscreen();

/* ---------- Skins ---------- */
const SKINS = [
  { id:"classic", name:"Classic", price:0,   fill:"#141A2B", glow:"#62D0FF", face:true },
  { id:"violet",  name:"Violet",  price:35,  fill:"#241A3B", glow:"#B26BFF", face:true },
  { id:"neon",    name:"Neon",    price:60,  fill:"#0E1F28", glow:"#62D0FF", face:false },
  { id:"rose",    name:"Rose",    price:90,  fill:"#2B1427", glow:"#FF5EDB", face:true },
  { id:"mint",    name:"Mint",    price:120, fill:"#102B2B", glow:"#4DFFD6", face:true },
  { id:"gold",    name:"Gold",    price:160, fill:"#2B2414", glow:"#FFD66E", face:false },
];

let coins = loadNum(LS.coins, 0);
let best  = loadNum(LS.best, 0);
let owned = new Set(loadArr(LS.owned, ["classic"]));
let currentSkin = localStorage.getItem(LS.skin) || "classic";
owned.add("classic");

function saveAll(){
  saveNum(LS.coins, coins);
  saveNum(LS.best, best);
  saveArr(LS.owned, [...owned]);
  localStorage.setItem(LS.skin, currentSkin);
}

function updateHUD(){
  scoreEl.textContent = score;
  bestEl.textContent = best;
  coinsEl.textContent = coins;
}

function renderShop(){
  shopGrid.innerHTML="";
  for(const s of SKINS){
    const item = document.createElement("div");
    item.className="shopItem";

    const left = document.createElement("div");
    left.style.display="flex";
    left.style.alignItems="center";
    left.style.gap="12px";

    const prev = document.createElement("div");
    prev.className="skinPreview";
    prev.style.background = s.fill;
    prev.style.boxShadow = `0 0 18px ${s.glow}AA`;

    const meta = document.createElement("div");
    meta.className="shopMeta";
    meta.innerHTML = `<div class="shopName">${s.name}</div>
                      <div class="shopPrice">${s.price} coins</div>`;

    left.appendChild(prev);
    left.appendChild(meta);

    const btn = document.createElement("button");
    btn.className="small";

    const has = owned.has(s.id);
    const equipped = (currentSkin===s.id);

    btn.textContent = equipped ? "Equipped" : (has ? "Equip" : "Buy");

    btn.onclick = async ()=>{
      await ensureAudio();
      sfx.ui();

      if(owned.has(s.id)){
        currentSkin = s.id;
        saveAll();
        renderShop();
        return;
      }
      if(coins >= s.price){
        coins -= s.price;
        owned.add(s.id);
        currentSkin = s.id;
        saveAll();
        updateHUD();
        renderShop();
      }else{
        // little “nope”
        beep(180,0.08,"triangle",0.06);
      }
    };

    item.appendChild(left);
    item.appendChild(btn);
    shopGrid.appendChild(item);
  }
}

/* ---------- Game State ---------- */
let running=false;
let dead=false;

const W = ()=>canvas.width;
const H = ()=>canvas.height;
const groundY = ()=>Math.floor(H()*0.82);

const player = {
  x: 190,
  y: 0,
  w: 44,
  h: 44,
  vy: 0,
  onGround: false,
  rot: 0,
};

let speed = 6.0;
let dist = 0;
let score = 0;
let runCoins = 0;

let shake = 0;
let slowMo = 1;        // slows time after death
let slowMoTarget = 1;

const obstacles = [];
const particles = [];
const trail = [];
const stars = [];

/* ---------- Init Stars ---------- */
function initStars(){
  stars.length = 0;
  const count = 90;
  for(let i=0;i<count;i++){
    stars.push({
      x: Math.random()*W(),
      y: Math.random()*H()*0.75,
      s: 0.7 + Math.random()*1.9,
      a: 0.25 + Math.random()*0.55,
      layer: Math.random()<0.5 ? 1 : 2
    });
  }
}

/* ---------- Helpers ---------- */
function rectHit(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function roundRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

function puff(x,y,n=10, glow="rgba(98,208,255,0.9)"){
  for(let i=0;i<n;i++){
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*3.2,
      vy: -Math.random()*3.2,
      a: 1,
      r: 2+Math.random()*4,
      glow
    });
  }
}

function sparks(x,y,n=22){
  for(let i=0;i<n;i++){
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*6.2,
      vy: (Math.random()-0.5)*6.2,
      a: 1,
      r: 1.8+Math.random()*2.4,
      glow:"rgba(255,255,255,0.95)",
      spark:true
    });
  }
}

/* ---------- Obstacles ---------- */
function spawnInitial(){
  for(let i=0;i<5;i++){
    spawnPack(W()+i*320);
  }
}

// NEW: more obstacle types
function spawnPack(x){
  const gy = groundY();

  // always keep spacing fair
  const roll = Math.random();

  if(roll < 0.40){
    // spike
    obstacles.push({type:"spike", x, w:46, h:46, y:gy-46});
  }else if(roll < 0.62){
    // wall
    obstacles.push({type:"wall", x, w:54, h:82, y:gy-82});
  }else if(roll < 0.78){
    // triple spikes
    obstacles.push({type:"triple", x, w:100, h:46, y:gy-46});
  }else if(roll < 0.90){
    // moving spike (slides up/down a bit)
    obstacles.push({type:"mspike", x, w:46, h:46, y:gy-46, t:Math.random()*10});
  }else{
    // jump pad (boost jump)
    obstacles.push({type:"pad", x, w:54, h:16, y:gy-16});
  }

  // coin chance
  if(Math.random() < 0.70){
    const cy = gy - (110 + Math.random()*160);
    obstacles.push({type:"coin", x: x + 80 + Math.random()*90, r:14, y: cy, taken:false});
  }
}

/* ---------- Run Reset ---------- */
function resetRun(){
  const gy = groundY();
  player.y = gy - player.h;
  player.vy = 0;
  player.onGround = true;
  player.rot = 0;

  speed = 6.0;
  dist = 0;
  score = 0;
  runCoins = 0;

  obstacles.length=0;
  particles.length=0;
  trail.length=0;

  dead=false;
  shake=0;
  slowMo = 1;
  slowMoTarget = 1;

  spawnInitial();
  updateHUD();
}

/* ---------- Jump ---------- */
function jump(force=false){
  if(!running || dead) return;
  if(player.onGround || force){
    player.vy = -14.6;
    player.onGround=false;
    sfx.jump();
    puff(player.x+player.w/2, player.y+player.h, 14, "rgba(98,208,255,0.85)");
  }
}

/* ---------- End Game ---------- */
function endGame(){
  dead=true;
  running=false;
  slowMoTarget = 0.25; // cinematic slow
  sfx.hit();
  shake = 16;
  sparks(player.x+player.w/2, player.y+player.h/2, 28);
  puff(player.x+player.w/2, player.y+player.h/2, 22, "rgba(178,107,255,0.85)");

  // save after a tiny delay so UI feels nicer
  setTimeout(()=>{
    coins += runCoins;
    if(score > best) best = score;
    saveAll();
    updateHUD();

    overText.textContent = `Score: ${score} • Coins earned: ${runCoins} • Best: ${best}`;
    over.style.display="flex";
    menu.style.display="none";
    shop.style.display="none";
    how.style.display="none";
  }, 180);
}

/* ---------- Background (dark neon) ---------- */
function drawBackground(){
  const w=W(), h=H();
  const gy=groundY();

  // soft vignette
  ctx.save();
  const vg = ctx.createRadialGradient(w*0.5,h*0.45, 60, w*0.5,h*0.55, w*0.75);
  vg.addColorStop(0,"rgba(98,208,255,0.06)");
  vg.addColorStop(0.35,"rgba(178,107,255,0.05)");
  vg.addColorStop(1,"rgba(0,0,0,0.35)");
  ctx.fillStyle = vg;
  ctx.fillRect(0,0,w,h);
  ctx.restore();

  // stars
  ctx.save();
  for(const s of stars){
    ctx.globalAlpha = s.a;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  ctx.restore();

  // neon grid
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.strokeStyle = "rgba(98,208,255,0.55)";
  ctx.lineWidth = 1;
  const step = 40;
  for(let x=0;x<w;x+=step){
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,gy); ctx.stroke();
  }
  ctx.strokeStyle = "rgba(178,107,255,0.55)";
  for(let y=0;y<gy;y+=step){
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke();
  }
  ctx.restore();

  // ground
  ctx.save();
  ctx.fillStyle="rgba(0,0,0,0.22)";
  ctx.fillRect(0,gy,w,h-gy);

  // neon rail
  ctx.shadowBlur = 18;
  ctx.shadowColor = "rgba(98,208,255,0.75)";
  ctx.strokeStyle="rgba(98,208,255,0.55)";
  ctx.lineWidth=4;
  ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(w,gy); ctx.stroke();

  ctx.shadowColor = "rgba(178,107,255,0.70)";
  ctx.strokeStyle="rgba(178,107,255,0.35)";
  ctx.lineWidth=3;
  ctx.beginPath(); ctx.moveTo(0,gy+6); ctx.lineTo(w,gy+6); ctx.stroke();

  ctx.restore();
}

/* ---------- Draw Player (cute neon cube) ---------- */
function drawPlayer(){
  const skin = SKINS.find(s=>s.id===currentSkin) || SKINS[0];
  const w=player.w, h=player.h;

  ctx.save();
  if(shake>0){
    ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);
  }
  ctx.translate(player.x + w/2, player.y + h/2);
  ctx.rotate(player.rot);

  // glow
  ctx.shadowColor = skin.glow;
  ctx.shadowBlur = 26;

  ctx.fillStyle = skin.fill;
  ctx.strokeStyle = "rgba(255,255,255,0.50)";
  ctx.lineWidth = 3;

  roundRect(-w/2, -h/2, w, h, 12);
  ctx.fill();
  ctx.stroke();

  // inner highlight
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "white";
  roundRect(-w/2+6, -h/2+6, w-12, h-18, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  // face
  if(skin.face){
    ctx.fillStyle="rgba(255,255,255,0.90)";
    ctx.beginPath(); ctx.arc(-8,-6,3.1,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,-6,3.1,0,Math.PI*2); ctx.fill();

    ctx.strokeStyle="rgba(255,255,255,0.80)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(-8,8);
    ctx.quadraticCurveTo(0,14,8,8);
    ctx.stroke();
  }

  ctx.restore();
}

/* ---------- Neon Trail ---------- */
function drawTrail(){
  if(trail.length < 2) return;
  ctx.save();
  for(let i=0;i<trail.length;i++){
    const t = trail[i];
    ctx.globalAlpha = t.a;
    ctx.shadowColor = t.glow;
    ctx.shadowBlur = 18;
    ctx.fillStyle = t.fill;
    roundRect(t.x, t.y, t.w, t.h, 10);
    ctx.fill();
  }
  ctx.restore();
}

/* ---------- Draw Obstacles ---------- */
function drawObstacle(o){
  const gy=groundY();

  if(o.type==="coin"){
    if(o.taken) return;
    ctx.save();
    ctx.shadowColor="rgba(255,214,110,0.9)";
    ctx.shadowBlur=18;
    ctx.fillStyle="rgba(255,214,110,0.95)";
    ctx.strokeStyle="rgba(255,255,255,0.75)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();

    ctx.shadowBlur=0;
    ctx.globalAlpha=0.35;
    ctx.fillStyle="white";
    ctx.beginPath();
    ctx.arc(o.x-4, o.y-4, o.r*0.38, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.save();
  ctx.shadowBlur=16;
  ctx.shadowColor="rgba(98,208,255,0.35)";
  ctx.strokeStyle="rgba(255,255,255,0.55)";
  ctx.lineWidth=3;

  if(o.type==="spike" || o.type==="mspike"){
    const y = o.y;
    ctx.fillStyle="rgba(20,26,43,0.92)";
    ctx.beginPath();
    ctx.moveTo(o.x, gy);
    ctx.lineTo(o.x+o.w/2, y);
    ctx.lineTo(o.x+o.w, gy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }else if(o.type==="triple"){
    ctx.fillStyle="rgba(20,26,43,0.92)";
    const w = o.w/3;
    for(let k=0;k<3;k++){
      const x = o.x + k*w;
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x+w/2, o.y);
      ctx.lineTo(x+w, gy);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }else if(o.type==="wall"){
    ctx.fillStyle="rgba(20,26,43,0.92)";
    roundRect(o.x, o.y, o.w, o.h, 10);
    ctx.fill(); ctx.stroke();

    // subtle bricks
    ctx.shadowBlur=0;
    ctx.globalAlpha=0.22;
    ctx.strokeStyle="rgba(255,255,255,0.35)";
    ctx.lineWidth=2;
    const rows=4, cols=2;
    for(let r=1;r<rows;r++){
      ctx.beginPath();
      ctx.moveTo(o.x, o.y+(o.h/rows)*r);
      ctx.lineTo(o.x+o.w, o.y+(o.h/rows)*r);
      ctx.stroke();
    }
    for(let c=1;c<cols;c++){
      ctx.beginPath();
      ctx.moveTo(o.x+(o.w/cols)*c, o.y);
      ctx.lineTo(o.x+(o.w/cols)*c, o.y+o.h);
      ctx.stroke();
    }
    ctx.globalAlpha=1;
  }else if(o.type==="pad"){
    // jump pad
    ctx.shadowColor="rgba(178,107,255,0.55)";
    ctx.fillStyle="rgba(178,107,255,0.20)";
    ctx.strokeStyle="rgba(178,107,255,0.80)";
    ctx.lineWidth=3;

    roundRect(o.x, o.y, o.w, o.h, 10);
    ctx.fill(); ctx.stroke();

    // arrows
    ctx.globalAlpha=0.9;
    ctx.strokeStyle="rgba(255,255,255,0.75)";
    ctx.lineWidth=3;
    const mid = o.x + o.w/2;
    ctx.beginPath();
    ctx.moveTo(mid-12, o.y+o.h-4);
    ctx.lineTo(mid, o.y+4);
    ctx.lineTo(mid+12, o.y+o.h-4);
    ctx.stroke();
    ctx.globalAlpha=1;
  }

  ctx.restore();
}

/* ---------- Particles ---------- */
function drawParticles(){
  for(const p of particles){
    ctx.save();
    ctx.globalAlpha = p.a;
    ctx.shadowBlur = p.spark ? 12 : 18;
    ctx.shadowColor = p.glow || "rgba(255,255,255,0.85)";
    ctx.fillStyle = p.spark ? "rgba(255,255,255,0.95)" : (p.glow || "rgba(255,255,255,0.75)");
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------- Main Loop ---------- */
let last=0;
function tick(ts){
  const rawDt = Math.min(0.033, (ts-last)/1000 || 0.016);
  last = ts;

  // slow mo easing
  slowMo += (slowMoTarget - slowMo) * 0.08;
  const dt = rawDt * slowMo;

  ctx.clearRect(0,0,W(),H());

  // update stars (parallax)
  const starSpeed = (running && !dead) ? speed*0.18 : 0.5;
  for(const s of stars){
    s.x -= starSpeed*(s.layer===2 ? 1.4 : 1.0);
    if(s.x < -10) s.x = W()+10;
  }

  drawBackground();

  // camera shake decay
  shake *= 0.86;

  // particles update
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.spark ? 0.06 : 0.10;
    p.a *= p.spark ? 0.93 : 0.95;
    if(p.a < 0.05) particles.splice(i,1);
  }

  // trail update
  for(let i=trail.length-1;i>=0;i--){
    trail[i].a *= 0.88;
    trail[i].y += 0.02;
    if(trail[i].a < 0.05) trail.splice(i,1);
  }

  if(running && !dead){
    dist += speed*60*dt;

    // speed ramps up but not crazy
    speed = Math.min(13.2, speed + 0.10*dt);

    // gravity
    player.vy += 38*dt;
    player.y += player.vy;

    const gy = groundY();
    if(player.y + player.h >= gy){
      player.y = gy - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    // spin
    if(!player.onGround) player.rot += 7.8*dt;
    else player.rot *= 0.84;

    // score
    score = Math.floor(dist/22);

    // add trail
    const skin = SKINS.find(s=>s.id===currentSkin) || SKINS[0];
    trail.push({
      x: player.x,
      y: player.y,
      w: player.w,
      h: player.h,
      a: 0.22,
      fill: skin.fill,
      glow: skin.glow
    });
    if(trail.length > 14) trail.shift();

    // move obstacles
    for(const o of obstacles){
      o.x -= speed*60*dt;

      // moving spike oscillation
      if(o.type==="mspike"){
        o.t += dt*3.2;
        const base = groundY()-46;
        o.y = base - (Math.sin(o.t)*18 + 10);
      }
    }

    // remove old
    while(obstacles.length && obstacles[0].x < -240){
      obstacles.shift();
    }

    // spawn more with fair spacing
    const far = obstacles.reduce((m,o)=>Math.max(m, (o.type==="coin"?o.x:o.x+(o.w||0))), 0);
    if(far < W()+520){
      // bigger spacing than before so it's playable
      spawnPack(W()+520 + Math.random()*220);
    }

    // collisions
    for(const o of obstacles){
      if(o.type==="coin"){
        if(!o.taken){
          const px = player.x + player.w/2;
          const py = player.y + player.h/2;
          const dx = px - o.x;
          const dy = py - o.y;
          if(dx*dx + dy*dy < (o.r+18)*(o.r+18)){
            o.taken = true;
            runCoins += 1;
            sfx.coin();
            sparks(o.x,o.y,14);
          }
        }
        continue;
      }

      if(o.type==="pad"){
        // pad triggers only if player is on ground and touches top area
        const hit = rectHit(player.x, player.y, player.w, player.h, o.x, o.y-8, o.w, o.h+8);
        if(hit && player.onGround){
          player.vy = -18.5;     // boosted jump
          player.onGround = false;
          sfx.pad();
          puff(player.x+player.w/2, player.y+player.h, 18, "rgba(178,107,255,0.85)");
          // small extra trail pop
          sparks(player.x+player.w/2, player.y+player.h, 10);
        }
        continue;
      }

      // spikes/walls = death
      const hit = rectHit(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h);
      if(hit){
        endGame();
        break;
      }
    }

    updateHUD();
  }

  // draw trail behind everything
  drawTrail();

  // draw obstacles
  for(const o of obstacles){
    drawObstacle(o);
  }

  drawParticles();
  drawPlayer();

  // hint
  tapHint.style.opacity = (running && !dead) ? "0" : "1";

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* ---------- Inputs ---------- */
function onPress(){
  ensureAudio();
  if(menu.style.display !== "none" || shop.style.display !== "none" || how.style.display !== "none"){
    return;
  }
  jump();
}

window.addEventListener("keydown", (e)=>{
  if(e.code==="Space" || e.code==="ArrowUp"){
    e.preventDefault();
    onPress();
  }
  if(e.code==="KeyR" && over.style.display!=="none"){
    e.preventDefault();
    startGame();
  }
});

canvas.addEventListener("pointerdown", (e)=>{
  e.preventDefault();
  if(running && !dead){
    jump();
  }
});

/* ---------- UI Buttons ---------- */
function startGame(){
  ensureAudio();
  menu.style.display="none";
  over.style.display="none";
  shop.style.display="none";
  how.style.display="none";
  resetRun();
  running=true;
}

startBtn.onclick = ()=>{ sfx.ui(); startGame(); };
retryBtn.onclick = ()=>{ sfx.ui(); startGame(); };
menuBtn.onclick  = ()=>{ sfx.ui(); over.style.display="none"; menu.style.display="flex"; running=false; slowMoTarget=1; };

shopBtn.onclick = ()=>{
  sfx.ui();
  renderShop();
  shop.style.display="flex";
  menu.style.display="none";
  running=false;
};
closeShopBtn.onclick = ()=>{
  sfx.ui();
  shop.style.display="none";
  menu.style.display="flex";
};

howBtn.onclick = ()=>{
  sfx.ui();
  how.style.display="flex";
  menu.style.display="none";
  running=false;
};
closeHowBtn.onclick = ()=>{
  sfx.ui();
  how.style.display="none";
  menu.style.display="flex";
};

creditsBtn.onclick = ()=>{
  sfx.ui();
  creditsText.style.display = (creditsText.style.display==="none") ? "block" : "none";
};

/* ---------- Resize / Fullscreen Friendly ---------- */
function fitCanvas(){
  // internal resolution stays stable; CSS scales it
  canvas.width = 960;
  canvas.height = (window.innerHeight > window.innerWidth) ? 620 : 540;
  resetRun();
  initStars();
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

/* ---------- Init ---------- */
updateHUD();
menu.style.display="flex";
renderShop();
saveAll();
