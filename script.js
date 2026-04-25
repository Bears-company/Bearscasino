// ============================================================
// FIREBASE
// ============================================================
const firebaseConfig = {
    apiKey: "AIzaSyD7F2lrec5XWyMWG7J0uW6IhEKD-LJ4jRY",
    authDomain: "bearscasino-bcded.firebaseapp.com",
    projectId: "bearscasino-bcded",
    storageBucket: "bearscasino-bcded.firebasestorage.app",
    messagingSenderId: "826765969101",
    appId: "1:826765969101:web:ee5e5da5057582f8ba4b84",
    measurementId: "G-J2BCGS7NVM",
    databaseURL: "https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db  = firebase.database();
const tg  = window.Telegram.WebApp;

// ============================================================
// SPLASH SCREEN
// ============================================================
(function initSplash(){
    const splash = document.getElementById('splash-screen');
    const bar    = document.getElementById('splash-bar');
    const txt    = document.getElementById('splash-text');
    if(!splash) return;

    const msgs = ['Завантаження...','Підключення до сервера...','Готуємо стіл...','Тасуємо карти...'];
    let progress = 0;
    let msgIdx   = 0;

    // Animate progress bar
    const iv = setInterval(()=>{
        const step = 2 + Math.random()*4;
        progress = Math.min(progress + step, 92);
        if(bar) bar.style.width = progress + '%';
        if(txt && msgIdx < msgs.length && progress > msgIdx * 25){
            txt.textContent = msgs[msgIdx++];
        }
    }, 120);

    // Hide splash when Firebase player data loaded (or max 4s)
    window._splashDone = function(){
        clearInterval(iv);
        if(bar) bar.style.width = '100%';
        if(txt) txt.textContent = 'Готово!';
        setTimeout(()=>{ if(splash) splash.classList.add('hidden'); }, 400);
    };

    // Safety fallback — max 4.5s
    setTimeout(()=>{ if(splash && !splash.classList.contains('hidden')) window._splashDone(); }, 4500);
})();

// Global error catch - prevent silent failures
window.onerror = function(msg, src, line, col, err) {
    console.error('CASINO ERROR:', msg, 'at', src, line, col, err);
    return false;
};
window.onunhandledrejection = function(e) {
    console.error('CASINO PROMISE ERROR:', e.reason);
};


// ============================================================
// КОНСТАНТИ
// ============================================================
const ADMINS          = [8216362223, 2067230442];
const myId            = tg.initDataUnsafe?.user?.id || 101;
const myName          = tg.initDataUnsafe?.user?.first_name || "Гравець";
const XP_BASE = 1000; // XP для 1-го рівня
function xpForLevel(lvl) {
    // Кожен рівень потребує на 30% більше ніж попередній
    return Math.round(XP_BASE * Math.pow(1.3, (lvl||1) - 1));
}

// ============================================================
// ПЕТИ — canvas малюнки + анімація
// ============================================================
// Кожен пет має функцію draw(ctx, W, H, t) де t = time для анімації

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}


// ============================================================
// СИСТЕМА ВІДОБРАЖЕННЯ ПЕТІВ — OpenMoji SVG ілюстрації
// ============================================================
// OpenMoji — безкоштовні ілюстровані emoji, виглядають як справжні малюнки

// Маппінг emoji → OpenMoji codepoint (hex unicode)
function getPetEmoji(pet) {
  const emojiMap = {
    'moonlamb':    '🌙🐑', 'moonhare':   '🌙🐇',
    'donutham':    '🍩🐹', 'honeybear':  '🍯🐻',
    'phoenixegg':  '🔥🥚', 'easterghost':'👻🐰',
  };
  return emojiMap[pet.drawKey] || pet.s;
}

// Фонові градієнти для кожної рідкості
const RARITY_BG = {
  'Звичайний':   'linear-gradient(135deg,#1e2433,#141820)',
  'Незвичайний': 'linear-gradient(135deg,#0f1e35,#0a1225)',
  'Рідкісний':   'linear-gradient(135deg,#1a0f2e,#0d0a20)',
  'Епічний':     'linear-gradient(135deg,#2a1800,#1a0f00)',
  'Легендарний': 'linear-gradient(135deg,#2a0a0a,#180505)',
  'Міфічний':    'linear-gradient(135deg,#001a2a,#000f18)',
  'Смехуятина':  'linear-gradient(135deg,#2a1000,#1a0800)',
};

// Анімації для різних рідкостей
const RARITY_ANIM = {
  'Звичайний':   '',
  'Незвичайний': 'pet-float',
  'Рідкісний':   'pet-float',
  'Епічний':     'pet-pulse',
  'Легендарний': 'pet-pulse',
  'Міфічний':    'pet-glow-anim',
  'Смехуятина':  'pet-bounce',
};

// Отримати зображення пета (кастомне фото або emoji)
function getPetImageSrc(pet) {
    const key = pet.drawKey;
    if (key && typeof PET_IMAGES !== 'undefined' && PET_IMAGES[key]) {
        return { type: 'img', src: PET_IMAGES[key] };
    }
    return { type: 'emoji', src: getPetEmoji(pet) };
}

// Малюємо красиву картку пета з кастомним фото або emoji
function createPetCardHTML(pet, size=80) {
  const glow   = RARITY_GLOW[pet.r] || '#94a3b8';
  const bg     = RARITY_BG[pet.r]   || RARITY_BG['Звичайний'];
  const radius = Math.round(size*0.18);
  const imgSrc = getPetImageSrc(pet);
  const particles = makeRarityParticles(pet.r, glow);

  // Анімація ТІЛЬКИ для emoji-петів (без фото)
  const hasPhoto = imgSrc.type === 'img';
  const anim = hasPhoto ? '' : (RARITY_ANIM[pet.r] || '');
  const animStyle = anim ? `animation:${anim} 2.5s ease-in-out infinite` : '';

  let content;
  if (hasPhoto) {
    const sz = Math.round(size * 0.90);
    // Фото без анімації. Фон контейнера завжди видно через прозорі пікселі
    content = `<img src="${imgSrc.src}"
      width="${sz}" height="${sz}"
      style="object-fit:contain;position:relative;z-index:1;display:block;flex-shrink:0"
      alt="${pet.n}">`;
  } else {
    content = `<span style="font-size:${Math.round(size*.54)}px;line-height:1;position:relative;z-index:1;${animStyle}">${imgSrc.src}</span>`;
  }

  return `<div style="
    width:${size}px;height:${size}px;background:${bg};
    border-radius:${radius}px;border:2px solid ${glow};
    box-shadow:0 0 ${Math.round(size*.2)}px ${glow}66,inset 0 0 ${Math.round(size*.1)}px ${glow}11;
    display:flex;align-items:center;justify-content:center;
    position:relative;overflow:hidden;flex-shrink:0;">${particles}${content}</div>`;
}

// Часточки/декор для рідкісних петів
function makeRarityParticles(rarity, color) {
  if (['Звичайний','Незвичайний'].includes(rarity)) return '';
  const count = rarity==='Mythic'||rarity==='Міфічний' ? 8 : 5;
  let html = '';
  for (let i=0; i<count; i++) {
    const x = 10+Math.random()*80, y = 10+Math.random()*80;
    const delay = (i*0.3).toFixed(1);
    const size  = 2+Math.random()*3;
    html += `<div style="
      position:absolute;left:${x}%;top:${y}%;
      width:${size}px;height:${size}px;
      background:${color};border-radius:50%;
      animation:particle-twinkle 2s ${delay}s ease-in-out infinite;
      opacity:0;
    "></div>`;
  }
  return html;
}

// Для canvas у кейс-рулетці — використовує кастомні фото або emoji
function drawPetCard(canvas, pet) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);
  const glow = RARITY_GLOW[pet.r] || '#94a3b8';

  // Фон
  const bgColors = {
    'Звичайний':['#1e2433','#141820'],'Незвичайний':['#0f1e35','#0a1225'],
    'Рідкісний':['#1a0f2e','#0d0a20'],'Епічний':['#2a1800','#1a0f00'],
    'Легендарний':['#2a0a0a','#180505'],'Міфічний':['#001a2a','#000f18'],
    'Смехуятина':['#2a1000','#1a0800'],
  };
  const [c1,c2]=bgColors[pet.r]||bgColors['Звичайний'];
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,c1);bg.addColorStop(1,c2);
  ctx.fillStyle=bg;roundRect(ctx,0,0,W,H,10);ctx.fill();

  // Рамка
  ctx.shadowColor=glow;ctx.shadowBlur=12;ctx.strokeStyle=glow;ctx.lineWidth=2;
  roundRect(ctx,1,1,W-2,H-2,10);ctx.stroke();ctx.shadowBlur=0;

  // Зірочки для рідкісних
  if(!['Звичайний','Незвичайний'].includes(pet.r)){
    ctx.fillStyle=glow;
    for(let i=0;i<5;i++){
      const px=W*(0.1+Math.random()*.8),py=H*(0.05+Math.random()*.55);
      ctx.globalAlpha=0.4+Math.random()*.4;
      ctx.beginPath();ctx.arc(px,py,1.5+Math.random()*2,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  const drawFallbackEmoji = () => {
    ctx.font=`${Math.floor(H*.45)}px serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(getPetEmoji(pet),W/2,H*.43);
    drawLabels();
  };
  const drawLabels = () => {
    ctx.font=`bold ${Math.max(9,Math.floor(H*.11))}px system-ui`;
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText(pet.n.length>9?pet.n.slice(0,9)+'…':pet.n,W/2,H*.82);
    ctx.font=`bold ${Math.max(7,Math.floor(H*.09))}px system-ui`;
    ctx.fillStyle=glow;ctx.fillText(pet.r,W/2,H*.94);
  };

  // Пробуємо завантажити кастомне фото
  const imgSrc = getPetImageSrc(pet);
  if (imgSrc.type === 'img') {
    const img = new Image();
    img.onload = () => {
      const sz=Math.floor(H*.58),ox=(W-sz)/2,oy=H*.05;
      ctx.drawImage(img,ox,oy,sz,sz);
      drawLabels();
    };
    img.onerror = drawFallbackEmoji;
    img.src = imgSrc.src;
    drawLabels(); // одразу малюємо текст
  } else {
    drawFallbackEmoji();
  }
}


// Анімовані картки в інвентарі — через CSS div замість canvas
const petAnimFrames = new Map();

function startPetAnim(containerId, pet) {
  // Для HUD canvas — анімована картка з фото
  if (containerId === 'p-hud-canvas') {
    const canvas = document.getElementById(containerId);
    if (!canvas) return;
    if (petAnimFrames.has(containerId)) cancelAnimationFrame(petAnimFrames.get(containerId));
    const ctx = canvas.getContext('2d');
    const W=canvas.width, H=canvas.height;
    const glow = RARITY_GLOW[pet.r]||'#94a3b8';
    const imgSrc = getPetImageSrc(pet);
    let petImg = null;
    if (imgSrc.type === 'img') {
      petImg = new Image();
      petImg.src = imgSrc.src;
    }
    let startT=null;
    function frame(ts) {
      if(!startT) startT=ts;
      const t=(ts-startT)/1000;
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle='#1a1f2e'; roundRect(ctx,0,0,W,H,10); ctx.fill();
      ctx.shadowColor=glow; ctx.shadowBlur=8;
      ctx.strokeStyle=glow; ctx.lineWidth=2;
      roundRect(ctx,1,1,W-2,H-2,10); ctx.stroke(); ctx.shadowBlur=0;
      const scale = 1+Math.sin(t*2)*0.04;
      ctx.save(); ctx.translate(W/2,H/2); ctx.scale(scale,scale);
      if (petImg && petImg.complete && petImg.naturalHeight>0) {
        const sz=Math.floor(W*.82);
        ctx.drawImage(petImg,-sz/2,-sz/2,sz,sz);
      } else {
        ctx.font=`${Math.floor(W*.6)}px serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(getPetEmoji(pet),0,0);
      }
      ctx.restore();
      petAnimFrames.set(containerId, requestAnimationFrame(frame));
    }
    petAnimFrames.set(containerId, requestAnimationFrame(frame));
    return;
  }
  // Для інвентарю — вставляємо HTML div
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = createPetCardHTML(pet, container.dataset.size||80);
}

function stopAllPetAnims() {
  petAnimFrames.forEach(id=>cancelAnimationFrame(id));
  petAnimFrames.clear();
}


// ============================================================
// КЕЙСИ
// ============================================================

// Дедлайн великоднього кейсу (14 квітня 2026, 00:00 UTC)
const DEADLINE_EASTER_CASE = new Date('2026-04-14T00:00:00Z').getTime();

const CASES = {
    basic:    { n:"Common Case 🐾", p:285, drop:[
        {n:'Собака',s:'🐶',r:'Звичайний',  m:1.05,w:40,c:'#94a3b8'},
        {n:'Кіт',   s:'🐱',r:'Звичайний',  m:1.05,w:40,c:'#94a3b8'},
        {n:'Кролик',s:'🐰',r:'Незвичайний',m:1.08,w:20,c:'#3b82f6'}]},
    uncommon: { n:"Rare Case 🌟",   p:525, drop:[
        {n:'Кролик',s:'🐰',r:'Незвичайний',m:1.08,w:46,c:'#3b82f6'},
        {n:'Лисиця',s:'🦊',r:'Незвичайний',m:1.09,w:40,c:'#3b82f6'},
        {n:'Вовк',  s:'🐺',r:'Рідкісний',  m:1.11,w:14,c:'#a855f7'}]},
    rare:     { n:"Epic Case 💎",   p:875, drop:[
        {n:'Вовк',  s:'🐺',r:'Рідкісний',  m:1.11,w:50,c:'#a855f7'},
        {n:'Бджола',s:'🐝',r:'Рідкісний',  m:1.12,w:40,c:'#a855f7'},
        {n:'Панда', s:'🐼',r:'Епічний',    m:1.14,w:10,c:'#f59e0b'}]},
    legend:   { n:"Legendary Case 👑", p:1200, drop:[
        {n:'Панда',    s:'🐼',r:'Епічний',    m:1.14,w:50,c:'#f59e0b'},
        {n:'Лев',      s:'🦁',r:'Легендарний',m:1.16,w:30,c:'#f43f5e'},
        {n:'Дракон',   s:'🐲',r:'Легендарний',m:1.17,w:20,c:'#f43f5e'}]},
    easter:   { n:"Великодній Кейс 🥚", p:1450, limited:true, deadline:DEADLINE_EASTER_CASE, drop:[
        {n:'Місячний заєць',   s:'🌙🐇',r:'Рідкісний',  m:1.165,w:33,c:'#a855f7',drawKey:'moonhare'},
        {n:'Місячний баранчик',s:'🌙🐑',r:'Рідкісний',  m:1.165,w:33,c:'#a855f7',drawKey:'moonlamb'},
        {n:'Пончик-хом\'як',   s:'🍩🐹',r:'Епічний',    m:1.22, w:20,c:'#f59e0b',drawKey:'donutham'},
        {n:'Фенікс-писанка',   s:'🔥🥚',r:'Легендарний',m:1.26, w:10,c:'#f43f5e',drawKey:'phoenixegg'},
        {n:'Привид пасхи',     s:'👻🐰',r:'Міфічний',   m:1.33, w:4, c:'#06b6d4',drawKey:'easterghost'}]},
};

const ADMIN_ONLY_PETS = [
    {n:'Клоун',              s:'🤡',r:'Смехуятина', m:1.67, c:'#ff6b35',drawKey:'clown2'},
    {n:'Смітник',            s:'🗑️',r:'Легендарний',m:1.35, c:'#f43f5e'},
    {n:'Медовий пасх. медвідь',s:'🍯🐻',r:'Епічний',m:1.25, c:'#f59e0b',drawKey:'honeybear'},
    {n:'Унітаз',             s:'🚽',r:'Епічний',    m:1.20, c:'#f59e0b',drawKey:'toilet'},
    {n:'Какашка',            s:'💩',r:'Легендарний', m:1.25, c:'#f43f5e',drawKey:'poop'},
    {n:'Нокіа3310',          s:'📱',r:'Міфічний',   m:1.32, c:'#bf40bf',drawKey:'nokia'},
    // 🌊 Океан кейс (видалений кейс, пети залишились в інвентарях)
    {n:'Рибка',              s:'🐟',r:'Рідкісний',  m:1.160,c:'#3b82f6'},
    {n:'Тропічна рибка',     s:'🐠',r:'Епічний',    m:1.195,c:'#f59e0b'},
    {n:'Акула',              s:'🦈',r:'Епічний',    m:1.150,c:'#6366f1'},
    {n:'Восьминіг',          s:'🐙',r:'Міфічний',   m:1.300,c:'#06b6d4'},
];


// ============================================================
// ЩОДЕННІ ЗАВДАННЯ
// ============================================================
const DAILY_QUESTS_DEF = [
    {id:'play5', icon:'🎮', title:'Зіграй 5 ігор',        type:'play',   need:5, reward:{type:'xp',amount:300}},
    {id:'open1', icon:'📦', title:'Відкрий 1 кейс',        type:'case',   need:1, reward:{type:'bb',amount:100}},
    {id:'win3',  icon:'🏆', title:'Виграй 3 рази поспіль', type:'winrow', need:3, reward:{type:'bb',amount:200}},
];

function todayKey(){ return new Date().toISOString().slice(0,10); }

function getDailyState(){
    if(!s.daily||s.daily.day!==todayKey())
        s.daily={day:todayKey(),play:0,case:0,winrow:0,done:{}};
    return s.daily;
}

