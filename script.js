// --- FIREBASE ---
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
const myId   = tg.initDataUnsafe?.user?.id || 101;
const myName = tg.initDataUnsafe?.user?.first_name || "Гравець";
const DEADLINE = new Date("2026-04-04T00:00:00+03:00").getTime();
const XP_PER_LEVEL = 1000;

const CASES = {
    basic:    { n:"Common Case 🐾",    p:285,  drop:[
        {n:'Собака',s:'🐶',r:'Звичайний',m:1.05,w:40,c:'#94a3b8'},
        {n:'Кіт',s:'🐱',r:'Звичайний',m:1.05,w:40,c:'#94a3b8'},
        {n:'Кролик',s:'🐰',r:'Незвичайний',m:1.08,w:20,c:'#3b82f6'}]},
    uncommon: { n:"Rare Case 🌟",      p:525,  drop:[
        {n:'Кролик',s:'🐰',r:'Незвичайний',m:1.08,w:46,c:'#3b82f6'},
        {n:'Лисиця',s:'🦊',r:'Незвичайний',m:1.09,w:40,c:'#3b82f6'},
        {n:'Вовк',s:'🐺',r:'Рідкісний',m:1.11,w:14,c:'#a855f7'}]},
    rare:     { n:"Epic Case 💎",      p:875,  drop:[
        {n:'Вовк',s:'🐺',r:'Рідкісний',m:1.11,w:50,c:'#a855f7'},
        {n:'Бджола',s:'🐝',r:'Рідкісний',m:1.12,w:40,c:'#a855f7'},
        {n:'Панда',s:'🐼',r:'Епічний',m:1.14,w:10,c:'#f59e0b'}]},
    legend:   { n:"Legendary Case 👑", p:1200, drop:[
        {n:'Панда',s:'🐼',r:'Епічний',m:1.14,w:56,c:'#f59e0b'},
        {n:'Лев',s:'🦁',r:'Легендарний',m:1.16,w:24,c:'#f43f5e'},
        {n:'Дракон',s:'🐲',r:'Легендарний',m:1.17,w:20,c:'#f43f5e'}]},
    ocean:    { n:"Ocean Case 🌊",     p:1500, limited:true, drop:[
        {n:'Рибка',s:'🐟',r:'Рідкісний',m:1.16,w:45,c:'#a855f7'},
        {n:'Тропічна рибка',s:'🐠',r:'Епічний',m:1.19,w:35,c:'#f59e0b'},
        {n:'Акула',s:'🦈',r:'Легендарний',m:1.23,w:15,c:'#f43f5e'},
        {n:'Восьминіг',s:'🐙',r:'Міфічний',m:1.30,w:5,c:'#bf40bf'}]}
};

let s = {b:0,x:0,r:1,name:myName,p:null,inv:[],v:4.0};
let currentShopTab='cases', currentAdminTab='balance';
let adminInvUserId=null, adminInvUserName='';

// FIREBASE SYNC
db.ref('players/'+myId).on('value', snap=>{
    let d=snap.val();
    if(d){s=d;if(!s.inv)s.inv=[];}
    else{db.ref('players/'+myId).set(s);}
    ren();
});
function save(){db.ref('players/'+myId).set(s);}

// XP / LEVELUP
function checkPetLevelUp(){
    if(!s.p) return;
    let needed=(s.p.lvl||1)*XP_PER_LEVEL;
    if(s.x>=needed){
        s.x-=needed;
        s.p.lvl=(s.p.lvl||1)+1;
        s.p.m=Math.round((s.p.m+0.005)*1000)/1000;
        let idx=s.inv.findIndex(i=>i.id===s.p.id);
        if(idx!==-1) s.inv[idx]=s.p;
        save();
        showToast(`${s.p.s} <b>${s.p.n}</b> — LVL ${s.p.lvl}! <span style="color:var(--accent)">+0.005</span>`);
    }
}
function showToast(html){
    let t=document.createElement('div');
    t.innerHTML=html; t.className='toast';
    document.body.appendChild(t);
    setTimeout(()=>t.remove(),3000);
}

