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
// КОНСТАНТИ
// ============================================================
const ADMINS          = [8216362223, 2067230442];
const myId            = tg.initDataUnsafe?.user?.id || 101;
const myName          = tg.initDataUnsafe?.user?.first_name || "Гравець";
const DEADLINE_EASTER = new Date("2026-04-14T00:00:00+03:00").getTime();
const DEADLINE_CLOWN  = new Date("2026-04-14T00:00:00+03:00").getTime();
const XP_PER_LEVEL    = 1000;

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
  const anim   = RARITY_ANIM[pet.r] || '';
  const radius = Math.round(size*0.18);
  const imgSrc = getPetImageSrc(pet);
  const particles = makeRarityParticles(pet.r, glow);
  const animStyle = anim ? `animation:${anim} 2.5s ease-in-out infinite` : '';

  let content;
  if (imgSrc.type === 'img') {
    const sz = Math.round(size * 0.9);
    // Показуємо тільки img — без дублювання emoji
    content = `<img src="${imgSrc.src}"
      width="${sz}" height="${sz}"
      style="object-fit:contain;position:relative;z-index:1;${animStyle};filter:drop-shadow(0 2px 12px ${glow}aa)"
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
const DEADLINE_EASTER_CASE = new Date("2026-04-14T00:00:00+03:00").getTime();

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
        {n:'Панда', s:'🐼',r:'Епічний',    m:1.14,w:56,c:'#f59e0b'},
        {n:'Лев',   s:'🦁',r:'Легендарний',m:1.16,w:24,c:'#f43f5e'},
        {n:'Дракон',s:'🐲',r:'Легендарний',m:1.17,w:20,c:'#f43f5e'}]},
    easter:   { n:"Великодній Кейс 🥚", p:1450, limited:true, deadline:DEADLINE_EASTER_CASE, drop:[
        {n:'Місячний заєць',   s:'🌙🐇',r:'Рідкісний',  m:1.165,w:33,c:'#a855f7',drawKey:'moonhare'},
        {n:'Місячний баранчик',s:'🌙🐑',r:'Рідкісний',  m:1.165,w:33,c:'#a855f7',drawKey:'moonlamb'},
        {n:'Пончик-хом\'як',   s:'🍩🐹',r:'Епічний',    m:1.22, w:20,c:'#f59e0b',drawKey:'donutham'},
        {n:'Фенікс-писанка',   s:'🔥🥚',r:'Легендарний',m:1.26, w:10,c:'#f43f5e',drawKey:'phoenixegg'},
        {n:'Привид пасхи',     s:'👻🐰',r:'Міфічний',   m:1.33, w:4, c:'#06b6d4',drawKey:'easterghost'}]},
};

const ADMIN_ONLY_PETS = [
    {n:'Клоун',              s:'🤡',r:'Смехуятина', m:1.67, c:'#ff6b35'},
    {n:'Смітник',            s:'🗑️',r:'Легендарний',m:1.35, c:'#f43f5e'},
    {n:'Медовий пасх. медвідь',s:'🍯🐻',r:'Епічний',m:1.25, c:'#f59e0b',drawKey:'honeybear'},
];

// ============================================================
// ТЕМИ
// ============================================================
const THEMES = {
    gold:   {name:'🏆 Золото',  a:'#f59e0b',a2:'#fbbf24',bg:'#050710',btnTxt:'#000'},
    blue:   {name:'💎 Сапфір',  a:'#58a6ff',a2:'#93c5fd',bg:'#030812',btnTxt:'#fff'},
    purple: {name:'🔮 Аметист', a:'#a855f7',a2:'#c084fc',bg:'#070510',btnTxt:'#fff'},
    green:  {name:'🌿 Смарагд', a:'#22c55e',a2:'#4ade80',bg:'#030c06',btnTxt:'#000'},
    red:    {name:'🔥 Рубін',   a:'#ef4444',a2:'#f87171',bg:'#0c0303',btnTxt:'#fff'},
    easter: {name:'🐣 Великдень',a:'#e879a0',a2:'#fbbf24',bg:'#0a0518',btnTxt:'#fff'},
};
let currentTheme = localStorage.getItem('bc_theme') || 'easter';
let currentLang  = localStorage.getItem('bc_lang')  || 'uk';

function applyTheme(key) {
    const t=THEMES[key]||THEMES.easter;
    const r=document.documentElement.style;
    r.setProperty('--accent', t.a); r.setProperty('--accent2',t.a2);
    r.setProperty('--bg', t.bg);    r.setProperty('--btn-txt',t.btnTxt);
    const logo=document.querySelector('.logo');
    if(logo) logo.style.backgroundImage=`linear-gradient(90deg,${t.a},${t.a2},${t.a},${t.a2},${t.a})`;
    currentTheme=key; localStorage.setItem('bc_theme',key);
}

// ============================================================
// МОВА
// ============================================================
const LANGS = {
    uk:{
        chooseGame:'ОБЕРИ ГРУ',betLbl:'СТАВКА',betBtn:'ЗРОБИТИ СТАВКУ',
        win:'Переміг!',lose:'Програв!',waiting:'⏳ Очікування...',
        spinning:'🎰 Крутимо...',openCells:'⚡ Відкривай клітинки!',
        chooseDoor:'🚪 Обирай двері без кролика!',tapBalloon:'🎈 Тисни на яйце!',
        minesBoom:'Бум! Міна!',clownBoom:'За тою дверью був кролик!',
        allRounds:'Виграв всі 4 раунди!',balloonBoom:'Яйце луснуло!',
        take:'💰 ЗАБРАТИ',round:'РАУНД',prize:'Приз:',
        myPets:'🎒 МОЇ ПЕТИ',leaders:'🏆 ЛІДЕРИ',admin:'⚡ АДМІН',
        settings:'⚙️ Налаштування',theme:'Тема',lang:'Мова',
        invEmpty:'Інвентар порожній',invEmptySub:'Відкривай кейси в магазині!',
        loading:'Завантаження...',marketEmpty:'На ринку порожньо',
        saved:'✅ Збережено!',chosen:'ВИБРАНЕ ЧИСЛО',
        g_f50:'⚖️ 50/50 (x1.55)',g_dice:'🎲 Кубик (x2.05)',
        g_wheel:'🎡 Колесо (до x1.6)',g_slots:'🎰 Слоти (до x5.0)',
        g_mines:'💣 Міни (до x4.0)',
        g_clown:'🐰 Двері Великодня (до x2.4)',
        g_balloon:'🥚 Яйце Удачі (до x2.5)',
        g_bj:'🃏 Блекджек (x2.0)',
        g_pvp:'⚔️ Бій Крашанками',
        g_plinko:'🥚 Кошик Удачі (Plinko)',
        expired:'Ця гра вже недоступна',
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
        invCountLabel:'ПЕТІВ',balloonPopsLabel:'Лопань:',
        back:'← Назад',petsOf:'петів',noPet:'Обери пета',noPetRarity:'НЕМАЄ',
        bonusLabelHud:'БОНУС',openingCase:'ВІДКРИВАЄМО...',
        music:'Музика',musicOn:'🔊 Увімк.',musicOff:'🔇 Вимк.',
        pvpTitle:'⚔️ БІЙ КРАШАНКАМИ',pvpSelect:'Обери зону захисту',
        pvpAttack:'Обери куди бити',pvpTop:'Верх',pvpSide:'Боки',pvpBot:'Низ',
        pvpFight:'⚔️ БИТИСЯ!',pvpCommission:'Комісія казино: 5%',
        plinkoTitle:'🥚 КОШИК УДАЧІ',plinkoDrop:'КИНУТИ ЯЙЦЕ',
    },
    en:{
        chooseGame:'CHOOSE GAME',betLbl:'BET',betBtn:'PLACE BET',
        win:'Won!',lose:'Lost!',waiting:'⏳ Waiting...',
        spinning:'🎰 Spinning...',openCells:'⚡ Open cells!',
        chooseDoor:'🚪 Pick a door without the bunny!',tapBalloon:'🎈 Tap the egg!',
        minesBoom:'Boom! Mine!',clownBoom:'The bunny was behind that door!',
        allRounds:'Won all 4 rounds!',balloonBoom:'The egg cracked!',
        take:'💰 TAKE',round:'ROUND',prize:'Prize:',
        myPets:'🎒 MY PETS',leaders:'🏆 LEADERS',admin:'⚡ ADMIN',
        settings:'⚙️ Settings',theme:'Theme',lang:'Language',
        invEmpty:'Inventory empty',invEmptySub:'Open cases in the shop!',
        loading:'Loading...',marketEmpty:'Market is empty',
        saved:'✅ Saved!',chosen:'CHOSEN NUMBER',
        g_f50:'⚖️ 50/50 (x1.55)',g_dice:'🎲 Dice (x2.05)',
        g_wheel:'🎡 Wheel (up to x1.6)',g_slots:'🎰 Slots (up to x5.0)',
        g_mines:'💣 Mines (up to x4.0)',
        g_clown:'🐰 Easter Doors (up to x2.4)',
        g_balloon:'🥚 Lucky Egg (up to x2.5)',
        g_bj:'🃏 Blackjack (x2.0)',
        g_pvp:'⚔️ Egg Battle',
        g_plinko:'🥚 Easter Plinko',
        expired:'This game is no longer available',
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
        invCountLabel:'PETS',balloonPopsLabel:'Pops:',
        back:'← Back',petsOf:'pets',noPet:'Choose a pet',noPetRarity:'NONE',
        bonusLabelHud:'BONUS',openingCase:'OPENING...',
        music:'Music',musicOn:'🔊 On',musicOff:'🔇 Off',
        pvpTitle:'⚔️ EGG BATTLE',pvpSelect:'Choose defense zone',
        pvpAttack:'Choose attack zone',pvpTop:'Top',pvpSide:'Sides',pvpBot:'Bottom',
        pvpFight:'⚔️ FIGHT!',pvpCommission:'Casino fee: 5%',
        plinkoTitle:'🥚 EASTER PLINKO',plinkoDrop:'DROP EGG',
    },
    ru:{
        chooseGame:'ВЫБЕРИ ИГРУ',betLbl:'СТАВКА',betBtn:'СДЕЛАТЬ СТАВКУ',
        win:'Победил!',lose:'Проиграл!',waiting:'⏳ Ожидание...',
        spinning:'🎰 Крутим...',openCells:'⚡ Открывай клетки!',
        chooseDoor:'🚪 Выбирай дверь без кролика!',tapBalloon:'🎈 Нажимай на яйцо!',
        minesBoom:'Бум! Мина!',clownBoom:'За той дверью был кролик!',
        allRounds:'Выиграл все 4 раунда!',balloonBoom:'Яйцо лопнуло!',
        take:'💰 ЗАБРАТЬ',round:'РАУНД',prize:'Приз:',
        myPets:'🎒 МОИ ПИТОМЦЫ',leaders:'🏆 ЛИДЕРЫ',admin:'⚡ АДМИН',
        settings:'⚙️ Настройки',theme:'Тема',lang:'Язык',
        invEmpty:'Инвентарь пуст',invEmptySub:'Открывай кейсы в магазине!',
        loading:'Загрузка...',marketEmpty:'Рынок пуст',
        saved:'✅ Сохранено!',chosen:'ВЫБРАННОЕ ЧИСЛО',
        g_f50:'⚖️ 50/50 (x1.55)',g_dice:'🎲 Кубик (x2.05)',
        g_wheel:'🎡 Колесо (до x1.6)',g_slots:'🎰 Слоты (до x5.0)',
        g_mines:'💣 Мины (до x4.0)',
        g_clown:'🐰 Двери Пасхи (до x2.4)',
        g_balloon:'🥚 Яйцо Удачи (до x2.5)',
        g_bj:'🃏 Блекджек (x2.0)',
        g_pvp:'⚔️ Бой Крашанками',
        g_plinko:'🥚 Корзина Удачи (Plinko)',
        expired:'Эта игра уже недоступна',
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
        invCountLabel:'ПИТОМЦЕВ',balloonPopsLabel:'Взрывов:',
        back:'← Назад',petsOf:'питомцев',noPet:'Выбери питомца',noPetRarity:'НЕТ',
        bonusLabelHud:'БОНУС',openingCase:'ОТКРЫВАЕМ...',
        music:'Музыка',musicOn:'🔊 Вкл.',musicOff:'🔇 Выкл.',
        pvpTitle:'⚔️ БОЙ КРАШАНКАМИ',pvpSelect:'Выбери зону защиты',
        pvpAttack:'Выбери куда бить',pvpTop:'Верх',pvpSide:'Бока',pvpBot:'Низ',
        pvpFight:'⚔️ БИТЬСЯ!',pvpCommission:'Комиссия казино: 5%',
        plinkoTitle:'🥚 КОРЗИНА УДАЧИ',plinkoDrop:'БРОСИТЬ ЯЙЦО',
    },
};
function L(k){return(LANGS[currentLang]||LANGS.uk)[k]||k;}

function applyLang(lang){
    currentLang=lang; localStorage.setItem('bc_lang',lang);
    // Select options
    const sel=document.getElementById('g-sel');
    if(sel){
        const keys=['g_f50','g_dice','g_wheel','g_slots','g_mines','g_clown','g_balloon','g_bj','g_pvp','g_plinko'];
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
    if(document.getElementById('ui-clown')?.style.display!=='none') buildClownUI();
    if(document.getElementById('ui-balloon')?.style.display!=='none') buildBalloonUI();
    buildDiceUI();
}

// ============================================================
// СТАН
// ============================================================
let s={b:0,x:0,r:1,name:myName,p:null,inv:[],v:6.0};
let currentShopTab='cases',currentAdminTab='balance';
let adminInvUserId=null,adminInvUserName='';

// FIREBASE SYNC
db.ref('players/'+myId).on('value',snap=>{
    const d=snap.val();
    if(d){s=d;if(!s.inv)s.inv=[];}
    else{db.ref('players/'+myId).set(s);}
    ren();
});
function save(){db.ref('players/'+myId).set(s);}

// ============================================================
// XP / LEVELUP
// ============================================================
function checkPetLevelUp(){
    if(!s.p) return;
    const needed=(s.p.lvl||1)*XP_PER_LEVEL;
    if(s.x>=needed){
        s.x-=needed; s.p.lvl=(s.p.lvl||1)+1;
        s.p.m=Math.round((s.p.m+0.005)*1000)/1000;
        const idx=s.inv.findIndex(i=>i.id===s.p.id);
        if(idx!==-1) s.inv[idx]=s.p;
        save(); showToast(`${s.p.s||''} <b>${s.p.n}</b> — LVL ${s.p.lvl}! <span style="color:var(--accent)">+0.005</span>`);
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
    document.getElementById('bal-val').innerText=Number.isInteger(s.b)?s.b:s.b.toFixed(2);
    const petLvl=s.p?(s.p.lvl||1):1;
    document.getElementById('xp-f').style.width=Math.min((s.x/(petLvl*XP_PER_LEVEL))*100,100)+'%';
    const bonusLblEl=document.getElementById('pet-bonus-lbl');
    if(bonusLblEl) bonusLblEl.textContent=L('bonusLabelHud');
    if(s.p){
        document.getElementById('p-img').innerText='';
        // Draw pet on HUD canvas
        const hc=document.getElementById('p-hud-canvas');
        if(hc){ hc.width=hc.width; startPetAnim('p-hud-canvas',s.p); }
        else {
            const img=document.getElementById('p-img');
            if(img) img.innerText=s.p.s||'';
        }
        document.getElementById('p-name').innerText=s.p.n;
        document.getElementById('p-m').innerText=s.p.m.toFixed(3);
        document.getElementById('p-l').innerText=s.p.lvl||1;
        const t=document.getElementById('p-rarity');
        t.innerText=s.p.r; t.style.background=s.p.c;
    } else {
        const img=document.getElementById('p-img'); if(img) img.innerText='🥚';
        document.getElementById('p-name').innerText=L('noPet');
        const t=document.getElementById('p-rarity');
        t.innerText=L('noPetRarity'); t.style.background='';
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display='block';
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
            if(c.limited){const diff=dl-now,d=Math.floor(diff/86400000),hr=Math.floor((diff/3600000)%24);timer=`<div class="case-timer">⏳ ${d}д ${hr}г</div>`;}
            h+=`<div class="shop-card"><div class="case-info">
                <div class="case-name">${c.n} ${badge}</div>
                <div style="font-size:10px;margin:4px 0;font-weight:600;opacity:.85">${chances}</div>${timer}
            </div><button class="btn-buy" onclick="buyCase('${k}')">${c.p} BB</button></div>`;
        }
        list.innerHTML=h;
    } else {
        list.innerHTML=tabs+`<div id="m-list" class="glass" style="text-align:center;color:#8d99ae">${L('loading')}</div>`;
        db.ref('market').once('value',snap=>{
            let h='';
            snap.forEach(child=>{
                const lot=child.val();
                if(!lot||!lot.pet) return;
                if(String(lot.sellerId)===String(myId)) return;
                h+=`<div class="market-item">
                    <div><div style="font-weight:700;color:${lot.pet.c}">${lot.pet.s} ${lot.pet.n}</div>
                    <div style="font-size:11px;color:#8d99ae">LVL ${lot.pet.lvl||1} · x${lot.pet.m.toFixed(3)} · ${lot.sellerName}</div></div>
                    <button class="btn-buy" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button>
                </div>`;
            });
            const el=document.getElementById('m-list');
            if(el) el.innerHTML=h||`<div style="padding:30px;text-align:center;color:#8d99ae">${L('marketEmpty')}</div>`;
        });
    }
}
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
    if(!s.inv||!s.inv.length){
        el.innerHTML=`<div class="inv-empty"><div style="font-size:52px;margin-bottom:12px">🥚</div>
            <div style="font-weight:bold;font-size:15px">${L('invEmpty')}</div>
            <div style="font-size:12px;opacity:.6;margin-top:4px">${L('invEmptySub')}</div></div>`;
        return;
    }
    let h=`<div style="font-size:11px;color:#8d99ae;font-weight:700;margin-bottom:10px;letter-spacing:.5px">${s.inv.length} ${L('invCountLabel')}</div>`;
    s.inv.forEach((p,i)=>{
        const eq=s.p&&s.p.id===p.id;
        const containerId=`pet-vis-${i}`;
        h+=`<div class="pet-card${eq?' pet-eq':''}">
            <div class="pet-stripe" style="background:${p.c}"></div>
            <div id="${containerId}" data-size="72" style="flex-shrink:0"></div>
            <div class="pet-info">
                <div class="pet-badge" style="background:${p.c}25;color:${p.c};border:1px solid ${p.c}50">${p.r}</div>
                <div class="pet-name">${p.n}${eq?`<span class="pet-active-tag">✦ ${L('activePet')}</span>`:''}</div>
                <div class="pet-stats">
                    <span>${L('bonusWord')} <b style="color:${p.c}">x${p.m.toFixed(3)}</b></span>
                    <span style="margin-left:10px">LVL <b style="color:#eee">${p.lvl||1}</b></span>
                </div>
            </div>
            <div class="pet-btns">
                <button class="pb-equip${eq?' pb-eq':''}" onclick="equip(${p.id})">${eq?L('equipped'):L('equip')}</button>
                <button class="pb-sell" onclick="listOnMarket(${p.id})">🏪</button>
            </div>
        </div>`;
    });
    el.innerHTML=h;
    // Insert pet visuals after render
    requestAnimationFrame(()=>{
        s.inv.forEach((p,i)=>startPetAnim(`pet-vis-${i}`,p));
    });
}
window.equip=id=>{s.p=s.inv.find(i=>i.id===id);save();renderInv();ren();};

// ============================================================
// КОЛЕСО
// ============================================================
const WHEEL_SEGS=[
    {label:'0x',      color:'#c0392b',m:0,   start:0,  end:180},
    {label:'1.4x',    color:'#27ae60',m:1.4, start:180,end:270},
    {label:'1.6x',    color:'#2980b9',m:1.6, start:270,end:342},
    {label:'🍯🐻',   color:'#f59e0b',m:999, start:342,end:360},
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
    for(let i=0;i<25;i++){const cell=minesState.cells[i];if(cell.revealed){h+=cell.mine?`<div class="mc mc-boom">💣</div>`:`<div class="mc mc-safe">🌿</div>`;}else if(minesState.alive){h+=`<div class="mc mc-btn" onclick="minesReveal(${i})">🥚</div>`;}else{h+=`<div class="mc" style="opacity:.3">·</div>`;}}
    document.getElementById('mines-grid').innerHTML=h;
}
window.minesReveal=idx=>{
    if(!minesState||!minesState.alive)return;
    const cell=minesState.cells[idx];cell.revealed=true;
    if(cell.mine){
        minesState.alive=false;minesState.cells.forEach(c=>{if(c.mine)c.revealed=true;});buildMinesGrid();
        document.getElementById('mines-ctrl').style.display='none';
        const bt=minesState.bet;s.b-=bt;save();
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
    s.b+=win;s.x+=Math.floor(bt/2);save();checkPetLevelUp();
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
// ВЕЛИКОДНІ ДВЕРІ (Clown Doors → Easter Doors)
// ============================================================
const CLOWN_MULTS=[1.1,1.5,2.0,2.4];
let clownState=null;
function buildClownUI(){
    const el=document.getElementById('ui-clown');if(!el)return;
    if(!clownState){
        el.innerHTML=`<div class="clown-info">
            <div style="font-size:13px;font-weight:700;color:#8d99ae;margin-bottom:10px">${L('roundsAndMults')}</div>
            <div class="clown-rounds-info">${CLOWN_MULTS.map((m,i)=>`<div class="clown-ri"><span>${L('round')} ${i+1}</span><b style="color:var(--accent)">x${m}</b><small>${5-i} 🚪</small></div>`).join('')}</div>
            <div style="font-size:11px;color:#8d99ae;margin-top:10px;text-align:center">${L('pressToStart')}</div>
        </div>`;return;
    }
    const {round,alive,doors,betweenRounds}=clownState,totalDoors=5-round;
    let doorsHtml='';
    for(let i=0;i<totalDoors;i++){
        if(doors[i]==='clown') doorsHtml+=`<div class="clown-door door-boom">🐰</div>`;
        else if(doors[i]==='ok') doorsHtml+=`<div class="clown-door door-ok">🥚</div>`;
        else if(alive) doorsHtml+=`<div class="clown-door door-closed" onclick="clownPick(${i})">🚪</div>`;
        else doorsHtml+=`<div class="clown-door" style="opacity:.3">🚪</div>`;
    }
    const prevMult=round>0?CLOWN_MULTS[round-1]:null;
    const canCashout=round>0&&alive&&betweenRounds;
    el.innerHTML=`<div class="clown-game">
        <div class="clown-header"><span style="color:#8d99ae;font-size:12px;font-weight:700">${L('round')} ${round+1}/4</span><span style="color:var(--accent);font-weight:800">${L('prize')} x${CLOWN_MULTS[round]}</span></div>
        <div class="clown-doors">${doorsHtml}</div>
        <div style="font-size:11px;color:#8d99ae;text-align:center;margin-top:8px">${L('chooseDoor')}</div>
        ${canCashout?`<button class="btn" style="background:var(--success);margin-top:10px;padding:11px;font-size:13px" onclick="clownCashout()">${L('take')} x${prevMult}</button>`:''}
    </div>`;
}
window.clownPick=idx=>{
    if(!clownState||!clownState.alive)return;
    clownState.betweenRounds=false;
    const{round,bet}=clownState,totalDoors=5-round,clownDoor=Math.floor(Math.random()*totalDoors);
    clownState.doors[idx]=(idx===clownDoor)?'clown':'ok';
    if(idx===clownDoor){
        clownState.alive=false;buildClownUI();s.b-=bet;save();
        setTimeout(()=>{document.getElementById('g-stat').innerHTML=`<span style="color:var(--error)">-${bet.toFixed(2)} BB 🐰</span><br><small>${L('clownBoom')}</small>`;clownState=null;buildClownUI();},800);
    } else {
        if(round>=3){
            const mult=CLOWN_MULTS[3],bon=s.p?s.p.m:1,win=(bet*mult-bet)*bon;
            s.b+=win;s.x+=Math.floor(bet/2);save();checkPetLevelUp();
            document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${win.toFixed(2)} BB 🎉</span><br><small>${L('allRounds')} x${mult}</small>`;
            clownState.alive=false;buildClownUI();setTimeout(()=>{clownState=null;buildClownUI();},1500);
        } else {clownState.round++;clownState.doors={};clownState.betweenRounds=true;buildClownUI();}
    }
};
window.clownCashout=()=>{
    if(!clownState||!clownState.alive)return;
    const{bet,round}=clownState,mult=CLOWN_MULTS[round-1],bon=s.p?s.p.m:1,win=(bet*mult-bet)*bon;
    s.b+=win;s.x+=Math.floor(bet/2);save();checkPetLevelUp();
    document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${win.toFixed(2)} BB 💰</span><br><small>${L('take')} x${mult}</small>`;
    clownState=null;buildClownUI();
};
function startClown(bt){clownState={bet:bt,round:0,alive:true,betweenRounds:false,doors:{}};document.getElementById('g-stat').innerHTML=`<span style="color:var(--accent)">${L('chooseDoor')}</span>`;buildClownUI();}

// ============================================================
// ЯЙЦe УДАЧІ (Balloon → Easter Egg)
// ============================================================
const BALLOON_MAX=15;
let balloonState=null;
function buildBalloonUI(){
    const el=document.getElementById('ui-balloon');if(!el)return;
    if(!balloonState){
        el.innerHTML=`<div style="text-align:center;padding:10px 0">
            <div style="font-size:11px;color:#8d99ae;font-weight:700;margin-bottom:8px">ЗА КОЖНЕ ЛОПАННЯ +x0.1</div>
            <div style="font-size:11px;color:#8d99ae">Макс. ${BALLOON_MAX} лопань · Яйце може луснути будь-коли</div>
            <div style="font-size:11px;color:#8d99ae;margin-top:4px">Макс. приз: <b style="color:var(--accent)">x${(1+BALLOON_MAX*.1).toFixed(1)}</b></div>
        </div>`;return;
    }
    const{pops,alive}=balloonState,mult=(1+pops*.1).toFixed(1),size=Math.min(80+pops*8,180);
    // Easter egg colors
    const colors=['#e82a4a','#4a8ae8','#4ae84a','#f8d84a','#e84ae8'];
    const col=colors[pops%colors.length];
    el.innerHTML=`<div class="balloon-game">
        <div class="balloon-mult">x${mult}</div>
        <div id="balloon-el" style="width:${size}px;height:${size*1.2}px;margin:0 auto;cursor:${alive?'pointer':'default'};transition:.15s;position:relative;${alive?'':'opacity:.6'}"
             ${alive?'onclick="balloonPop()"':''}>
            <canvas id="egg-canvas" width="${size}" height="${size*1.2}" style="border-radius:50% 50% 45% 45%;"></canvas>
        </div>
        <div style="font-size:11px;color:#8d99ae;margin-top:8px">${L('balloonPopsLabel')} ${pops}</div>
        ${alive&&pops>0?`<button class="btn" style="background:var(--success);margin-top:10px;padding:11px;font-size:13px" onclick="balloonCashout()">${L('take')} x${mult}</button>`:''}
    </div>`;
    // Draw egg on canvas
    const ec=document.getElementById('egg-canvas');
    if(ec){
        const ectx=ec.getContext('2d'),EW=ec.width,EH=ec.height;
        const eg=ectx.createRadialGradient(EW*.4,EH*.3,EW*.05,EW*.5,EH*.5,EW*.5);
        eg.addColorStop(0,'#fff'); eg.addColorStop(0.3,col); eg.addColorStop(1,'#8b0000');
        ectx.fillStyle=eg; ectx.beginPath(); ectx.ellipse(EW*.5,EH*.5,EW*.45,EH*.47,0,0,Math.PI*2); ectx.fill();
        // Pattern
        ectx.strokeStyle='rgba(255,255,255,0.6)'; ectx.lineWidth=2;
        ectx.beginPath(); ectx.ellipse(EW*.5,EH*.5,EW*.45,EH*.47,0,Math.PI*.3,Math.PI*.9); ectx.stroke();
        ectx.strokeStyle='rgba(255,255,255,0.4)';
        for(let i=0;i<5;i++){ectx.beginPath();const a=i/5*Math.PI*2;ectx.moveTo(EW*.5+Math.cos(a)*EW*.15,EH*.5+Math.sin(a)*EH*.15);ectx.lineTo(EW*.5+Math.cos(a)*EW*.4,EH*.5+Math.sin(a)*EH*.4);ectx.stroke();}
        if(!alive){ectx.strokeStyle='#333';ectx.lineWidth=3;ectx.beginPath();ectx.moveTo(EW*.3,EH*.4);ectx.lineTo(EW*.7,EH*.6);ectx.moveTo(EW*.7,EH*.4);ectx.lineTo(EW*.3,EH*.6);ectx.stroke();}
    }
}
window.balloonPop=()=>{
    if(!balloonState||!balloonState.alive)return;
    balloonState.pops++;
    if(balloonState.pops>=balloonState.burstAt||balloonState.pops>=BALLOON_MAX){
        balloonState.alive=false;buildBalloonUI();const bt=balloonState.bet;s.b-=bt;save();
        setTimeout(()=>{document.getElementById('g-stat').innerHTML=`<span style="color:var(--error)">-${bt.toFixed(2)} BB 💥</span><br><small>${L('balloonBoom')}</small>`;balloonState=null;buildBalloonUI();},700);
    } else {
        const el=document.getElementById('balloon-el');if(el){el.style.transform='scale(1.15)';setTimeout(()=>el.style.transform='scale(1)',150);}
        buildBalloonUI();
    }
};
window.balloonCashout=()=>{
    if(!balloonState||!balloonState.alive||balloonState.pops===0)return;
    const{bet,pops}=balloonState,mult=1+pops*.1,bon=s.p?s.p.m:1,win=(bet*mult-bet)*bon;
    s.b+=win;s.x+=Math.floor(bet/2);save();checkPetLevelUp();
    document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${win.toFixed(2)} BB 🥚</span><br><small>Забрав x${mult.toFixed(1)}</small>`;
    balloonState=null;buildBalloonUI();
};
function startBalloon(bt){balloonState={bet:bt,pops:0,burstAt:Math.floor(Math.random()*BALLOON_MAX)+1,alive:true};document.getElementById('g-stat').innerHTML=`<span style="color:var(--accent)">${L('tapBalloon')}</span>`;buildBalloonUI();}

