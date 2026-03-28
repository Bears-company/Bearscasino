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

const ADMINS = [8216362223, 2067230442];
const myId = tg.initDataUnsafe?.user?.id || 101; 
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

let s = { b: 0, x: 0, name: myName, p: null, inv: [], v: 3.6 };
let currentShopTab = 'cases';
let currentAdminTab = 'balance';
let selN_val = 1;

db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) { s = d; if(!s.inv) s.inv = []; } 
    else { db.ref('players/' + myId).set(s); }
    ren();
});

function save() { db.ref('players/' + myId).set(s); }
function getNeedXP(lvl) { return Math.floor(1000 * Math.pow(1.2, (lvl || 1) - 1)); }

function ren() {
    document.getElementById('bal-val').innerText = s.b.toFixed(2);
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = s.p.m.toFixed(3);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let curXP = s.p.xp || 0;
        let need = getNeedXP(s.p.lvl);
        document.getElementById('xp-f').style.width = Math.min((curXP/need*100), 100) + "%";
        document.getElementById('xp-num').innerText = `${curXP}/${need} XP`;
        let t = document.getElementById('p-rarity'); t.innerText = s.p.r; t.style.background = s.p.c;
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display = 'block';
}

window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    if(t === 'top') loadTop();
    if(t === 'admin') loadAdmin();
    if(t === 'inv') renderInv();
};

// --- ІГРОВА ЛОГІКА ---
window.selN = (n) => {
    selN_val = n;
    document.querySelectorAll('.d-btn').forEach(b => b.style.background = '#30363d');
    event.target.style.background = 'var(--accent)';
};

window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0 || isNaN(bt)) return alert("Недостатньо BB!");
    if(!s.p) return alert("Оберіть пета!");

    let g = document.getElementById('g-sel').value;
    if(g === 'f50') {
        let w = Math.random() > 0.5;
        res(w, bt, 1.55, w ? "Перемога!" : "Програш");
    } else if(g === 'dice') {
        let r = Math.floor(Math.random()*6)+1;
        res(r === selN_val, bt, 2.05, `Випало ${r}`);
    } else if(g === 'wheel') {
        // Логіка колеса...
        res(Math.random() > 0.6, bt, 1.8, "Колесо зупинилось!");
    } else if(g === 'bj') startBJ(bt);
};

function res(win, bt, m, msg) {
    if(win) {
        let winAmount = (bt * m - bt) * (s.p ? s.p.m : 1);
        s.b += winAmount;
        if(s.p) {
            s.p.xp = (s.p.xp || 0) + Math.floor(bt);
            let need = getNeedXP(s.p.lvl);
            while(s.p.xp >= need) {
                s.p.xp -= need; s.p.lvl = (s.p.lvl || 1) + 1; s.p.m += 0.005;
                need = getNeedXP(s.p.lvl);
            }
            let idx = s.inv.findIndex(i => i.id === s.p.id);
            if(idx !== -1) s.inv[idx] = s.p;
        }
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--success)">+${winAmount.toFixed(2)} BB</span><br><small>${msg}</small>`;
    } else {
        s.b -= bt;
        document.getElementById('g-stat').innerHTML = `<span style="color:var(--error)">-${bt.toFixed(2)} BB</span><br><small>${msg}</small>`;
    }
    save();
}

// --- ТОП ---
function loadTop() {
    db.ref('players').once('value', snap => {
        let players = [];
        snap.forEach(c => { if(c.val().name) players.push(c.val()); });
        players.sort((a,b) => b.b - a.b);
        document.getElementById('leaderboard').innerHTML = players.slice(0, 10).map((p, i) => `
            <div class="market-item"><span>${i+1}. ${p.name}</span><b>${Math.floor(p.b)} BB</b></div>
        `).join('');
    });
}

// --- АДМІНКА ---
window.loadAdmin = () => {
    db.ref('players').once('value', snap => {
        let h = `<div class="admin-tabs">
            <div class="a-tab ${currentAdminTab==='balance'?'active':''}" onclick="currentAdminTab='balance';loadAdmin()">💰 Баланс</div>
            <div class="a-tab ${currentAdminTab==='inv'?'active':''}" onclick="currentAdminTab='inv';loadAdmin()">🎒 Інвентарі</div>
        </div>`;
        snap.forEach(c => {
            let p = c.val(); let uid = c.key;
            h += `<div class="admin-card">
                <b>${p.name || 'Анонім'}</b> (ID: ${uid})<br>
                ${currentAdminTab === 'balance' ? 
                    `<div class="admin-ctrl-grid">
                        <button class="btn-ctrl b-add" onclick="mathB('${uid}', 'add')">+ BB</button>
                        <button class="btn-ctrl b-sub" onclick="mathB('${uid}', 'sub')">- BB</button>
                        <button class="btn-ctrl b-set" onclick="mathB('${uid}', 'set')">ВСТАН.</button>
                    </div>` : 
                    `<div class="admin-ctrl-grid" style="grid-template-columns: 1fr 1fr">
                        <button class="btn-s" onclick="adminViewInv('${uid}')">ІНВЕНТАР</button>
                        <button class="btn-s" style="background:var(--purple)" onclick="adminGivePet('${uid}')">ВИДАТИ ПЕТА</button>
                    </div>`
                }
            </div>`;
        });
        document.getElementById('admin-list').innerHTML = h;
    });
};

window.mathB = (id, type) => {
    let v = prompt("Введіть суму:"); if(v === null || isNaN(v)) return;
    v = parseFloat(v);
    let ref = db.ref('players/' + id + '/b');
    if(type === 'add') ref.transaction(c => (c || 0) + v);
    else if(type === 'sub') ref.transaction(c => (c || 0) - v);
    else ref.set(v);
    loadAdmin();
};

window.adminViewInv = (tid) => {
    db.ref('players/' + tid).once('value', snap => {
        let p = snap.val(); let inv = p.inv || [];
        let list = inv.map((pet, idx) => 
            `<div class="market-item"><span>${pet.s} ${pet.n} (Lvl ${pet.lvl || 1})</span><button class="btn-s" style="background:var(--error)" onclick="adminRemovePet('${tid}', ${idx})">❌</button></div>`
        ).join('');
        document.getElementById('admin-list').innerHTML = `<button class="btn-s" onclick="loadAdmin()">⬅️ НАЗАД</button><h4>${p.name}</h4>${list || "Порожньо"}`;
    });
};

window.adminRemovePet = (tid, idx) => {
    if(!confirm("Видалити пета?")) return;
    db.ref('players/' + tid + '/inv').once('value', sn => {
        let inv = sn.val() || []; inv.splice(idx, 1);
        db.ref('players/' + tid + '/inv').set(inv).then(() => adminViewInv(tid));
    });
};

window.renderInv = () => {
    let h = "";
    s.inv.forEach(p => {
        let isEq = s.p && s.p.id === p.id;
        h += `<div class="market-item">
            <div><span style="color:${p.c}">${p.s} ${p.n}</span><br><small>Lvl ${p.lvl || 1} (x${p.m.toFixed(3)})</small></div>
            <button class="btn-s" onclick="equip(${p.id})">${isEq?'✅':'ВЗЯТИ'}</button>
        </div>`;
    });
    document.getElementById('inv-list').innerHTML = h || "Пусто";
};

window.equip = (id) => { s.p = s.inv.find(i => i.id === id); save(); renderInv(); };
window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = g==='dice'?'block':'none';
    document.getElementById('ui-wheel').style.display = g==='wheel'?'block':'none';
    document.getElementById('ui-bj').style.display = g==='bj'?'block':'none';
};
