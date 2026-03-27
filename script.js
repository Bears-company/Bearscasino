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
const user = tg.initDataUnsafe?.user || { id: 'dev_user', first_name: 'Гравець' };
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
    document.getElementById('u-name').textContent = s.name;
    document.getElementById('xp-f').style.width = Math.min((s.x / (s.r * 1000) * 100), 100) + "%";
    if(s.p) {
        document.getElementById('p-img').textContent = s.p.s;
        document.getElementById('p-name').textContent = s.p.n;
        document.getElementById('p-l').textContent = s.p.lvl;
        document.getElementById('p-m').textContent = "x" + (s.p.m + (s.p.lvl * 0.1)).toFixed(1);
        let t = document.getElementById('p-rarity'); t.textContent = s.p.r; t.style.background = s.p.c;
    }
}

db.ref('players/' + userId).on('value', (snap) => {
    if(snap.exists()) { s = snap.val(); ren(); } else { save(); }
});

function save() {
    if(s.x >= s.r * 1000) { s.x = 0; s.r++; alert("⬆️ НОВИЙ РАНГ: " + s.r); }
    db.ref('players/' + userId).set(s);
    ren();
}

function tab(id, el) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('v-'+id).style.display = 'block';
    el.classList.add('active');
}

function buy(t, c) {
    if(s.b < c) return alert("Недостатньо BB!");
    s.b -= c;
    let r = Math.random();
    if(t === 'egg_wood') s.p = {...(r>0.7?PETS.w[0]:PETS.w[1]), lvl:1};
    else if(t === 'egg_iron') s.p = {...(r>0.8?PETS.i[0]:PETS.i[1]), lvl:1};
    else if(t === 'egg_diamond') s.p = {...(r>0.9?PETS.d[1]:PETS.d[0]), lvl:1};
    else if(t === 'food' && s.p) s.p.lvl++;
    else { s.b += c; return alert("Купи пета!"); }
    save();
}

function play() {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(bt <= 0 || bt > s.b) return;
    let g = document.getElementById('g-sel').value;
    if(g === 'dice') res(Math.random() > 0.6, bt, 2);
    else if(g === 'wheel') {
        let w = document.getElementById('w-obj');
        let d = 3600 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${d}deg)`;
        setTimeout(() => { let n=d%360; res(n>90, bt, (n<180?2:n<270?1.5:5)); }, 4000);
    }
}

function res(w, bt, m) {
    if(w) { let g = Math.floor((bt*m-bt)*(s.p?(s.p.m+s.p.lvl*0.1):1)); s.b+=g; s.x+=Math.floor(bt/2); }
    else s.b -= bt;
    save();
}

db.ref('players').orderByChild('b').limitToLast(5).on('value', (snap) => {
    let h = ""; snap.forEach(p => { let v = p.val(); h = `<div>${v.name}: ${Math.floor(v.b)}</div>` + h; });
    document.getElementById('leaderboard').innerHTML = h;
});

function updUI() {
    document.getElementById('ui-wheel').style.display = document.getElementById('g-sel').value==='wheel'?'block':'none';
    document.getElementById('ui-bj').style.display = document.getElementById('g-sel').value==='bj'?'block':'none';
}
