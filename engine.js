function vel(d){return d==="2"?1:d==="1"?0.72:d==="3"?0.3:0}
function hit(track,step){if(!track)return 0; return vel(track[step%track.length]||"0")}

function SampleSynth(ctx, dest) {
  this.ctx = ctx;
  this.dest = dest;
  this.buffers = {};
  
  // High quality sample URLs (Studio recorded acoustic drums and instruments)
  this.sampleUrls = {
    kick: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/kick.wav",
    snare: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/snare.wav",
    hat: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/hihat-closed.wav",
    openHat: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/hihat-open.wav",
    crash: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/crash.wav",
    ride: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/ride.wav",
    tom: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/tom-mid.wav",
    floor: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/tom-low.wav",
    rim: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/rimshot.wav",
    clap: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/clap.wav",
    bass: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/bass-e1.wav",
    trumpet: "https://cdn.jsdelivr.net/gh/muralidesign/audio-samples@main/trumpet-c4.wav"
  };

  this.preload();
}

SampleSynth.prototype.preload = function() {
  var self = this;
  Object.keys(this.sampleUrls).forEach(function(key) {
    fetch(self.sampleUrls[key])
      .then(function(res) { return res.arrayBuffer(); })
      .then(function(data) { return self.ctx.decodeAudioData(data); })
      .then(function(decoded) { self.buffers[key] = decoded; })
      .catch(function(err) { console.warn("Failed loading sample: " + key, err); });
  });
};

SampleSynth.prototype.playSample = function(key, when, vol, pitchOffset) {
  var buf = this.buffers[key];
  if (!buf) return;
  
  var source = this.ctx.createBufferSource();
  var gainNode = this.ctx.createGain();
  
  source.buffer = buf;
  
  if (pitchOffset) {
    source.playbackRate.value = Math.pow(2, pitchOffset / 12);
  }
  
  gainNode.gain.setValueAtTime(Math.max(0.01, vol), when);
  
  source.connect(gainNode);
  gainNode.connect(this.dest);
  
  source.start(when);
};

SampleSynth.prototype.trig = function(voice, t, v) {
  var velocity = Math.max(0.05, Math.min(1.4, v));
  if (this.buffers[voice]) {
    this.playSample(voice, t, velocity);
  }
};

SampleSynth.prototype.bass = function(t, v, freq) {
  if (!freq) return;
  var semitones = 12 * (Math.log(freq / 41.20) / Math.LN2);
  this.playSample("bass", t, v * 0.8, semitones);
};

SampleSynth.prototype.trumpet = function(t, v, freq) {
  if (!freq) return;
  var semitones = 12 * (Math.log(freq / 261.63) / Math.LN2);
  this.playSample("trumpet", t, v * 0.6, semitones);
};

