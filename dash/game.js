/* Enzo Dash — original cube runner (not a copy)
   Features: fullscreen, mobile tap, shop + skins, saved coins/best, sound
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

/* ---------- Save ---------- */
const LS = {
  coins: "edash_coins_v1",
  best: "edash_best_v1",
  owned: "edash_owned_v1",
  skin: "edash_skin_v1",
  mute: "edash_mute_v1",
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
  jump(){ beep(700,0.05,"sine",0.05); beep(900,0.04,"sine",0.04); },
  coin(){ beep(1200,0.04,"sine",0.05); },
  hit(){ beep(160,0.14,"triangle",0.06); },
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
function isFullscreen(){
  return !!document.fullscreenElement;
}
async function toggleFullscreen(){
  await ensureAudio();
  try{
    if(!isFullscreen()){
      // make the container fullscreen (frame)
      const frame = document.querySelector(".frame");
      await frame.requestFullscreen?.();
    }else{
      await document.exitFullscreen?.();
    }
  }catch{
    // Some mobile browsers block fullscreen unless user gesture
  }
}
fsBtn.onclick = ()=>toggleFullscreen();

/* ---------- Skins ---------- */
const SKINS = [
  { id:"classic", name:"Classic", price:0,  style:{ fill:"#1F2A52", glow:"#8BC9FF", face:true }},
  { id:"mint",    name:"Mint",    price:35, style:{ fill:"#1D7F7A", glow:"#A7FFE6", face:true }},
  { id:"sunset",  name:"Sunset",  price:60, style:{ fill:"#7A2D5D", glow:"#FFB86B", face:true }},
  { id:"void",    name:"Void",    price:90, style:{ fill:"#101225", glow:"#B26BFF", face:false }},
  { id:"peach",   name:"Peach",   price:120,style:{ fill:"#C96B6B", glow:"#FFE1F0", face:true }},
  { id:"gold",    name:"Gold",    price:160,style:{ fill:"#B7812B", glow:"#FFD66E", face:false }},
];

let coins = loadNum(LS.coins, 0);
let best  = loadNum(LS.best, 0);
let owned = new Set(loadArr(LS.owned, ["classic"]));
let currentSkin = localStorage.getItem(LS.skin) || "classic";
if(!owned.has("classic")) owned.add("classic");

function saveShop(){
  saveNum(LS.coins, coins);
  saveNum(LS.best, best);
  saveArr(LS.owned, [...owned]);
  localStorage.setItem(LS.skin, currentSkin);
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
    prev.style.background = s.style.fill;
    prev.style.boxShadow = `0 0 0 4px rgba(255,255,255,.55), 0 0 22px ${s.style.glow}AA`;

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

    if(equipped) btn.textContent="Equipped";
    else if(has) btn.textContent="Equip";
    else btn.textContent="Buy";

    btn.onclick = async ()=>{
      await ensureAudio();
      sfx.ui();

      if(owned.has(s.id)){
        currentSkin = s.id;
        saveShop();
        renderShop();
        return;
      }

      if(coins >= s.price){
        coins -= s.price;
        owned.add(s.id);
        currentSkin = s.id;
        saveShop();
        updateHUD();
        renderShop();
      }else{
        // little “nope” beep
        beep(200,0.08,"triangle",0.06);
      }
    };

    item.appendChild(left);
    item.appendChild(btn);
    shopGrid.appendChild(item);
  }
}

/* ---------- Game ---------- */
let running=false;
let dead=false;

const W = ()=>canvas.width;
const H = ()=>canvas.height;

const groundY = ()=>Math.floor(H()*0.80);

const player = {
  x: 180,
  y: 0,
  w: 44,
  h: 44,
  vy: 0,
  onGround: false,
  rot: 0, // cube spin
};

let speed = 6.2;
let dist = 0;
let score = 0;
let runCoins = 0;

let shake = 0;