// ============================================================
// БІЙ КРАШАНКАМИ (PvP)
// ============================================================
let pvpState=null;
function buildPvpUI(){
    const el=document.getElementById('ui-pvp');if(!el)return;
    const zones=['top','side','bot'];
    const zoneEmoji={'top':'⬆️','side':'↔️','bot':'⬇️'};
    const zoneLabel={
        'top': L('pvpTop'), 'side': L('pvpSide'), 'bot': L('pvpBot')
    };
    const defSel = pvpState?.defense;
    const atkSel = pvpState?.attack;

    el.innerHTML=`<div style="padding:4px 0">
        <div style="font-size:12px;color:#8d99ae;text-align:center;margin-bottom:14px;font-weight:600">
            ${L('pvpCommission')}<br>
            <span style="color:var(--accent);font-size:11px">Якщо атака влучає — яйце тріскає. Захисти своє та розбий ворожe!</span>
        </div>

        <div style="display:grid;grid-template-columns:1fr auto 1fr;gap:10px;align-items:start;margin-bottom:14px">
            <!-- Захист -->
            <div>
                <div style="font-size:11px;color:#8d99ae;font-weight:700;text-align:center;margin-bottom:8px">🛡️ ${L('pvpSelect')}</div>
                ${zones.map(v=>`
                    <button onclick="pvpPick('defense','${v}')" style="
                        width:100%;padding:10px 8px;margin-bottom:6px;border:2px solid ${defSel===v?'var(--accent)':'var(--border)'};
                        border-radius:10px;background:${defSel===v?'rgba(255,255,255,.12)':'rgba(255,255,255,.04)'};
                        color:${defSel===v?'var(--accent)':'#8d99ae'};font-weight:700;font-size:13px;cursor:pointer;
                        display:flex;align-items:center;gap:6px;
                    ">
                        <span>${zoneEmoji[v]}</span> ${zoneLabel[v]}
                        ${defSel===v?'<span style="margin-left:auto">✓</span>':''}
                    </button>`).join('')}
            </div>

            <!-- Яйця -->
            <div style="text-align:center;font-size:32px;padding-top:28px">🥚<br>⚔️<br>🥚</div>

            <!-- Атака -->
            <div>
                <div style="font-size:11px;color:#8d99ae;font-weight:700;text-align:center;margin-bottom:8px">⚔️ ${L('pvpAttack')}</div>
                ${zones.map(v=>`
                    <button onclick="pvpPick('attack','${v}')" style="
                        width:100%;padding:10px 8px;margin-bottom:6px;border:2px solid ${atkSel===v?'var(--error)':'var(--border)'};
                        border-radius:10px;background:${atkSel===v?'rgba(239,68,68,.15)':'rgba(255,255,255,.04)'};
                        color:${atkSel===v?'var(--error)':'#8d99ae'};font-weight:700;font-size:13px;cursor:pointer;
                        display:flex;align-items:center;gap:6px;
                    ">
                        <span>${zoneEmoji[v]}</span> ${zoneLabel[v]}
                        ${atkSel===v?'<span style="margin-left:auto">✓</span>':''}
                    </button>`).join('')}
            </div>
        </div>

        ${defSel&&atkSel ? `
            <div style="background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:12px;font-size:12px;color:#8d99ae;text-align:center">
                Захист: <b style="color:var(--accent)">${zoneEmoji[defSel]} ${zoneLabel[defSel]}</b> · Атака: <b style="color:var(--error)">${zoneEmoji[atkSel]} ${zoneLabel[atkSel]}</b>
            </div>
            <button class="btn" onclick="pvpFight()">${L('pvpFight')}</button>
        ` : `
            <div style="text-align:center;color:#8d99ae;font-size:12px;padding:8px">
                👆 Обери зону захисту і зону атаки
            </div>
        `}
    </div>`
;}
window.pvpPick=(zone,val)=>{
    if(!pvpState) pvpState={};
    pvpState[zone]=val; buildPvpUI();
};
window.pvpFight=()=>{
    const bt=parseFloat(document.getElementById('bet-a').value);
    if(isNaN(bt)||bt<=0||bt>s.b)return alert('Мало BB!');
    if(!pvpState||!pvpState.defense||!pvpState.attack)return;

    const zones=['top','side','bot'];
    const botDefense=zones[Math.floor(Math.random()*3)];
    const botAttack =zones[Math.floor(Math.random()*3)];
    const playerCracks = pvpState.attack   !== botDefense;
    const botCracks    = botAttack         !== pvpState.defense;
    const commission   = Math.round(bt*0.05*100)/100;
    const zoneEmoji={'top':'⬆️','side':'↔️','bot':'⬇️'};
    const zoneLabel={'top':L('pvpTop'),'side':L('pvpSide'),'bot':L('pvpBot')};
    const el=document.getElementById('ui-pvp');

    // Показуємо анімацію зіткнення
    el.innerHTML=`<div style="text-align:center;padding:20px 0">
        <div style="font-size:48px;animation:pvp-clash 0.6s ease" id="pvp-anim">🥚💥🥚</div>
        <div style="font-size:12px;color:#8d99ae;margin-top:8px">Зіткнення...</div>
    </div>`;

    setTimeout(()=>{
        let resultHTML='', won=0;
        if(playerCracks&&!botCracks){
            won=(bt-commission)*(s.p?s.p.m:1);
            s.b+=won;s.x+=Math.floor(bt/2);save();checkPetLevelUp();
            resultHTML=`<div style="font-size:36px">🥚✅</div>
                <div style="color:var(--success);font-size:18px;font-weight:900;margin-top:8px">+${won.toFixed(2)} BB</div>
                <div style="color:#8d99ae;font-size:12px;margin-top:4px">Твоє яйце вціліло! Ворожє тріснуло! 🎉</div>`;
        } else if(botCracks&&!playerCracks){
            s.b-=bt;save();
            resultHTML=`<div style="font-size:36px">💔🥚</div>
                <div style="color:var(--error);font-size:18px;font-weight:900;margin-top:8px">-${bt.toFixed(2)} BB</div>
                <div style="color:#8d99ae;font-size:12px;margin-top:4px">Твоє яйце тріснуло! 😢</div>`;
        } else if(playerCracks&&botCracks){
            s.b-=commission;save();
            resultHTML=`<div style="font-size:36px">💥💥</div>
                <div style="color:var(--warning);font-size:16px;font-weight:900;margin-top:8px">Нічия! -${commission.toFixed(2)} BB</div>
                <div style="color:#8d99ae;font-size:12px;margin-top:4px">Обидва яйця тріснули!</div>`;
        } else {
            resultHTML=`<div style="font-size:36px">🥚🥚</div>
                <div style="color:var(--accent);font-size:16px;font-weight:900;margin-top:8px">Нічия!</div>
                <div style="color:#8d99ae;font-size:12px;margin-top:4px">Обидва захистились!</div>`;
        }

        const detailColor={top:'#38bdf8',side:'#a78bfa',bot:'#f87171'};
        el.innerHTML=`<div style="text-align:center;padding:8px 0">
            ${resultHTML}
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px;font-size:11px">
                <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:10px">
                    <div style="color:#8d99ae;margin-bottom:4px">Твоя атака</div>
                    <div style="font-weight:700">${zoneEmoji[pvpState.attack]} ${zoneLabel[pvpState.attack]}</div>
                    <div style="color:#8d99ae;margin-top:2px">Бот захистив: ${zoneEmoji[botDefense]} ${zoneLabel[botDefense]}</div>
                    <div style="color:${playerCracks?'var(--success)':'var(--error)'};font-weight:700;margin-top:4px">${playerCracks?'✅ Влучив!':'❌ Заблоковано'}</div>
                </div>
                <div style="background:rgba(255,255,255,.04);border-radius:10px;padding:10px">
                    <div style="color:#8d99ae;margin-bottom:4px">Бот атакував</div>
                    <div style="font-weight:700">${zoneEmoji[botAttack]} ${zoneLabel[botAttack]}</div>
                    <div style="color:#8d99ae;margin-top:2px">Твій захист: ${zoneEmoji[pvpState.defense]} ${zoneLabel[pvpState.defense]}</div>
                    <div style="color:${botCracks?'var(--error)':'var(--success)'};font-weight:700;margin-top:4px">${botCracks?'💔 Тріснуло!':'🛡️ Захистив!'}</div>
                </div>
            </div>
            <button class="btn" style="margin-top:14px;background:rgba(255,255,255,.1);color:#fff;font-size:13px" onclick="pvpState=null;buildPvpUI()">🥚 Грати знову</button>
        </div>`;
        pvpState=null;
    },800);
};

