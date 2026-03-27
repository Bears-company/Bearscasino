// Переконайся, що твій Firebase Config тут!

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
        t.textContent = s.p.r;
        t.style.background = s.p.c;
    }
}

function play() {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(isNaN(bt) || bt <= 0 || bt > s.b) {
        alert("Невірна ставка!");
        return;
    }
    
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').textContent = "Граємо...";

    if(g === 'dice') {
        setTimeout(() => {
            res(Math.random() > 0.6, bt, 2);
        }, 500);
    } 
    else if(g === 'wheel') {
        let w = document.getElementById('w-obj');
        let d = 3600 + Math.floor(Math.random() * 360);
        w.style.transform = `rotate(${d}deg)`;
        
        // Блокуємо кнопку на час обертання
        document.getElementById('b-play').disabled = true;
        
        setTimeout(() => {
            document.getElementById('b-play').disabled = false;
            let n = d % 360;
            // Визначаємо множник за кутом
            let m = (n < 90) ? 0 : (n < 180) ? 2 : (n < 270) ? 1.5 : 5;
            res(m > 0, bt, m);
        }, 4000);
    }
}

function res(win, bt, mult) {
    let statusEl = document.getElementById('g-stat');
    if(win) {
        let petBonus = s.p ? (s.p.m + s.p.lvl * 0.1) : 1;
        let winAmount = Math.floor((bt * mult - bt) * petBonus);
        s.b += winAmount;
        s.x += Math.floor(bt / 2);
        statusEl.innerHTML = `<span style="color:#00f5a0">ВИГРАШ: +${winAmount} BB</span>`;
    } else {
        s.b -= bt;
        statusEl.innerHTML = `<span style="color:#ff4d6d">ПРОГРАШ: -${bt} BB</span>`;
    }
    save();
}

// Решта функцій (buy, tab, save) залишаються без змін