const obstacles = [];
const particles = [];

function resetRun(){
  player.y = groundY()-player.h;
  player.vy = 0;
  player.onGround = true;
  player.rot = 0;

  speed = 6.2;
  dist = 0;
  score = 0;
  runCoins = 0;

  obstacles.length=0;
  particles.length=0;

  dead=false;
  shake=0;

  spawnInitial();
  updateHUD();
}

function spawnInitial(){
  // add a few starter gaps so it doesn't spawn on player
  for(let i=0;i<4;i++){
    spawnObstacle(W()+i*280);
  }
}

function spawnObstacle(x){
  // mix: spike, wall, double spike, floating coin
  const t = Math.random();
  if(t < 0.55){
    obstacles.push({type:"spike", x, w:44, h:44, y: groundY()-44});
  }else if(t < 0.80){
    obstacles.push({type:"wall", x, w:54, h:74, y: groundY()-74});
  }else{
    obstacles.push({type:"double", x, w:70, h:44, y: groundY()-44});
  }

  // coin chance
  if(Math.random() < 0.62){
    const cy = groundY() - 120 - Math.random()*120;
    obstacles.push({type:"coin", x: x + 60 + Math.random()*80, r:14, y: cy, taken:false});
  }
}

function jump(){
  if(!running || dead) return;
  if(player.onGround){
    player.vy = -14.2;
    player.onGround=false;
    sfx.jump();
    puff(player.x+player.w/2, player.y+player.h, 14);
  }
}

function puff(x,y,n=10){
  for(let i=0;i<n;i++){
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*2.6,
      vy: -Math.random()*2.6,
      a: 1,
      r: 2+Math.random()*3.5,
    });
  }
}

function addSpark(x,y){
  for(let i=0;i<16;i++){
    particles.push({
      x, y,
      vx: (Math.random()-0.5)*4.2,
      vy: (Math.random()-0.5)*4.2,
      a: 1,
      r: 2+Math.random()*2.5,
      spark:true
    });
  }
}