// РЕНДЕР
function ren(){
    let disp=Number.isInteger(s.b)?s.b:s.b.toFixed(2);
    document.getElementById('bal-val').innerText=disp;
    let petLvl=s.p?(s.p.lvl||1):1;
    document.getElementById('xp-f').style.width=Math.min((s.x/(petLvl*XP_PER_LEVEL))*100,100)+'%';
    if(s.p){
        document.getElementById('p-img').innerText=s.p.s;
        document.getElementById('p-name').innerText=s.p.n;
        document.getElementById('p-m').innerText=s.p.m.toFixed(3);
        document.getElementById('p-l').innerText=s.p.lvl||1;
        let t=document.getElementById('p-rarity');
        t.innerText=s.p.r; t.style.background=s.p.c;
    }
    if(ADMINS.includes(Number(myId))) document.getElementById('admin-tab').style.display='block';
}

window.tab=(t,el)=>{
    document.querySelectorAll('.page').forEach(p=>p.style.display='none');
    document.querySelectorAll('.nav-tab').forEach(n=>n.classList.remove('active'));
    document.getElementById('v-'+t).style.display='block';
    el.classList.add('active');
    if(t==='shop') renderShop();
    if(t==='inv')  renderInv();
    if(t==='top')  loadTop();
    if(t==='admin')loadAdmin();
};

// МАГАЗИН
window.setShopTab=t=>{currentShopTab=t;renderShop();};
function renderShop(){
    let list=document.getElementById('shop-list');
    let tabs=`<div class="shop-tabs">
        <div class="s-tab ${currentShopTab==='cases'?'active':''}" onclick="setShopTab('cases')">📦 Кейси</div>
        <div class="s-tab ${currentShopTab==='market'?'active':''}" onclick="setShopTab('market')">🛒 Ринок</div>
    </div>`;
    if(currentShopTab==='cases'){
        let h=tabs; const now=Date.now();
        for(let k in CASES){
            const c=CASES[k];
            if(c.limited&&now>DEADLINE) continue;
            let badge=c.limited?`<span class="badge-ltd">Лімітовано</span>`:'';
            let chances=c.drop.map(p=>`<span style="color:${p.c}">${p.s} ${p.w}%</span>`).join(' · ');
            let timer='';
            if(c.limited){
                let diff=DEADLINE-now,d=Math.floor(diff/86400000),hr=Math.floor((diff/3600000)%24);
                timer=`<div class="case-timer">⏳ ${d}д ${hr}г</div>`;
            }
            h+=`<div class="shop-card">
                <div class="case-info">
                    <div class="case-name">${c.n} ${badge}</div>
                    <div style="font-size:10px;margin:4px 0;font-weight:600;opacity:.85">${chances}</div>
                    ${timer}
                </div>
                <button class="btn-buy" onclick="buyCase('${k}')">${c.p} BB</button>
            </div>`;
        }
        list.innerHTML=h;
    } else {
        list.innerHTML=tabs+'<div id="m-list" class="glass" style="text-align:center;color:#8d99ae">Завантаження...</div>';
        db.ref('market').once('value',snap=>{
            let h='';
            snap.forEach(child=>{
                let lot=child.val();
                if(!lot||!lot.pet) return;
                if(String(lot.sellerId)===String(myId)) return;
                h+=`<div class="market-item">
                    <div>
                        <div style="font-weight:700;color:${lot.pet.c}">${lot.pet.s} ${lot.pet.n}</div>
                        <div style="font-size:11px;color:#8d99ae">LVL ${lot.pet.lvl||1} · x${lot.pet.m.toFixed(3)} · ${lot.sellerName}</div>
                    </div>
                    <button class="btn-buy" onclick="buyFromMarket('${child.key}')">${lot.price} BB</button>
                </div>`;
            });
            let el=document.getElementById('m-list');
            if(el) el.innerHTML=h||'<div style="padding:30px;text-align:center;color:#8d99ae">На ринку порожньо</div>';
        });
    }
}
window.buyFromMarket=lotId=>{
    db.ref('market/'+lotId).once('value',snap=>{
        let lot=snap.val();
        if(!lot) return alert('Лот недоступний!');
        if(s.b<lot.price) return alert(`Потрібно: ${lot.price} BB`);
        s.b-=lot.price; s.inv.push(lot.pet); save();
        db.ref('players/'+lot.sellerId+'/b').transaction(c=>(c||0)+lot.price);
        db.ref('market/'+lotId).remove();
        showToast(`✅ Куплено ${lot.pet.s} ${lot.pet.n}!`);
        renderShop();
    });
};
window.listOnMarket=petId=>{
    if(s.p&&s.p.id===petId) return alert('Спочатку зніми пета!');
    let pr=prompt('Ціна (BB):');
    if(!pr||isNaN(pr)||pr<=0) return;
    let idx=s.inv.findIndex(p=>p.id===petId), pet=s.inv[idx];
    db.ref('market').push({pet,price:Number(pr),sellerId:myId,sellerName:myName}).then(()=>{
        s.inv.splice(idx,1); save(); renderInv();
    });
};

