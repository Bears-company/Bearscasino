// ВСТАВ СВІЙ КОНФІГ ТУТ
const firebaseConfig = {
  apiKey: "AIzaSyD7F2lrec5XWyMWG7J6",
  authDomain: "bearscasino-bcded.firebaseapp.com",
  projectId: "bearscasino-bcded",
  storageBucket: "bearscasino-bcded.appspot.com",
  messagingSenderId: "826765969101",
  appId: "1:826765969101:web:ee5e5d3",
  databaseURL: "https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 'test_user', first_name: 'Гравець' };
const userId = user.id;

let s = { b: 5000, x: 0, r: 1, name: user.first_name, p: null };

const PETS = {
    w: [{n:'Сова', s:'🦉', r:'Rare', m:1.5, c:'#3b82f6'}, {n:'Жабка', s:'🐸', r:'Common', m:1.1, c:'#94a3b8'}],
    i: [{n:'Акула', s:'🦈', r:'Epic', m:2.5, c:'#a855f7'}, {n:'Панда', s:'🐼', r:'Rare', m:1.8, c:'#3b82f6'}],
    d: [{n:'Дракон', s:'🐲', r:'LEGENDARY', m:4.5, c:'#f43f5e'}, {n:'Єдиноріг', s:'🦄', r:'MYTHIC', m:6.0, c:'#ff00ff'}]
};

function ren() {
    document.getElementById('bal-val').textContent = Math.floor(s.b).toLocaleString();
    document.getElementById('u-rank').textContent = "РАНГ: " + s.r;
    let nextXp = s.r * 1000;
    document.getElementById('xp-f').style.width = Math.min((s.x / nextXp * 100), 100) + "%";
    
    if(s.p) {
        document.getElementById('p-img').textContent = s.p.s;
        document.getElementById('p-name').textContent = s.p.n;
        document.getElementById('p-l').textContent = s.p.lvl;
        document.getElementById('p-m').textContent = "x" + (s.p.m + (s.p.lvl * 0.1)).toFixed(1);
        let t = document.getElementById('p-rarity');
        t.textContent = s.p.r; t.style.background = s.p.c;
    }
}

// ЗАВАНТАЖЕННЯ ДАНИХ
db.ref('players/' + userId).on('value', (snap) => {
    if(snap.exists()) { s = snap.val(); ren(); } else { save(); }
});

function save() {
    if(s.x >= s.r * 1000) { s.x = 0; s.r++; alert("НОВИЙ РАНГ!"); }
    db.ref('players/' + userId).set(s);
    ren();
}

// НАВІГАЦІЯ (ШОП ТЕПЕР ПРАЦЮЄ)
function tab(pageId, el) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('v-' + pageId).style.display = 'block';
    el.classList.add('active');
}

function buy(type, cost) {
    if(s.b < cost) return alert("Мало BB!");
    s.b -= cost;
    let r = Math.random();
    if(type === 'egg_wood') s.p = {...(r > 0.7 ? PETS.w[0] : PETS.w[1]), lvl:1};
    else if(type === 'egg_iron') s.p = {...(r > 0.8 ? PETS.i[0] : PETS.i[1]), lvl:1};
    else if(type === 'egg_diamond') s.p = {...(r > 0.9 ? PETS.d[1] : PETS.d[0]), lvl:1};
    save();
}

function play() {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(bt <= 0 || bt > s.b) return alert("Ставка!");
    let g = document.getElementById('g-sel').value;

    if(g === 'dice') {
        res(Math.random() > 0.6, bt, 2);
    } else if(g === 'wheel') {
        let w = document.getElementById('w-obj');
        let d = 3600 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${d}deg)`;
        setTimeout(() => {
            let n = d % 360;
            let m = (n<90)?0 : (n<180)?2 : (n<270)?1.5 : 5;
            res(m > 0, bt, m);
        }, 4000);
    }
}

function res(win, bt, m) {
    if(win) {
        let bonus = s.p ? (s.p.m + s.p.lvl*0.1) : 1;
        let winSum = Math.floor((bt * m - bt) * bonus);
        s.b += winSum; s.x += Math.floor(bt/2);
        document.getElementById('g-stat').innerHTML = `<span style="color:#00f5a0">+${winSum} BB</span>`;
    } else {
        s.b -= bt;
        document.getElementById('g-stat').innerHTML = `<span style="color:#ff4d6d">-${bt} BB</span>`;
    }
    save();
}

function updUI() {
    document.getElementById('ui-wheel').style.display = document.getElementById('g-sel').value === 'wheel' ? 'block' : 'none';
}

db.ref('players').orderByChild('b').limitToLast(5).on('value', (snap) => {
    let h = ""; snap.forEach(p => { let v = p.val(); h = `<div>${v.name}: ${Math.floor(v.b)}</div>` + h; });
    document.getElementById('leaderboard').innerHTML = h;
});