function rectHit(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function endGame(){
  dead=true;
  running=false;

  // add run coins to total
  coins += runCoins;
  if(score > best) best = score;
  saveShop();
  updateHUD();

  overText.textContent = `Score: ${score} • Coins earned: ${runCoins} • Best: ${best}`;
  over.style.display="flex";
  menu.style.display="none";
  shop.style.display="none";
  how.style.display="none";
}

function updateHUD(){
  scoreEl.textContent = score;
  bestEl.textContent = best;
  coinsEl.textContent = coins;
}

/* ---------- Drawing ---------- */
function drawBackground(){
  // parallax lines + clouds
  const w=W(), h=H();
  const gy=groundY();

  // sky gradient
  const g=ctx.createLinearGradient(0,0,0,h);
  g.addColorStop(0,"rgba(255,255,255,0.70)");
  g.addColorStop(1,"rgba(255,255,255,0.10)");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,w,h);

  // faint grid
  ctx.save();
  ctx.globalAlpha=0.12;
  ctx.strokeStyle="rgba(18,32,70,0.55)";
  ctx.lineWidth=1;
  const step=40;
  for(let x=0;x<w;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for(let y=0;y<h;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  ctx.restore();

  // clouds
  function cloud(cx,cy,s=1,a=0.65){
    ctx.save();
    ctx.globalAlpha=a;
    ctx.fillStyle="rgba(255,255,255,0.95)";
    ctx.strokeStyle="rgba(18,32,70,0.10)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.ellipse(cx-70*s, cy, 55*s, 35*s, 0, 0, Math.PI*2);
    ctx.ellipse(cx-25*s, cy-18*s, 65*s, 45*s, 0, 0, Math.PI*2);
    ctx.ellipse(cx+30*s, cy, 60*s, 40*s, 0, 0, Math.PI*2);
    ctx.ellipse(cx+78*s, cy+10*s, 50*s, 30*s, 0, 0, Math.PI*2);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  const t = dist*0.002;
  cloud((w*0.25 - t*120)%(w+400)-200, h*0.18, 1.0, 0.42);
  cloud((w*0.65 - t*90)%(w+500)-250, h*0.26, 1.1, 0.36);
  cloud((w*0.90 - t*70)%(w+500)-250, h*0.16, 0.85, 0.30);

  // ground
  ctx.save();
  ctx.fillStyle="rgba(18,32,70,0.08)";
  ctx.fillRect(0,gy,w,h-gy);

  // neon rail line
  ctx.strokeStyle="rgba(178,107,255,0.75)";
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(0,gy);
  ctx.lineTo(w,gy);
  ctx.stroke();
  ctx.restore();
}

function drawPlayer(){
  const skin = SKINS.find(s=>s.id===currentSkin) || SKINS[0];
  const w=player.w, h=player.h;

  ctx.save();
  // camera shake
  if(shake>0){
    ctx.translate((Math.random()-0.5)*shake, (Math.random()-0.5)*shake);
  }

  ctx.translate(player.x + w/2, player.y + h/2);
  ctx.rotate(player.rot);

  // glow
  ctx.shadowColor = skin.style.glow;
  ctx.shadowBlur = 22;

  ctx.fillStyle = skin.style.fill;
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 3;

  roundRect(-w/2, -h/2, w, h, 12);
  ctx.fill();
  ctx.stroke();

  // cute face
  if(skin.style.face){
    ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.90)";
    ctx.beginPath(); ctx.arc(-8,-6,3.2,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(8,-6,3.2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.75)";
    ctx.lineWidth=3;
    ctx.beginPath(); ctx.moveTo(-8,8); ctx.quadraticCurveTo(0,14,8,8); ctx.stroke();
  }

  ctx.restore();
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

function drawObstacle(o){
  const gy=groundY();

  if(o.type==="coin"){
    if(o.taken) return;
    ctx.save();
    ctx.shadowColor="rgba(255,214,110,0.9)";
    ctx.shadowBlur=18;
    ctx.fillStyle="rgba(255,214,110,0.95)";
    ctx.strokeStyle="rgba(255,255,255,0.85)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, Math.PI*2);
    ctx.fill(); ctx.stroke();
    // inner
    ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(o.x-4, o.y-4, o.r*0.35, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // spikes / walls
  ctx.save();
  ctx.shadowColor="rgba(76,141,255,0.45)";
  ctx.shadowBlur=12;

  if(o.type==="spike"){
    ctx.fillStyle="rgba(31,42,82,0.92)";
    ctx.strokeStyle="rgba(255,255,255,0.70)";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(o.x, gy);
    ctx.lineTo(o.x+o.w/2, o.y);
    ctx.lineTo(o.x+o.w, gy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }else if(o.type==="double"){
    ctx.fillStyle="rgba(31,42,82,0.92)";
    ctx.strokeStyle="rgba(255,255,255,0.70)";
    ctx.lineWidth=3;

    const w=o.w/2;
    ctx.beginPath();
    ctx.moveTo(o.x, gy);
    ctx.lineTo(o.x+w/2, o.y);
    ctx.lineTo(o.x+w, gy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(o.x+w, gy);
    ctx.lineTo(o.x+w+w/2, o.y);
    ctx.lineTo(o.x+o.w, gy);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
  }else{
    // wall
    ctx.fillStyle="rgba(31,42,82,0.92)";
    ctx.strokeStyle="rgba(255,255,255,0.70)";
    ctx.lineWidth=3;
    roundRect(o.x, o.y, o.w, o.h, 10);
    ctx.fill(); ctx.stroke();

    // bricks
    ctx.shadowBlur=0;
    ctx.globalAlpha=0.35;
    ctx.strokeStyle="rgba(255,255,255,0.45)";
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
  }

  ctx.restore();
}

function drawParticles(){
  for(const p of particles){
    ctx.save();
    ctx.globalAlpha=p.a;
    if(p.spark){
      ctx.fillStyle="rgba(255,255,255,0.95)";
    }else{
      ctx.fillStyle="rgba(255,255,255,0.75)";
    }
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------- Update loop ---------- */
let last=0;
function tick(ts){
  const dt = Math.min(0.033, (ts-last)/1000 || 0.016);
  last = ts;

  // always draw (even in menu)
  ctx.save();
  ctx.clearRect(0,0,W(),H());
  drawBackground();

  // camera shake decay
  shake *= 0.85;

  // update particles
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.spark ? 0.05 : 0.08;
    p.a *= 0.96;
    if(p.a < 0.05) particles.splice(i,1);
  }

  if(running && !dead){
    dist += speed*60*dt;

    // speed scale
    speed = Math.min(13.5, speed + 0.08*dt);

    // gravity
    player.vy += 36*dt;
    player.y += player.vy;

    const gy = groundY();
    if(player.y + player.h >= gy){
      player.y = gy - player.h;
      player.vy = 0;
      player.onGround = true;
    }

    // spin while in air
    if(!player.onGround) player.rot += 7.2*dt;
    else player.rot *= 0.85;

    // score increases with distance
    score = Math.floor(dist/22);

    // move obstacles
    for(const o of obstacles){
      o.x -= speed*60*dt;
    }

    // remove old + spawn new
    while(obstacles.length && obstacles[0].x < -200){
      obstacles.shift();
    }
    // ensure enough ahead
    const far = obstacles.reduce((m,o)=>Math.max(m,o.x+(o.w||0)), 0);
    if(far < W()+420){
      spawnObstacle(W()+420 + Math.random()*160);
    }

    // collisions
    for(const o of obstacles){
      if(o.type==="coin"){
        if(!o.taken){
          // coin hit circle vs player rect approx
          const px = player.x + player.w/2;
          const py = player.y + player.h/2;
          const dx = px - o.x;
          const dy = py - o.y;
          if(dx*dx + dy*dy < (o.r+18)*(o.r+18)){
            o.taken = true;
            runCoins += 1;
            sfx.coin();
            addSpark(o.x,o.y);
          }
        }
        continue;
      }

      if(rectHit(player.x, player.y, player.w, player.h, o.x, o.y, o.w, o.h)){
        sfx.hit();
        shake = 14;
        puff(player.x+player.w/2, player.y+player.h/2, 18);
        endGame();
        break;
      }
    }

    updateHUD();
  }

  // draw world
  for(const o of obstacles){
    drawObstacle(o);
  }
  drawParticles();
  drawPlayer();

  ctx.restore();

  // show tap hint on touch devices (simple)
  tapHint.style.opacity = (running && !dead) ? "0" : "1";

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

/* ---------- Input ---------- */
function onPress(){
  ensureAudio();
  if(menu.style.display !== "none" || shop.style.display !== "none" || how.style.display !== "none"){
    // if in menu, do nothing; use buttons
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
  // allow tap jump while playing
  if(running && !dead){
    jump();
  }
});

/* ---------- UI ---------- */
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
menuBtn.onclick  = ()=>{ sfx.ui(); over.style.display="none"; menu.style.display="flex"; running=false; };

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

/* ---------- Resize canvas (fullscreen friendly) ---------- */
function fitCanvas(){
  // keep internal resolution stable; CSS scales it
  // but adjust height for very tall phones a bit
  const ratio = 16/9;
  const w = 960;
  let h = 540;

  // on tall screens, make more vertical space
  if(window.innerHeight > window.innerWidth){
    h = 600;
  }

  canvas.width = w;
  canvas.height = h;
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

/* ---------- Init ---------- */
updateHUD();
menu.style.display="flex";
renderShop();
saveShop();