// ІНВЕНТАР
function renderInv(){
    let el=document.getElementById('inv-list');
    if(!s.inv||!s.inv.length){
        el.innerHTML=`<div class="inv-empty"><div style="font-size:52px;margin-bottom:12px">🥚</div><div style="font-weight:bold;font-size:15px">Інвентар порожній</div><div style="font-size:12px;opacity:.6;margin-top:4px">Відкривай кейси в магазині!</div></div>`;
        return;
    }
    let h=`<div style="font-size:11px;color:#8d99ae;font-weight:700;margin-bottom:10px;letter-spacing:.5px">${s.inv.length} ПЕТІВ</div>`;
    s.inv.forEach(p=>{
        let eq=s.p&&s.p.id===p.id;
        h+=`<div class="pet-card${eq?' pet-eq':''}">
            <div class="pet-stripe" style="background:${p.c}"></div>
            <div class="pet-emo">${p.s}</div>
            <div class="pet-info">
                <div class="pet-badge" style="background:${p.c}25;color:${p.c};border:1px solid ${p.c}50">${p.r}</div>
                <div class="pet-name">${p.n}${eq?`<span class="pet-active-tag">✦ АКТИВНИЙ</span>`:''}</div>
                <div class="pet-stats">
                    <span>Бонус <b style="color:${p.c}">x${p.m.toFixed(3)}</b></span>
                    <span style="margin-left:10px">LVL <b style="color:#eee">${p.lvl||1}</b></span>
                </div>
            </div>
            <div class="pet-btns">
                <button class="pb-equip${eq?' pb-eq':''}" onclick="equip(${p.id})">${eq?'✅':'Взяти'}</button>
                <button class="pb-sell" onclick="listOnMarket(${p.id})">🏪</button>
            </div>
        </div>`;
    });
    el.innerHTML=h;
}
window.equip=id=>{s.p=s.inv.find(i=>i.id===id);save();renderInv();ren();};

// КОЛЕСО
const WHEEL_SEGS=[
    {label:'0x',  color:'#c0392b',m:0,  start:0,  end:198},
    {label:'1.4x',color:'#27ae60',m:1.4,start:198,end:288},
    {label:'1.6x',color:'#2980b9',m:1.6,start:288,end:342},
    {label:'1.8x',color:'#e67e22',m:1.8,start:342,end:360},
];
let wheelAngle=0,wheelSpinning=false;