// ============================================================
// PLINKO (Кошик Удачі)
// ============================================================
// Plinko: 13 кошиків, симетричні, макс x1.75 в центрі, x0.2 на краях
// Очікуване значення ~0.94
const PLINKO_MULTS=[0.2,0.3,0.4,0.6,0.8,1.1,1.75,1.1,0.8,0.6,0.4,0.3,0.2];
let plinkoRunning=false;
function buildPlinkoUI(){
    const el=document.getElementById('ui-plinko');if(!el)return;
    el.innerHTML=`<div style="text-align:center">
        <canvas id="plinko-canvas" width="280" height="320" style="border-radius:12px;background:rgba(0,0,0,.3)"></canvas>
        <div id="plinko-result" style="margin-top:8px;font-weight:bold;min-height:24px"></div>
    </div>`;
    drawPlinkoBoard();
}
function drawPlinkoBoard(ballX,ballY,winIdx){
    const canvas=document.getElementById('plinko-canvas');if(!canvas)return;
    const ctx=canvas.getContext('2d'),W=280,H=320;
    ctx.clearRect(0,0,W,H);
    // Pegs (carrot shaped)
    const rows=8,cols=9;
    for(let r=0;r<rows;r++){
        const numPegs=cols-r%2,startX=r%2===0?14:28;
        for(let c=0;c<numPegs;c++){
            const px=startX+c*(W-28)/(numPegs-1),py=40+r*28;
            ctx.fillStyle='#f8a030';
            ctx.beginPath();ctx.arc(px,py,5,0,Math.PI*2);ctx.fill();
        }
    }
    // Buckets
    const bW=W/PLINKO_MULTS.length;
    PLINKO_MULTS.forEach((m,i)=>{
        const hue=m<1?0:m<3?60:m<10?120:180;
        ctx.fillStyle=`hsla(${hue},80%,50%,.85)`;
        ctx.fillRect(i*bW+1,H-32,bW-2,32);
        ctx.fillStyle='#fff';ctx.font='bold 8px system-ui';ctx.textAlign='center';
        ctx.fillText(`x${m}`,i*bW+bW/2,H-16);
    });
    // Ball
    if(ballX!==undefined){
        ctx.fillStyle='#e82a4a';ctx.beginPath();ctx.arc(ballX,ballY,8,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.5)';ctx.beginPath();ctx.arc(ballX-2,ballY-2,3,0,Math.PI*2);ctx.fill();
    }
    // Highlight winning bucket
    if(winIdx!==undefined){
        ctx.strokeStyle='#fff';ctx.lineWidth=2;
        ctx.strokeRect(winIdx*(W/PLINKO_MULTS.length)+1,H-32,W/PLINKO_MULTS.length-2,32);
    }
}
function dropPlinkoEgg(bt){
    if(plinkoRunning)return; plinkoRunning=true;
    const N=PLINKO_MULTS.length, ROWS=8;
    // Стартова позиція — центр з невеликим відхиленням
    // Після ROWS рядів позиція розподіляється по всій ширині (біноміальний розподіл)
    let col = Math.floor(N/2);
    const path=[col];
    for(let r=0;r<ROWS;r++){
        const dir = Math.random()<0.5 ? -1 : 1;
        col = Math.max(0, Math.min(N-1, col + dir));
        path.push(col);
    }
    const bucketIdx = col;
    const finalMult = PLINKO_MULTS[bucketIdx];
    const W=280, H=320;
    const bucketW = W/N;
    const finalX = bucketIdx*bucketW + bucketW/2;

    let step=0;
    const iv=setInterval(()=>{
        const progress = step/path.length;
        const curCol = path[Math.min(step, path.length-1)];
        const bx = curCol*bucketW + bucketW/2 + (Math.random()-.5)*4*(1-progress);
        const by = 20 + progress*(H-60);
        drawPlinkoBoard(bx, by, step>=path.length-1 ? bucketIdx : undefined);
        step++;
        if(step > path.length){
            clearInterval(iv);
            drawPlinkoBoard(finalX, H-40, bucketIdx);
            plinkoRunning=false;
            const payout = bt * finalMult;
            const won = payout - bt;
            s.b += won; save();
            if(won >= 0){
                if(finalMult > 0) { s.x+=Math.floor(bt/2); checkPetLevelUp(); }
                document.getElementById('plinko-result').innerHTML=`<span style="color:var(--success)">+${won.toFixed(2)} BB 🥚 x${finalMult}</span>`;
            } else {
                document.getElementById('plinko-result').innerHTML=`<span style="color:var(--error)">${won.toFixed(2)} BB (x${finalMult})</span>`;
            }
        }
    }, 90);
}