function dailyProgress(type,amount=1){
    const d=getDailyState();
    if(type==='win')       d.winrow=(d.winrow||0)+1;
    else if(type==='lose') d.winrow=0;
    else                   d[type]=(d[type]||0)+amount;
    DAILY_QUESTS_DEF.forEach(q=>{
        if(d.done[q.id]) return;
        const cur=q.type==='winrow'?(d.winrow||0):(d[q.type]||0);
        if(cur>=q.need){
            d.done[q.id]=true;
            if(q.reward.type==='bb'){s.b+=q.reward.amount;showToast(`\u2705 Завдання виконано! +${q.reward.amount} BB`);}
            if(q.reward.type==='xp'){s.x=(s.x||0)+q.reward.amount;checkPetLevelUp();showToast(`\u2705 Завдання виконано! +${q.reward.amount} XP`);}
        }
    });
    save();
    if(document.getElementById('v-main')?.style.display!=='none') renderDailyQuests();
}

function renderDailyQuests(){
    const el=document.getElementById('daily-quests-card');
    if(!el) return;
    const d=getDailyState();
    const now=new Date(),midnight=new Date(now);
    midnight.setHours(24,0,0,0);
    const diff=midnight-now;
    const hh=Math.floor(diff/3600000),mm=Math.floor((diff%3600000)/60000);
    const rows=DAILY_QUESTS_DEF.map(q=>{
        const done=!!d.done[q.id];
        const cur=Math.min(q.type==='winrow'?(d.winrow||0):(d[q.type]||0),q.need);
        const pct=Math.round(cur/q.need*100);
        const rwStr=q.reward.type==='bb'?`+${q.reward.amount} BB`:`+${q.reward.amount} XP`;
        return `<div class="dq-row${done?' dq-done':''}">
            <div class="dq-icon">${q.icon}</div>
            <div class="dq-info">
                <div class="dq-title-q">${q.title}</div>
                <div class="dq-bar-wrap"><div class="dq-bar" style="width:${pct}%"></div></div>
                <div class="dq-sub">${cur}/${q.need} &middot; <b style="color:var(--accent2)">${rwStr}</b></div>
            </div>
            ${done?'<div class="dq-check">\u2705</div>':''}
        </div>`;
    }).join('');
    el.innerHTML=`<div class="dq-header">
        <span class="dq-title-main">\uD83D\uDCCB Щоденні завдання</span>
        <span class="dq-timer">\uD83D\uDD04 ${hh}г ${mm}хв</span>
    </div>${rows}`;
}

// ============================================================
// РЕФЕРАЛЬНА СИСТЕМА
// ============================================================
function getRefCode(){
    if(!s.refCode){
        s.refCode='BEAR'+String(myId).slice(-4)+Math.random().toString(36).slice(2,5).toUpperCase();
        save();
    }
    return s.refCode;
}

window.applyRef=async function(){
    const code=(document.getElementById('ref-inp')?.value||'').trim().toUpperCase();
    if(!code) return;
    if(code===getRefCode()) return showToast('\u274C Не можна використати власний код!');
    if(s.refUsed) return showToast('\u274C Ти вже використав реферальний код!');
    const snap=await db.ref('players').orderByChild('refCode').equalTo(code).once('value');
    if(!snap.exists()) return showToast('\u274C Код не знайдено');
    const [refUid]=Object.entries(snap.val())[0];
    if(String(refUid)===String(myId)) return showToast('\u274C Не можна використати власний код!');
    const bonus=250;
    s.b+=bonus; s.refUsed=code; save();
    db.ref('players/'+refUid+'/b').transaction(c=>(c||0)+bonus);
    db.ref('players/'+refUid+'/refCount').transaction(c=>(c||0)+1);
    showToast(`\uD83C\uDF89 +${bonus} BB тобі і другу!`);
    renderSettings();
};

// ============================================================
// ПОКЕДЕКС
// ============================================================
function getAllPetsForDex(){
    const all=[];
    const seen=new Set();
    Object.values(CASES).forEach(c=>c.drop.forEach(p=>{
        if(!seen.has(p.n)){all.push(p);seen.add(p.n);}
    }));
    // Додаємо всіх петів з інвентаря гравця (щоб адмін-пети теж відображались)
    (s.inv||[]).forEach(p=>{
        if(!seen.has(p.n)){all.push({...p,w:0});seen.add(p.n);}
    });
    return all;
}

let showingDex=false;
window.togglePokedex=function(){showingDex=!showingDex;renderInv();};