function Engine(){
  this.song=null;this.playing=false;this.partIndex=0;this.step=0;this.bpm=120;this.volume=1;
  this.fillQ=false;this.nextQ=false;this.accentQ=false;this.inFill=false;this.listeners=[];
  this.bassOn=false;this.trumpetOn=false;this.feelOverride=null;
}
Engine.prototype.sub=function(fn){this.listeners.push(fn);fn(this.state());};
Engine.prototype.emit=function(){var s=this.state();this.listeners.forEach(function(fn){fn(s);});};
Engine.prototype.state=function(){
  var p=this.song&&this.song.parts[this.partIndex];
  return {
    playing:this.playing,ready:this.ctx&&this.ctx.state==="running",
    partName:(p&&p.name)||"—",partIndex:this.partIndex,step:this.step,bpm:this.bpm,
    inFill:this.inFill,fillQ:this.fillQ,nextQ:this.nextQ,accentQ:this.accentQ,volume:this.volume,
    feel:(this.song&&this.song.feel)||"rock",bassOn:this.bassOn,trumpetOn:this.trumpetOn
  };
};
Engine.prototype.load=function(song){
  var feel=this.feelOverride||song.feel;
  if(feel&&feel!==song.feel&&G[feel]) this.song={id:song.id,title:song.title,artist:song.artist,bpm:song.bpm,feel:feel,parts:partsFor(feel)};
  else this.song=song;
  this.partIndex=0;this.step=0;this.inFill=false;this.bpm=this.song.bpm;this.emit();
};
Engine.prototype.unlock=function(){
  try{
    if(!this.ctx){
      var AC=window.AudioContext||window.webkitAudioContext;
      this.ctx=new AC();
      var drums=this.ctx.createGain();
      var comp=this.ctx.createDynamicsCompressor();
      comp.threshold.value=-16;
      comp.knee.value=10;
      comp.ratio.value=3.5;
      comp.attack.value=0.005;
      comp.release.value=0.1;
      var makeup=this.ctx.createGain();makeup.gain.value=1.4;
      this.master=this.ctx.createGain();
      drums.connect(comp);comp.connect(makeup);makeup.connect(this.master);this.master.connect(this.ctx.destination);
      this.synth=new SampleSynth(this.ctx,drums);
      this.apply();
      var self=this;
      this.ctx.addEventListener("statechange",function(){
        if(self.ctx.state==="running"&&self.playing)self.begin();
        self.emit();
      });
    }
    if(this.ctx.state==="suspended")this.ctx.resume();
    if(!this.htmlAudio){
      this.htmlAudio=new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
      this.htmlAudio.loop=true;this.htmlAudio.setAttribute("playsinline","");this.htmlAudio.volume=.01;
    }
    this.htmlAudio.play().catch(function(){});
    var o=this.ctx.createOscillator();var g=this.ctx.createGain();g.gain.value=.03;o.frequency.value=72;
    o.connect(g);g.connect(this.master);o.start();o.stop(this.ctx.currentTime+.05);
  }catch(e){}
};
Engine.prototype.apply=function(){
  if(this.master&&this.ctx)this.master.gain.setTargetAtTime(this.volume*this.volume,this.ctx.currentTime,.02);
};
Engine.prototype.start=function(){
  if(!this.song)return;
  this.unlock();this.playing=true;this.step=0;this.inFill=false;this.clock=false;this.begin();
  if(this.synth&&this.ctx&&this.ctx.state==="running"){this.synth.trig("kick",this.ctx.currentTime,1);this.synth.trig("hat",this.ctx.currentTime,.9);}
  this.emit();
};
Engine.prototype.stop=function(){this.playing=false;this.clock=false;clearInterval(this.timer);this.emit();};
Engine.prototype.toggle=function(){if(this.playing&&this.ctx&&this.ctx.state==="running")this.stop();else this.start();};
Engine.prototype.queueFill=function(){this.fillQ=true;this.emit();};
Engine.prototype.queueNext=function(){this.nextQ=true;this.emit();};
Engine.prototype.restart=function(){this.partIndex=0;this.step=0;this.inFill=false;this.emit();};
Engine.prototype.queueAccent=function(){this.accentQ=true;this.emit();};
Engine.prototype.setBpm=function(n){this.bpm=n;this.emit();};
Engine.prototype.setVol=function(n){this.volume=n;this.apply();this.emit();};
Engine.prototype.setFeel=function(feel){
  if(!this.song||!G[feel])return;
  this.unlock();
  this.feelOverride=feel;
  if(this.song.feel===feel){this.emit();return;}
  this.song.feel=feel;this.song.parts=partsFor(feel);this.inFill=false;this.emit();
};
Engine.prototype.setBass=function(on){this.unlock();this.bassOn=on;this.emit();};
Engine.prototype.setTrumpet=function(on){this.unlock();this.trumpetOn=on;this.emit();};
Engine.prototype.begin=function(){
  if(!this.playing||!this.ctx||this.clock)return;
  if(this.ctx.state!=="running"){this.ctx.resume();return;}
  this.clock=true;this.nextT=this.ctx.currentTime+.04;clearInterval(this.timer);
  var self=this;
  this.timer=setInterval(function(){self.sched();},25);
  this.sched();
};
Engine.prototype.sched=function(){
  if(!this.playing||!this.ctx||this.ctx.state!=="running"){if(this.playing)this.unlock();return;}
  while(this.nextT<this.ctx.currentTime+.12){this.schedStep(this.nextT);this.advance();}
};
Engine.prototype.schedStep=function(when){
  var part=this.song.parts[this.partIndex]; if(!part||!this.synth)return;
  var pattern=this.inFill?part.fill:part.groove;
  var st=this.inFill?this.fillStep%16:this.step%16;
  if(this.accentQ&&st===0){this.synth.trig("crash",when,1);this.accentQ=false;}
  var voices=["kick","snare","hat","openHat","ride","tom","floor","crash","rim","clap"];
  var stepIdx=this.inFill?this.fillStep:this.step;
  for(var i=0;i<voices.length;i++){var v=voices[i];var velo=hit(pattern[v],stepIdx);if(velo)this.synth.trig(v,when,velo);}
  if(!this.inFill){
    var acc=AC[this.song.feel]||AC.rock;
    var velB=hit(acc.br,st), freqB=acc.bn[st]||0;
    if(this.bassOn&&velB&&freqB)this.synth.bass(when,velB,freqB);
    var velT=hit(acc.tr,st), freqT=acc.tn[st]||0;
    if(this.trumpetOn&&velT&&freqT)this.synth.trumpet(when,velT,freqT);
  }
  this.vis={step:st,partIndex:this.partIndex,inFill:this.inFill};
  this.emit();
};
Engine.prototype.advance=function(){
  var part=this.song.parts[this.partIndex];
  var six=60/(this.bpm||120)/4;
  var odd=(this.inFill?this.fillStep:this.step)%2===1;
  var sw=part&&part.swing||0;
  this.nextT+=odd?six*(1+sw*.55):six*(1-sw*.55);
  if(this.inFill){this.fillStep++; if(this.fillStep>=16){this.inFill=false; this.advancePart(); this.step=0;} return;}
  this.step++;
  if(this.fillQ && this.step%16===0){this.inFill=true;this.fillStep=0;this.fillQ=false;return;}
  if(this.nextQ){this.advancePart();this.step=0;this.nextQ=false;}
  else if(part&&this.step>=part.bars*16)this.step=0;
};
Engine.prototype.advancePart=function(){this.partIndex=(this.partIndex+1)%this.song.parts.length;};