// ============================================================
// CANVAS КЕЙСИ
// ============================================================
function buyCase(k){
    const c=CASES[k];
    if(s.b<c.p)return alert('Мало BB!');
    s.b-=c.p;save();
    document.getElementById('case-modal').style.display='flex';
    let rand=Math.random()*100,win,cur=0;
    for(const p of c.drop){cur+=p.w;if(rand<=cur){win={...p};break;}}
    const CARD_W=90,COUNT=55,WIN_IDX=40;
    const pool=[];for(const key in CASES)pool.push(...CASES[key].drop);
    const scr=document.getElementById('case-scroll');
    scr.innerHTML='';scr.style.transition='none';scr.style.left='0px';
    const items=[];for(let i=0;i<COUNT;i++)items.push(i===WIN_IDX?win:pool[Math.floor(Math.random()*pool.length)]);
    items.forEach(pet=>{
        const cv=document.createElement('canvas');cv.width=84;cv.height=104;
        cv.style.cssText='display:block;margin:3px;border-radius:12px;flex-shrink:0';
        scr.appendChild(cv);drawPetCard(cv,pet);
    });
    setTimeout(()=>{scr.style.transition='5s cubic-bezier(0.05,0,0.1,1)';scr.style.left=`-${WIN_IDX*CARD_W-(window.innerWidth/2-CARD_W/2)}px`;},50);
    const resEl=document.getElementById('case-res'),closeEl=document.getElementById('case-close');
    setTimeout(()=>{
        const bigCv=document.createElement('canvas');bigCv.width=160;bigCv.height=196;
        bigCv.style.cssText='border-radius:16px;display:block;margin:0 auto 10px';
        drawPetCard(bigCv,win);resEl.innerHTML='';resEl.appendChild(bigCv);
        const label=document.createElement('div');
        label.innerHTML=`<span style="color:${RARITY_GLOW[win.r]||'#fff'};font-size:20px;font-weight:900">${win.n}</span><br><small style="color:#8d99ae">${win.r} · x${win.m.toFixed(3)}</small>`;
        resEl.appendChild(label);closeEl.style.display='block';
        win.id=Date.now();win.lvl=1;s.inv.push(win);save();
    },5600);
}
window.buyCase=buyCase;
window.closeCase=()=>{document.getElementById('case-modal').style.display='none';document.getElementById('case-close').style.display='none';document.getElementById('case-res').innerText='';};