function renderPokedex(){
    const all=getAllPetsForDex();
    const owned=new Set(s.inv.map(p=>p.n));
    const byRarity={};
    all.forEach(p=>{if(!byRarity[p.r])byRarity[p.r]=[];byRarity[p.r].push(p);});
    const rarityOrder=['Звичайний','Незвичайний','Рідкісний','Епічний','Легендарний','Міфічний','Смехуятина'];
    const total=all.length,gotCount=all.filter(p=>owned.has(p.n)).length;
    let h=`<button class="btn-s" style="width:100%;margin-bottom:12px" onclick="togglePokedex()">\u2190 Назад до інвентаря</button>
    <div style="text-align:center;margin-bottom:12px;font-size:13px;color:var(--muted);font-weight:700">${gotCount} / ${total} петів зібрано</div>`;
    rarityOrder.forEach(rar=>{
        if(!byRarity[rar]) return;
        h+=`<div style="font-size:9px;font-weight:700;letter-spacing:1px;color:${RARITY_GLOW[rar]||'var(--muted)'};text-transform:uppercase;margin:10px 0 6px">${rar}</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:4px">`;
        byRarity[rar].forEach(p=>{
            const have=owned.has(p.n);
            const imgSrc=getPetImageSrc(p);
            const img=imgSrc.type==='img'
                ?`<img src="${imgSrc.src}" style="width:36px;height:36px;object-fit:contain;${have?'':'filter:grayscale(1) opacity(.3)'}">`
                :`<span style="font-size:26px;${have?'':'filter:grayscale(1) opacity(.3)'}">${p.s}</span>`;
            h+=`<div style="background:${have?p.c+'18':'rgba(255,255,255,.03)'};border:1px solid ${have?p.c+'44':'rgba(255,255,255,.06)'};border-radius:10px;padding:8px 4px;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px">
                ${img}
                <div style="font-size:9px;font-weight:700;color:${have?p.c:'var(--muted)'};line-height:1.2">${p.n}</div>
                ${have?`<div style="font-size:8px;color:var(--muted)">x${p.m.toFixed(2)}</div>`:''}
            </div>`;
        });
        h+=`</div>`;
    });
    h+=`<div class="glass" style="margin-top:12px"><div class="card-title">\uD83C\uDF81 Бонуси за повну колекцію</div>`;
    rarityOrder.forEach(rar=>{
        if(!byRarity[rar]) return;
        const cnt=byRarity[rar].length,got=byRarity[rar].filter(p=>owned.has(p.n)).length;
        const full=got===cnt,bonus=Math.round(cnt*50);
        h+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05)">
            <span style="font-size:12px;color:${RARITY_GLOW[rar]||'var(--muted)'}">${rar} (${got}/${cnt})</span>
            <span style="font-size:11px;font-weight:700;color:${full?'var(--success)':'var(--muted)'}">+${bonus} BB ${full?'\u2705':'\uD83D\uDD12'}</span>
        </div>`;
    });
    h+=`</div>`;
    return h;
}

// ============================================================
// ПІДПИСКИ НА КАНАЛИ
// ============================================================
window.renderChannels=async function(){
    const el=document.getElementById('channels-wrap');
    if(!el) return;
    const snap=await db.ref('channels').once('value');
    const channels=snap.val()||{};
    if(!Object.keys(channels).length){
        el.innerHTML=`<div style="text-align:center;color:var(--muted);padding:16px;font-size:13px">Немає активних підписок</div>`;
        return;
    }
    const claimed=s.claimedChannels||{};
    // Зберігаємо які посилання клікнув гравець (локально)
    if(!window._chClicked) window._chClicked={};
    el.innerHTML=Object.entries(channels).map(([id,ch])=>{
        const done=!!claimed[id];
        const rwStr=ch.rewardType==='bb'?`+${ch.reward} BB`:`+${ch.reward} XP`;
        const clicked=!!window._chClicked[id];
        return `<div class="sett-card" style="margin-bottom:8px;flex-direction:column;align-items:flex-start;gap:8px">
            <div style="display:flex;align-items:center;gap:10px;width:100%">
                <span style="font-size:22px">📢</span>
                <div style="flex:1"><div style="font-weight:700;font-size:14px">${ch.name}</div>
                <div style="font-size:11px;color:var(--muted)">Нагорода: <b style="color:var(--accent2)">${rwStr}</b></div></div>
                ${done?'<span style="color:var(--success);font-size:13px;font-weight:700">✅</span>':''}
            </div>
            ${!done?`<div style="display:flex;gap:7px;width:100%">
                <a href="${ch.url}" target="_blank" style="flex:1;padding:9px;border-radius:9px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--text);font-size:12px;font-weight:700;text-align:center;text-decoration:none"
                   onclick="window._chClicked['${id}']=Date.now();setTimeout(()=>window.renderChannels(),500)">🔗 Підписатись</a>
                <button class="btn" style="flex:1;padding:9px;font-size:12px;font-family:inherit;${!clicked?'opacity:.4;cursor:not-allowed':''}"
                   onclick="${clicked?`claimChannel('${id}')`:'showToast(\"⚠️ Спочатку натисни Підписатись!\")'}">${clicked?'✅ Отримати':'🔒 Отримати'}</button>
            </div>
            ${clicked?`<div style="font-size:10px;color:var(--success);width:100%">✔ Посилання відкрито — тепер натисни Отримати</div>`:
            `<div style="font-size:10px;color:var(--muted);width:100%">⚠️ Спочатку підпишись на канал, потім натисни Отримати</div>`}
            `:''}
        </div>`;
    }).join('');
};

window.claimChannel=async function(id){
    if((s.claimedChannels||{})[id]) return showToast('Вже отримано!');
    // Перевірка що гравець натиснув посилання
    if(!window._chClicked||!window._chClicked[id]) return showToast('⚠️ Спочатку натисни кнопку Підписатись!');
    const snap=await db.ref('channels/'+id).once('value');
    const ch=snap.val();
    if(!ch) return;
    if(!s.claimedChannels) s.claimedChannels={};
    s.claimedChannels[id]=true;
    let rewardMsg='';
    // Підтримка кількох нагород: rewards масив або одна нагорода
    const rewards=ch.rewards||[{type:ch.rewardType||'bb',amount:ch.reward}];
    rewards.forEach(rw=>{
        if(rw.type==='bb'){s.b+=rw.amount;rewardMsg+=`+${rw.amount} BB `;}
        else if(rw.type==='xp'){s.x=(s.x||0)+rw.amount;checkPetLevelUp();rewardMsg+=`+${rw.amount} XP `;}
        else if(rw.type==='pet'&&rw.pet){const p={...rw.pet,id:Date.now(),lvl:1};s.inv.push(p);rewardMsg+=`${p.s||''}${p.n} `;}
    });
    save();
    showToast(`🎉 Дякуємо за підписку! ${rewardMsg.trim()}`);
    window.renderChannels();
};

// ============================================================
// ТЕМИ
// ============================================================
const THEMES = {
    gold:   {name:'🏆 Золото',  a:'#d4a017',a2:'#f0c840',bg:'#07090a',btnTxt:'#0a0800'},
    blue:   {name:'💎 Сапфір',  a:'#58a6ff',a2:'#93c5fd',bg:'#030810',btnTxt:'#fff'},
    purple: {name:'🔮 Аметист', a:'#a855f7',a2:'#c084fc',bg:'#07050f',btnTxt:'#fff'},
    green:  {name:'🌿 Смарагд', a:'#22c55e',a2:'#4ade80',bg:'#030c05',btnTxt:'#000'},
    red:    {name:'🔥 Рубін',   a:'#ef4444',a2:'#f87171',bg:'#0c0303',btnTxt:'#fff'},
};
let currentTheme = localStorage.getItem('bc_theme') || 'gold';
let currentLang  = localStorage.getItem('bc_lang')  || 'uk';

function applyTheme(key) {
    const t=THEMES[key]||THEMES.gold;
    const r=document.documentElement.style;
    r.setProperty('--accent',  t.a);
    r.setProperty('--accent2', t.a2);
    r.setProperty('--bg',      t.bg);
    r.setProperty('--btn-txt', t.btnTxt);
    // Логотип — завжди градієнт з кольорів поточної теми
    const logo=document.querySelector('.logo');
    if(logo) logo.style.backgroundImage=`linear-gradient(90deg,${t.a},${t.a2},${t.a},${t.a2},${t.a})`;
    // Баланс чіп
    const balChip=document.querySelector('.bal-chip');
    if(balChip){
        balChip.style.background=`rgba(${hexToRgb(t.a)},.1)`;
        balChip.style.borderColor=`rgba(${hexToRgb(t.a)},.3)`;
        balChip.style.color=t.a2;
    }
    // Splash bar
    const sb=document.getElementById('splash-bar');
    if(sb) sb.style.background=`linear-gradient(90deg,${t.a},${t.a2})`;
    currentTheme=key; localStorage.setItem('bc_theme',key);
}

function hexToRgb(hex){
    const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    return `${r},${g},${b}`;
}

// ============================================================
// МОВА
// ============================================================
const LANGS = {
    uk:{
        chooseGame:'ОБЕРИ ГРУ',betLbl:'СТАВКА',betBtn:'ЗРОБИТИ СТАВКУ',
        win:'Переміг!',lose:'Програв!',waiting:'⏳ Очікування...',
        spinning:'🎰 Крутимо...',openCells:'⚡ Відкривай клітинки!',
        minesBoom:'Бум! Міна!',
        take:'💰 ЗАБРАТИ',round:'РАУНД',prize:'Приз:',
        myPets:'🎒 МОЇ ПЕТИ',leaders:'🏆 ЛІДЕРИ',admin:'⚡ АДМІН',
        settings:'⚙️ Налаштування',theme:'Тема',lang:'Мова',
        invEmpty:'Інвентар порожній',invEmptySub:'Відкривай кейси в магазині!',
        loading:'Завантаження...',marketEmpty:'На ринку порожньо',
        saved:'✅ Збережено!',chosen:'ВИБРАНЕ ЧИСЛО',
        g_f50:'⚖️ 50/50 (x1.55)',g_dice:'🎲 Кубик (x2.05)',
        g_wheel:'🎡 Колесо (до x1.6)',g_slots:'🎰 Слоти (до x5.0)',
        g_mines:'💣 Міни (до x4.0)',
        g_bj:'🃏 Блекджек (x2.0)',
        navShop:'📦',navInv:'🎒',navTop:'🏆',navSet:'⚙️',
        tabCases:'📦 Кейси',tabMarket:'🛒 Ринок',
        dealer:'ДИЛЕР',you:'ВИ',hit:'ЩЕ',stand:'СТОП',
        bonusLabel:'БОНУС',lvlLabel:'LVL',
        adminBalance:'Баланс',adminPets:'Пети',adminInv:'Інвентар',
        equip:'Взяти',equipped:'✅',bonusWord:'Бонус',
        roundsAndMults:'РАУНДИ ТА МНОЖНИКИ',pressToStart:'Натисни ЗРОБИТИ СТАВКУ щоб почати',
        popsCount:'Лопань:',bjBust:'Перебір!',bjWin:'Виграш!',bjLose:'Програш',
        anon:'Анонім',petsCount:'Петів:',viewInv:'🎒 Переглянути',empty:'Порожньо',
        activePet:'Активний',confirmDelete:'Видалити',given:'Видано!',
        invCountLabel:'ПЕТІВ',
        back:'← Назад',petsOf:'петів',noPet:'Обери пета',noPetRarity:'НЕМАЄ',
        bonusLabelHud:'БОНУС',openingCase:'ВІДКРИВАЄМО...',
        music:'Музика',musicOn:'🔊 Увімк.',musicOff:'🔇 Вимк.',
    },
    en:{
        chooseGame:'CHOOSE GAME',betLbl:'BET',betBtn:'PLACE BET',
        win:'Won!',lose:'Lost!',waiting:'⏳ Waiting...',
        spinning:'🎰 Spinning...',openCells:'⚡ Open cells!',
        minesBoom:'Boom! Mine!',
        take:'💰 TAKE',round:'ROUND',prize:'Prize:',
        myPets:'🎒 MY PETS',leaders:'🏆 LEADERS',admin:'⚡ ADMIN',
        settings:'⚙️ Settings',theme:'Theme',lang:'Language',
        invEmpty:'Inventory empty',invEmptySub:'Open cases in the shop!',
        loading:'Loading...',marketEmpty:'Market is empty',
        saved:'✅ Saved!',chosen:'CHOSEN NUMBER',
        g_f50:'⚖️ 50/50 (x1.55)',g_dice:'🎲 Dice (x2.05)',
        g_wheel:'🎡 Wheel (up to x1.6)',g_slots:'🎰 Slots (up to x5.0)',
        g_mines:'💣 Mines (up to x4.0)',
        g_bj:'🃏 Blackjack (x2.0)',
        navShop:'📦',navInv:'🎒',navTop:'🏆',navSet:'⚙️',
        tabCases:'📦 Cases',tabMarket:'🛒 Market',
        dealer:'DEALER',you:'YOU',hit:'HIT',stand:'STAND',
        bonusLabel:'BONUS',lvlLabel:'LVL',
        adminBalance:'Balance',adminPets:'Pets',adminInv:'Inventory',
        equip:'Equip',equipped:'✅',bonusWord:'Bonus',
        roundsAndMults:'ROUNDS & MULTIPLIERS',pressToStart:'Press PLACE BET to start',
        popsCount:'Pops:',bjBust:'Bust!',bjWin:'Win!',bjLose:'Loss',
        anon:'Anonymous',petsCount:'Pets:',viewInv:'🎒 View',empty:'Empty',
        activePet:'Active',confirmDelete:'Delete',given:'Given!',
        invCountLabel:'PETS',
        back:'← Back',petsOf:'pets',noPet:'Choose a pet',noPetRarity:'NONE',
        bonusLabelHud:'BONUS',openingCase:'OPENING...',
        music:'Music',musicOn:'🔊 On',musicOff:'🔇 Off',
    },
    ru:{
        chooseGame:'ВЫБЕРИ ИГРУ',betLbl:'СТАВКА',betBtn:'СДЕЛАТЬ СТАВКУ',
        win:'Победил!',lose:'Проиграл!',waiting:'⏳ Ожидание...',
        spinning:'🎰 Крутим...',openCells:'⚡ Открывай клетки!',
        minesBoom:'Бум! Мина!',
        take:'💰 ЗАБРАТЬ',round:'РАУНД',prize:'Приз:',
        myPets:'🎒 МОИ ПИТОМЦЫ',leaders:'🏆 ЛИДЕРЫ',admin:'⚡ АДМИН',
        settings:'⚙️ Настройки',theme:'Тема',lang:'Язык',
        invEmpty:'Инвентарь пуст',invEmptySub:'Открывай кейсы в магазине!',
        loading:'Загрузка...',marketEmpty:'Рынок пуст',
        saved:'✅ Сохранено!',chosen:'ВЫБРАННОЕ ЧИСЛО',
        g_f50:'⚖️ 50/50 (x1.55)',g_dice:'🎲 Кубик (x2.05)',
        g_wheel:'🎡 Колесо (до x1.6)',g_slots:'🎰 Слоты (до x5.0)',
        g_mines:'💣 Мины (до x4.0)',
        g_bj:'🃏 Блекджек (x2.0)',
        navShop:'📦',navInv:'🎒',navTop:'🏆',navSet:'⚙️',
        tabCases:'📦 Кейсы',tabMarket:'🛒 Рынок',
        dealer:'ДИЛЕР',you:'ВЫ',hit:'ЕЩЁ',stand:'СТОП',
        bonusLabel:'БОНУС',lvlLabel:'УРВ',
        adminBalance:'Баланс',adminPets:'Питомцы',adminInv:'Инвентарь',
        equip:'Взять',equipped:'✅',bonusWord:'Бонус',
        roundsAndMults:'РАУНДЫ И МНОЖИТЕЛИ',pressToStart:'Нажми СДЕЛАТЬ СТАВКУ чтобы начать',
        popsCount:'Взрывов:',bjBust:'Перебор!',bjWin:'Выигрыш!',bjLose:'Проигрыш',
        anon:'Аноним',petsCount:'Питомцев:',viewInv:'🎒 Просмотр',empty:'Пусто',
        activePet:'Активный',confirmDelete:'Удалить',given:'Выдано!',
        invCountLabel:'ПИТОМЦЕВ',
        back:'← Назад',petsOf:'питомцев',noPet:'Выбери питомца',noPetRarity:'НЕТ',
        bonusLabelHud:'БОНУС',openingCase:'ОТКРЫВАЕМ...',
        music:'Музыка',musicOn:'🔊 Вкл.',musicOff:'🔇 Выкл.',
    },
};
function L(k){return(LANGS[currentLang]||LANGS.uk)[k]||k;}

function applyLang(lang){
    currentLang=lang; localStorage.setItem('bc_lang',lang);
    // Select options
    const sel=document.getElementById('g-sel');
    if(sel){
        const keys=['g_f50','g_dice','g_wheel','g_slots','g_mines','g_bj',];
        [...sel.options].forEach((o,i)=>{if(keys[i])o.text=L(keys[i]);});
    }
    // data-l elements
    document.querySelectorAll('[data-l]').forEach(el=>el.textContent=L(el.dataset.l));
    // IDs
    const ids={
        'btn-play':'betBtn','inv-heading':'myPets','top-heading':'leaders',
        'sett-heading':'settings','admin-heading':'admin',
        'bj-dealer-lbl':'dealer','bj-you-lbl':'you',
        'bj-hit':'hit','bj-stop':'stand',
        'pet-bonus-lbl':'bonusLabelHud','case-title':'openingCase',
    };
    Object.entries(ids).forEach(([id,key])=>{
        const el=document.getElementById(id); if(el) el.textContent=L(key);
    });
    // Re-render open pages
    ren();
    if(document.getElementById('v-settings')?.style.display!=='none') renderSettings();
    if(document.getElementById('v-shop')?.style.display!=='none') renderShop();
    if(document.getElementById('v-inv')?.style.display!=='none') renderInv();
    buildDiceUI();
}

// ============================================================
// СТАН
// ============================================================
let s={b:0,x:0,r:1,name:myName,p:null,inv:[],dbl:0,v:6.0};
let currentShopTab='cases',currentAdminTab='balance';
let adminInvUserId=null,adminInvUserName='';

// FIREBASE SYNC
let _splashFired = false;
let _saving = false;
let _saveTimer = null;
function save(){
    _saving = true;
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(()=>{ _saving = false; }, 2000);
    db.ref('players/'+myId).set(s);
}

db.ref('players/'+myId).on('value',snap=>{
    const d=snap.val();
    if(d){
        // Якщо щойно зберігали — не перезаписуємо локальний стан
        // щоб Firebase не відкотив зміни балансу назад
        if(_saving){
            // Оновлюємо тільки те що не може змінитись локально
            // (наприклад дані від інших гравців — але для поточного гравця пропускаємо)
            ren();
            if(!_splashFired){ _splashFired=true; if(window._splashDone) window._splashDone(); }
            return;
        }
        // Зберігаємо локальні дані що можуть бути новіші ніж у Firebase
        const curDaily = s.daily;
        const curAdoptPurchases = s.adoptPurchases;
        s=d;
        if(!s.inv)s.inv=[];
        // Якщо локальний daily новіший (той самий день) — залишаємо його
        if(curDaily && curDaily.day === todayKey() && (!s.daily || s.daily.day !== todayKey())){
            s.daily = curDaily;
        }
        // Якщо локальний adoptPurchases має більше покупок — мерджимо (беремо максимум)
        if(curAdoptPurchases){
            if(!s.adoptPurchases) s.adoptPurchases={};
            Object.entries(curAdoptPurchases).forEach(([id,qty])=>{
                if((s.adoptPurchases[id]||0) < qty) s.adoptPurchases[id]=qty;
            });
        }
    }
    else{db.ref('players/'+myId).set(s);}
    ren();
    if(!_splashFired){ _splashFired=true; if(window._splashDone) window._splashDone(); }
});

// ============================================================
// XP / LEVELUP
// ============================================================
function checkPetLevelUp(){
    if(!s.p) return;
    let levelled = false;
    // Цикл — пет може підняти кілька рівнів за раз
    while(s.x >= xpForLevel(s.p.lvl||1)){
        const needed = xpForLevel(s.p.lvl||1);
        s.x  -= needed;
        s.p.lvl = (s.p.lvl||1) + 1;
        s.p.m   = Math.round((s.p.m + 0.005)*1000)/1000;
        levelled = true;
    }
    if(levelled){
        const idx = s.inv.findIndex(i=>i.id===s.p.id);
        if(idx!==-1) s.inv[idx] = s.p;
        save();
        showToast(`${getPetEmoji(s.p)} <b>${s.p.n}</b> — LVL ${s.p.lvl}! <span style="color:var(--accent)">+0.005 бонус</span>`);
        ren();
    }
}
function showToast(html){
    const t=document.createElement('div');
    t.innerHTML=html; t.className='toast';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}

// ============================================================
// РЕНДЕР
// ============================================================
const RARITY_GLOW={
    'Звичайний':'#94a3b8','Незвичайний':'#3b82f6','Рідкісний':'#a855f7',
    'Епічний':'#f59e0b','Легендарний':'#f43f5e','Міфічний':'#06b6d4',
    'Смехуятина':'#ff6b35',
};

function ren(){
    try {
    // Баланс BB
    document.getElementById('bal-val').innerText = Number.isInteger(s.b) ? s.b : s.b.toFixed(2);

    // Дублони
    const dblEl = document.getElementById('dbl-val');
    if(dblEl) dblEl.innerText = s.dbl || 0;

    const petLvl  = s.p ? (s.p.lvl||1) : 1;
    const needed  = xpForLevel(petLvl);
    const pct     = Math.min((s.x / needed)*100, 100);

    // XP бар з анімацією
    const xpFill = document.getElementById('xp-f');
    if (xpFill) xpFill.style.width = pct + '%';

    // XP текст
    const xpText = document.getElementById('xp-text');
    if (xpText) xpText.textContent = `${s.x} / ${needed} XP`;

    // Бонус лейбл
    const bonusLbl = document.getElementById('pet-bonus-lbl');
    if (bonusLbl) bonusLbl.textContent = L('bonusLabelHud');

    const hudWrap = document.getElementById('p-hud-wrap');

    if (s.p) {
        if (hudWrap) {
            const imgSrc = getPetImageSrc(s.p);
            if (imgSrc.type === 'img') {
                hudWrap.innerHTML = `<img src="${imgSrc.src}" style="width:52px;height:52px;object-fit:contain;">`;
            } else {
                hudWrap.innerHTML = `<span style="font-size:34px;animation:pet-float 3s ease-in-out infinite">${imgSrc.src}</span>`;
            }
        }
        document.getElementById('p-name').innerText  = s.p.n;
        document.getElementById('p-m').innerText     = 'x' + s.p.m.toFixed(3);
        document.getElementById('p-l').innerText     = s.p.lvl || 1;
        const rb = document.getElementById('p-rarity');
        rb.innerText = s.p.r;
        rb.style.background = (s.p.c||'#94a3b8') + '22';
        rb.style.color = s.p.c || '#94a3b8';
        rb.style.border = `1px solid ${s.p.c||'#94a3b8'}44`;
    } else {
        if (hudWrap) hudWrap.innerHTML = `<span style="font-size:34px">🥚</span>`;
        document.getElementById('p-name').innerText = L('noPet');
        document.getElementById('p-m').innerText    = 'x1.000';
        document.getElementById('p-l').innerText    = '1';
        const rb = document.getElementById('p-rarity');
        rb.innerText = L('noPetRarity');
        rb.style.background = 'rgba(107,114,128,.2)';
        rb.style.color = '#9ca3af';
        rb.style.border = '1px solid rgba(107,114,128,.3)';
    }

    if (ADMINS.includes(Number(myId)))
        document.getElementById('admin-tab').style.display = 'flex';

    // Daily quests
    renderDailyQuests();
    } catch(e) { console.error('ren() error:', e); }
}

// ============================================================
// НАВІГАЦІЯ
// ============================================================
window.tab=(t,el)=>{
    stopAllPetAnims();
    document.querySelectorAll('.page').forEach(p=>p.style.display='none');
    document.querySelectorAll('.nav-tab').forEach(n=>n.classList.remove('active'));
    document.getElementById('v-'+t).style.display='block';
    el.classList.add('active');
    if(t==='shop')     renderShop();
    if(t==='inv')      renderInv();
    if(t==='top')      loadTop();
    if(t==='admin')    loadAdmin();
    if(t==='settings') renderSettings();
};

// ============================================================
// МАГАЗИН
// ============================================================
window.setShopTab=t=>{currentShopTab=t;renderShop();};
function renderShop(){
    const list=document.getElementById('shop-list');
    const tabs=`<div class="shop-tabs">
        <div class="s-tab ${currentShopTab==='cases'?'active':''}" onclick="setShopTab('cases')">${L('tabCases')}</div>
        <div class="s-tab ${currentShopTab==='adoptme'?'active':''}" onclick="setShopTab('adoptme')">🐾 Adopt Me <span style="background:#ef4444;color:#fff;font-size:9px;font-weight:800;padding:1px 5px;border-radius:4px;margin-left:3px;vertical-align:middle">NEW</span></div>
        <div class="s-tab ${currentShopTab==='market'?'active':''}" onclick="setShopTab('market')">${L('tabMarket')}</div>
    </div>`;
    if(currentShopTab==='cases'){
        let h=tabs; const now=Date.now();
        for(const k in CASES){
            const c=CASES[k];
            const dl=c.deadline||0;
            if(c.limited&&now>dl) continue;
            const badge=c.limited?'<span class="badge-ltd">Лімітовано</span>':'';
            const chances = c.drop.map(p => {
                const imgSrc = getPetImageSrc(p);
                const petIcon = imgSrc.type === 'img'
                    ? `<img src="${imgSrc.src}" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:2px">`
                    : `<span style="font-size:14px;vertical-align:middle;margin-right:1px">${p.s}</span>`;
                return `<span style="color:${p.c}">${petIcon}${p.w}%</span>`;
            }).join(' · ');
            let timer='';
            if(c.limited){const diff=dl-now,d=Math.floor(diff/86400000),hr=Math.floor((diff/3600000)%24),mn=Math.floor((diff/60000)%60);timer=`<div class="case-timer">⏳ ${d}д ${hr}г ${mn}хв</div>`;}
            h+=`<div class="shop-card"><div class="case-info">
                <div class="case-name">${c.n} ${badge}</div>
                <div style="font-size:10px;margin:4px 0;font-weight:600;opacity:.85">${chances}</div>${timer}
            </div><button class="btn-buy" onclick="buyCase('${k}')">${c.p} BB</button></div>`;
        }
        list.innerHTML=h;
    } else if(currentShopTab==='adoptme'){
        list.innerHTML=tabs+`<div id="adoptme-list" class="card" style="text-align:center;color:var(--muted)">Завантаження...</div>`;
        renderAdoptMe();
    } else {
        list.innerHTML=tabs+`<div id="m-list" class="card" style="text-align:center;color:var(--muted)">${L('loading')}</div>`;
        db.ref('market').once('value',snap=>{
            let myLots='', otherLots='';
            snap.forEach(child=>{
                const lot=child.val();
                if(!lot||!lot.pet) return;
                const imgSrc=getPetImageSrc(lot.pet);
                const icon = imgSrc.type==='img'
                    ? `<img src="${imgSrc.src}" width="38" height="38" style="object-fit:contain;border-radius:8px;flex-shrink:0">`
                    : `<span style="font-size:28px;flex-shrink:0">${lot.pet.s}</span>`;
                if(String(lot.sellerId)===String(myId)){
                    myLots+=`<div class="market-item">
                        ${icon}
                        <div style="flex:1">
                            <div style="font-weight:700;color:${lot.pet.c};font-size:13px">${lot.pet.n}</div>
                            <div style="font-size:11px;color:var(--muted)">Твій лот · <b style="color:var(--accent2)">${lot.price} BB</b></div>
                        </div>
                        <button class="btn-ghost" style="color:var(--error);border-color:rgba(239,68,68,.3);font-size:11px;padding:7px 10px" onclick="cancelMarketLot('${child.key}')">✕ Забрати</button>
                    </div>`;
                } else {
                    otherLots+=`<div class="market-item">
                        ${icon}
                        <div style="flex:1">
                            <div style="font-weight:700;color:${lot.pet.c};font-size:13px">${lot.pet.n}</div>
                            <div style="font-size:11px;color:var(--muted)">LVL ${lot.pet.lvl||1} · x${lot.pet.m.toFixed(3)} · ${lot.sellerName}</div>
                        </div>
                        <button class="btn-buy" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button>
                    </div>`;
                }
            });
            let result='';
            if(myLots) result+=`<div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin-bottom:8px">МОЇ ЛОТИ</div>${myLots}<div style="height:1px;background:rgba(255,255,255,.06);margin:12px 0"></div>`;
            result+=otherLots||`<div style="padding:20px;text-align:center;color:var(--muted)">${L('marketEmpty')}</div>`;
            const el=document.getElementById('m-list');
            if(el) el.innerHTML=result;
        });
    }
}
// ============================================================
// ADOPT ME SHOP
// ============================================================
async function renderAdoptMe(){
    const el=document.getElementById('adoptme-list');
    if(!el) return;
    const snap=await db.ref('adoptme').once('value');
    const items=snap.val()||{};
    const keys=Object.keys(items);
    if(!keys.length){
        el.innerHTML=`<div style="text-align:center;padding:30px;color:var(--muted)">
            <div style="font-size:40px;margin-bottom:10px">🐾</div>
            <div style="font-weight:700">Магазин порожній</div>
            <div style="font-size:12px;margin-top:6px">Незабаром тут з'являться товари!</div>
        </div>`;
        return;
    }
    const myPurchases=s.adoptPurchases||{};
    let h='<div style="display:flex;flex-direction:column;gap:10px">';
    keys.forEach(id=>{
        const item=items[id];
        if(!item||item.hidden) return;
        const totalBought=item.totalBought||0;
        const myBought=myPurchases[id]||0;
        const limitPerUser=item.limitPerUser||0;
        const limitTotal=item.limitTotal||0;
        const soldOut=(limitTotal>0 && totalBought>=limitTotal);
        const myLimitReached=(limitPerUser>0 && myBought>=limitPerUser);
        const blocked=soldOut||myLimitReached;
        let maxCanBuy=99;
        if(limitPerUser>0) maxCanBuy=Math.min(maxCanBuy, limitPerUser-myBought);
        if(limitTotal>0)   maxCanBuy=Math.min(maxCanBuy, limitTotal-totalBought);
        if(maxCanBuy<1)    maxCanBuy=1;
        const stockLine=limitTotal>0
            ? `📦 ${soldOut?`<span style="color:var(--error)">Розпродано</span>`:`<span style="color:var(--accent2)">${totalBought}/${limitTotal} куплено</span>`}`
            : `📦 <span style="color:var(--muted)">Необмежено</span>`;
        const myLine=myBought>0
            ? `&nbsp;·&nbsp;<span style="color:var(--accent)">Ти купив: <b>${myBought}</b>${limitPerUser>0?' / '+limitPerUser:''}</span>`
            : (limitPerUser>0?`&nbsp;·&nbsp;<span style="color:var(--muted)">Ліміт: ${limitPerUser}</span>`:'');
        h+=`<div style="background:rgba(255,255,255,.04);border:1px solid ${blocked?'rgba(255,255,255,.07)':'rgba(255,200,50,.18)'};border-radius:14px;padding:14px">
            <div style="display:flex;align-items:flex-start;gap:12px">
                <div style="font-size:38px;flex-shrink:0;line-height:1">${item.icon||'🎁'}</div>
                <div style="flex:1;min-width:0">
                    <div style="font-weight:800;font-size:14px;color:#fff;margin-bottom:3px">${item.name}</div>
                    ${item.desc?`<div style="font-size:11px;color:var(--muted);margin-bottom:5px;line-height:1.4">${item.desc}</div>`:''}
                    <div style="font-size:10px;font-weight:700;margin-bottom:8px">${stockLine}${myLine}</div>
                    ${!blocked?`
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                        <div style="display:flex;align-items:center;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;overflow:hidden;flex-shrink:0">
                            <button onclick="amQty('${id}',-1,${maxCanBuy})" style="background:none;border:none;color:#fff;font-size:20px;padding:4px 12px;cursor:pointer;line-height:1">−</button>
                            <span id="am-qty-${id}" style="min-width:30px;text-align:center;font-weight:800;font-size:15px;color:#fff">1</span>
                            <button onclick="amQty('${id}',1,${maxCanBuy})" style="background:none;border:none;color:#fff;font-size:20px;padding:4px 12px;cursor:pointer;line-height:1">+</button>
                        </div>
                        <div style="flex:1;min-width:60px">
                            <div style="font-size:10px;color:var(--muted)">Разом:</div>
                            <div id="am-total-${id}" style="font-weight:900;font-size:15px;color:var(--accent2)">${item.price} BB</div>
                        </div>
                        <button class="btn-buy" onclick="buyAdoptMe('${id}',${item.price},${maxCanBuy})">🛒 Купити</button>
                    </div>`:`
                    <div style="font-size:12px;font-weight:700;color:var(--error)">${soldOut?'❌ Розпродано':'❌ Досяг ліміту'}</div>`}
                </div>
            </div>
        </div>`;
    });
    h+='</div>';
    el.innerHTML=h;
}

