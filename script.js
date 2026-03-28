const db = firebase.database();
const tg = window.Telegram.WebApp;

let s = {b:1000,inv:[],p:null};

const pets=[
{n:"Собака",s:"🐶",m:1.05},
{n:"Кіт",s:"🐱",m:1.05},
{n:"Кролик",s:"🐰",m:1.08},
{n:"Лисиця",s:"🦊",m:1.09}
];

const cases=[
{p:300,drop:[pets[0],pets[1],pets[2]]}
];

function openTab(t){
document.querySelectorAll(".page").forEach(e=>e.classList.remove("active"));
document.getElementById(t).classList.add("active");

if(t==="shop") renderShop();
if(t==="inv") renderInv();
}

function render(){
document.getElementById("bal").innerText=s.b;

if(s.p){
document.getElementById("pet-emoji").innerText=s.p.s;
document.getElementById("pet-name").innerText=s.p.n;
document.getElementById("pet-m").innerText="x"+s.p.m;
}
}

function renderShop(){
let h="";
cases.forEach((c,i)=>{
h+=`<div class="glass">
Кейс ${i}
<button onclick="buy(${i})">${c.p}</button>
</div>`;
});
document.getElementById("cases").innerHTML=h;
}

function renderInv(){
let h="";
s.inv.forEach((p,i)=>{
h+=`<div>${p.s} ${p.n}
<button onclick="equip(${i})">Взяти</button>
</div>`;
});
document.getElementById("inventory").innerHTML=h;
}

function equip(i){s.p=s.inv[i];render();}

function play(){
let bet=Number(document.getElementById("bet").value);

if(!s.p) return alert("нема пета");

let win=Math.random()>0.5;

if(win)s.b+=bet*s.p.m;
else s.b-=bet;

render();
}

function buy(i){
let c=cases[i];
if(s.b<c.p) return;

s.b-=c.p;

let line=document.getElementById("line");
let wrap=document.getElementById("case");

wrap.style.display="flex";
line.innerHTML="";

let items=[];
for(let j=0;j<40;j++){
items.push(c.drop[Math.floor(Math.random()*c.drop.length)]);
}

let win=items[30];

items.forEach(p=>{
line.innerHTML+=`<div class="item">${p.s}</div>`;
});

setTimeout(()=>{
line.style.transform="translateX(-2400px)";
},100);

setTimeout(()=>{
s.inv.push(win);
wrap.style.display="none";
line.style.transform="translateX(0)";
render();
},4000);
}

render();