// ============================================================
// updUI + play
// ============================================================
window.updUI=()=>{
    const g=document.getElementById('g-sel').value;
    ['dice','wheel','slots','mines','bj','clown','balloon','pvp','plinko'].forEach(id=>{
        const el=document.getElementById('ui-'+id);if(el)el.style.display=(g===id)?'block':'none';
    });
    if(g==='dice')    buildDiceUI();
    if(g==='wheel')   setTimeout(()=>drawWheel(wheelAngle),50);
    if(g==='mines')   updateMinesCount();
    if(g==='clown')   buildClownUI();
    if(g==='balloon') buildBalloonUI();
    if(g==='pvp')     buildPvpUI();
    if(g==='plinko')  buildPlinkoUI();
};

window.play=()=>{
    const bt=parseFloat(document.getElementById('bet-a').value);
    if(isNaN(bt)||bt<=0||bt>s.b)return alert('Мало BB!');
    const g=document.getElementById('g-sel').value;
    const now=Date.now();
    if((g==='clown'||g==='balloon')&&now>DEADLINE_CLOWN)return alert(L('expired'));
    if(g==='mines'&&minesState&&minesState.alive)return alert('Спочатку завершуй гру!');
    if(g==='clown'&&clownState&&clownState.alive)return alert('Спочатку завершуй гру!');
    if(g==='balloon'&&balloonState&&balloonState.alive)return alert('Спочатку завершуй гру!');
    document.getElementById('g-stat').innerText=L('waiting');
    if(g==='f50'){
        const w=Math.random()>.5;let ticks=0;
        document.getElementById('g-stat').innerHTML='<div id="coin-anim" style="font-size:56px;display:inline-block;transition:transform .08s">🥚</div>';
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
        if(p<50)m=0;else if(p<75)m=1.4;else if(p<95)m=1.6;else m=999;
        spinWheel(m,()=>{
            if(m===999){
                const bear={n:'Медовий пасх. медвідь',s:'🍯🐻',r:'Епічний',m:1.25,w:0,c:'#f59e0b',id:Date.now(),lvl:1,drawKey:'honeybear'};
                s.inv.push(bear);save();
                document.getElementById('g-stat').innerHTML=`<span style="color:#f59e0b">🎉 Ти виграв 🍯🐻 Медового ведмедя!</span>`;
                showToast('🍯🐻 <b>Медовий ведмідь</b> в інвентарі!');
            } else {res(m>0,bt,m,`Множник x${m}`);}
        });
    } else if(g==='slots'){
        if(slotsSpinning)return;
        document.getElementById('g-stat').innerText=L('spinning');
        runSlots((a,b,c)=>res(slotMult(a,b,c)>0,bt,slotMult(a,b,c),`${a} ${b} ${c}`));
    } else if(g==='mines'){startMines(bt);return;
    } else if(g==='clown'){startClown(bt);return;
    } else if(g==='balloon'){startBalloon(bt);return;
    } else if(g==='pvp'){buildPvpUI();document.getElementById('g-stat').innerText='';return;
    } else if(g==='plinko'){dropPlinkoEgg(bt);s.b-=bt;save();return;
    } else if(g==='bj') startBJ(bt);
};

