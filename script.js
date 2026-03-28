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
const myId = Number(tg.initDataUnsafe?.user?.id) || 101;

let user = { b: 0, p: null, inv: [] };
let diceVal = 1;

// БАЗОВА СИНХРОНІЗАЦІЯ
db.ref('players/' + myId).on('value', snap => {
    let data = snap.val();
    if(data) { user = data; renderProfile(); }
    if(ADMINS.includes(myId)) document.getElementById('adm-nav').style.display = 'flex';
});

function renderProfile() {
    document.getElementById('bal-val').innerText = Math.floor(user.b);
    if(user.p) {
        document.getElementById('p-img').innerText = user.p.s || '🥚';
        document.getElementById('p-name').innerText = user.p.n;
        document.getElementById('p-m').innerText = (user.p.m || 1).toFixed(2);
        document.getElementById('p-l').innerText = user.p.lvl || 1;
        let nx = Math.floor(1000 * Math.pow(1.2, (user.p.lvl||1)-1));
        document.getElementById('xp-f').style.width = ((user.p.xp||0)/nx*100) + "%";
        document.getElementById('xp-num').innerText = `${user.p.xp||0}/${nx}`;
        let r = document.getElementById('p-rarity');
        r.innerText = user.p.r; r.style.background = user.p.c;
    }
}

// НАВІГАЦІЯ
window.tab = (name, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('v-'+name).style.display = 'block';
    el.classList.add('active');
    if(name === 'admin') syncAdmin();
};

// МАГАЗИН & РИНОК
window.openShopPart = (part) => {
    document.getElementById('part-cases').style.display = (part === 'cases') ? 'block' : 'none';
    document.getElementById('part-market').style.display = (part === 'market') ? 'block' : 'none';
    document.getElementById('s-cases-btn').classList.toggle('active', part === 'cases');
    document.getElementById('s-market-btn').classList.toggle('active', part === 'market');
    if(part === 'market') {
        db.ref('market').once('value', snap => {
            let h = "";
            snap.forEach(l => {
                let lot = l.val();
                h += `<div class='glass shop-item'><span>${lot.p.s} ${lot.p.n}</span><button>${lot.price} BB</button></div>`;
            });
            document.getElementById('market-list').innerHTML = h || "Ринок порожній";
        });
    }
};

// АДМІНКА
function syncAdmin() {
    db.ref('players').limitToFirst(10).once('value', snap => {
        let h = "";
        snap.forEach(u => {
            h += `<div class='admin-row'>
                <span>${u.val().name || u.key}</span>
                <button onclick="setB('${u.key}')">EDIT</button>
            </div>`;
        });
        document.getElementById('admin-users-list').innerHTML = h;
    });
}
window.setB = (id) => {
    let v = prompt("Новий баланс:");
    if(v) db.ref('players/'+id+'/b').set(Number(v));
};

// ІГРИ
window.switchGameUI = () => {
    let g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g === 'dice') ? 'block' : 'none';
    document.getElementById('ui-wheel').style.display = (g === 'wheel') ? 'block' : 'none';
};

window.setDice = (n, el) => {
    diceVal = n;
    document.querySelectorAll('.d-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
};

window.runGame = () => {
    let bt = Number(document.getElementById('bet-a').value);
    if(bt > user.b || bt <= 0) return alert("Немає BB!");
    if(!user.p) return alert("Обери пета!");

    let mode = document.getElementById('g-sel').value;
    let win = false; let m = 1;

    if(mode === 'f50') { win = Math.random() > 0.5; m = 1.55; }
    if(mode === 'dice') { win = (Math.floor(Math.random()*6)+1 === diceVal); m = 2.05; }
    
    // ЛОГІКА ВИГРАШУ (ПЕТИ НЕ ТРОНУТІ)
    if(win) {
        let prize = (bt * m - bt) * user.p.m;
        user.b += prize;
        user.p.xp += Math.floor(bt);
        document.getElementById('g-res').innerHTML = `<b style="color:var(--success)">+${prize.toFixed(1)} BB</b>`;
    } else {
        user.b -= bt;
        document.getElementById('g-res').innerHTML = `<b style="color:var(--error)">-${bt} BB</b>`;
    }
    db.ref('players/'+myId).set(user);
};
