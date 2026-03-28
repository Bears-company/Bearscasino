const tg = window.Telegram.WebApp;
const db = firebase.database();
const myId = tg.initDataUnsafe?.user?.id || 101; 
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";

let s = { b: 25, inv: [], p: null, name: myName };
let selN_val = 1;

db.ref('players/' + myId).on('value', snap => {
    let d = snap.val();
    if(d) {
        s.b = (typeof d.b === 'number') ? d.b : 25;
        s.inv = Array.isArray(d.inv) ? d.inv : [];
        s.p = d.p || null;
        s.name = d.name || myName;
    } else {
        db.ref('players/' + myId).set(s);
    }
    try { ren(); } catch(e) { console.error("Помилка рендеру:", e); }
});

function save() { db.ref('players/' + myId).update(s); }

function addPetXP(amount) {
    if (!s.p) return;
    let idx = s.inv.findIndex(i => i.id === s.p.id);
    if(idx === -1) return;
    let pet = s.inv[idx];
    pet.xp = (pet.xp || 0) + amount;
    let lvl = pet.lvl || 1;
    let need = Math.floor(500 * Math.pow(1.2, lvl - 1));
    if (pet.xp >= need) {
        pet.xp -= need; pet.lvl = lvl + 1; pet.m += 0.005;
        alert(`🆙 LEVEL UP! ${pet.s} тепер ${pet.lvl} LVL!`);
    }
    s.p = pet; save();
}

function ren() {
    document.getElementById('bal-val').innerText = s.b.toFixed(2);
    if(s.p) {
        document.getElementById('p-img').innerText = s.p.s;
        document.getElementById('p-name').innerText = s.p.n;
        document.getElementById('p-m').innerText = (s.p.m || 1).toFixed(3);
        document.getElementById('p-l').innerText = s.p.lvl || 1;
        let lvl = s.p.lvl || 1;
        let need = Math.floor(500 * Math.pow(1.2, lvl - 1));
        let progress = ((s.p.xp || 0) / need) * 100;
        document.getElementById('xp-f').style.width = Math.min(progress, 100) + "%";
        document.getElementById('u-rank').innerText = "PET LVL: " + lvl;
        let t = document.getElementById('p-rarity');
        t.innerText = s.p.r; t.style.background = s.p.c;
    } else {
        document.getElementById('u-rank').innerText = "ОБЕРІТЬ ПЕТА";
        document.getElementById('xp-f').style.width = "0%";
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display = 'block';
}

window.play = () => {
    let bt = parseFloat(document.getElementById('bet-a').value);
    if(bt > s.b || bt <= 0 || isNaN(bt)) return alert("Мало BB!");
    let g = document.getElementById('g-sel').value;
    if(g === 'f50') res(Math.random() > 0.5, bt, GAME_CONFIG.f50, "50/50");
    else if(g === 'dice') {
        let r = Math.floor(Math.random() * 6) + 1;
        res(r === selN_val, bt, GAME_CONFIG.dice, `Випало ${r}`);
    }
};

function res(win, bt, m, msg) {
    let bon = s.p ? (s.p.m || 1) : 1;
    if(win) {
        let winAmount = (bt * m - bt) * bon; 
        s.b += winAmount; addPetXP(Math.floor(bt * 0.1));
        document.getElementById('g-stat').innerHTML = `<span style="color:#10b981">+${winAmount.toFixed(2)}</span>`;
    } else {
        s.b -= bt; addPetXP(Math.floor(bt * 0.02));
        document.getElementById('g-stat').innerHTML = `<span style="color:#f43f5e">-${bt.toFixed(2)}</span>`;
    }
    save();
}

window.tab = (t, el) => {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    document.querySelectorAll('.nav-tab').forEach(n => n.classList.remove('active'));
    document.getElementById('v-'+t).style.display = 'block';
    if(el) el.classList.add('active');
    if(t === 'inv') renderInv();
};

window.renderInv = () => {
    document.getElementById('inv-list').innerHTML = s.inv.map(p => `
        <div class="glass" style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <span>${p.s} ${p.n} (Lvl ${p.lvl || 1})</span>
            <button onclick="equip(${p.id})">${s.p?.id === p.id ? '✅' : 'Взяти'}</button>
        </div>`).join('') || "Порожньо";
};

window.equip = (id) => { s.p = s.inv.find(i => i.id === id); save(); renderInv(); };

// --- АДМІНКА ---
window.setATab = (tab) => {
    document.getElementById('a-sec-main').style.display = tab==='main'?'block':'none';
    document.getElementById('a-sec-stats').style.display = tab==='stats'?'block':'none';
    document.getElementById('a-sec-users').style.display = tab==='users'?'block':'none';
    if(tab==='stats') renderGlobalStats();
};

function renderGlobalStats() {
    db.ref('players').once('value', snap => {
        let total = 0, pets = {};
        snap.forEach(c => {
            let u = c.val(); total += u.b || 0;
            if(u.inv) u.inv.forEach(p => pets[p.n] = (pets[p.n] || 0) + 1);
        });
        let h = `💰 Всього: ${total.toFixed(0)} BB<br>🐾 Петів: ${Object.keys(pets).length}`;
        document.getElementById('global-stats').innerHTML = h;
    });
}