window.amQty=function(id,delta,maxCanBuy){
    maxCanBuy=maxCanBuy||99;
    const el=document.getElementById('am-qty-'+id);
    const totalEl=document.getElementById('am-total-'+id);
    if(!el) return;
    let qty=parseInt(el.textContent)||1;
    qty=Math.max(1,Math.min(maxCanBuy,qty+delta));
    el.textContent=qty;
    if(totalEl){
        const btn=document.querySelector(`[onclick*="buyAdoptMe('${id}'"]`);
        if(btn){
            const m=btn.getAttribute('onclick').match(/buyAdoptMe\('[^']+',(\d+)/);
            if(m) totalEl.textContent=(parseInt(m[1])*qty)+' BB';
        }
    }
};

window.buyAdoptMe=async function(id,priceArg,maxCanBuy){
    const qtyEl=document.getElementById('am-qty-'+id);
    const qty=qtyEl?Math.max(1,parseInt(qtyEl.textContent)||1):1;
    const snap=await db.ref('adoptme/'+id).once('value');
    const item=snap.val();
    if(!item) return showToast('❌ Товар не знайдено');
    const myPurchases=s.adoptPurchases||{};
    const myBought=myPurchases[id]||0;
    const totalBought=item.totalBought||0;
    const limitPerUser=item.limitPerUser||0;
    const limitTotal=item.limitTotal||0;
    const totalCost=item.price*qty;
    if(limitPerUser>0 && myBought>=limitPerUser) return showToast('❌ Ти вже досяг ліміту покупок');
    if(limitTotal>0 && totalBought>=limitTotal)  return showToast('❌ Товар розпродано');
    if(limitPerUser>0 && myBought+qty>limitPerUser) return showToast(`❌ Можеш купити ще лише ${limitPerUser-myBought}`);
    if(limitTotal>0 && totalBought+qty>limitTotal)  return showToast(`❌ Залишилось лише ${limitTotal-totalBought} шт.`);
    if(s.b<totalCost) return showToast(`❌ Мало BB! Потрібно ${totalCost} BB`);
    s.b-=totalCost;
    if(!s.adoptPurchases) s.adoptPurchases={};
    s.adoptPurchases[id]=(s.adoptPurchases[id]||0)+qty;
    save();
    db.ref('adoptme/'+id+'/totalBought').set(totalBought+qty);
    const orderRef=db.ref('adoptorders').push();
    const order={orderId:orderRef.key,itemId:id,itemName:item.name,itemIcon:item.icon||'🎁',price:item.price,qty,totalCost,buyerId:myId,buyerName:myName,status:'pending',createdAt:Date.now()};
    orderRef.set(order);
    ADMINS.forEach(adminId=>{
        db.ref('adminNotifs/'+adminId).push({type:'adoptorder',msg:`🛒 ${myName} купив: ${item.icon||'🎁'} ${item.name} x${qty} за ${totalCost} BB`,orderId:orderRef.key,buyerName:myName,buyerId:myId,itemName:item.name,qty,read:false,createdAt:Date.now()});
    });
    showToast(`✅ Куплено ${qty}x ${item.icon||'🎁'} ${item.name}! Очікуй видачі від адміна`);
    renderAdoptMe();
    ren();
};
window.adminDeliverOrder=async function(orderId){
    if(!orderId||orderId==='undefined'){return showToast('❌ Помилка: ID замовлення не знайдено');}
    await db.ref('adoptorders/'+orderId+'/status').set('delivered');
    showToast('✅ Позначено як видано!');
    loadAdmin();
};


window.cancelMarketLot=lotId=>{
    db.ref('market/'+lotId).once('value',snap=>{
        const lot=snap.val();
        if(!lot) return;
        s.inv.push(lot.pet); save();
        db.ref('market/'+lotId).remove();
        showToast(`✅ ${lot.pet.n} повернуто в інвентар`);
        renderShop();
    });
};
window.buyFromMarket=lotId=>{
    db.ref('market/'+lotId).once('value',snap=>{
        const lot=snap.val();
        if(!lot) return alert('Лот недоступний!');
        if(s.b<lot.price) return alert(`Потрібно: ${lot.price} BB`);
        s.b-=lot.price; s.inv.push(lot.pet); save();
        db.ref('players/'+lot.sellerId+'/b').transaction(c=>(c||0)+lot.price);
        db.ref('market/'+lotId).remove();
        showToast(`✅ Куплено ${lot.pet.s} ${lot.pet.n}!`);
        renderShop();
    });
};
window.listOnMarket=petId=>{
    if(s.p&&s.p.id===petId) return alert('Спочатку зніми пета!');
    const pr=prompt('Ціна (BB):');
    if(!pr||isNaN(pr)||pr<=0) return;
    const idx=s.inv.findIndex(p=>p.id===petId),pet=s.inv[idx];
    db.ref('market').push({pet,price:Number(pr),sellerId:myId,sellerName:myName}).then(()=>{s.inv.splice(idx,1);save();renderInv();});
};

// ============================================================
// ІНВЕНТАР (canvas pets)
// ============================================================
function renderInv(){
    stopAllPetAnims();
    const el=document.getElementById('inv-list');
    const countEl=document.getElementById('inv-count');
    if(countEl) countEl.textContent=s.inv.length ? `${s.inv.length} ${L('invCountLabel')}` : '';

    // Pokédex mode
    if(showingDex){ el.innerHTML=renderPokedex(); return; }

    // Pokédex button
    const dexBtn=`<button class="btn-dex" onclick="togglePokedex()">📖 Покедекс</button>`;

    if(!s.inv||!s.inv.length){
        el.innerHTML=dexBtn+`<div class="inv-empty">
            <div style="font-size:52px;margin-bottom:12px">🥚</div>
            <div style="font-weight:700;font-size:15px">${L('invEmpty')}</div>
            <div style="font-size:12px;opacity:.6;margin-top:4px">${L('invEmptySub')}</div>
        </div>`;
        return;
    }
    let h=dexBtn;
    s.inv.forEach((p,i)=>{
        const eq=s.p&&s.p.id===p.id;
        const cid=`pet-vis-${i}`;
        const pvl=p.lvl||1, pxp=s.p&&s.p.id===p.id?s.x:0;
        const pct=eq?Math.min((pxp/xpForLevel(pvl))*100,100):0;
        const qsPrice = Math.floor(p.m * 50);
        h+=`<div class="pet-card${eq?' pet-eq':''}">
            <div class="pet-stripe" style="background:${p.c}"></div>
            <div id="${cid}" data-size="68" style="flex-shrink:0"></div>
            <div class="pet-info" style="overflow:hidden">
                <div style="display:flex;align-items:center;gap:5px;margin-bottom:3px">
                    <div class="pet-badge" style="background:${p.c}22;color:${p.c};border:1px solid ${p.c}44">${p.r}</div>
                    ${eq?`<span class="pet-active-tag">✦ ${L('activePet')}</span>`:''}
                </div>
                <div class="pet-name">${p.n}</div>
                <div class="pet-stats"><span>${L('bonusWord')} <b style="color:${p.c}">x${p.m.toFixed(3)}</b> · LVL <b style="color:#fff">${pvl}</b></span></div>
                ${eq?`<div style="margin-top:5px">
                    <div style="display:flex;justify-content:space-between;font-size:9px;color:var(--muted);margin-bottom:2px">
                        <span>XP</span><span>${pxp}/${xpForLevel(pvl)}</span>
                    </div>
                    <div class="xp-bar" style="height:4px"><div class="xp-fill" style="width:${pct}%"></div></div>
                </div>`:''}
            </div>
            <div class="pet-btns">
                <button class="pb-equip${eq?' pb-eq':''}" onclick="equip(${p.id})">${eq?L('equipped'):L('equip')}</button>
                <button class="pb-sell" onclick="listOnMarket(${p.id})" title="На ринок">🏪</button>
                <button class="pb-quick-sell" onclick="quickSell(${p.id},${qsPrice})" title="Продати за ${qsPrice} BB">💰${qsPrice}</button>
            </div>
        </div>`;
    });
    el.innerHTML=h;
    requestAnimationFrame(()=>{ s.inv.forEach((p,i)=>startPetAnim(`pet-vis-${i}`,p)); });
}
window.equip=id=>{s.p=s.inv.find(i=>i.id===id);save();renderInv();ren();};
window.quickSell=(petId,price)=>{
    const pet=s.inv.find(p=>p.id===petId);
    if(!pet) return;
    if(s.p&&s.p.id===petId) return alert(`Спочатку зніми ${pet.n}!`);
    if(!confirm(`Продати ${pet.s||''} ${pet.n} за ${price} BB?`)) return;
    s.inv=s.inv.filter(p=>p.id!==petId);
    s.b+=price; save(); renderInv(); ren();
    showToast(`💰 Продано ${pet.n} за ${price} BB`);
};

// ============================================================
// КОЛЕСО
// ============================================================
const WHEEL_SEGS=[
    {label:'0x',      color:'#c0392b',m:0,   start:0,  end:180},
    {label:'1.4x',    color:'#27ae60',m:1.4, start:180,end:270},
    {label:'1.6x',    color:'#2980b9',m:1.6, start:270,end:342},
    {label:'1.8x',    color:'#f59e0b',m:1.8, start:342,end:360},
];
let wheelAngle=0,wheelSpinning=false;
function drawWheel(rot){
    const canvas=document.getElementById('wheel-canvas');
    if(!canvas) return;
    const ctx=canvas.getContext('2d'),cx=110,cy=110,r=100;
    ctx.clearRect(0,0,220,220);
    WHEEL_SEGS.forEach(seg=>{
        const sa=(seg.start+rot-90)*Math.PI/180,ea=(seg.end+rot-90)*Math.PI/180;
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,sa,ea);ctx.closePath();
        ctx.fillStyle=seg.color;ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.5)';ctx.lineWidth=2;ctx.stroke();
        const mid=((seg.start+seg.end)/2+rot-90)*Math.PI/180;
        ctx.save();ctx.translate(cx+Math.cos(mid)*r*.65,cy+Math.sin(mid)*r*.65);
        ctx.rotate(mid+Math.PI/2);ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';
        ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(seg.label,0,0);ctx.restore();
    });
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=3;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,16,0,Math.PI*2);ctx.fillStyle='#060810';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=2;ctx.stroke();
}
function spinWheel(resultM,onDone){
    if(wheelSpinning) return; wheelSpinning=true;
    const seg=WHEEL_SEGS.find(s=>s.m===resultM);
    const segMid=(seg.start+seg.end)/2,halfArc=(seg.end-seg.start)/2;
    const randOff=(Math.random()-.5)*halfArc*.7,landAt=segMid+randOff;
    const finalRot=((360-landAt%360)+360)%360,totalRot=6*360+finalRot-(wheelAngle%360);
    const a0=wheelAngle,t0=performance.now(),dur=4500;
    function easeOut(t){return 1-Math.pow(1-t,4);}
    function frame(now){
        const t=Math.min((now-t0)/dur,1);
        wheelAngle=a0+totalRot*easeOut(t);drawWheel(wheelAngle%360);
        if(t<1) requestAnimationFrame(frame);
        else{wheelAngle=wheelAngle%360;wheelSpinning=false;onDone();}
    }
    requestAnimationFrame(frame);
}

// ============================================================
// СЛОТИ
// ============================================================
const SLOT_SYMS=['🍒','🍋','🍊','🍇','⭐','💎','7'];
const SLOT_W=[30,25,20,15,6,3,1];
let slotsSpinning=false;
function pickSlot(){let r=Math.random()*100,cur=0;for(let i=0;i<SLOT_SYMS.length;i++){cur+=SLOT_W[i];if(r<cur)return SLOT_SYMS[i];}return SLOT_SYMS[0];}
function slotMult(a,b,c){if(a===b&&b===c){if(a==='7')return 5;if(a==='💎')return 4;if(a==='⭐')return 3;return 2;}if(a===b||b===c||a===c)return 1.3;return 0;}
function spinReel(id,final,onDone){let t=0;const iv=setInterval(()=>{document.getElementById(id).innerText=SLOT_SYMS[Math.floor(Math.random()*SLOT_SYMS.length)];if(++t>=14){clearInterval(iv);document.getElementById(id).innerText=final;onDone();}},75);}
function runSlots(cb){if(slotsSpinning)return;slotsSpinning=true;const r0=pickSlot(),r1=pickSlot(),r2=pickSlot();spinReel('reel-0',r0,()=>spinReel('reel-1',r1,()=>spinReel('reel-2',r2,()=>{slotsSpinning=false;cb(r0,r1,r2);})));}