var engine=new Engine();
var hits=SEEDS.slice(), selected=SEEDS[0], song=makeSong(selected), searchTimer=0;
function $(id){return document.getElementById(id);}
function renderList(){
  $("list").innerHTML = hits.length? hits.map(function(h){
    return '\x3cbutton class="row '+(h.id===selected.id?"active":"")+'" data-id="'+h.id+'"\x3e\x3cspan\x3e\x3cspan class="t"\x3e'+h.title+'\x3c/span\x3e\x3cspan class="a"\x3e'+h.artist+'\x3c/span\x3e\x3c/span\x3e\x3cspan class="bpm"\x3e'+(h.bpm?h.bpm+" BPM":"")+'\x3c/span\x3e\x3c/button\x3e';
  }).join("") : '\x3cdiv class="empty"\x3eNo songs match. Try a title or artist.\x3c/div\x3e';
  $("list").querySelectorAll(".row").forEach(function(btn){
    btn.addEventListener("pointerdown",function(){pick(btn.dataset.id);});
  });
}
function pick(id){
  if(id===selected.id)return;
  engine.stop();
  var h=hits.find(function(x){return x.id===id;})||SEEDS.find(function(x){return x.id===id;});
  if(!h)return;
  selected=h; song=makeSong(h); engine.load(song); paint(); renderList();
}
function paint(st){
  st=st||engine.state();
  $("song").textContent=song.title;
  $("artist").textContent=song.artist;
  $("groove").textContent=LABELS[st.feel]||st.feel||song.feel;
  $("part").textContent=st.partName;
  $("tempo").textContent=st.bpm+" BPM";
  $("status").textContent=!st.playing?"Stopped":!st.ready?"Tap for sound":st.inFill?"Fill":"Playing";
  $("start").textContent=st.playing&&st.ready?"■ STOP":st.playing?"TAP FOR SOUND":"▶ START";
  $("bpm").value=st.bpm; $("bpmv").textContent=st.bpm;
  $("bpm").style.setProperty("--pct",((st.bpm-40)/200*100)+"%");
  var beat=st.playing?Math.floor(st.step/4)%4:-1;
  $("dots").innerHTML=[0,1,2,3].map(function(i){return '\x3cspan class="dot '+(i===beat?"on":"")+'"\x3e\x3c/span\x3e';}).join("");
  $("styles").querySelectorAll(".chip").forEach(function(btn){btn.classList.toggle("on",btn.dataset.feel===st.feel);});
  $("bass").classList.toggle("on",!!st.bassOn);
  $("trumpet").classList.toggle("on",!!st.trumpetOn);
}
engine.sub(paint); engine.load(song); renderList(); paint();
function press(el,fn){
  var last=0;
  var run=function(){var n=Date.now(); if(n-last<350)return; last=n; engine.unlock(); fn();};
  el.addEventListener("pointerdown",run);
  el.addEventListener("click",run);
}
press($("start"),function(){engine.toggle();});
press($("fill"),function(){engine.queueFill();});
press($("next"),function(){engine.queueNext();});
press($("restart"),function(){engine.restart();});
press($("accent"),function(){engine.queueAccent();});
$("styles").innerHTML=STYLES.map(function(s){return '\x3cbutton class="chip" type="button" data-feel="'+s.id+'"\x3e'+s.label+'\x3c/button\x3e';}).join("");
$("styles").querySelectorAll(".chip").forEach(function(btn){
  press(btn,function(){engine.setFeel(btn.dataset.feel);});
});
press($("bass"),function(){engine.setBass(!engine.bassOn);});
press($("trumpet"),function(){engine.setTrumpet(!engine.trumpetOn);});
paint();
$("bpm").addEventListener("pointerdown",function(){engine.unlock();});
$("bpm").addEventListener("input",function(e){engine.setBpm(+e.target.value);});
$("vol").addEventListener("pointerdown",function(){engine.unlock();});
$("vol").addEventListener("input",function(e){
  engine.setVol(+e.target.value/100);
  $("volv").textContent=e.target.value;
  $("vol").style.setProperty("--pct",e.target.value+"%");
});
$("vol").style.setProperty("--pct","100%");
$("q").addEventListener("input",function(){
  clearTimeout(searchTimer);
  var q=$("q").value.trim();
  if(q.length<2){hits=SEEDS.slice(); renderList(); return;}
  searchTimer=setTimeout(function(){search(q);},280);
});
function search(q){
  var local=SEEDS.filter(function(s){return (s.title+" "+s.artist).toLowerCase().indexOf(q.toLowerCase())>=0;});
  hits=local.slice(); renderList();
  fetch("https://itunes.apple.com/search?term="+encodeURIComponent(q)+"&entity=song&limit=20")
    .then(function(r){return r.json();})
    .then(function(data){
      var seen={};
      local.forEach(function(s){seen[(s.title+"|"+s.artist).toLowerCase()]=1;});
      (data.results||[]).forEach(function(t){
        if(hits.length>=16)return;
        var title=(t.trackName||"").replace(/\s*\([^)]*(remaster|live|edit|version|remix)[^)]*\)/ig,"").trim()||t.trackName;
        var artist=t.artistName||"";
        if(!title||!artist)return;
        var key=(title+"|"+artist).toLowerCase();
        if(seen[key])return;
        seen[key]=1;
        hits.push({id:"it-"+t.trackId,title:title,artist:artist,bpm:0,feel:feelFromGenre(t.primaryGenreName,0)});
      });
      renderList();
    })
    .catch(function(){});
}
window.addEventListener("keydown",function(e){
  if(["INPUT","TEXTAREA"].indexOf(e.target.tagName)>=0)return;
  if(e.code==="Space"){e.preventDefault();engine.unlock();engine.toggle();}
  var k=e.key.toLowerCase();
  if(k==="f")engine.queueFill();
  if(k==="n")engine.queueNext();
  if(k==="r")engine.restart();
  if(k==="a")engine.queueAccent();
});