function res(win,bt,m,msg){
    const bon=s.p?s.p.m:1;
    if(win){const w=(bt*m-bt)*bon;s.b+=w;s.x+=Math.floor(bt/2);document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${w.toFixed(2)} BB</span><br><small>${msg}</small>`;checkPetLevelUp();}
    else{s.b-=bt;document.getElementById('g-stat').innerHTML=`<span style="color:var(--error)">-${bt.toFixed(2)} BB</span><br><small>${msg}</small>`;}
    save();
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
        let l=[];snap.forEach(c=>{const v=c.val();if(v.name)l.push(v);});l.sort((a,b)=>b.b-a.b);
        document.getElementById('leaderboard').innerHTML=l.slice(0,10).map((p,i)=>`
            <div class="market-item"><span>${['🥇','🥈','🥉'][i]||`${i+1}.`} ${p.name}</span><b style="color:var(--accent)">${Math.floor(p.b)} BB</b></div>`).join('');
    });
}

// ============================================================
// АДМІНКА
// ============================================================
window.setAdminTab=t=>{currentAdminTab=t;adminInvUserId=null;loadAdmin();};
function loadAdmin(){
    if(currentAdminTab==='inv'&&adminInvUserId){loadAdminUserInv(adminInvUserId,adminInvUserName);return;}
    db.ref('players').once('value',snap=>{
        let tabs=`<div class="admin-tabs">
            <div class="a-tab ${currentAdminTab==='balance'?'active':''}" onclick="setAdminTab('balance')">💰 ${L('adminBalance')}</div>
            <div class="a-tab ${currentAdminTab==='pets'?'active':''}" onclick="setAdminTab('pets')">🐾 ${L('adminPets')}</div>
            <div class="a-tab ${currentAdminTab==='inv'?'active':''}" onclick="setAdminTab('inv')">🎒 ${L('adminInv')}</div>
        </div>`;
        let h=tabs;
        snap.forEach(c=>{
            const p=c.val(),uid=c.key;
            h+=`<div class="admin-card"><b>${p.name||L('anon')}</b> <small style="color:#8d99ae">${(p.b||0).toFixed(2)} BB</small>`;
            if(currentAdminTab==='balance'){h+=`<div class="admin-ctrl-grid"><button class="btn-ctrl b-add" onclick="mathB('${uid}','add')">+ ${L('adminBalance')}</button><button class="btn-ctrl b-sub" onclick="mathB('${uid}','sub')">−</button><button class="btn-ctrl b-set" onclick="mathB('${uid}','set')">Set</button></div>`;}
            else if(currentAdminTab==='pets'){h+=`<button class="btn" style="padding:8px;font-size:12px;margin-top:8px;background:#8b5cf6" onclick="adminGivePet('${uid}')">🎁 ${L('adminPets')}</button>`;}
            else{h+=`<br><small style="color:#8d99ae">${L('petsCount')} ${(p.inv||[]).length}</small><button class="btn" style="padding:8px;font-size:12px;margin-top:8px;background:#1c4a8a" onclick="openAdminInv('${uid}','${(p.name||L('anon')).replace(/'/g,"\\'")}')"> ${L('viewInv')}</button>`;}
            h+=`</div>`;
        });
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.openAdminInv=(uid,name)=>{adminInvUserId=uid;adminInvUserName=name;loadAdminUserInv(uid,name);};
function loadAdminUserInv(uid,name){
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val(),inv=(p&&p.inv)?p.inv:[];
        let h=`<div class="admin-tabs"><div class="a-tab" onclick="setAdminTab('balance')">💰</div><div class="a-tab" onclick="setAdminTab('pets')">🐾</div><div class="a-tab active">🎒</div></div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <button class="btn-s" onclick="adminInvUserId=null;loadAdmin()" style="font-size:15px;padding:8px 14px">${L('back')}</button>
            <div><b>${name}</b> <small style="color:#8d99ae">(${inv.length} ${L('petsOf')})</small></div>
        </div>`;
        if(!inv.length){h+=`<div class="admin-card" style="text-align:center;color:#8d99ae;padding:20px">${L('empty')}</div>`;}
        else{inv.forEach((pet,idx)=>{const eq=p.p&&p.p.id===pet.id;h+=`<div class="admin-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div style="display:flex;align-items:center;gap:10px"><span style="font-size:28px">${pet.s}</span><div><div style="font-weight:bold">${pet.n}${eq?` <span style="font-size:10px;background:var(--success);padding:1px 5px;border-radius:4px">${L('activePet')}</span>`:''}</div><div style="font-size:11px;color:${pet.c}">${pet.r} · x${pet.m.toFixed(3)} · LVL ${pet.lvl||1}</div></div></div><button class="btn-ctrl b-sub" onclick="adminRemovePet('${uid}',${idx},'${name}')">🗑</button></div>`;});}
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.adminRemovePet=(uid,idx,name)=>{
    db.ref('players/'+uid).once('value',snap=>{
        const p=snap.val();let inv=p.inv?[...p.inv]:[];const pet=inv[idx];
        if(!pet)return alert('Не знайдено!');
        if(!confirm(`${L('confirmDelete')} ${pet.s} ${pet.n}?`))return;
        if(p.p&&p.p.id===pet.id)db.ref('players/'+uid+'/p').set(null);
        inv.splice(idx,1);db.ref('players/'+uid+'/inv').set(inv).then(()=>loadAdminUserInv(uid,name));
    });
};
window.mathB=(id,type)=>{
    let v=prompt('Сума:');if(!v||isNaN(v))return;v=Number(v);const ref=db.ref('players/'+id+'/b');
    if(type==='add')ref.transaction(c=>(c||0)+v);else if(type==='sub')ref.transaction(c=>(c||0)-v);else ref.set(v);
    setTimeout(loadAdmin,500);
};
window.adminGivePet=tid=>{
    let unique=[],seen=new Set();
    for(const k in CASES)CASES[k].drop.forEach(p=>{if(!seen.has(p.n)){unique.push(p);seen.add(p.n);}});
    ADMIN_ONLY_PETS.forEach(p=>{if(!seen.has(p.n)){unique.push(p);seen.add(p.n);}});
    const list=unique.map((p,i)=>`${i}: ${p.s} ${p.n} (${p.r})`).join('\n');
    const ch=prompt(list);
    if(ch!==null&&unique[ch]){
        const p={...unique[ch],id:Date.now(),lvl:1};
        db.ref('players/'+tid+'/inv').once('value',sn=>{const inv=sn.val()||[];inv.push(p);db.ref('players/'+tid+'/inv').set(inv);});
        alert(`${L('given')} ${unique[ch].s} ${unique[ch].n}`);
    }
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
    el.innerHTML=`
        <div class="glass"><div class="sett-section-title">${L('theme')}</div><div class="sett-grid">${themeHtml}</div></div>
        <div class="glass"><div class="sett-section-title">${L('lang')}</div><div class="sett-list">${langHtml}</div></div>
        <div class="glass"><div class="sett-section-title">${L('music')}</div>
            <div class="sett-card${musicEnabled?' sett-active':''}" onclick="toggleMusic()">
                <span>${musicEnabled?L('musicOn'):L('musicOff')}</span>
                <div style="font-size:22px">${musicEnabled?'🔊':'🔇'}</div>
            </div>
        </div>`;
}
window.pickTheme=k=>{applyTheme(k);renderSettings();showToast(L('saved'));};
window.pickLang=k=>{applyLang(k);renderSettings();showToast(L('saved'));};

// ============================================================
// МУЗИКА
// ============================================================
const MUSIC_URL=typeof MUSIC_B64!=='undefined'?MUSIC_B64:'';
let musicEnabled=localStorage.getItem('bc_music')!=='false';
let bgAudio=null;
function initMusic(){
    if(!MUSIC_URL)return;
    if(!bgAudio){bgAudio=new Audio(MUSIC_URL);bgAudio.loop=true;bgAudio.volume=0.35;}
    if(musicEnabled){bgAudio.play().catch(()=>{document.addEventListener('click',()=>{if(musicEnabled&&bgAudio.paused)bgAudio.play();},{once:true});});}
}
window.toggleMusic=()=>{
    musicEnabled=!musicEnabled;localStorage.setItem('bc_music',musicEnabled);
    if(musicEnabled){if(!bgAudio)initMusic();else bgAudio.play().catch(()=>{});}
    else{if(bgAudio)bgAudio.pause();}
    renderSettings();showToast(musicEnabled?L('musicOn'):L('musicOff'));
};

// ============================================================
// ВЕЛИКОДНІЙ ФОН (Easter particles)
// ============================================================
function startEasterBg(){
    const canvas=document.getElementById('easter-bg');if(!canvas)return;
    const ctx=canvas.getContext('2d');
    canvas.width=window.innerWidth;canvas.height=window.innerHeight;
    window.addEventListener('resize',()=>{canvas.width=window.innerWidth;canvas.height=window.innerHeight;});
    const items=['🥚','🐣','🌸','🌷','🐰','✨','🍬'];
    const particles=Array.from({length:20},()=>({
        x:Math.random()*canvas.width,y:Math.random()*canvas.height,
        s:items[Math.floor(Math.random()*items.length)],
        size:16+Math.random()*20,speed:.3+Math.random()*.5,
        wobble:Math.random()*Math.PI*2,wobbleSpeed:.02+Math.random()*.03,
        alpha:.15+Math.random()*.25,
    }));
    function frame(){
        ctx.clearRect(0,0,canvas.width,canvas.height);
        particles.forEach(p=>{
            p.y+=p.speed;p.wobble+=p.wobbleSpeed;p.x+=Math.sin(p.wobble)*.5;
            if(p.y>canvas.height+30){p.y=-30;p.x=Math.random()*canvas.width;}
            ctx.globalAlpha=p.alpha;ctx.font=`${p.size}px serif`;ctx.textAlign='center';
            ctx.fillText(p.s,p.x,p.y);
        });
        ctx.globalAlpha=1;requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

// ============================================================
// СТАРТ
// ============================================================
applyTheme(currentTheme);
initMusic();
updUI();
startEasterBg();