// ============================================================
// МІНИ
// ============================================================
let minesState=null;
function calcMinesMult(opened,mineCount){if(opened===0)return 1.0;const maxMult=1.0+mineCount*.25,progress=opened/(25-mineCount);return Math.round((1.0+(maxMult-1.0)*progress)*100)/100;}
window.updateMinesCount=()=>{const n=parseInt(document.getElementById('mines-count').value);document.getElementById('mines-count-label').innerText=n;document.getElementById('mines-mult-label').innerText=(1+n*.25).toFixed(2);};
function buildMinesGrid(){
    if(!minesState){document.getElementById('mines-grid').innerHTML='';return;}
    let h='';
    for(let i=0;i<25;i++){const cell=minesState.cells[i];if(cell.revealed){h+=cell.mine?`<div class="mc mc-boom">💣</div>`:`<div class="mc mc-safe">✅</div>`;}else if(minesState.alive){h+=`<div class="mc mc-btn" onclick="minesReveal(${i})">?</div>`;}else{h+=`<div class="mc" style="opacity:.3">·</div>`;}}
    document.getElementById('mines-grid').innerHTML=h;
}
window.minesReveal=idx=>{
    if(!minesState||!minesState.alive)return;
    const cell=minesState.cells[idx];cell.revealed=true;
    if(cell.mine){
        minesState.alive=false;minesState.cells.forEach(c=>{if(c.mine)c.revealed=true;});buildMinesGrid();
        document.getElementById('mines-ctrl').style.display='none';
        const bt=minesState.bet;s.b-=bt;save();ren();
        setTimeout(()=>{document.getElementById('g-stat').innerHTML=`<span style="color:var(--error)">-${bt.toFixed(2)} BB 💣</span><br><small>${L('minesBoom')}</small>`;minesState=null;buildMinesGrid();},600);
    } else {
        minesState.opened++;const mult=calcMinesMult(minesState.opened,minesState.mineCount);
        minesState.currentMult=mult;document.getElementById('mines-curr-mult').innerText=mult.toFixed(2);
        buildMinesGrid();if(minesState.opened>=minesState.safeCells)minesCashout();
    }
};
window.minesCashout=()=>{
    if(!minesState||!minesState.alive||minesState.opened===0)return;
    const bt=minesState.bet,mult=minesState.currentMult,win=(bt*mult-bt)*(s.p?s.p.m:1);
    s.b+=win;s.x+=Math.floor(bt/2);save();ren();checkPetLevelUp();
    document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${win.toFixed(2)} BB</span><br><small>Забрав x${mult.toFixed(2)} 💰</small>`;
    minesState.alive=false;minesState.cells.forEach(c=>c.revealed=true);buildMinesGrid();
    document.getElementById('mines-ctrl').style.display='none';minesState=null;
};
function startMines(bt){
    const mineCount=parseInt(document.getElementById('mines-count').value),safeCells=25-mineCount;
    let pos=Array.from({length:25},(_,i)=>i);
    for(let i=pos.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pos[i],pos[j]]=[pos[j],pos[i]];}
    const mineSet=new Set(pos.slice(0,mineCount));
    minesState={bet:bt,mineCount,safeCells,opened:0,alive:true,currentMult:1.0,cells:Array.from({length:25},(_,i)=>({mine:mineSet.has(i),revealed:false}))};
    document.getElementById('mines-curr-mult').innerText='1.00';document.getElementById('mines-ctrl').style.display='block';
    document.getElementById('g-stat').innerHTML=`<span style="color:var(--accent)">${L('openCells')}</span>`;buildMinesGrid();
}

// ============================================================
// КУБИК
// ============================================================
const DICE_FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
let selN_val=1;
function buildDiceUI(){
    let h=`<div class="dice-display"><div id="dice-big" style="transition:transform .15s">${DICE_FACES[selN_val-1]}</div>
        <div style="font-size:10px;color:#8d99ae;font-weight:700;margin-top:6px;letter-spacing:.5px">${L('chosen')}</div>
    </div><div class="dice-grid">`;
    for(let i=1;i<=6;i++)h+=`<button class="dice-btn${i===selN_val?' dice-sel':''}" onclick="selN(${i})">${DICE_FACES[i-1]}<span>${i}</span></button>`;
    h+=`</div>`;document.getElementById('ui-dice').innerHTML=h;
}
window.selN=n=>{selN_val=n;buildDiceUI();const big=document.getElementById('dice-big');if(big){big.style.transform='scale(.8) rotate(-10deg)';setTimeout(()=>big.style.transform='scale(1.1) rotate(5deg)',80);setTimeout(()=>big.style.transform='scale(1) rotate(0)',160);}};
function rollDiceAnim(onDone){const big=document.getElementById('dice-big');if(!big){onDone(Math.floor(Math.random()*6)+1);return;}let t=0;const iv=setInterval(()=>{const r=Math.floor(Math.random()*6);big.innerText=DICE_FACES[r];big.style.transform=`rotate(${(Math.random()-.5)*30}deg) scale(${.85+Math.random()*.2})`;if(++t>12){clearInterval(iv);const result=Math.floor(Math.random()*6)+1;big.innerText=DICE_FACES[result-1];big.style.transform='scale(1) rotate(0)';onDone(result);}},55);}

// ============================================================
// CANVAS КЕЙСИ
// ============================================================
function openCaseAnimation(win, onComplete) {
    const modal = document.getElementById('case-modal');
    const title = document.getElementById('case-title');
    const resEl = document.getElementById('case-res');
    const closeEl = document.getElementById('case-close');
    const glow = RARITY_GLOW[win.r] || '#fff';

    modal.style.display = 'flex';
    closeEl.style.display = 'none';
    resEl.innerHTML = '';

    // Phase 1: Show rolling roulette
    const scr = document.getElementById('case-scroll');
    const CARD_W = 92, COUNT = 52, WIN_IDX = 38;
    const pool = [];
    for(const key in CASES) pool.push(...CASES[key].drop);
    if(!pool.length) pool.push(win);
    scr.innerHTML = ''; scr.style.transition = 'none'; scr.style.left = '0px';
    const items = [];
    for(let i=0;i<COUNT;i++) items.push(i===WIN_IDX ? win : pool[Math.floor(Math.random()*pool.length)]);
    items.forEach(pet=>{
        const cv=document.createElement('canvas'); cv.width=86; cv.height=106;
        cv.style.cssText='display:block;margin:3px;border-radius:14px;flex-shrink:0';
        scr.appendChild(cv); drawPetCard(cv,pet);
    });

    // Start spin
    setTimeout(()=>{
        scr.style.transition='4.5s cubic-bezier(0.08,0,0.05,1)';
        scr.style.left=`-${WIN_IDX*CARD_W-(window.innerWidth/2-CARD_W/2)}px`;
    }, 80);

    // Phase 2: After spin — dramatic reveal
    setTimeout(()=>{
        // Flash the winner card
        const winCard = scr.children[WIN_IDX];
        if(winCard){
            winCard.style.transition='transform .15s,box-shadow .15s';
            winCard.style.transform='scale(1.15)';
            winCard.style.boxShadow=`0 0 30px ${glow}, 0 0 60px ${glow}66`;
        }
        // Sparkle flash on modal
        modal.style.background=`rgba(4,6,12,.97)`;
        setTimeout(()=>{
            modal.style.background='rgba(4,6,12,.97)';
        },200);
    }, 4700);

    // Phase 3: Big reveal card
    setTimeout(()=>{
        // Hide roulette
        const roulette = modal.querySelector('.case-roulette');
        if(roulette){ roulette.style.transition='opacity .4s'; roulette.style.opacity='0'; }
        title.style.transition='opacity .3s'; title.style.opacity='0';

        setTimeout(()=>{
            if(roulette) roulette.style.display='none';
            title.style.display='none';

            // Big card reveal with animation
            const imgSrc = getPetImageSrc(win);
            const hasPhoto = imgSrc.type === 'img';
            const cardSize = 180;

            resEl.innerHTML = `<div id="reveal-card" style="
                opacity:0;transform:scale(0.3) rotate(-10deg);
                transition:opacity .5s,transform .5s cubic-bezier(.175,.885,.32,1.5);
                display:inline-block;
            ">
                <div style="
                    width:${cardSize}px;height:${cardSize}px;
                    background:${RARITY_BG[win.r]||'#1a1f2e'};
                    border-radius:20px;border:3px solid ${glow};
                    box-shadow:0 0 40px ${glow}88,0 0 80px ${glow}44;
                    display:flex;align-items:center;justify-content:center;
                    position:relative;overflow:hidden;margin:0 auto 12px;
                ">
                    ${hasPhoto
                        ? `<img src="${imgSrc.src}" style="width:${Math.round(cardSize*.9)}px;height:${Math.round(cardSize*.9)}px;object-fit:contain">`
                        : `<span style="font-size:${Math.round(cardSize*.5)}px">${imgSrc.src}</span>`
                    }
                </div>
            </div>
            <div id="reveal-info" style="opacity:0;transform:translateY(16px);transition:opacity .4s .3s,transform .4s .3s">
                <div style="font-size:24px;font-weight:900;color:${glow};letter-spacing:.5px">${win.n}</div>
                <div style="font-size:13px;color:#8d99ae;margin-top:4px">${win.r} · x${win.m.toFixed(3)}</div>
                <div style="font-size:12px;color:var(--accent2);margin-top:6px;font-weight:700">+${win.n} в інвентар!</div>
            </div>`;

            // Animate in
            requestAnimationFrame(()=>{
                requestAnimationFrame(()=>{
                    const card=document.getElementById('reveal-card');
                    const info=document.getElementById('reveal-info');
                    if(card){card.style.opacity='1';card.style.transform='scale(1) rotate(0deg)';}
                    if(info){info.style.opacity='1';info.style.transform='translateY(0)';}
                });
            });

            setTimeout(()=>{
                closeEl.style.display='block';
                closeEl.style.animation='toast-in .3s ease';
                onComplete();
            }, 700);
        }, 400);
    }, 5400);
}

function buyCase(k){
    const c=CASES[k];
    if(s.b<c.p)return alert('Мало BB!');

    // Pick winner
    let rand=Math.random()*100, win=null, cur=0;
    for(const p of c.drop){cur+=p.w;if(rand<=cur){win={...p};break;}}
    if(!win) win={...c.drop[c.drop.length-1]};

    // Знімаємо гроші та ОДРАЗУ додаємо пета в інвентар (до анімації!)
    // Це запобігає втраті пета через Firebase listener
    win.id=Date.now(); win.lvl=1;
    s.b-=c.p;
    s.inv.push(win);
    dailyProgress('case');
    save();

    openCaseAnimation(win, ()=>{
        // Пет вже в інвентарі, просто оновлюємо UI
        ren();
    });
}
window.buyCase=buyCase;
window.closeCase=()=>{
    const modal=document.getElementById('case-modal');
    const title=document.getElementById('case-title');
    const roulette=modal.querySelector('.case-roulette');
    // Reset modal for next use
    modal.style.display='none';
    if(title){title.style.display='';title.style.opacity='1';}
    if(roulette){roulette.style.display='';roulette.style.opacity='1';}
    document.getElementById('case-close').style.display='none';
    document.getElementById('case-res').innerHTML='';
};

// ============================================================
// updUI + play
// ============================================================
window.updUI=()=>{
    const g=document.getElementById('g-sel').value;
    ['dice','wheel','slots','mines','bj',].forEach(id=>{
        const el=document.getElementById('ui-'+id);if(el)el.style.display=(g===id)?'block':'none';
    });
    if(g==='dice')    buildDiceUI();
    if(g==='wheel')   setTimeout(()=>drawWheel(wheelAngle),50);
    if(g==='mines')   updateMinesCount();
};

window.play=()=>{
    const bt=parseFloat(document.getElementById('bet-a').value);
    if(isNaN(bt)||bt<=0||bt>s.b)return alert('Мало BB!');
    const g=document.getElementById('g-sel').value;
    const now=Date.now();
    if(g==='mines'&&minesState&&minesState.alive)return alert('Спочатку завершуй гру!');
    document.getElementById('g-stat').innerText=L('waiting');
    if(g==='f50'){
        const w=Math.random()>.5;let ticks=0;
        document.getElementById('g-stat').innerHTML='<div id="coin-anim" style="font-size:56px;display:inline-block;transition:transform .08s">🪙</div>';
        const iv=setInterval(()=>{
            const coin=document.getElementById('coin-anim');
            if(coin){coin.innerText=ticks%2===0?'✅':'❌';const sc=.7+Math.abs(Math.sin(ticks*.45))*.5,rot=ticks%2===0?-15:15;coin.style.transform=`scale(${sc}) rotate(${rot}deg)`;}
            if(++ticks>16){clearInterval(iv);const coin2=document.getElementById('coin-anim');if(coin2){coin2.innerText=w?'✅':'❌';coin2.style.transform='scale(1.2)';setTimeout(()=>coin2.style.transform='scale(1)',150);}setTimeout(()=>res(w,bt,1.55,w?L('win'):L('lose')),200);}
        },70);
    } else if(g==='dice'){
        rollDiceAnim(r=>res(r===selN_val,bt,2.05,`Випало ${r}`));
    } else if(g==='wheel'){
        if(wheelSpinning)return;
        let p=Math.random()*100,m;
        if(p<50)m=0;else if(p<75)m=1.4;else if(p<95)m=1.6;else m=1.8;
        spinWheel(m,()=>{res(m>0,bt,m,`Множник x${m}`);});
    } else if(g==='slots'){
        if(slotsSpinning)return;
        document.getElementById('g-stat').innerText=L('spinning');
        runSlots((a,b,c)=>res(slotMult(a,b,c)>0,bt,slotMult(a,b,c),`${a} ${b} ${c}`));
    } else if(g==='mines'){startMines(bt);return;
    } else if(g==='bj') startBJ(bt);
};

function res(win,bt,m,msg){
    const bon=s.p?s.p.m:1;
    if(win){const w=(bt*m-bt)*bon;s.b+=w;s.x+=Math.floor(bt/2);document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${w.toFixed(2)} BB</span><br><small>${msg}</small>`;checkPetLevelUp();dailyProgress('win');dailyProgress('play');}
    else{s.b-=bt;document.getElementById('g-stat').innerHTML=`<span style="color:var(--error)">-${bt.toFixed(2)} BB</span><br><small>${msg}</small>`;dailyProgress('lose');dailyProgress('play');}
    save();
    ren();
}

// ============================================================
// БЛЕКДЖЕК
// ============================================================
let bj=null;
function dr(){return Math.floor(Math.random()*10)+2;}
function startBJ(bt){bj={p:[dr(),dr()],d:[dr()],bt};document.getElementById('bj-ctrl').style.display='flex';reBJ();}
function reBJ(){
    const card=n=>`<div class="bj-card">${n}</div>`;
    document.getElementById('bj-pc').innerHTML=bj.p.map(card).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(card).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){res(false,bj.bt,0,L('bjBust'));endBJ();}
}
window.bjDo=a=>{
    if(a==='hit'){bj.p.push(dr());reBJ();}
    else{while(bj.d.reduce((a,b)=>a+b,0)<17)bj.d.push(dr());reBJ();const ps=bj.p.reduce((a,b)=>a+b,0),ds=bj.d.reduce((a,b)=>a+b,0);const w=ds>21||ps>ds;res(w,bj.bt,2,w?L('bjWin'):L('bjLose'));endBJ();}
};
function endBJ(){document.getElementById('bj-ctrl').style.display='none';}

// ============================================================
// ЛІДЕРИ
// ============================================================
function loadTop(){
    db.ref('players').once('value',snap=>{
        let l=[];
        snap.forEach(c=>{const v=c.val();if(v&&v.name)l.push(v);});
        l.sort((a,b)=>b.b-a.b);
        const medals=['🥇','🥈','🥉'];
        document.getElementById('leaderboard').innerHTML=l.slice(0,10).map((p,i)=>`
            <div class="leader-item">
                <div class="leader-rank">${medals[i]||`<span style="color:var(--muted);font-size:13px">${i+1}</span>`}</div>
                <div>
                    <div class="leader-name">${p.name}</div>
                    <div style="font-size:10px;color:var(--muted)">${p.p?`${p.p.s||''} ${p.p.n}`:''}</div>
                </div>
                <div class="leader-bal">${Math.floor(p.b).toLocaleString()} BB</div>
            </div>`).join('');
    });
}