function drawWheel(angle){
    const canvas=document.getElementById('wheel-canvas');
    if(!canvas) return;
    const ctx=canvas.getContext('2d'),cx=110,cy=110,r=100;
    ctx.clearRect(0,0,220,220);
    WHEEL_SEGS.forEach(seg=>{
        const sa=(seg.start+angle-90)*Math.PI/180;
        const ea=(seg.end  +angle-90)*Math.PI/180;
        ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,sa,ea);ctx.closePath();
        ctx.fillStyle=seg.color;ctx.fill();
        ctx.strokeStyle='rgba(0,0,0,0.55)';ctx.lineWidth=2;ctx.stroke();
        const mid=((seg.start+seg.end)/2+angle-90)*Math.PI/180;
        ctx.save();
        ctx.translate(cx+Math.cos(mid)*r*.65,cy+Math.sin(mid)*r*.65);
        ctx.rotate(mid+Math.PI/2);
        ctx.fillStyle='#fff';ctx.font='bold 13px system-ui';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(seg.label,0,0);
        ctx.restore();
    });
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.12)';ctx.lineWidth=4;ctx.stroke();
    ctx.beginPath();ctx.arc(cx,cy,18,0,Math.PI*2);
    ctx.fillStyle='#0d1117';ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=2;ctx.stroke();
}
function spinWheel(resultM,onDone){
    if(wheelSpinning) return;
    wheelSpinning=true;
    const seg=WHEEL_SEGS.find(s=>s.m===resultM);
    const midDeg=(seg.start+seg.end)/2;
    const extra=((360-midDeg)%360);
    const total=7*360+extra;
    const t0=performance.now(),dur=4500,a0=wheelAngle;
    function easeOut(t){return 1-Math.pow(1-t,4);}
    function frame(now){
        const t=Math.min((now-t0)/dur,1);
        wheelAngle=a0+total*easeOut(t);
        drawWheel(wheelAngle%360);
        if(t<1) requestAnimationFrame(frame);
        else{wheelAngle=wheelAngle%360;wheelSpinning=false;onDone();}
    }
    requestAnimationFrame(frame);
}

// СЛОТИ
const SLOT_SYMS=['🍒','🍋','🍊','🍇','⭐','💎','7'];
const SLOT_W=[30,25,20,15,6,3,1];
let slotsSpinning=false;
function pickSlot(){
    let r=Math.random()*100,cur=0;
    for(let i=0;i<SLOT_SYMS.length;i++){cur+=SLOT_W[i];if(r<cur)return SLOT_SYMS[i];}
    return SLOT_SYMS[0];
}
function slotMult(a,b,c){
    if(a===b&&b===c){if(a==='7')return 5;if(a==='💎')return 4;if(a==='⭐')return 3;return 2;}
    if(a===b||b===c||a===c) return 1.3;
    return 0;
}
function spinReel(id,final,onDone){
    let t=0;
    const iv=setInterval(()=>{
        document.getElementById(id).innerText=SLOT_SYMS[Math.floor(Math.random()*SLOT_SYMS.length)];
        if(++t>=14){clearInterval(iv);document.getElementById(id).innerText=final;onDone();}
    },75);
}
function runSlots(cb){
    if(slotsSpinning) return;
    slotsSpinning=true;
    const r0=pickSlot(),r1=pickSlot(),r2=pickSlot();
    spinReel('reel-0',r0,()=>spinReel('reel-1',r1,()=>spinReel('reel-2',r2,()=>{slotsSpinning=false;cb(r0,r1,r2);})));
}

