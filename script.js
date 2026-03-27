// 1. КОНФІГУРАЦІЯ FIREBASE
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

// Ініціалізація
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 'test_dev', first_name: 'Гравець' };

// 2. СТАН ГРИ ТА ДАНІ
let s = { b: 5000, x: 0, r: 1, name: user.first_name, p: null };
let selDice = 1;
let bj = null;

const PETS = {
    w: [{n:'Сова', s:'🦉', r:'Rare', m:1.5, c:'#3b82f6'}, {n:'Жабка', s:'🐸', r:'Common', m:1.1, c:'#94a3b8'}],
    i: [{n:'Акула', s:'🦈', r:'Epic', m:2.5, c:'#a855f7'}, {n:'Панда', s:'🐼', r:'Rare', m:1.8, c:'#3b82f6'}],
    d: [{n:'Дракон', s:'🐲', r:'LEGENDARY', m:4.5, c:'#f43f5e'}, {n:'Єдиноріг', s:'🦄', r:'MYTHIC', m:6.0, c:'#ff00ff'}]
};

// 3. ФУНКЦІЇ ОНОВЛЕННЯ ТА ЗБЕРЕЖЕННЯ
function ren() {
    const balEl = document.getElementById('bal-val');
    const rankEl = document.getElementById('u-rank');
    const xpFillEl = document.getElementById('xp-f');

    if(balEl) balEl.textContent = Math.floor(s.b).toLocaleString();
    if(rankEl) rankEl.textContent = "РАНГ: " + s.r;
    if(xpFillEl) xpFillEl.style.width = Math.min((s.x / (s.r * 1000) * 100), 100) + "%";
    
    if(s.p) {
        document.getElementById('p-img').textContent = s.p.s;
        document.getElementById('p-name').textContent = s.p.n;
        document.getElementById('p-l').textContent = s.p.lvl;
        document.getElementById('p-m').textContent = "x" + (s.p.m + (s.p.lvl * 0.1)).toFixed(1);
        let t = document.getElementById('p-rarity'); 
        if(t) { t.textContent = s.p.r; t.style.background = s.p.c; }
    }
}

db.ref('players/' + user.id).on('value', (snap) => {
    if(snap.exists()) { s = snap.val(); ren(); } else { save(); }
});

function save() {
    if(s.x >= s.r * 1000) { 
        s.x = 0; 
        s.r++; 
        alert("НОВИЙ РАНГ: " + s.r);
    }
    db.ref('players/' + user.id).set(s);
    ren();
}

// 4. НАВІГАЦІЯ ТА ВИБІР
window.tab = function(id, el) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const targetPage = document.getElementById('v-' + id);
    if(targetPage) targetPage.style.display = 'block';
    if(el) el.classList.add('active');
};

window.selN = function(n, el) {
    selDice = n;
    document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active'));
    if(el) el.classList.add('active');
};

window.updUI = function() {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
};

// 5. ЛОГІКА ІГОР
window.play = function() {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(isNaN(bt) || bt <= 0 || bt > s.b) return alert("Невірна ставка!");
    
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').textContent = "ГРАЄМО...";

    if(g === 'f50') {
        // Гра 50/50: 50% шанс, x1.45
        res(Math.random() > 0.5, bt, 1.45);
    } 
    else if(g === 'dice') {
        // Кубик: вибір 1-6, x1.45
        let r = Math.floor(Math.random()*6)+1;
        document.getElementById('g-stat').textContent = "Випало: " + r;
        setTimeout(() => res(r === selDice, bt, 1.45), 800);
    } 
    else if(g === 'wheel') {
        // Колесо: Твої шанси (45/35/15/5)
        let w = document.getElementById('w-obj');
        let deg = 3600 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${deg}deg)`;
        document.getElementById('b-play').disabled = true;
        
        setTimeout(() => {
            document.getElementById('b-play').disabled = false;
            let p = Math.random()*100;
            let m = 0;
            if(p < 45) m = 0;      // 45% шанс на 0
            else if(p < 80) m = 1.25; // 35% шанс на 1.25
            else if(p < 95) m = 1.5;  // 15% шанс на 1.5
            else m = 1.75;           // 5% шанс на 1.75
            res(m > 0, bt, m);
        }, 4000);
    } 
    else if(g === 'bj') {
        bj = {p:[dr(), dr()], d:[dr()], bt:bt};
        document.getElementById('bj-ctrl').style.display='flex';
        document.getElementById('b-play').style.display='none';
        reBJ();
    }
};

// 6. БЛЕКДЖЕК
function dr(){ return Math.floor(Math.random()*10)+2; }
function reBJ(){
    const sum = (a) => a.reduce((x,y)=>x+y,0);
    document.getElementById('bj-pc').innerHTML = bj.p.map(c=>`<div class="bj-c">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML = bj.d.map(c=>`<div class="bj-c">${c}</div>`).join('');
    if(sum(bj.p) > 21) { res(false, bj.bt, 0); endBJ(); }
}
window.bjDo = function(a){
    const sum = (x) => x.reduce((v,z)=>v+z,0);
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else {
        while(sum(bj.d)<17) bj.d.push(dr());
        reBJ();
        let ps=sum(bj.p), ds=sum(bj.d);
        res(ds>21 || ps>ds, bj.bt, 2);
        endBJ();
    }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; document.getElementById('b-play').style.display='block'; }

// 7. РЕЗУЛЬТАТ ТА ШОП
function res(w, bt, m) {
    let el = document.getElementById('g-stat');
    if(w) {
        let bonus = s.p ? (s.p.m + s.p.lvl*0.1) : 1;
        let win = Math.floor((bt * m - bt) * bonus);
        s.b += win; 
        s.x += Math.floor(bt/2);
        el.innerHTML = `<span style="color:#00f5a0">WIN! +${win} BB</span>`;
    } else {
        s.b -= bt;
        el.innerHTML = `<span style="color:#ff4d6d">LOSE! -${bt} BB</span>`;
    }
    save();
}

window.buy = function(t, c) {
    if(s.b < c) return alert("Недостатньо BB!");
    s.b -= c;
    let r = Math.random();
    if(t === 'egg_wood') s.p = {...(r>0.7?PETS.w[0]:PETS.w[1]), lvl:1};
    else if(t === 'egg_iron') s.p = {...(r>0.8?PETS.i[0]:PETS.i[1]), lvl:1};
    else if(t === 'egg_diamond') s.p = {...(r>0.9?PETS.d[1]:PETS.d[0]), lvl:1};
    save();
};

// 8. ЛІДЕРБОРД
db.ref('players').orderByChild('b').limitToLast(5).on('value', snap => {
    let h = ""; 
    snap.forEach(p => { 
        let v = p.val(); 
        h = `<div style="display:flex; justify-content:space-between; margin-bottom:5px">
                <span>${v.name}</span>
                <span style="color:var(--accent)">${Math.floor(v.b).toLocaleString()} BB</span>
             </div>` + h; 
    });
    const lbEl = document.getElementById('leaderboard');
    if(lbEl) lbEl.innerHTML = h;
});