// ============================================================
// АДМІНКА
// ============================================================
window.setAdminTab=t=>{currentAdminTab=t;adminInvUserId=null;loadAdmin();};
function loadAdmin(){
    if(currentAdminTab==='inv'&&adminInvUserId){loadAdminUserInv(adminInvUserId,adminInvUserName);return;}

    const makeTabs=()=>`<div class="admin-tabs">
        <div class="a-tab ${currentAdminTab==='stats'?'active':''}"     onclick="setAdminTab('stats')">📊 Стат</div>
        <div class="a-tab ${currentAdminTab==='balance'?'active':''}"   onclick="setAdminTab('balance')">💰 BB</div>
        <div class="a-tab ${currentAdminTab==='inv'?'active':''}"       onclick="setAdminTab('inv')">🐾 Пети</div>
        <div class="a-tab ${currentAdminTab==='petmult'?'active':''}"   onclick="setAdminTab('petmult')">⚡ Множ.</div>
        <div class="a-tab ${currentAdminTab==='promo'?'active':''}"     onclick="setAdminTab('promo')">🎟 Промо</div>
        <div class="a-tab ${currentAdminTab==='channels'?'active':''}"  onclick="setAdminTab('channels')">📢</div>
        <div class="a-tab ${currentAdminTab==='announce'?'active':''}"  onclick="setAdminTab('announce')">📣</div>
        <div class="a-tab ${currentAdminTab==='adoptme'?'active':''}"   onclick="setAdminTab('adoptme')">AM</div>
        <div class="a-tab ${currentAdminTab==='orders'?'active':''}"    onclick="setAdminTab('orders')" id="admin-orders-tab">📬 <span id="admin-orders-badge" style="display:none;background:#ef4444;color:#fff;font-size:8px;padding:1px 4px;border-radius:4px;margin-left:2px">!</span></div>
    </div>`;

    // ── ОГОЛОШЕННЯ ──
    if(currentAdminTab==='announce'){
        db.ref('announce').once('value',snap=>{
            const cur=snap.val()||{};
            document.getElementById('admin-list').innerHTML=makeTabs()+`
            <div class="admin-card">
                <div class="card-title">📣 Активне оголошення</div>
                <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Показується всім гравцям при вході в гру як банер зверху</div>
                <textarea id="ann-text" rows="3" style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#fff;font-family:inherit;font-size:13px;padding:10px;resize:vertical;margin-bottom:8px">${cur.text||''}</textarea>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                    <select id="ann-type" style="margin:0">
                        <option value="info" ${(cur.type||'info')==='info'?'selected':''}>ℹ️ Інфо</option>
                        <option value="warn" ${cur.type==='warn'?'selected':''}>⚠️ Увага</option>
                        <option value="event" ${cur.type==='event'?'selected':''}>🎉 Івент</option>
                    </select>
                    <input type="text" id="ann-link" placeholder="Посилання (необов.)" value="${cur.link||''}" style="margin:0">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                    <button class="btn" style="margin:0" onclick="adminSaveAnnounce()">📣 Опублікувати</button>
                    <button class="btn-s" style="background:rgba(239,68,68,.15);border-color:rgba(239,68,68,.3);color:#f87171" onclick="adminClearAnnounce()">🗑 Прибрати</button>
                </div>
            </div>
            ${cur.text?`<div class="admin-card" style="border-color:rgba(255,200,50,.2)">
                <div style="font-size:10px;color:var(--accent);font-weight:700;margin-bottom:6px">ЗАРАЗ АКТИВНЕ:</div>
                <div style="font-size:13px;color:#fff">${cur.text}</div>
                ${cur.link?`<div style="font-size:11px;color:var(--muted);margin-top:4px">🔗 ${cur.link}</div>`:''}
            </div>`:'<div class="admin-card" style="text-align:center;color:var(--muted);padding:16px">Активних оголошень немає</div>'}`;
        });
        return;
    }

    // ── РЕДАКТОР МНОЖНИКІВ ПЕТІВ ──
    if(currentAdminTab==='petmult'){
        // Отримуємо кастомні множники з Firebase
        db.ref('petmults').once('value',snap=>{
            const overrides=snap.val()||{};
            const allPets=getAllPets();
            let rows='';
            allPets.forEach(pet=>{
                const key=pet.n.replace(/[^a-zA-ZА-Яа-яёЁіІїЇєЄ0-9]/g,'_');
                const currentMult=overrides[key]!==undefined ? overrides[key] : pet.m;
                const isModified=overrides[key]!==undefined;
                rows+=`<div class="admin-card" style="padding:10px 12px;${isModified?'border-color:rgba(251,191,36,.3)':''}">
                    <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-size:24px;flex-shrink:0">${pet.s||'🐾'}</span>
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:700;font-size:13px;color:#fff">${pet.n}</div>
                            <div style="font-size:10px;color:var(--muted)">${pet.r} · База: <b>x${pet.m}</b>${isModified?` · <span style="color:var(--accent2)">Змінено: x${currentMult}</span>`:''}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                            <input type="number" id="pm-${key}" value="${currentMult}" step="0.005" min="1" max="5"
                                style="width:72px;margin:0;text-align:center;font-size:13px;font-weight:700;padding:6px 8px">
                            <button class="btn-ctrl b-add" style="padding:7px 10px;font-size:11px" onclick="adminSavePetMult('${key}','${pet.n}')">✓</button>
                            ${isModified?`<button class="btn-ctrl b-sub" style="padding:7px 8px;font-size:11px" onclick="adminResetPetMult('${key}')">↩</button>`:''}
                        </div>
                    </div>
                </div>`;
            });
            document.getElementById('admin-list').innerHTML=makeTabs()+`
            <div class="admin-card" style="padding:12px">
                <div style="font-size:11px;color:var(--muted);line-height:1.5">
                    ⚡ Зміна множника діє одразу для всіх гравців.<br>
                    ↩ — повернути до базового значення.<br>
                    🟡 Підсвічені — вже змінені від базових.
                </div>
            </div>
            <div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin:10px 0 8px">ВСІ ПЕТИ (${allPets.length})</div>
            ${rows}`;
        });
        return;
    }

    // ── КАНАЛИ ──
    if(currentAdminTab==='channels'){
        db.ref('channels').once('value',snap=>{
            const chs=snap.val()||{};
            let rows='';
            Object.entries(chs).forEach(([id,ch])=>{
                rows+=`<div class="admin-card" style="padding:12px">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div style="font-weight:700;font-size:14px;color:var(--text)">${ch.name}</div>
                            <div style="font-size:11px;color:var(--muted);margin-top:2px">${ch.url} · ${ch.rewardType==='bb'?'+'+ch.reward+' BB':'+'+ch.reward+' XP'}</div>
                        </div>
                        <button class="btn-ctrl b-sub" style="padding:7px 10px" onclick="db.ref('channels/${id}').remove().then(()=>{showToast('🗑 Видалено');loadAdmin();})">🗑</button>
                    </div>
                </div>`;
            });
            document.getElementById('admin-list').innerHTML=makeTabs()+`
            <div class="admin-card">
                <div class="card-title">➕ Додати канал</div>
                <input type="text" id="ch-name" placeholder="Назва каналу" style="margin-bottom:8px">
                <input type="text" id="ch-url"  placeholder="https://t.me/канал" style="margin-bottom:8px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                    <input type="number" id="ch-reward-bb" placeholder="💰 BB (0 = не давати)" style="margin:0">
                    <input type="number" id="ch-reward-xp" placeholder="⭐ XP (0 = не давати)" style="margin:0">
                </div>
                <div style="font-size:10px;color:var(--muted);margin-bottom:8px">Можна одночасно дати і BB і XP. Залиш 0 якщо не потрібно.</div>
                <button class="btn" onclick="adminAddChannel()">✅ Додати</button>
            </div>
            <div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin:14px 0 8px">АКТИВНІ КАНАЛИ (${Object.keys(chs).length})</div>
            ${rows||'<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Немає каналів</div>'}`;
        });
        return;
    }
    // ── ADOPT ME УПРАВЛІННЯ ──
    if(currentAdminTab==='adoptme'){
        db.ref('adoptme').once('value',snap=>{
            const items=snap.val()||{};
            let rows='';
            Object.entries(items).forEach(([id,item])=>{
                // Іконка може бути URL — показуємо як img якщо починається з http
                const isUrl=item.icon&&(item.icon.startsWith('http')||item.icon.startsWith('/'));
                const iconPreview=isUrl
                    ? `<img src="${item.icon}" style="width:40px;height:40px;object-fit:contain;border-radius:6px;background:rgba(255,255,255,.05)">`
                    : `<span style="font-size:32px">${item.icon||'🎁'}</span>`;
                rows+=`<div class="admin-card" style="padding:12px" id="am-card-${id}">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                        ${iconPreview}
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:700;font-size:13px">${item.name}</div>
                            <div style="font-size:11px;color:var(--muted)">${item.price} BB · куплено: ${item.totalBought||0}${item.limitTotal>0?' / '+item.limitTotal:''}${item.limitPerUser>0?' · ліміт/особу: '+item.limitPerUser:''}</div>
                            ${isUrl?`<div style="font-size:9px;color:var(--error);margin-top:2px">⚠️ Іконка — посилання (може бути великою)</div>`:''}
                        </div>
                        <div style="display:flex;flex-direction:column;gap:5px;flex-shrink:0">
                            <button class="btn-ctrl" style="background:#6366f1;padding:6px 10px;font-size:11px" onclick="adminEditAdoptItem('${id}')">✏️ Ред.</button>
                            <button class="btn-ctrl" style="background:${item.hidden?'#374151':'#059669'};padding:6px 10px;font-size:11px" onclick="adminToggleAdoptItem('${id}',${!item.hidden})">${item.hidden?'👁':'🙈'}</button>
                            <button class="btn-ctrl b-sub" style="padding:6px 10px" onclick="adminDeleteAdoptItem('${id}')">🗑</button>
                        </div>
                    </div>
                    <div id="am-edit-${id}" style="display:none;border-top:1px solid rgba(255,255,255,.08);padding-top:10px;margin-top:4px">
                        <div style="font-size:10px;color:var(--accent);font-weight:700;margin-bottom:8px">✏️ РЕДАГУВАННЯ</div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                            <input type="text" id="am-edit-icon-${id}" placeholder="Іконка (emoji або URL)" value="${item.icon||''}" style="margin:0;font-size:13px">
                            <input type="number" id="am-edit-price-${id}" placeholder="Ціна BB" value="${item.price||0}" style="margin:0">
                        </div>
                        <input type="text" id="am-edit-name-${id}" placeholder="Назва" value="${item.name||''}" style="margin-bottom:8px">
                        <input type="text" id="am-edit-desc-${id}" placeholder="Опис" value="${item.desc||''}" style="margin-bottom:8px">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                            <input type="number" id="am-edit-lpu-${id}" placeholder="Ліміт/особу (0=∞)" value="${item.limitPerUser||0}" style="margin:0">
                            <input type="number" id="am-edit-lt-${id}" placeholder="Ліміт всього (0=∞)" value="${item.limitTotal||0}" style="margin:0">
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                            <button class="btn" style="margin:0" onclick="adminSaveAdoptItem('${id}')">💾 Зберегти</button>
                            <button class="btn-s" onclick="document.getElementById('am-edit-${id}').style.display='none'">✕ Скасувати</button>
                        </div>
                    </div>
                </div>`;
            });
            document.getElementById('admin-list').innerHTML=makeTabs()+`
            <div class="admin-card">
                <div class="card-title">➕ Додати товар Adopt Me</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                    <input type="text" id="am-icon" placeholder="Іконка (emoji, напр. 🐶)" style="margin:0;font-size:20px">
                    <input type="number" id="am-price" placeholder="Ціна BB" style="margin:0">
                </div>
                <input type="text" id="am-name" placeholder="Назва товару" style="margin-bottom:8px">
                <input type="text" id="am-desc" placeholder="Опис (необов'язково)" style="margin-bottom:8px">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
                    <input type="number" id="am-limit-user" placeholder="Ліміт на 1 особу (0=∞)" style="margin:0" value="0">
                    <input type="number" id="am-limit-total" placeholder="Ліміт всього (0=∞)" style="margin:0" value="0">
                </div>
                <button class="btn" onclick="adminAddAdoptItem()">✅ Додати товар</button>
            </div>
            <div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin:14px 0 8px">ТОВАРИ (${Object.keys(items).length})</div>
            ${rows||'<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Немає товарів</div>'}`;
        });
        return;
    }
    // ── ЗАМОВЛЕННЯ ADOPT ME ──
    if(currentAdminTab==='orders'){
        db.ref('adoptorders').orderByChild('createdAt').once('value',snap=>{
            const orders=[];
            // Беремо KEY як orderId — val() може не мати orderId якщо запис старий
            snap.forEach(c=>{
                const v=c.val();
                if(v) orders.unshift({...v, orderId: c.key});
            });
            const pending=orders.filter(o=>o.status==='pending');
            const delivered=orders.filter(o=>o.status==='delivered');
            // Позначаємо нотифікації як прочитані
            db.ref('adminNotifs/'+myId).once('value',ns=>{
                if(ns.val()) ns.forEach(n=>{if(n.val()&&!n.val().read) db.ref('adminNotifs/'+myId+'/'+n.key+'/read').set(true);});
            });
            const renderOrder=(o,isDone)=>`<div class="admin-card" style="padding:12px;${isDone?'opacity:.55':'border-left:3px solid var(--accent)'}">
                <div style="display:flex;align-items:center;gap:10px">
                    <span style="font-size:26px">${o.itemIcon||'🎁'}</span>
                    <div style="flex:1;min-width:0">
                        <div style="font-weight:700;font-size:13px">${o.itemName}${(o.qty&&o.qty>1)?` <span style="color:var(--accent2)">x${o.qty}</span>`:''}</div>
                        <div style="font-size:11px;color:var(--muted)">👤 <b>${o.buyerName}</b> · ID: <span style="user-select:all">${o.buyerId}</span></div>
                        <div style="font-size:11px;color:var(--accent2);font-weight:700">${o.totalCost||o.price} BB</div>
                        <div style="font-size:10px;color:var(--muted)">${new Date(o.createdAt).toLocaleString('uk')}</div>
                    </div>
                    ${!isDone
                        ?`<button class="btn-ctrl b-add" style="padding:8px 10px;font-size:11px;white-space:nowrap" onclick="adminDeliverOrder('${o.orderId}')">✅ Видано</button>`
                        :`<span style="color:var(--success);font-size:20px">✅</span>`
                    }
                </div>
            </div>`;
            let h=makeTabs();
            h+=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                <div style="font-size:10px;color:var(--error);font-weight:700;letter-spacing:.5px">⏳ ОЧІКУЮТЬ ВИДАЧІ (${pending.length})</div>
                <button class="btn-s" style="font-size:10px;padding:5px 10px" onclick="loadAdmin()">🔄 Оновити</button>
            </div>`;
            h+=pending.length
                ? pending.map(o=>renderOrder(o,false)).join('')
                : `<div class="admin-card" style="text-align:center;color:var(--muted);padding:16px">Нових замовлень немає 🎉</div>`;
            if(delivered.length){
                h+=`<div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin:14px 0 8px">✅ ВИКОНАНІ (${delivered.length})</div>`;
                h+=delivered.slice(0,30).map(o=>renderOrder(o,true)).join('');
            }
            document.getElementById('admin-list').innerHTML=h;
        });
        return;
    }
    if(currentAdminTab==='promo'){
        db.ref('promo').once('value',snap=>{
            const codes=snap.val()||{};
            let codeRows='';
            Object.entries(codes).forEach(([code,data])=>{
                const used=data.used||0, max=data.maxUses||1;
                const expired=used>=max;
                codeRows+=`<div class="admin-card" style="padding:12px">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div style="font-weight:800;font-size:15px;letter-spacing:1px;color:${expired?'var(--muted)':'var(--accent2)'}">${code}</div>
                            <div style="font-size:11px;color:var(--muted);margin-top:3px">
                                ${promoRewardLabel(data)} · ${used}/${max} активацій${expired?' · <span style="color:var(--error)">Вичерпано</span>':''}
                            </div>
                        </div>
                        <button class="btn-ctrl b-sub" style="padding:7px 10px" onclick="adminDeletePromo('${code}')">🗑</button>
                    </div>
                </div>`;
            });
            document.getElementById('admin-list').innerHTML=makeTabs()+`
            <div class="admin-card">
                <div class="card-title">➕ Створити промокод</div>
                <input type="text" id="promo-code-inp" placeholder="Код (напр. EASTER2026)" style="text-transform:uppercase;margin-bottom:8px" oninput="this.value=this.value.toUpperCase()">
                <div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin-bottom:6px">ТИП НАГОРОДИ</div>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px">
                    <button id="pt-bb"   class="btn-s promo-type-btn active-type" onclick="setPromoType('bb')">💰 BB</button>
                    <button id="pt-pet"  class="btn-s promo-type-btn" onclick="setPromoType('pet')">🐾 Пет</button>
                    <button id="pt-case" class="btn-s promo-type-btn" onclick="setPromoType('case')">📦 Кейс</button>
                </div>
                <div id="promo-bb-inp">
                    <input type="number" id="promo-amount" placeholder="Кількість BB (0 = не давати)" style="margin-bottom:8px">
                </div>
                <div id="promo-pet-inp" style="display:none">
                    <select id="promo-pet-sel" style="margin-bottom:8px">
                        ${getAllPets().map((p,i)=>`<option value="${i}">${p.s||''} ${p.n} (${p.r})</option>`).join('')}
                    </select>
                </div>
                <div id="promo-case-inp" style="display:none">
                    <select id="promo-case-sel" style="margin-bottom:8px">
                        ${Object.entries(CASES).map(([k,c])=>`<option value="${k}">${c.n} — ${c.p} BB</option>`).join('')}
                    </select>
                    <input type="number" id="promo-case-count" placeholder="Кількість кейсів" value="1" style="margin-bottom:8px">
                </div>
                <div style="font-size:10px;color:var(--muted);margin-bottom:8px">💡 Для типу BB — можна одночасно дати і пета: переключись між типами, але BB + Пет комбінується автоматично якщо ввести суму > 0</div>
                <input type="number" id="promo-uses" placeholder="Макс. активацій (0 = необмежено)" style="margin-bottom:10px" value="1">
                <button class="btn" onclick="adminCreatePromo()">✅ Створити промокод</button>
            </div>
            <div style="font-size:10px;color:var(--muted);font-weight:700;letter-spacing:.5px;margin:14px 0 8px">АКТИВНІ ПРОМОКОДИ (${Object.keys(codes).length})</div>
            ${codeRows||`<div style="text-align:center;color:var(--muted);padding:20px;font-size:13px">Немає промокодів</div>`}`;
        });
        return;
    }

    // ── СТАТИСТИКА ──
    db.ref('players').once('value',snap=>{
        const players=[];
        snap.forEach(c=>{const v=c.val();if(v)players.push({uid:c.key,...v});});

        if(currentAdminTab==='stats'){
            const totalBB=players.reduce((a,p)=>a+(p.b||0),0);
            const totalPets=players.reduce((a,p)=>a+(p.inv?p.inv.length:0),0);
            const avgBB=players.length?(totalBB/players.length).toFixed(0):0;
            const richest=players.reduce((a,b)=>(b.b||0)>(a.b||0)?b:a,{b:0,name:'—'});
            const mostPets=players.reduce((a,b)=>((b.inv||[]).length>((a.inv||[]).length))?b:a,{inv:[],name:'—'});
            const rarityCount={};
            players.forEach(p=>(p.inv||[]).forEach(pet=>{rarityCount[pet.r]=(rarityCount[pet.r]||0)+1;}));
            document.getElementById('admin-list').innerHTML=makeTabs()+`
            <div class="stat-grid">
                <div class="stat-card"><div class="stat-val">${players.length}</div><div class="stat-lbl">Гравців</div></div>
                <div class="stat-card"><div class="stat-val">${Math.floor(totalBB).toLocaleString()}</div><div class="stat-lbl">BB у грі</div></div>
                <div class="stat-card"><div class="stat-val">${totalPets}</div><div class="stat-lbl">Петів всього</div></div>
                <div class="stat-card"><div class="stat-val">${avgBB}</div><div class="stat-lbl">BB на гравця</div></div>
            </div>
            <div class="admin-card">
                <div class="card-title">🏆 Лідери</div>
                <div style="font-size:13px;margin-bottom:6px">💰 <b style="color:var(--accent2)">${richest.name}</b> — ${Math.floor(richest.b||0)} BB</div>
                <div style="font-size:13px">🐾 <b style="color:var(--accent2)">${mostPets.name}</b> — ${(mostPets.inv||[]).length} петів</div>
            </div>
            <div class="admin-card">
                <div class="card-title">🐾 Розподіл по рідкості</div>
                ${Object.entries(rarityCount).sort((a,b)=>b[1]-a[1]).map(([r,n])=>`
                    <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.05)">
                        <span style="color:${RARITY_GLOW[r]||'#fff'}">${r}</span>
                        <b style="color:var(--accent2)">${n}</b>
                    </div>`).join('')}
            </div>`;
            return;
        }

        // ── BB / ПЕТИ+ІНВ ──
        let h=makeTabs();
        // Пошук гравця
        const searchVal=(window._adminSearch||'').toLowerCase();
        const filtered=searchVal
            ? players.filter(p=>(p.name||'').toLowerCase().includes(searchVal))
            : players;
        h+=`<div style="position:relative;margin-bottom:10px">
            <input type="text" id="admin-search" placeholder="🔍 Пошук по імені..." value="${window._adminSearch||''}"
                oninput="window._adminSearch=this.value;loadAdmin()"
                style="margin:0;padding-left:14px;font-size:13px">
            ${searchVal?`<button onclick="window._adminSearch='';loadAdmin()" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer">✕</button>`:''}
        </div>
        ${filtered.length===0?`<div class="admin-card" style="text-align:center;color:var(--muted);padding:16px">Нікого не знайдено</div>`:''}`;
        filtered.forEach(({uid,name,b,dbl,inv,p:activePet})=>{
            b=b||0; dbl=dbl||0; inv=inv||[];
            h+=`<div class="admin-card">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                    <div>
                        <b style="font-size:14px">${name||L('anon')}</b>
                        ${activePet?`<span style="font-size:11px;color:var(--muted);margin-left:6px">${activePet.s||''}</span>`:''}
                    </div>
                    <div style="text-align:right">
                        <div style="color:var(--accent2);font-weight:700;font-size:14px">${b.toFixed(0)} BB</div>
                        ${dbl>0?`<div style="color:#67e8f9;font-weight:700;font-size:11px">⚓ ${dbl} дубл.</div>`:''}
                    </div>
                </div>`;
            if(currentAdminTab==='balance'){
                h+=`<div class="admin-ctrl-grid">
                    <button class="btn-ctrl b-add" onclick="mathB('${uid}','add','bb')">＋ BB</button>
                    <button class="btn-ctrl b-sub" onclick="mathB('${uid}','sub','bb')">－ BB</button>
                    <button class="btn-ctrl b-set" onclick="mathB('${uid}','set','bb')">= BB</button>
                </div>
                <div class="admin-ctrl-grid" style="margin-top:6px">
                    <button class="btn-ctrl" style="background:rgba(6,182,212,.2);border-color:#06b6d4;color:#67e8f9" onclick="mathB('${uid}','add','dbl')">＋ ⚓</button>
                    <button class="btn-ctrl" style="background:rgba(6,182,212,.1);border-color:#06b6d4;color:#67e8f9" onclick="mathB('${uid}','sub','dbl')">－ ⚓</button>
                    <button class="btn-ctrl" style="background:rgba(6,182,212,.1);border-color:#06b6d4;color:#67e8f9" onclick="mathB('${uid}','set','dbl')">= ⚓</button>
                </div>`;
            } else {
                // Пети + інвентар в одній вкладці
                h+=`<div style="display:flex;gap:6px;margin-top:6px">
                    <button class="btn-buy" style="flex:1" onclick="adminGivePetModal('${uid}','${(name||'').replace(/'/g,"\\'")}')">🎁 Подарувати</button>
                    <button class="btn-ghost" style="flex:1;font-size:12px" onclick="openAdminInv('${uid}','${(name||'').replace(/'/g,"\\'")}')">🎒 Інвентар (${inv.length})</button>
                </div>`;
            }
            h+=`</div>`;
        });
        document.getElementById('admin-list').innerHTML=h;
    });
}

// ── Оголошення ──
window.adminSaveAnnounce=()=>{
    const text=(document.getElementById('ann-text')?.value||'').trim();
    const type=document.getElementById('ann-type')?.value||'info';
    const link=(document.getElementById('ann-link')?.value||'').trim();
    if(!text) return showToast('❌ Введи текст оголошення');
    db.ref('announce').set({text,type,link,createdAt:Date.now(),by:myName}).then(()=>{
        showToast('✅ Оголошення опубліковано!');
        loadAdmin();
    });
};
window.adminClearAnnounce=()=>{
    if(!confirm('Прибрати оголошення?')) return;
    db.ref('announce').remove().then(()=>{showToast('🗑 Оголошення прибрано');loadAdmin();});
};

// ── Множники петів ──
window.adminSavePetMult=(key,petName)=>{
    const val=parseFloat(document.getElementById('pm-'+key)?.value||'1');
    if(isNaN(val)||val<1||val>5) return showToast('❌ Значення має бути від 1 до 5');
    db.ref('petmults/'+key).set(Math.round(val*1000)/1000).then(()=>{
        showToast(`✅ ${petName}: x${val.toFixed(3)}`);
        loadAdmin();
    });
};
window.adminResetPetMult=(key)=>{
    db.ref('petmults/'+key).remove().then(()=>{showToast('↩ Повернуто до базового');loadAdmin();});
};

// ── Хелпери промокодів ──
function getAllPets(){
    let all=[],seen=new Set();
    for(const k in CASES) CASES[k].drop.forEach(p=>{if(!seen.has(p.n)){all.push(p);seen.add(p.n);}});
    ADMIN_ONLY_PETS.forEach(p=>{if(!seen.has(p.n)){all.push(p);seen.add(p.n);}});
    return all;
}
function promoRewardLabel(d){
    if(d.type==='bb')   return `💰 ${d.amount} BB`;
    if(d.type==='pet')  return `🐾 ${d.pet?.s||''} ${d.pet?.n||'пет'}`;
    if(d.type==='case') return `📦 ${d.count||1}x ${CASES[d.caseKey]?.n||d.caseKey}`;
    return '?';
}
let currentPromoType='bb';
window.setPromoType=t=>{
    currentPromoType=t;
    ['bb','pet','case'].forEach(tp=>{
        const el=document.getElementById('promo-'+tp+'-inp');
        if(el) el.style.display=t===tp?'block':'none';
    });
    document.querySelectorAll('.promo-type-btn').forEach(b=>b.classList.remove('active-type'));
    const btn=document.getElementById('pt-'+t);
    if(btn) btn.classList.add('active-type');
};
window.adminCreatePromo=()=>{
    const code=(document.getElementById('promo-code-inp').value||'').trim().toUpperCase().replace(/\s+/g,'');
    if(!code) return alert('Введи код!');
    const uses=parseInt(document.getElementById('promo-uses').value)||1;
    let reward={};
    if(currentPromoType==='bb'){
        const amt=parseFloat(document.getElementById('promo-amount').value);
        if(!amt||amt<=0) return alert('Введи кількість BB!');
        reward={type:'bb',amount:amt};
    } else if(currentPromoType==='pet'){
        const idx=parseInt(document.getElementById('promo-pet-sel').value);
        const pets=getAllPets();
        if(!pets[idx]) return alert('Обери пета!');
        // Перевіряємо чи є і BB сума
        const bbAmt=parseFloat(document.getElementById('promo-amount')?.value||'0');
        if(bbAmt>0){
            // Комбінована: пет + BB
            reward={type:'multi',rewards:[
                {type:'pet',pet:{...pets[idx],id:Date.now(),lvl:1}},
                {type:'bb',amount:bbAmt}
            ]};
        } else {
            reward={type:'pet',pet:{...pets[idx],id:Date.now(),lvl:1}};
        }
    } else if(currentPromoType==='case'){
        const caseKey=document.getElementById('promo-case-sel').value;
        const count=parseInt(document.getElementById('promo-case-count').value)||1;
        if(!CASES[caseKey]) return alert('Обери кейс!');
        reward={type:'case',caseKey,count};
    }
    db.ref('promo/'+code).set({...reward,maxUses:uses||999999,used:0,createdAt:Date.now()}).then(()=>{
        showToast(`✅ Промокод ${code} створено!`);
        loadAdmin();
    });
};
window.adminDeletePromo=code=>{
    if(!confirm(`Видалити промокод ${code}?`)) return;
    db.ref('promo/'+code).remove().then(()=>{showToast('🗑 Видалено');loadAdmin();});
};
window.adminGivePetModal=(uid,name)=>{
    const pets=getAllPets();
    const list=pets.map((p,i)=>`${i}: ${p.s||''} ${p.n} (${p.r})`).join('\n');
    const ch=prompt(list);
    if(ch===null||!pets[ch]) return;
    const p={...pets[ch],id:Date.now(),lvl:1};
    db.ref('players/'+uid+'/inv').once('value',sn=>{
        const inv=sn.val()||[]; inv.push(p);
        db.ref('players/'+uid+'/inv').set(inv);
        showToast(`✅ ${p.s||''} ${p.n} → ${name}`);
    });
};

// ── Застосувати промокод (гравець) ──
window.applyPromo=()=>{
    const code=(document.getElementById('promo-inp').value||'').trim().toUpperCase();
    if(!code) return;
    const btn=document.querySelector('[onclick="applyPromo()"]');
    if(btn) btn.disabled=true;
    db.ref('promo/'+code).once('value',snap=>{
        if(btn) btn.disabled=false;
        const data=snap.val();
        if(!data){showToast('❌ Промокод не знайдено');return;}
        const used=data.used||0, max=data.maxUses||1;
        if(used>=max){showToast('❌ Промокод вичерпано');return;}
        const usedBy=data.usedBy||[];
        if(usedBy.includes(String(myId))){showToast('❌ Ти вже використав цей промокод');return;}
        // Застосовуємо нагороду
        db.ref('promo/'+code+'/used').set(used+1);
        db.ref('promo/'+code+'/usedBy').set([...usedBy,String(myId)]);
        document.getElementById('promo-inp').value='';

        function applySingleReward(d,toastParts){
            if(d.type==='bb'){
                s.b+=d.amount; toastParts.push(`+${d.amount} BB`);
            } else if(d.type==='pet'&&d.pet){
                const pet={...d.pet,id:Date.now(),lvl:1};
                s.inv.push(pet); toastParts.push(`${pet.s||''} ${pet.n}`);
            } else if(d.type==='case'&&d.caseKey){
                const c=CASES[d.caseKey];
                if(!c){showToast('❌ Кейс більше не доступний');return;}
                const count=d.count||1;
                let opened=0;
                function openNext(){
                    if(opened>=count){renderSettings();showToast(`🎉 ${count}x ${c.n} відкрито!`);return;}
                    let rand=Math.random()*100,win=null,cur2=0;
                    for(const p of c.drop){cur2+=p.w;if(rand<=cur2){win={...p};break;}}
                    if(!win) win={...c.drop[c.drop.length-1]};
                    opened++;
                    win.id=Date.now()+opened; win.lvl=1;
                    s.inv.push(win); save();
                    openCaseAnimation(win,()=>{
                        ren();
                        const origClose=window.closeCase;
                        if(opened<count){
                            window.closeCase=()=>{origClose();window.closeCase=origClose;setTimeout(openNext,300);};
                        }
                    });
                }
                openNext();
            }
        }

        const toastParts=[];
        if(data.type==='multi'&&Array.isArray(data.rewards)){
            data.rewards.forEach(rw=>applySingleReward(rw,toastParts));
        } else {
            applySingleReward(data,toastParts);
        }
        save(); ren();
        if(toastParts.length) showToast(`🎉 Промокод активовано! ${toastParts.join(' + ')}`);
        renderSettings();
    });
};
window.openAdminInv=(uid,name)=>{adminInvUserId=uid;adminInvUserName=name;currentAdminTab='inv';loadAdminUserInv(uid,name);};
function loadAdminUserInv(uid,name){
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val()||{},inv=p.inv||[];
        const tabs=`<div class="admin-tabs">
            <div class="a-tab" onclick="setAdminTab('stats')">📊</div>
            <div class="a-tab" onclick="setAdminTab('balance')">💰</div>
            <div class="a-tab active">🐾</div>
            <div class="a-tab" onclick="setAdminTab('promo')">🎟</div>
        </div>`;
        let h=tabs+`<div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <button class="btn-s" onclick="adminInvUserId=null;loadAdmin()" style="padding:8px 14px;font-size:14px">${L('back')}</button>
            <div><b>${name}</b> <span style="color:var(--muted);font-size:12px">${inv.length} ${L('petsOf')}</span></div>
        </div>`;
        if(!inv.length){
            h+=`<div class="admin-card" style="text-align:center;color:var(--muted);padding:20px">${L('empty')}</div>`;
        } else {
            inv.forEach((pet,idx)=>{
                const eq=p.p&&p.p.id===pet.id;
                const imgSrc=getPetImageSrc(pet);
                const icon = imgSrc.type==='img'
                    ? `<img src="${imgSrc.src}" width="36" height="36" style="object-fit:contain;border-radius:8px">`
                    : `<span style="font-size:26px">${pet.s}</span>`;
                h+=`<div class="admin-card" style="padding:12px">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                        ${icon}
                        <div style="flex:1">
                            <div style="font-weight:700;font-size:13px">${pet.n}${eq?` <span style="font-size:10px;background:rgba(16,185,129,.2);color:var(--success);padding:1px 5px;border-radius:4px">Активний</span>`:''}</div>
                            <div style="font-size:11px;color:${pet.c}">${pet.r} · x${pet.m.toFixed(3)} · LVL ${pet.lvl||1}</div>
                        </div>
                        <button class="btn-ctrl b-sub" style="padding:8px 10px;font-size:16px" onclick="adminRemovePet('${uid}',${idx},'${name.replace(/'/g,"\\'")}')">🗑</button>
                    </div>
                    <div class="admin-ctrl-grid" style="grid-template-columns:1fr 1fr 1fr 1fr;gap:6px">
                        <button class="btn-ctrl" style="background:#6366f1;font-size:10px" onclick="adminSetPetLevel('${uid}',${idx},'${name.replace(/'/g,"\\'")}')">✏️ Рівень</button>
                        <button class="btn-ctrl b-add" style="font-size:10px" onclick="adminAddPetLevel('${uid}',${idx},1)">LVL +1</button>
                        <button class="btn-ctrl b-sub" style="font-size:10px" onclick="adminAddPetLevel('${uid}',${idx},-1)">LVL -1</button>
                        <button class="btn-ctrl" style="background:#374151;font-size:10px" onclick="adminResetXP('${uid}')">🔄 XP</button>
                    </div>
                </div>`;
            });
        }
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.adminRemovePet=(uid,idx,name)=>{
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val(); let inv=p.inv?[...p.inv]:[];
        const pet=inv[idx];
        if(!pet) return alert('Не знайдено!');
        if(!confirm(`${L('confirmDelete')} ${pet.n}?`)) return;
        // Якщо це активний пет — знімаємо
        if(p.p&&p.p.id===pet.id) db.ref('players/'+uid+'/p').set(null);
        inv.splice(idx,1);
        db.ref('players/'+uid+'/inv').set(inv).then(()=>loadAdminUserInv(uid,name));
    });
};
window.adminSetPetLevel=(uid,idx,name)=>{
    const newLvlStr=prompt('Новий рівень (1-100):');
    if(!newLvlStr||isNaN(newLvlStr)) return;
    const newLvl=Math.max(1,Math.min(100,parseInt(newLvlStr)));
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val(); const inv=[...(p.inv||[])];
        if(!inv[idx]) return;
        const pet=inv[idx];
        const oldLvl=pet.lvl||1;
        // Перераховуємо м від базового значення рідкості + (newLvl-1)*0.005
        // Базовий множник — те що було на LVL1
        const baseMult = Math.round((pet.m - (oldLvl-1)*0.005)*1000)/1000;
        pet.lvl = newLvl;
        pet.m   = Math.round((baseMult + (newLvl-1)*0.005)*1000)/1000;
        if(pet.m < 1) pet.m = 1;
        // Скидаємо XP гравця до 0 при зміні рівня
        db.ref('players/'+uid+'/x').set(0);
        db.ref('players/'+uid+'/inv').set(inv);
        if(p.p&&p.p.id===pet.id) db.ref('players/'+uid+'/p').set(pet);
        showToast(`✅ ${pet.n}: LVL ${newLvl}, x${pet.m.toFixed(3)}`);
        setTimeout(()=>loadAdminUserInv(uid,name),400);
    });
};
window.adminResetXP=(uid)=>{
    if(!confirm('Скинути XP до 0?')) return;
    db.ref('players/'+uid+'/x').set(0);
    showToast('✅ XP скинуто');
};
window.adminAddPetLevel=(uid,idx,delta)=>{
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val(); const inv=[...(p.inv||[])];
        if(!inv[idx]) return;
        const pet=inv[idx];
        const oldLvl=pet.lvl||1;
        const newLvl=Math.max(1,oldLvl+delta);
        const baseMult=Math.round((pet.m-(oldLvl-1)*0.005)*1000)/1000;
        pet.lvl=newLvl;
        pet.m=Math.round((baseMult+(newLvl-1)*0.005)*1000)/1000;
        if(pet.m<1) pet.m=1;
        db.ref('players/'+uid+'/inv').set(inv);
        if(p.p&&p.p.id===pet.id) db.ref('players/'+uid+'/p').set(pet);
        setTimeout(()=>loadAdminUserInv(uid,p.name||name),300);
    });
};
window.mathB=(id,type,currency='bb')=>{
    const label=currency==='dbl'?'⚓ Дублони':'BB';
    let v=prompt(`Сума (${label}):`);
    if(!v||isNaN(v))return;
    v=Number(v);
    const field=currency==='dbl'?'dbl':'b';
    const ref=db.ref('players/'+id+'/'+field);
    if(type==='add')ref.transaction(c=>(c||0)+v);
    else if(type==='sub')ref.transaction(c=>Math.max(0,(c||0)-v));
    else ref.set(Math.max(0,v));
    setTimeout(loadAdmin,500);
};
// adminGivePet — alias для зворотньої сумісності
window.adminGivePet=uid=>window.adminGivePetModal(uid,'');

window.adminEditAdoptItem=(id)=>{
    const editEl=document.getElementById('am-edit-'+id);
    if(editEl) editEl.style.display=editEl.style.display==='none'?'block':'none';
};
window.adminSaveAdoptItem=(id)=>{
    const icon=(document.getElementById('am-edit-icon-'+id)?.value||'🎁').trim();
    const name=(document.getElementById('am-edit-name-'+id)?.value||'').trim();
    const desc=(document.getElementById('am-edit-desc-'+id)?.value||'').trim();
    const price=parseInt(document.getElementById('am-edit-price-'+id)?.value||'0');
    const limitPerUser=parseInt(document.getElementById('am-edit-lpu-'+id)?.value||'0');
    const limitTotal=parseInt(document.getElementById('am-edit-lt-'+id)?.value||'0');
    if(!name||price<=0) return showToast('❌ Введи назву і ціну');
    db.ref('adoptme/'+id).update({icon,name,desc,price,limitPerUser,limitTotal}).then(()=>{
        showToast('✅ Збережено!');
        loadAdmin();
    });
};
window.adminAddAdoptItem=()=>{
    const icon=(document.getElementById('am-icon')?.value||'🎁').trim();
    const name=(document.getElementById('am-name')?.value||'').trim();
    const desc=(document.getElementById('am-desc')?.value||'').trim();
    const price=parseInt(document.getElementById('am-price')?.value||'0');
    const limitPerUser=parseInt(document.getElementById('am-limit-user')?.value||'0');
    const limitTotal=parseInt(document.getElementById('am-limit-total')?.value||'0');
    if(!name||price<=0) return showToast('❌ Введи назву і ціну');
    db.ref('adoptme').push({icon,name,desc,price,limitPerUser,limitTotal,totalBought:0,hidden:false,createdAt:Date.now()}).then(()=>{
        showToast('✅ Товар додано!');
        loadAdmin();
    });
};
window.adminToggleAdoptItem=(id,visible)=>{
    db.ref('adoptme/'+id+'/hidden').set(!visible).then(()=>{showToast(visible?'👁 Показано':'🙈 Сховано');loadAdmin();});
};
window.adminDeleteAdoptItem=(id)=>{
    if(!confirm('Видалити товар?')) return;
    db.ref('adoptme/'+id).remove().then(()=>{showToast('🗑 Видалено');loadAdmin();});
};

// ── Показ оголошення гравцям ──
function initAnnounce(){
    db.ref('announce').on('value',snap=>{
        const ann=snap.val();
        let banner=document.getElementById('announce-banner');
        if(!ann||!ann.text){
            if(banner) banner.remove();
            return;
        }
        if(!banner){
            banner=document.createElement('div');
            banner.id='announce-banner';
            document.querySelector('.container').prepend(banner);
        }
        const colors={info:'rgba(6,182,212,.12)',warn:'rgba(251,191,36,.12)',event:'rgba(168,85,247,.12)'};
        const borders={info:'rgba(6,182,212,.3)',warn:'rgba(251,191,36,.3)',event:'rgba(168,85,247,.3)'};
        const icons={info:'ℹ️',warn:'⚠️',event:'🎉'};
        const t=ann.type||'info';
        banner.style.cssText=`background:${colors[t]};border:1px solid ${borders[t]};border-radius:12px;padding:10px 14px;margin:0 0 10px;display:flex;align-items:center;gap:10px;position:relative`;
        banner.innerHTML=`<span style="font-size:18px;flex-shrink:0">${icons[t]}</span>
            <div style="flex:1;font-size:12px;font-weight:700;color:#fff;line-height:1.4">${ann.text}
                ${ann.link?`<br><a href="${ann.link}" target="_blank" style="color:var(--accent2);font-size:11px">🔗 Детальніше</a>`:''}
            </div>
            <button onclick="document.getElementById('announce-banner').style.display='none'"
                style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;flex-shrink:0;padding:0">✕</button>`;
    });
}
setTimeout(initAnnounce, 1800);


