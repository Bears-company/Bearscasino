let selDiceNum = 1; 
let bj = null;

function selN(n) {
    selDiceNum = n;
    document.querySelectorAll('.n-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
}

function updUI() {
    const g = document.getElementById('g-sel').value;
    document.getElementById('ui-dice').style.display = (g === 'dice') ? 'block' : 'none';
    document.getElementById('ui-wheel').style.display = (g === 'wheel') ? 'block' : 'none';
    document.getElementById('ui-bj').style.display = (g === 'bj') ? 'block' : 'none';
}

function play() {
    let bt = parseInt(document.getElementById('bet-a').value);
    if(bt <= 0 || bt > s.b) return alert("Недостатньо коштів!");
    let g = document.getElementById('g-sel').value;
    document.getElementById('g-stat').textContent = "Граємо...";

    if(g === 'f50') {
        res(Math.random() > 0.5, bt, 1.45);
    } 
    else if(g === 'dice') {
        let rolled = Math.floor(Math.random() * 6) + 1;
        document.getElementById('g-stat').textContent = "Випало: " + rolled;
        setTimeout(() => res(rolled === selDiceNum, bt, 1.45), 600);
    }
    else if(g === 'wheel') {
        let w = document.getElementById('w-obj');
        let d = 3600 + Math.floor(Math.random()*360);
        w.style.transform = `rotate(${d}deg)`;
        document.getElementById('b-play').disabled = true;
        
        setTimeout(() => {
            document.getElementById('b-play').disabled = false;
            let n = d % 360;
            let prob = Math.random() * 100;
            let m = 0;
            // Логіка шансів: 0 (45%), 1.25 (35%), 1.5 (15%), 1.75 (5%)
            if(prob < 45) m = 0;
            else if(prob < 80) m = 1.25;
            else if(prob < 95) m = 1.5;
            else m = 1.75;
            res(m > 0, bt, m);
        }, 4000);
    }
    else if(g === 'bj') {
        bj = { p: [draw(), draw()], d: [draw()], bt: bt };
        document.getElementById('bj-ctrl').style.display = 'flex';
        document.getElementById('b-play').style.display = 'none';
        renBJ();
    }
}

// ЛОГІКА БЛЕКДЖЕКА
function draw() { return Math.floor(Math.random() * 10) + 2; }
function renBJ() {
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    document.getElementById('bj-pc').innerHTML = bj.p.map(c => `<div class="bj-card">${c}</div>`).join('');
    document.getElementById('bj-dc').innerHTML = bj.d.map(c => `<div class="bj-card">${c}</div>`).join('');
    if(sum(bj.p) > 21) { res(false, bj.bt, 0); endBJ(); }
}
function bjDo(act) {
    const sum = (arr) => arr.reduce((a, b) => a + b, 0);
    if(act === 'hit') { bj.p.push(draw()); renBJ(); }
    else {
        while(sum(bj.d) < 17) bj.d.push(draw());
        renBJ();
        let ps = sum(bj.p), ds = sum(bj.d);
        res(ds > 21 || ps > ds, bj.bt, 2.0);
        endBJ();
    }
}
function endBJ() {
    document.getElementById('bj-ctrl').style.display = 'none';
    document.getElementById('b-play').style.display = 'block';
}

function res(win, bt, m) {
    let st = document.getElementById('g-stat');
    if(win) {
        let bonus = s.p ? (s.p.m + s.p.lvl*0.1) : 1;
        let winSum = Math.floor((bt * m - bt) * bonus);
        s.b += winSum; s.x += Math.floor(bt/2);
        st.innerHTML = `<span style="color:#00f5a0">WIN! +${winSum} BB</span>`;
    } else {
        s.b -= bt;
        st.innerHTML = `<span style="color:#ff4d6d">LOSE! -${bt} BB</span>`;
    }
    save();
}
