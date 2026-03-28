// Firebase Config (Твій старий)
const firebaseConfig = {
    apiKey: "AIzaSyD7F2lrec5XWyMWG7J0uW6IhEKD-LJ4jRY",
    authDomain: "bearscasino-bcded.firebaseapp.com",
    projectId: "bearscasino-bcded",
    databaseURL: "https://bearscasino-bcded-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const tg = window.Telegram.WebApp;

const ADMINS = [8216362223, 2067230442];
const myId = tg.initDataUnsafe?.user?.id || 101;
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

let s = { b: 0, name: myName, p: null, inv: [] };
let selectedDice = 1;

// Синхронізація з БД
db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) { s = d; if(!s.inv) s.inv = []; } 
    else { db.ref('players/' + myId).set(s); }
    updateUI();
});

function updateUI() {
    document.getElementById('bal-val').innerText = Math.floor(s.b);
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s || '🥚';
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = (s.p.m || 1.0).toFixed(2);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let nx = Math.floor(1000 * Math.pow(1.2, (s.p.lvl||1)-1));
        document.getElementById('xp-f').style.width = ((s.p.xp||0)/nx*100) + "%";
        document.getElementById('xp-num').innerText = `${s.p.xp||0}/${nx}`;
        let r = document.getElementById('p-rarity');
        r.innerText = s.p.r; r.style.background = s.p.c;
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('adm-btn').style.display = 'flex';
}

// Навігація вкладок
window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    el.classList.add('active');
    
    if(t === 'admin') loadAdminData();
    if(t === 'shop') switchShop('cases');
    if(t === 'inv') renderInventory();
};

// МАГАЗИН (Робочий перемикач)
window.switchShop = (mode) => {
    document.getElementById('shop-cases').style.display = (mode === 'cases') ? 'block' : 'none';
    document.getElementById('shop-market').style.display = (mode === 'market') ? 'block' : 'none';
    
    document.getElementById('btn-cases').classList.toggle('active', mode === 'cases');
    document.getElementById('btn-market').classList.toggle('active', mode === 'market');

    if(mode === 'market') loadMarketData();
};

function loadMarketData() {
    db.ref('market').once('value', snap => {
        let h = "";
        snap.forEach(l => {
            let lot = l.val();
            h += `<div class="glass market-item">
                <span>${lot.p.s} ${lot.p.n} (x${lot.p.m})</span>
                <button class="buy-btn" onclick="buyFromMarket('${l.key}', ${lot.price})">${lot.price} BB</button>
            </div>`;
        });
        document.getElementById('market-list').innerHTML = h || "<p style='text-align:center; opacity:0.5'>Ринку поки немає</p>";
    });
}

// АДМІНКА
function loadAdminData() {
    db.ref('players').limitToFirst(15).once('value', snap => {
        let h = "";
        snap.forEach(u => {
            let user = u.val();
            h += `<div class="admin-user-card">
                <span>${user.name}</span>
                <div class="admin-btns">
                    <button onclick="adminAddBB('${u.key}', 1000)">+1k</button>
                    <button onclick="adminAddBB('${u.key}', -1000)">-1k</button>
                    <button onclick="adminSetBB('${u.key}')">SET</button>
                </div>
            </div>`;
        });
        document.getElementById('admin-users').innerHTML = h;
    });
}

window.adminAddBB = (uid, amt) => {
    db.ref('players/'+uid+'/b').transaction(b => (b || 0) + amt);
};

window.adminSetBB = (uid) => {
    let v = prompt("Введіть точну суму:");
    if(v) db.ref('players/'+uid+'/b').set(Number(v));
};

// ІГРИ
window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0) return alert("Недостатньо BB!");
    if(!s.p) return alert("Візьми пета в інвентарі!");

    let g = document.getElementById('g-sel').value;
    if(g==='f50') finalize(Math.random() > 0.5, bt, 1.55);
    if(g==='dice') finalize(Math.floor(Math.random()*6)+1 === selectedDice, bt, 2.05);
    if(g==='wheel') handleWheel(bt);
};

function finalize(win, bt, m) {
    let res = document.getElementById('g-stat');
    if(win) {
        let w = (bt * m - bt) * s.p.m;
        s.b += w;
        s.p.xp = (s.p.xp || 0) + Math.floor(bt);
        res.innerHTML = `<span style="color:var(--success)">ВИГРАШ: +${w.toFixed(1)} BB</span>`;
    } else {
        s.b -= bt;
        res.innerHTML = `<span style="color:var(--error)">ПРОГРАШ: -${bt} BB</span>`;
    }
    db.ref('players/'+myId).set(s);
}

window.selN = (n, el) => {
    selectedDice = n;
    document.querySelectorAll('.d-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};

window.updUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g==='dice') ? 'block' : 'none';
    document.getElementById('ui-wheel').style.display = (g==='wheel') ? 'block' : 'none';
};