function initAdminNotifs(){
    if(!ADMINS.includes(Number(myId))) return;
    db.ref('adminNotifs/'+myId).on('value',snap=>{
        let unread=0;
        if(snap.val()) snap.forEach(n=>{ if(!n.val().read) unread++; });
        const badge=document.getElementById('admin-orders-badge');
        if(badge){
            badge.style.display=unread>0?'inline':'none';
            badge.textContent=unread>9?'9+':unread||'!';
        }
    });
}
// Запускаємо після ініціалізації Firebase
setTimeout(initAdminNotifs, 1500);


window.adminAddChannel=()=>{
    const name=(document.getElementById('ch-name')?.value||'').trim();
    const url=(document.getElementById('ch-url')?.value||'').trim();
    if(!name||!url) return showToast('❌ Заповни назву і посилання');
    // Збираємо нагороди
    const rewards=[];
    const bb=parseInt(document.getElementById('ch-reward-bb')?.value||'0');
    const xp=parseInt(document.getElementById('ch-reward-xp')?.value||'0');
    if(bb>0) rewards.push({type:'bb',amount:bb});
    if(xp>0) rewards.push({type:'xp',amount:xp});
    if(!rewards.length) return showToast('❌ Додай хоча б одну нагороду (BB або XP)');
    // Для сумісності зі старим кодом — зберігаємо і старий формат
    db.ref('channels').push({name,url,rewardType:rewards[0].type,reward:rewards[0].amount,rewards}).then(()=>{
        showToast('✅ Канал додано!');
        loadAdmin();
    });
};