// МІНИ
let minesState=null;
function calcMinesMult(opened,mineCount){
    if(opened===0) return 1.0;
    const maxMult=1.0+mineCount*0.25;
    const progress=opened/(25-mineCount);
    return Math.round((1.0+(maxMult-1.0)*progress)*100)/100;
}
window.updateMinesCount=()=>{
    const n=parseInt(document.getElementById('mines-count').value);
    document.getElementById('mines-count-label').innerText=n;
    document.getElementById('mines-mult-label').innerText=(1+n*0.25).toFixed(2);
};
function buildMinesGrid(){
    if(!minesState){document.getElementById('mines-grid').innerHTML='';return;}
    let h='';
    for(let i=0;i<25;i++){
        const cell=minesState.cells[i];
        if(cell.revealed){
            h+=cell.mine?`<div class="mc mc-boom">💣</div>`:`<div class="mc mc-safe">💚</div>`;
        } else if(minesState.alive){
            h+=`<div class="mc mc-btn" onclick="minesReveal(${i})">?</div>`;
        } else {
            h+=`<div class="mc" style="opacity:.3">·</div>`;
        }
    }
    document.getElementById('mines-grid').innerHTML=h;
}
window.minesReveal=idx=>{
    if(!minesState||!minesState.alive) return;
    const cell=minesState.cells[idx];
    cell.revealed=true;
    if(cell.mine){
        minesState.alive=false;
        minesState.cells.forEach(c=>{if(c.mine)c.revealed=true;});
        buildMinesGrid();
        document.getElementById('mines-ctrl').style.display='none';
        const bt=minesState.bet;
        s.b-=bt;save();
        setTimeout(()=>{
            document.getElementById('g-stat').innerHTML=`<span style="color:var(--error)">-${bt.toFixed(2)} BB 💣</span><br><small>Бум! Міна!</small>`;
            minesState=null;buildMinesGrid();
        },600);
    } else {
        minesState.opened++;
        const mult=calcMinesMult(minesState.opened,minesState.mineCount);
        minesState.currentMult=mult;
        document.getElementById('mines-curr-mult').innerText=mult.toFixed(2);
        buildMinesGrid();
        if(minesState.opened>=minesState.safeCells) minesCashout();
    }
};
window.minesCashout=()=>{
    if(!minesState||!minesState.alive||minesState.opened===0) return;
    const bt=minesState.bet,mult=minesState.currentMult;
    const win=(bt*mult-bt)*(s.p?s.p.m:1);
    s.b+=win;s.x+=Math.floor(bt/2);save();checkPetLevelUp();
    document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${win.toFixed(2)} BB</span><br><small>Забрав x${mult.toFixed(2)} 💰</small>`;
    minesState.alive=false;
    minesState.cells.forEach(c=>c.revealed=true);
    buildMinesGrid();
    document.getElementById('mines-ctrl').style.display='none';
    minesState=null;
};
function startMines(bt){
    const mineCount=parseInt(document.getElementById('mines-count').value);
    const safeCells=25-mineCount;
    let pos=Array.from({length:25},(_,i)=>i);
    for(let i=pos.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[pos[i],pos[j]]=[pos[j],pos[i]];}
    const mineSet=new Set(pos.slice(0,mineCount));
    minesState={bet:bt,mineCount,safeCells,opened:0,alive:true,currentMult:1.0,
        cells:Array.from({length:25},(_,i)=>({mine:mineSet.has(i),revealed:false}))};
    document.getElementById('mines-curr-mult').innerText='1.00';
    document.getElementById('mines-ctrl').style.display='block';
    document.getElementById('g-stat').innerHTML=`<span style="color:var(--accent)">⚡ Відкривай клітинки!</span>`;
    buildMinesGrid();
}

// КУБИК
const DICE_FACES=['⚀','⚁','⚂','⚃','⚄','⚅'];
let selN_val=1;
function buildDiceUI(){
    let h=`<div class="dice-display">
        <div id="dice-big" style="transition:transform .15s">${DICE_FACES[selN_val-1]}</div>
        <div style="font-size:10px;color:#8d99ae;font-weight:700;margin-top:6px;letter-spacing:.5px">ВИБРАНЕ ЧИСЛО</div>
    </div><div class="dice-grid">`;
    for(let i=1;i<=6;i++)
        h+=`<button class="dice-btn${i===selN_val?' dice-sel':''}" onclick="selN(${i})">${DICE_FACES[i-1]}<span>${i}</span></button>`;
    h+=`</div>`;
    document.getElementById('ui-dice').innerHTML=h;
}
window.selN=n=>{
    selN_val=n; buildDiceUI();
    const big=document.getElementById('dice-big');
    if(big){
        big.style.transform='scale(.8) rotate(-10deg)';
        setTimeout(()=>big.style.transform='scale(1.1) rotate(5deg)',80);
        setTimeout(()=>big.style.transform='scale(1) rotate(0)',160);
    }
};
function rollDiceAnim(onDone){
    const big=document.getElementById('dice-big');
    if(!big){onDone(Math.floor(Math.random()*6)+1);return;}
    let t=0;
    const iv=setInterval(()=>{
        const r=Math.floor(Math.random()*6);
        big.innerText=DICE_FACES[r];
        big.style.transform=`rotate(${(Math.random()-.5)*30}deg) scale(${.85+Math.random()*.2})`;
        if(++t>12){
            clearInterval(iv);
            const result=Math.floor(Math.random()*6)+1;
            big.innerText=DICE_FACES[result-1];
            big.style.transform='scale(1) rotate(0)';
            onDone(result);
        }
    },55);
}

// updUI + play
window.updUI=()=>{
    const g=document.getElementById('g-sel').value;
    ['dice','wheel','slots','mines','bj'].forEach(id=>{
        document.getElementById('ui-'+id).style.display=(g===id)?'block':'none';
    });
    if(g==='dice')  buildDiceUI();
    if(g==='wheel') setTimeout(()=>drawWheel(wheelAngle),50);
    if(g==='mines') updateMinesCount();
};

window.play=()=>{
    const bt=parseFloat(document.getElementById('bet-a').value);
    if(isNaN(bt)||bt<=0||bt>s.b) return alert('Мало BB!');
    const g=document.getElementById('g-sel').value;
    if(g==='mines'&&minesState&&minesState.alive) return alert('Спочатку завершуй гру!');
    document.getElementById('g-stat').innerText='⏳ Очікування...';
    if(g==='f50'){
        const w=Math.random()>.5; res(w,bt,1.55,w?'Виграв!':'Програв');
    } else if(g==='dice'){
        rollDiceAnim(r=>res(r===selN_val,bt,2.05,`Випало ${r}`));
    } else if(g==='wheel'){
        if(wheelSpinning) return;
        let p=Math.random()*100,m;
        if(p<55)m=0;else if(p<80)m=1.4;else if(p<95)m=1.6;else m=1.8;
        spinWheel(m,()=>res(m>0,bt,m,`Множник x${m}`));
    } else if(g==='slots'){
        if(slotsSpinning) return;
        document.getElementById('g-stat').innerText='🎰 Крутимо...';
        runSlots((a,b,c)=>res(slotMult(a,b,c)>0,bt,slotMult(a,b,c),`${a} ${b} ${c}`));
    } else if(g==='mines'){
        startMines(bt); return;
    } else if(g==='bj') startBJ(bt);
};

function res(win,bt,m,msg){
    const bon=s.p?s.p.m:1;
    if(win){
        const w=(bt*m-bt)*bon;
        s.b+=w;s.x+=Math.floor(bt/2);
        document.getElementById('g-stat').innerHTML=`<span style="color:var(--success)">+${w.toFixed(2)} BB</span><br><small>${msg}</small>`;
        checkPetLevelUp();
    } else {
        s.b-=bt;
        document.getElementById('g-stat').innerHTML=`<span style="color:var(--error)">-${bt.toFixed(2)} BB</span><br><small>${msg}</small>`;
    }
    save();
}

// КЕЙСИ
window.buyCase=k=>{
    const c=CASES[k];
    if(s.b<c.p) return alert('Мало BB!');
    s.b-=c.p;save();
    document.getElementById('case-modal').style.display='flex';
    let rand=Math.random()*100,win,cur=0;
    for(let p of c.drop){cur+=p.w;if(rand<=cur){win={...p};break;}}
    let scr=document.getElementById('case-scroll');
    let pool=[];for(let key in CASES)pool.push(...CASES[key].drop);
    let h='';for(let i=0;i<55;i++){
        let it=(i===40)?win:pool[Math.floor(Math.random()*pool.length)];
        h+=`<div class="case-item">${it.s}</div>`;
    }
    scr.innerHTML=h;scr.style.transition='0s';scr.style.left='0px';
    setTimeout(()=>{
        scr.style.transition='5s cubic-bezier(0.1,0,0.1,1)';
        scr.style.left=`-${40*90-(window.innerWidth/2-45)}px`;
    },50);
    setTimeout(()=>{
        document.getElementById('case-res').innerHTML=`<span style="color:${win.c}">${win.s} ${win.n}</span>`;
        document.getElementById('case-close').style.display='block';
        win.id=Date.now();win.lvl=1;s.inv.push(win);save();
    },5600);
};
window.closeCase=()=>{
    document.getElementById('case-modal').style.display='none';
    document.getElementById('case-close').style.display='none';
    document.getElementById('case-res').innerText='';
};

// БЛЕКДЖЕК
let bj=null;
function dr(){return Math.floor(Math.random()*10)+2;}
function startBJ(bt){bj={p:[dr(),dr()],d:[dr()],bt};document.getElementById('bj-ctrl').style.display='flex';reBJ();}
function reBJ(){
    const card=n=>`<div class="bj-card">${n}</div>`;
    document.getElementById('bj-pc').innerHTML=bj.p.map(card).join('');
    document.getElementById('bj-dc').innerHTML=bj.d.map(card).join('');
    if(bj.p.reduce((a,b)=>a+b,0)>21){res(false,bj.bt,0,'Перебір!');endBJ();}
}
window.bjDo=a=>{
    if(a==='hit'){bj.p.push(dr());reBJ();}
    else{
        while(bj.d.reduce((a,b)=>a+b,0)<17)bj.d.push(dr());
        reBJ();
        let ps=bj.p.reduce((a,b)=>a+b,0),ds=bj.d.reduce((a,b)=>a+b,0);
        let w=ds>21||ps>ds;
        res(w,bj.bt,2,w?'Виграш!':'Програш');endBJ();
    }
};
function endBJ(){document.getElementById('bj-ctrl').style.display='none';}

// ЛІДЕРИ
function loadTop(){
    db.ref('players').once('value',snap=>{
        let l=[];snap.forEach(c=>{let v=c.val();if(v.name)l.push(v);});
        l.sort((a,b)=>b.b-a.b);
        document.getElementById('leaderboard').innerHTML=l.slice(0,10).map((p,i)=>`
            <div class="market-item">
                <span>${['🥇','🥈','🥉'][i]||`${i+1}.`} ${p.name}</span>
                <b style="color:var(--accent)">${Math.floor(p.b)} BB</b>
            </div>`).join('');
    });
}

// АДМІНКА
window.setAdminTab=t=>{currentAdminTab=t;adminInvUserId=null;loadAdmin();};
function loadAdmin(){
    if(currentAdminTab==='inv'&&adminInvUserId){loadAdminUserInv(adminInvUserId,adminInvUserName);return;}
    db.ref('players').once('value',snap=>{
        let tabs=`<div class="admin-tabs">
            <div class="a-tab ${currentAdminTab==='balance'?'active':''}" onclick="setAdminTab('balance')">💰 Баланс</div>
            <div class="a-tab ${currentAdminTab==='pets'?'active':''}" onclick="setAdminTab('pets')">🐾 Пети</div>
            <div class="a-tab ${currentAdminTab==='inv'?'active':''}" onclick="setAdminTab('inv')">🎒 Інвентар</div>
        </div>`;
        let h=tabs;
        snap.forEach(c=>{
            let p=c.val(),uid=c.key;
            h+=`<div class="admin-card"><b>${p.name||'Анонім'}</b> <small style="color:#8d99ae">${(p.b||0).toFixed(2)} BB</small>`;
            if(currentAdminTab==='balance'){
                h+=`<div class="admin-ctrl-grid">
                    <button class="btn-ctrl b-add" onclick="mathB('${uid}','add')">+ Додати</button>
                    <button class="btn-ctrl b-sub" onclick="mathB('${uid}','sub')">− Мінус</button>
                    <button class="btn-ctrl b-set" onclick="mathB('${uid}','set')">Задати</button>
                </div>`;
            } else if(currentAdminTab==='pets'){
                h+=`<button class="btn" style="padding:8px;font-size:12px;margin-top:8px;background:var(--purple)" onclick="adminGivePet('${uid}')">🎁 Подарувати пета</button>`;
            } else {
                h+=`<br><small style="color:#8d99ae">Петів: ${(p.inv||[]).length}</small>
                <button class="btn" style="padding:8px;font-size:12px;margin-top:8px;background:#1c4a8a" onclick="openAdminInv('${uid}','${(p.name||'Анонім').replace(/'/g,"\\'")}')">🎒 Переглянути</button>`;
            }
            h+=`</div>`;
        });
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.openAdminInv=(uid,name)=>{adminInvUserId=uid;adminInvUserName=name;loadAdminUserInv(uid,name);};
function loadAdminUserInv(uid,name){
    db.ref('players/'+uid).once('value',snap=>{
        let p=snap.val(),inv=(p&&p.inv)?p.inv:[];
        let h=`<div class="admin-tabs">
            <div class="a-tab" onclick="setAdminTab('balance')">💰</div>
            <div class="a-tab" onclick="setAdminTab('pets')">🐾</div>
            <div class="a-tab active">🎒</div>
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <button class="btn-s" onclick="adminInvUserId=null;loadAdmin()" style="font-size:15px;padding:8px 14px">← Назад</button>
            <div><b>${name}</b> <small style="color:#8d99ae">(${inv.length} петів)</small></div>
        </div>`;
        if(!inv.length){
            h+=`<div class="admin-card" style="text-align:center;color:#8d99ae;padding:20px">Порожньо</div>`;
        } else {
            inv.forEach((pet,idx)=>{
                let eq=p.p&&p.p.id===pet.id;
                h+=`<div class="admin-card" style="display:flex;justify-content:space-between;align-items:center;gap:10px">
                    <div style="display:flex;align-items:center;gap:10px">
                        <span style="font-size:28px">${pet.s}</span>
                        <div>
                            <div style="font-weight:bold">${pet.n}${eq?' <span style="font-size:10px;background:var(--success);padding:1px 5px;border-radius:4px">Активний</span>':''}</div>
                            <div style="font-size:11px;color:${pet.c}">${pet.r} · x${pet.m.toFixed(3)} · LVL ${pet.lvl||1}</div>
                        </div>
                    </div>
                    <button class="btn-ctrl b-sub" style="padding:8px 12px" onclick="adminRemovePet('${uid}',${idx},'${name}')">🗑</button>
                </div>`;
            });
        }
        document.getElementById('admin-list').innerHTML=h;
    });
}
window.adminRemovePet=(uid,idx,name)=>{
    db.ref('players/'+uid).once('value',snap=>{
        let p=snap.val(),inv=p.inv?[...p.inv]:[];
        let pet=inv[idx];
        if(!pet) return alert('Не знайдено!');
        if(!confirm(`Видалити ${pet.s} ${pet.n} у ${name}?`)) return;
        if(p.p&&p.p.id===pet.id) db.ref('players/'+uid+'/p').set(null);
        inv.splice(idx,1);
        db.ref('players/'+uid+'/inv').set(inv).then(()=>loadAdminUserInv(uid,name));
    });
};
window.mathB=(id,type)=>{
    let v=prompt('Сума:');if(!v||isNaN(v))return;
    v=Number(v);let ref=db.ref('players/'+id+'/b');
    if(type==='add')ref.transaction(c=>(c||0)+v);
    else if(type==='sub')ref.transaction(c=>(c||0)-v);
    else ref.set(v);
    setTimeout(loadAdmin,500);
};
window.adminGivePet=tid=>{
    let unique=[],seen=new Set();
    for(let k in CASES)CASES[k].drop.forEach(p=>{if(!seen.has(p.n)){unique.push(p);seen.add(p.n);}});
    let list=unique.map((p,i)=>`${i}: ${p.s} ${p.n}`).join('\n');
    let ch=prompt(list);
    if(ch!==null&&unique[ch]){
        let p={...unique[ch],id:Date.now(),lvl:1};
        db.ref('players/'+tid+'/inv').once('value',sn=>{let inv=sn.val()||[];inv.push(p);db.ref('players/'+tid+'/inv').set(inv);});
        alert('Видано!');
    }
};

updUI();
