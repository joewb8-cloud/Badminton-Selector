// Badminton Player Selector – JavaScript port of "badminton selector 28.10.py"
const START_RATING = 1000, K_FACTOR = 32, STORE = "badmintonSelector";

let S = {players:[], partnerCount:{}, meetCount:{}, gamesPlayed:{}, rating:{}, wins:{}, roundNo:0, currentGame:null, selected:[], matchInfo:""};

const $ = id => document.getElementById(id);
const save = () => localStorage.setItem(STORE, JSON.stringify(S));
function load(){ try{ const d = JSON.parse(localStorage.getItem(STORE)); if(d) S = {...S, ...d}; }catch{} }

// ---------- Rotation + skill logic ----------
const pair = (a,b) => [a,b].sort().join("\u0001");
const getRating = p => S.rating[p] ?? START_RATING;
const teamRating = t => t.reduce((s,p)=>s+getRating(p),0)/t.length;
const winChance = (t1,t2) => 1/(1+10**((teamRating(t2)-teamRating(t1))/400));
function combinations(arr,k){ const out=[]; (function r(s,c){ if(c.length===k){out.push(c);return;} for(let i=s;i<arr.length;i++) r(i+1,[...c,arr[i]]); })(0,[]); return out; }
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function partnershipsDone(){
  const all = combinations(S.players,2);
  return [all.filter(([a,b])=>(S.partnerCount[pair(a,b)]||0)>0).length, all.length];
}

function chooseGame(){
  let players = [...S.players];
  if(players.length>12){ shuffle(players); players.sort((a,b)=>(S.gamesPlayed[a]||0)-(S.gamesPlayed[b]||0)); players = players.slice(0,12); }
  let best=null, bestGame=null;
  for(const [a,b,c,d] of combinations(players,4)){
    const games = [a,b,c,d].reduce((s,p)=>s+(S.gamesPlayed[p]||0),0);
    for(const [t1,t2] of [[[a,b],[c,d]],[[a,c],[b,d]],[[a,d],[b,c]]]){
      const partnerRepeats = (S.partnerCount[pair(...t1)]||0)+(S.partnerCount[pair(...t2)]||0);
      let opp=0; for(const x of t1) for(const y of t2) opp += S.meetCount[pair(x,y)]||0;
      const score = partnerRepeats*1000 + games*50 + Math.abs(teamRating(t1)-teamRating(t2))*1.5 + opp*5 + Math.random();
      if(best===null||score<best){ best=score; bestGame=[t1,t2]; }
    }
  }
  return bestGame;
}

function recordGame(t1,t2){
  for(const t of [t1,t2]){ const k=pair(...t); S.partnerCount[k]=(S.partnerCount[k]||0)+1; }
  for(const x of t1) for(const y of t2){ const k=pair(x,y); S.meetCount[k]=(S.meetCount[k]||0)+1; }
  for(const p of [...t1,...t2]) S.gamesPlayed[p]=(S.gamesPlayed[p]||0)+1;
  S.roundNo++;
}

function recordResult(w){
  if(!S.currentGame) return;
  const [t1,t2]=S.currentGame;
  const change = K_FACTOR*((w===0?1:0)-winChance(t1,t2));
  t1.forEach(p=>S.rating[p]=getRating(p)+change);
  t2.forEach(p=>S.rating[p]=getRating(p)-change);
  const winners = w===0?t1:t2;
  winners.forEach(p=>S.wins[p]=(S.wins[p]||0)+1);
  S.currentGame=null;
  S.matchInfo=`Result saved: ${winners.join(" & ")} won (ratings moved by ${Math.abs(Math.round(change))})`;
  render();
}

// ---------- Actions ----------
function addPlayer(e){
  e.preventDefault();
  const name=$("name").value.trim();
  if(!name) return alert("Please enter a player name.");
  if(S.players.some(p=>p.toLowerCase()===name.toLowerCase())) return alert("That player is already in the list.");
  S.players.push(name); $("name").value=""; $("name").focus(); render();
}
function removePlayer(name){
  S.players=S.players.filter(p=>p!==name);
  for(const d of [S.gamesPlayed,S.rating,S.wins]) delete d[name];
  for(const d of [S.partnerCount,S.meetCount]) for(const k of Object.keys(d)) if(k.split("\u0001").includes(name)) delete d[k];
  if(S.selected.includes(name)) restartSelection(); else render();
}
function selectFour(){
  if(S.players.length<4) return alert("You need at least 4 players.");
  if(S.currentGame && !confirm("The last game has no result recorded.\n\nSkip it and pick a new game?")) return;
  const [t1,t2]=chooseGame();
  recordGame(t1,t2);
  S.currentGame=[t1,t2]; S.selected=[...t1,...t2];
  S.matchInfo=`Team A rating ${Math.round(teamRating(t1))} vs Team B rating ${Math.round(teamRating(t2))} · Team A win chance ${Math.round(winChance(t1,t2)*100)}%`;
  render();
  const [done,total]=partnershipsDone();
  if(done===total){
    alert("Rotation Complete\n\nEveryone has now partnered everyone else at least once!\nPartnership history will reset for a fresh rotation.\nRatings and wins are kept.");
    S.partnerCount={}; S.meetCount={}; render();
  }
}
function restartSelection(){ S.selected=[]; S.currentGame=null; S.matchInfo=""; render(); }
function resetHistory(){
  if(!confirm("Clear all pairing history, wins and ratings?")) return;
  Object.assign(S,{partnerCount:{},meetCount:{},gamesPlayed:{},rating:{},wins:{},roundNo:0});
  restartSelection();
}

// ---------- Rendering ----------
function render(){
  const n=S.players.length;
  $("count").textContent=`${n} player${n===1?"":"s"}`;
  $("selectBtn").disabled=n<4;
  const ul=$("players"); ul.innerHTML="";
  if(!n) ul.innerHTML='<li class="muted">No players added yet.</li>';
  for(const p of S.players){
    const li=document.createElement("li");
    li.innerHTML=`<span><b></b><span class="stats">${S.wins[p]||0}W/${S.gamesPlayed[p]||0}G · ${Math.round(getRating(p))}</span></span><button>Remove</button>`;
    li.querySelector("b").textContent=p;
    li.querySelector("button").onclick=()=>removePlayer(p);
    ul.appendChild(li);
  }
  const [done,total]=partnershipsDone();
  $("progress").textContent=`Round ${S.roundNo} · Partnerships covered: ${done} of ${total}`;
  $("matchInfo").textContent=S.matchInfo;
  const boxes=$("boxes"); boxes.innerHTML="";
  for(let i=0;i<4;i++){
    const d=document.createElement("div"), sel=S.selected[i];
    d.className="box"+(sel?(i<2?" a":" b"):"");
    d.innerHTML=`<div class="t">${i<2?"TEAM A":"TEAM B"} - PLAYER ${i%2+1}</div><div class="n"></div>`;
    d.querySelector(".n").textContent=sel||"Waiting for selection...";
    boxes.appendChild(d);
  }
  $("aWon").disabled=$("bWon").disabled=!S.currentGame;
  save();
}

$("addForm").onsubmit=addPlayer;
$("selectBtn").onclick=selectFour;
$("restartBtn").onclick=restartSelection;
$("resetBtn").onclick=resetHistory;
$("aWon").onclick=()=>recordResult(0);
$("bWon").onclick=()=>recordResult(1);
load(); render();

if("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js");