// ============================================================
// НАЛАШТУВАННЯ
// ============================================================
function renderSettings(){
    const el=document.getElementById('settings-body');if(!el)return;
    const themeHtml=Object.entries(THEMES).map(([k,t])=>`
        <div class="sett-card${currentTheme===k?' sett-active':''}" onclick="pickTheme('${k}')">
            <span>${t.name}</span><div class="sett-dot" style="background:${t.a}"></div>
        </div>`).join('');
    const langHtml=[['uk','🇺🇦 Українська'],['en','🇬🇧 English'],['ru','🇷🇺 Русский']].map(([k,n])=>`
        <div class="sett-card${currentLang===k?' sett-active':''}" onclick="pickLang('${k}')">
            <span>${n}</span>${currentLang===k?'<span style="color:var(--accent)">✓</span>':''}
        </div>`).join('');
    const musicTracksHtml = (() => {
        if (typeof MUSIC_TRACKS === 'undefined') return '<div style="color:var(--muted);font-size:12px">music.js не завантажено</div>';
        const tracks = Object.entries(MUSIC_TRACKS);
        const offCard = `<div class="sett-card${currentTrack===null?' sett-active':''}" onclick="pickTrack(null)">
            <span>🔇 Без звуку</span>
            ${currentTrack===null?'<span style="color:var(--accent)">✓</span>':''}
        </div>`;
        const trackCards = tracks.map(([k,t])=>`
            <div class="sett-card${currentTrack===k?' sett-active':''}" onclick="pickTrack('${k}')">
                <span>🎵 ${t.title}</span>
                <div style="display:flex;align-items:center;gap:6px">
                    ${currentTrack===k && musicEnabled ? '<span style="color:var(--accent);font-size:16px;animation:xp-shine 1s infinite">▶</span>' : ''}
                    ${currentTrack===k?'<span style="color:var(--accent)">✓</span>':''}
                </div>
            </div>`).join('');
        return offCard + trackCards;
    })();

    el.innerHTML=`
        <div class="glass"><div class="sett-section-title">${L('theme')}</div><div class="sett-grid">${themeHtml}</div></div>
        <div class="glass"><div class="sett-section-title">${L('lang')}</div><div class="sett-list">${langHtml}</div></div>
        <div class="glass">
            <div class="sett-section-title">${L('music')}</div>
            <div style="display:flex;gap:8px;margin-bottom:10px">
                <button class="btn-s" style="flex:1;background:${musicEnabled?'rgba(var(--accent-rgb),.15)':'rgba(255,255,255,.04)'};border-color:${musicEnabled?'var(--accent)':'rgba(255,255,255,.12)'};color:${musicEnabled?'var(--accent)':'var(--muted)'}" onclick="toggleMusic()">
                    ${musicEnabled?'🔊 Увімк.':'🔇 Вимк.'}
                </button>
                <div style="flex:2;display:flex;align-items:center;font-size:12px;color:var(--muted);padding:0 8px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:8px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis">
                    ${currentTrack && typeof MUSIC_TRACKS!=='undefined' && MUSIC_TRACKS[currentTrack] ? '🎵 ' + MUSIC_TRACKS[currentTrack].title : '🔇 Без звуку'}
                </div>
            </div>
            <div class="sett-list">${musicTracksHtml}</div>
        </div>
        <div class="glass">
            <div class="sett-section-title">📢 Підписки на канали</div>
            <div id="channels-wrap"><div style="color:var(--muted);font-size:12px;text-align:center;padding:12px">Завантаження...</div></div>
        </div>
        <div class="glass">
            <div class="sett-section-title">👥 Реферальна система</div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Твій реферальний код — поділись з другом. Обидва отримаєте <b style="color:var(--accent2)">+250 BB</b>!</div>
            <div style="display:flex;gap:8px;margin-bottom:10px">
                <div style="flex:1;padding:11px 14px;background:rgba(255,255,255,.04);border:1px solid var(--border-gold);border-radius:10px;font-size:15px;font-weight:800;color:var(--accent2);letter-spacing:1.5px;text-align:center">${getRefCode()}</div>
                <button class="btn-s" onclick="if(navigator.clipboard)navigator.clipboard.writeText('${getRefCode()}').then(()=>showToast('✅ Скопійовано!'))">📋</button>
            </div>
            ${s.refUsed
                ? `<div style="font-size:12px;color:var(--success);font-weight:700;text-align:center">✅ Ти вже активував код друга</div>`
                : `<div style="display:flex;gap:8px">
                    <input type="text" id="ref-inp" placeholder="Код друга..." style="flex:1;margin:0;text-transform:uppercase;letter-spacing:1px" oninput="this.value=this.value.toUpperCase()">
                    <button class="btn" style="width:auto;padding:12px 16px;flex-shrink:0;font-size:13px" onclick="applyRef()">▶</button>
                </div>`
            }
            <div style="margin-top:10px;font-size:11px;color:var(--muted)">Запрошено друзів: <b style="color:var(--accent2)">${s.refCount||0}</b></div>
        </div>
        <div class="glass">
            <div class="sett-section-title">🎟 ПРОМОКОД</div>
            <div style="display:flex;gap:8px">
                <input type="text" id="promo-inp" placeholder="Введи промокод..." style="flex:1;margin:0;text-transform:uppercase;letter-spacing:1px" oninput="this.value=this.value.toUpperCase()">
                <button class="btn" style="width:auto;padding:12px 16px;flex-shrink:0;font-size:13px" onclick="applyPromo()">▶</button>
            </div>
        </div>`;
    // Load channels async
    setTimeout(()=>window.renderChannels(), 50);
}
window.pickTheme=k=>{applyTheme(k);renderSettings();showToast(L('saved'));};
window.pickLang=k=>{applyLang(k);renderSettings();showToast(L('saved'));};

// ============================================================
// МУЗИКА — мультитрек плеєр
// ============================================================
let currentTrack  = localStorage.getItem('bc_track') || 'bubblegum';
let musicEnabled  = localStorage.getItem('bc_music') !== 'false';
let bgAudio       = null;

function getMusicSrc(key) {
    if (!key) return null;
    if (typeof MUSIC_TRACKS !== 'undefined' && MUSIC_TRACKS[key]) return MUSIC_TRACKS[key].src;
    // Fallback: стара MUSIC_B64
    if (typeof MUSIC_B64 !== 'undefined' && key === 'bubblegum') return MUSIC_B64;
    return null;
}

function initMusic() {
    if (!musicEnabled || !currentTrack) return;
    const src = getMusicSrc(currentTrack);
    if (!src) return;
    if (!bgAudio) {
        bgAudio = new Audio(src);
        bgAudio.loop   = true;
        bgAudio.volume = 0.35;
    } else if (bgAudio.src !== src) {
        bgAudio.pause();
        bgAudio = new Audio(src);
        bgAudio.loop   = true;
        bgAudio.volume = 0.35;
    }
    bgAudio.play().catch(() => {
        document.addEventListener('click', () => {
            if (musicEnabled && bgAudio && bgAudio.paused) bgAudio.play();
        }, { once: true });
    });
}

window.pickTrack = key => {
    currentTrack = key;
    localStorage.setItem('bc_track', key || '');
    if (bgAudio) { bgAudio.pause(); bgAudio = null; }
    if (key && musicEnabled) {
        musicEnabled = true;
        localStorage.setItem('bc_music', 'true');
        initMusic();
    } else if (!key) {
        // Вимкнути звук
        musicEnabled = false;
        localStorage.setItem('bc_music', 'false');
    }
    renderSettings();
    if (key && typeof MUSIC_TRACKS !== 'undefined' && MUSIC_TRACKS[key]) {
        showToast(`🎵 ${MUSIC_TRACKS[key].title}`);
    }
};

window.toggleMusic = () => {
    musicEnabled = !musicEnabled;
    localStorage.setItem('bc_music', musicEnabled);
    if (musicEnabled) {
        if (!bgAudio) initMusic();
        else bgAudio.play().catch(()=>{});
    } else {
        if (bgAudio) bgAudio.pause();
    }
    renderSettings();
    showToast(musicEnabled ? L('musicOn') : L('musicOff'));
};

// ============================================================


// ============================================================
// СТАРТ
// ============================================================
applyTheme(currentTheme);
applyLang(currentLang);
updUI();
initMusic();

// ── Кастомні множники петів ──
function applyPetMults(overrides){
    if(!overrides) return;
    const applyToList=list=>list.forEach(pet=>{
        const key=pet.n.replace(/[^a-zA-ZА-Яа-яёЁіІїЇєЄ0-9]/g,'_');
        if(overrides[key]!==undefined) pet.m=overrides[key];
    });
    Object.values(CASES).forEach(c=>applyToList(c.drop));
    applyToList(ADMIN_ONLY_PETS);
    // Оновлюємо петів в інвентарі гравця і зберігаємо в Firebase
    if(s.inv){
        applyToList(s.inv);
        db.ref('players/'+myId+'/inv').set(s.inv);
    }
    // Оновлюємо активного пета і зберігаємо
    if(s.p){
        const key=s.p.n.replace(/[^a-zA-ZА-Яа-яёЁіІїЇєЄ0-9]/g,'_');
        if(overrides[key]!==undefined){
            s.p.m=overrides[key];
            db.ref('players/'+myId+'/p').set(s.p);
        }
    }
    ren();
}
db.ref('petmults').on('value',snap=>applyPetMults(snap.val()));

// ── Оголошення для гравців ──
function initAnnounce(){
    db.ref('announce').on('value',snap=>{
        const ann=snap.val();
        let banner=document.getElementById('announce-banner');
        if(!ann||!ann.text){
            if(banner) banner.remove();
            return;
        }
        if(!banner){
            banner=document.createElement('div');
            banner.id='announce-banner';
            const container=document.querySelector('.container');
            if(container) container.prepend(banner);
        }
        const colors={info:'rgba(6,182,212,.12)',warn:'rgba(251,191,36,.12)',event:'rgba(168,85,247,.12)'};
        const borders={info:'rgba(6,182,212,.3)',warn:'rgba(251,191,36,.3)',event:'rgba(168,85,247,.3)'};
        const icons={info:'ℹ️',warn:'⚠️',event:'🎉'};
        const t=ann.type||'info';
        banner.style.cssText=`background:${colors[t]};border:1px solid ${borders[t]};border-radius:12px;padding:10px 14px;margin:0 0 10px;display:flex;align-items:center;gap:10px`;
        banner.innerHTML=`<span style="font-size:18px;flex-shrink:0">${icons[t]}</span>
            <div style="flex:1;font-size:12px;font-weight:700;color:#fff;line-height:1.4">${ann.text}${ann.link?`<br><a href="${ann.link}" target="_blank" style="color:var(--accent2);font-size:11px">🔗 Детальніше</a>`:''}</div>
            <button onclick="document.getElementById('announce-banner').style.display='none'" style="background:none;border:none;color:var(--muted);font-size:18px;cursor:pointer;flex-shrink:0;padding:0">✕</button>`;
    });
}
setTimeout(initAnnounce, 1500);

// Оновлення таймеру кейсів кожну хвилину
setInterval(()=>{
    if(document.getElementById('v-shop')?.style.display!=='none') renderShop();
}, 60000);
