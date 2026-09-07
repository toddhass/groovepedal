class Synth{
    constructor(ctx,dest){this.ctx=ctx;this.dest=dest;const n=ctx.createBuffer(1,ctx.sampleRate*1.2,ctx.sampleRate);const d=n.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.noise=n;}
    env(t,peak,a,dec){const g=this.ctx.createGain();const s=Math.max(t,this.ctx.currentTime);g.gain.setValueAtTime(0.0001,s);try{g.gain.exponentialRampToValueAtTime(Math.max(0.0002,peak),s+0.004);g.gain.exponentialRampToValueAtTime(0.0001,s+a+dec);}catch{g.gain.linearRampToValueAtTime(peak,s+0.004);}return g;}
    ns(t,dur){const s=this.ctx.createBufferSource();s.buffer=this.noise;s.loop=true;s.start(t);s.stop(t+dur);return s;}
    kick(t,v){const o=this.ctx.createOscillator();o.type="sine";o.frequency.setValueAtTime(160,t);o.frequency.exponentialRampToValueAtTime(38,t+.1);const g=this.env(t,1.45*v,.004,.36);o.connect(g);g.connect(this.dest);o.start(t);o.stop(t+.4);}
    snare(t,v){const n=this.ns(t,.22);const bp=this.ctx.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1800;const g=this.env(t,.85*v,.002,.16);n.connect(bp);bp.connect(g);g.connect(this.dest);const o=this.ctx.createOscillator();o.type="triangle";o.frequency.setValueAtTime(196,t);const tg=this.env(t,.38*v,.002,.1);o.connect(tg);tg.connect(this.dest);o.start(t);o.stop(t+.18);}
    hat(t,v,dec){const n=this.ns(t,dec+.04);const hp=this.ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=6800;const g=this.env(t,(dec>.1?.26:.22)*v,.001,dec);n.connect(hp);hp.connect(g);g.connect(this.dest);}
    crash(t,v){const n=this.ns(t,.9);const hp=this.ctx.createBiquadFilter();hp.type="highpass";hp.frequency.value=5000;const g=this.env(t,.45*v,.002,.8);n.connect(hp);hp.connect(g);g.connect(this.dest);}
    tom(t,v,f){const o=this.ctx.createOscillator();o.type="sine";o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.6,t+.18);const g=this.env(t,.7*v,.003,.2);o.connect(g);g.connect(this.dest);o.start(t);o.stop(t+.25);}
    trig(voice,t,v){v=Math.max(.05,Math.min(1.4,v)); if(voice==="kick")this.kick(t,v); else if(voice==="snare"||voice==="clap")this.snare(t,v); else if(voice==="rim")this.tom(t,v*.8,420); else if(voice==="hat")this.hat(t,v,.05); else if(voice==="openHat")this.hat(t,v,.24); else if(voice==="ride")this.hat(t,v,.4); else if(voice==="crash")this.crash(t,v); else if(voice==="tom")this.tom(t,v,160); else if(voice==="floor")this.tom(t,v,95);}
  }
  class Engine{
    constructor(){this.song=null;this.playing=false;this.partIndex=0;this.step=0;this.bpm=120;this.volume=1;this.fillQ=false;this.nextQ=false;this.accentQ=false;this.inFill=false;this.listeners=[];}
    sub(fn){this.listeners.push(fn);fn(this.state());}
    emit(){const s=this.state();this.listeners.forEach(fn=>fn(s));}
    state(){const p=this.song?.parts[this.partIndex]; return {playing:this.playing,ready:this.ctx?.state==="running",partName:p?.name||"—",partIndex:this.partIndex,step:this.step,bpm:this.bpm,inFill:this.inFill,fillQ:this.fillQ,nextQ:this.nextQ,accentQ:this.accentQ,volume:this.volume};}
    load(song){this.song=song;this.partIndex=0;this.step=0;this.inFill=false;this.bpm=song.bpm;this.emit();}
    unlock(){try{if(!this.ctx){const AC=window.AudioContext||window.webkitAudioContext;this.ctx=new AC();const drums=this.ctx.createGain();const comp=this.ctx.createDynamicsCompressor();comp.threshold.value=-12;comp.ratio.value=2.5;const makeup=this.ctx.createGain();makeup.gain.value=1.8;this.master=this.ctx.createGain();drums.connect(comp);comp.connect(makeup);makeup.connect(this.master);this.master.connect(this.ctx.destination);this.synth=new Synth(this.ctx,drums);this.apply();this.ctx.addEventListener("statechange",()=>{if(this.ctx.state==="running"&&this.playing)this.begin();this.emit();});}if(this.ctx.state==="suspended")this.ctx.resume(); if(!this.htmlAudio){this.htmlAudio=new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");this.htmlAudio.loop=true;this.htmlAudio.setAttribute("playsinline","");this.htmlAudio.volume=.01;} this.htmlAudio.play().catch(()=>{}); const o=this.ctx.createOscillator();const g=this.ctx.createGain();g.gain.value=.03;o.frequency.value=72;o.connect(g);g.connect(this.master);o.start();o.stop(this.ctx.currentTime+.05);}catch(e){}}
    apply(){if(this.master&&this.ctx)this.master.gain.setTargetAtTime(this.volume*this.volume,this.ctx.currentTime,.02);}
    start(){if(!this.song)return;this.unlock();this.playing=true;this.step=0;this.inFill=false;this.clock=false;this.begin();if(this.synth&&this.ctx?.state==="running"){this.synth.trig("kick",this.ctx.currentTime,1);this.synth.trig("hat",this.ctx.currentTime,.9);}this.emit();}
    stop(){this.playing=false;this.clock=false;clearInterval(this.timer);this.emit();}
    toggle(){if(this.playing&&this.ctx?.state==="running")this.stop();else this.start();}
    queueFill(){this.fillQ=true;this.emit();} queueNext(){this.nextQ=true;this.emit();}
    restart(){this.partIndex=0;this.step=0;this.inFill=false;this.emit();}
    queueAccent(){this.accentQ=true;this.emit();}
    setBpm(n){this.bpm=n;this.emit();} setVol(n){this.volume=n;this.apply();this.emit();}
    begin(){if(!this.playing||!this.ctx||this.clock)return; if(this.ctx.state!=="running"){this.ctx.resume();return;} this.clock=true; this.nextT=this.ctx.currentTime+.04; clearInterval(this.timer); this.timer=setInterval(()=>this.sched(),25); this.sched();}
    sched(){if(!this.playing||!this.ctx||this.ctx.state!=="running"){if(this.playing)this.unlock();return;} while(this.nextT<this.ctx.currentTime+.12){this.schedStep(this.nextT);this.advance();}}
    schedStep(when){const part=this.song.parts[this.partIndex]; if(!part||!this.synth)return; let pattern=this.inFill?part.fill:part.groove; let st=this.inFill?this.fillStep%16:this.step%16;
      if(this.accentQ&&st===0){this.synth.trig("crash",when,1);this.accentQ=false;}
      for(const v of ["kick","snare","hat","openHat","ride","tom","floor","crash","rim","clap"]){const vel=hit(pattern[v], this.inFill?this.fillStep:this.step); if(vel)this.synth.trig(v,when,vel);}
      this.vis={step:st,partIndex:this.partIndex,inFill:this.inFill}; this.emit();}
    advance(){const part=this.song.parts[this.partIndex]; const six=60/(this.bpm||120)/4; const odd=(this.inFill?this.fillStep:this.step)%2===1; const sw=part?.swing||0; this.nextT+=odd?six*(1+sw*.55):six*(1-sw*.55);
      if(this.inFill){this.fillStep++; if(this.fillStep>=16){this.inFill=false; this.advancePart(); this.step=0;} return;}
      this.step++;
      if(this.fillQ && this.step%16===0){this.inFill=true;this.fillStep=0;this.fillQ=false;return;}
      if(this.nextQ){this.advancePart();this.step=0;this.nextQ=false;}
      else if(part&&this.step>=part.bars*16)this.step=0;}
    advancePart(){this.partIndex=(this.partIndex+1)%this.song.parts.length;}
  }

  const engine=new Engine();
  let hits=SEEDS.slice(), selected=SEEDS[0], song=makeSong(selected), searchTimer=0;
  const $ = (id)=>document.getElementById(id);
  function renderList(){
    $("list").innerHTML = hits.length? hits.map(h=>`<button class="row ${h.id===selected.id?"active":""}" data-id="${h.id}"><span><span class="t">${h.title}</span><span class="a">${h.artist}</span></span><span class="bpm">${h.bpm?h.bpm+" BPM":""}</span></button>`).join("") : `<div class="empty">No songs match. Try a title or artist.</div>`;
    $("list").querySelectorAll(".row").forEach(btn=>btn.addEventListener("pointerdown",()=>pick(btn.dataset.id)));
  }
  function pick(id){if(id===selected.id)return; engine.stop(); const h=hits.find(x=>x.id===id)||SEEDS.find(x=>x.id===id); if(!h)return; selected=h; song=makeSong(h); engine.load(song); paint(); renderList();}
  function paint(st){st=st||engine.state(); $("song").textContent=song.title; $("artist").textContent=song.artist; $("groove").textContent=LABELS[song.feel]||song.feel; $("part").textContent=st.partName; $("tempo").textContent=st.bpm+" BPM"; $("status").textContent=!st.playing?"Stopped":!st.ready?"Tap for sound":st.inFill?"Fill":"Playing"; $("start").textContent=st.playing&&st.ready?"\u25A0 STOP":st.playing?"TAP FOR SOUND":"\u25B6 START"; $("bpm").value=st.bpm; $("bpmv").textContent=st.bpm; $("bpm").style.setProperty("--pct",((st.bpm-40)/200*100)+"%"); const beat=st.playing?Math.floor(st.step/4)%4:-1; $("dots").innerHTML=[0,1,2,3].map(i=>`<span class="dot ${i===beat?"on":""}"></span>`).join("");}
  engine.sub(paint); engine.load(song); renderList(); paint();
  function press(el,fn){let last=0; const run=()=>{const n=Date.now(); if(n-last<350)return; last=n; engine.unlock(); fn();}; el.addEventListener("pointerdown",run); el.addEventListener("click",run);}
  press($("start"),()=>engine.toggle()); press($("fill"),()=>engine.queueFill()); press($("next"),()=>engine.queueNext()); press($("restart"),()=>engine.restart()); press($("accent"),()=>engine.queueAccent());
  $("bpm").addEventListener("pointerdown",()=>engine.unlock()); $("bpm").addEventListener("input",e=>{engine.setBpm(+e.target.value);});
  $("vol").addEventListener("pointerdown",()=>engine.unlock()); $("vol").addEventListener("input",e=>{engine.setVol(+e.target.value/100); $("volv").textContent=e.target.value; $("vol").style.setProperty("--pct",e.target.value+"%");});
  $("vol").style.setProperty("--pct","100%");
  $("q").addEventListener("input",()=>{clearTimeout(searchTimer); const q=$("q").value.trim(); if(q.length<2){hits=SEEDS.slice(); renderList(); return;} searchTimer=setTimeout(()=>search(q),280);});
  async function search(q){
    const local=SEEDS.filter(s=> (s.title+" "+s.artist).toLowerCase().includes(q.toLowerCase()));
    hits=local.slice(); renderList();
    try{
      const r=await fetch("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=song&limit=20");
      const data=await r.json(); const seen=new Set(local.map(s=>(s.title+"|"+s.artist).toLowerCase()));
      for(const t of data.results||[]){
        const title=(t.trackName||"").replace(/\s*\([^)]*(remaster|live|edit|version|remix)[^)]*\)/ig,"").trim()||t.trackName;
        const artist=t.artistName||""; if(!title||!artist)continue; const key=(title+"|"+artist).toLowerCase(); if(seen.has(key))continue; seen.add(key);
        const feel=feelFromGenre(t.primaryGenreName,0);
        hits.push({id:"it-"+t.trackId,title,artist,bpm:0,feel});
        if(hits.length>=16)break;
      }
      renderList();
    }catch(e){}
  }
  window.addEventListener("keydown",e=>{if(["INPUT","TEXTAREA"].includes(e.target.tagName))return; if(e.code==="Space"){e.preventDefault();engine.unlock();engine.toggle();} const k=e.key.toLowerCase(); if(k==="f")engine.queueFill(); if(k==="n")engine.queueNext(); if(k==="r")engine.restart(); if(k==="a")engine.queueAccent();});
