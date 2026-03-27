// 1. КОНФІГУРАЦІЯ (Твій проект)
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
const db = firebase.database();
const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe?.user || { id: 'dev_user', first_name: 'Гравець' };

let s = { b: 5000, x: 0, r: 1, name: user.first_name, p: null };
let selDiceNum = 1;
let bj = null;

const PETS_DATA = {
    wood: [{n:'Песик', s:'🐶', r:'Common', m:1.2, c:'#94a3b8'}, {n:'Котик', s:'🐱', r:'Common', m:1.2, c:'#94a3b8'}],
    iron: [{n:'Єнот', s:'🦝', r:'Rare', m:1.8, c:'#3b82f6'}, {n:'Лисиця', s:'🦊', r:'Rare', m:2.0, c:'#3b82f6'}],
    diam: [{n:'Шарк', s:'🦈', r:'Epic', m:3.5, c:'#a855f7'}, {n:'Ведмідь', s:'🐻', r:'Legend', m:5.5, c:'#f43f5e'}]
};

// 2. БАЗА ДАНИХ
db.ref('players/' + user.id).on('value', (snap) => {
    if(snap.exists()) { s = snap.val(); ren(); } else { save(); }
});

function save() {
    if(s.x >= s.r * 1000) { s.x = 0; s.r++; alert("Новий Ранг!"); }
    db.ref('players/' + user.id).set(s);
    ren();
}

function ren() {
    document.getElementById('bal-val').textContent = Math.floor(s.b).toLocaleString();
    document.getElementById('u-rank').textContent = "РАНГ: " + s.r;
    document.getElementById('xp-f').style.width = Math.min((s.x / (s.r * 1000) * 100), 100) + "%";
    if(s.p) {
        document.getElementById('p-img').textContent = s.p.s;
        document.getElementById('p-name').textContent = s.p.n;
        document.getElementById('p-l').textContent = s.p.lvl;
        document.getElementById('p-m').textContent = "x" + (s.p.m + (s.p.lvl * 0.1)).toFixed(1);
        let t = document.getElementById('p-rarity'); t.textContent = s.p.r; t.style.background = s.p.c;
    }
}

// 3. ІГРИ
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice')?'block':'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel')?'block':'none';
    document.getElementById('ui-bj').style.display = (g==='bj')?'block':'none';
};

window.selN = (n, el) => {
    selDiceNum = n;
    document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};

window.play = () => {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(isNaN(bt) || bt <= 0 || bt > s.b) return alert("Недостатньо BB!");
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').textContent = "ГРАЄМО...";

    if(g === 'f50') res(Math.random() > 0.5, bt, 1.45);
    else if(g === 'dice') {
        let r = Math.floor(Math.random()*6)+1;
        document.getElementById('g-stat').textContent = "Випало: " + r;
        setTimeout(() => res(r === selDiceNum, bt, 1.45), 800);
    }
    else if(g === 'wheel') {
        let w = document.getElementById('w-obj');
        let deg = 3600 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${deg}deg)`;
        setTimeout(() => {
            let p = Math.random()*100;
            let m = (p<45)?0 : (p<80)?1.25 : (p<95)?1.5 : 1.75;
            res(m > 0, bt, m);
        }, 3000);
    }
    else if(g === 'bj') startBJ(bt);
};

function res(win, bt, m) {
    let el = document.getElementById('g-stat');
    if(win) {
        let bon = s.p ? (s.p.m + s.p.lvl*0.1) : 1;
        let winSum = Math.floor((bt * m - bt) * bon);
        s.b += winSum; s.x += Math.floor(bt/2);
        el.innerHTML = `<span style="color:var(--success)">ВИГРАШ +${winSum}</span>`;
    } else {
        s.b -= bt; el.innerHTML = `<span style="color:var(--error)">ПРОГРАШ -${bt}</span>`;
    }
    save();
}

// Блекджек логіка
function startBJ(bt){ bj={p:[dr(),dr()], d:[dr()], bt}; document.getElementById('bj-ctrl').style.display='flex'; reBJ(); }
function dr(){ return Math.floor(Math.random()*10)+2; }
function reBJ(){
    const sum=(a)=>a.reduce((x,y)=>x+y,0);
    document.getElementById('bj-pc').innerHTML=bj.p.map(c=>`<div class="bj-c">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(c=>`<div class="bj-c">${c}</div>`).join('');
    if(sum(bj.p)>21){ res(false,bj.bt,0); endBJ(); }
}
window.bjDo=(a)=>{
    const sum=(x)=>x.reduce((v,z)=>v+z,0);
    if(a==='hit'){ bj.p.push(dr()); reBJ(); }
    else { while(sum(bj.d)<17) bj.d.push(dr()); reBJ(); res(sum(bj.d)>21||sum(bj.p)>sum(bj.d),bj.bt,2); endBJ(); }
};
function endBJ(){ document.getElementById('bj-ctrl').style.display='none'; }

// 4. НАВІГАЦІЯ ТА ШОП
window.tab=(id,el)=>{
    document.querySelectorAll('.page').forEach(p=>p.style.display='none');
    document.querySelectorAll('.nav-tab').forEach(t=>t.classList.remove('active'));
    document.getElementById('v-'+id).style.display='block';
    el.classList.add('active');
    if(id==='admin') loadAdmin();
};

window.buy=(t,c)=>{
    if(s.b < c) return alert("Мало грошей!");
    s.b -= c; let r = Math.random();
    s.p = {...(r > 0.5 ? PETS_DATA[t][0] : PETS_DATA[t][1]), lvl:1};
    save();
};

// 5. АДМІН-ПАНЕЛЬ (ЗАДАТИ БАЛАНС)
function loadAdmin() {
    db.ref('players').on('value', snap => {
        let h = ""; snap.forEach(c => {
            let p = c.val(); let id = c.key;
            h += `<div class="glass" style="font-size:12px">
                <b>${p.name}</b> (${Math.floor(p.b)} BB)
                <div style="display:flex; gap:5px; margin-top:5px">
                    <input type="number" id="adm-${id}" placeholder="Сума..." style="margin:0; flex:1">
                    <button class="btn-s" onclick="setB('${id}')">OK</button>
                </div>
            </div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
}

window.setB = (id) => {
    let val = parseInt(document.getElementById('adm-'+id).value);
    if(!isNaN(val)) db.ref('players/'+id+'/b').set(val).then(()=>alert("Баланс змінено!"));
};

// ТОП ГРАВЦІВ
db.ref('players').orderByChild('b').limitToLast(5).on('value', snap => {
    let h = ""; snap.forEach(p => { let v=p.val(); h=`<div style="display:flex; justify-content:space-between; margin-bottom:5px"><span>${v.name}</span><b>${Math.floor(v.b)}</b></div>`+h; });
    document.getElementById('leaderboard').innerHTML = h;
});
