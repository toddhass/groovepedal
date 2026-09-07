const SEEDS = [
    {id:"wagon-wheel",title:"Wagon Wheel",artist:"Old Crow Medicine Show",bpm:146,feel:"country"},
    {id:"leaving-on-a-jet-plane",title:"Leaving on a Jet Plane",artist:"John Denver",bpm:121,feel:"folk"},
    {id:"wild-horses",title:"Wild Horses",artist:"The Rolling Stones",bpm:76,feel:"ballad"},
    {id:"wonderwall",title:"Wonderwall",artist:"Oasis",bpm:87,feel:"rock"},
    {id:"brown-eyed-girl",title:"Brown Eyed Girl",artist:"Van Morrison",bpm:129,feel:"pop"},
    {id:"country-roads",title:"Take Me Home Country Roads",artist:"John Denver",bpm:82,feel:"folk"},
    {id:"sweet-home-alabama",title:"Sweet Home Alabama",artist:"Lynyrd Skynyrd",bpm:98,feel:"southern"},
  ];
  const FILLS = {
    country:{kick:"2000000010000000",snare:"0000100010101111",hat:"1111111100000000",tom:"0000000022001100",crash:"0000000000000001"},
    folk:{kick:"2000000000000000",snare:"0000000010001111",hat:"1000100010000000",tom:"0000000011001100",crash:"0000000000000001"},
    ballad:{kick:"2000000000000000",snare:"0000000010001011",ride:"1000100000000000",crash:"0000000000000001"},
    rock:{kick:"2000001000001000",snare:"0000100010101111",hat:"1010101000000000",tom:"0000002222000000",crash:"0000000000000001"},
    pop:{kick:"2000200020000000",snare:"0000100011111111",hat:"1010101000000000",crash:"0000000000000001"},
    southern:{kick:"2000001000000000",snare:"0000100000101111",hat:"1010101010000000",crash:"0000000000000001"},
  };
  const G = {
    country:{s:.22,i:{kick:"2000000020000000",rim:"0000200000002000",hat:"1111111111111111"},v:{kick:"2000000020000000",snare:"0000200000002000",hat:"1111111111111111",rim:"0030003000300030"},c:{kick:"2000001020001000",snare:"0000200000002000",hat:"1111111111111111",crash:"2000000000000000"},o:{kick:"2000000020000000",snare:"0000200000002000",hat:"1010101010101010"}},
    folk:{s:.08,i:{kick:"2000000000000000",rim:"0000000020000000",hat:"1000100010001000"},v:{kick:"2000000020000000",rim:"0000200000002000",hat:"1000100010001000"},c:{kick:"2000000020000000",snare:"0000200000002000",hat:"1000100010001000",crash:"2000000000000000"},o:{kick:"2000000000000000",rim:"0000000020000000",ride:"1000100010001000"}},
    ballad:{s:0,i:{kick:"2000000000000000",ride:"1000100010001000"},v:{kick:"2000000000000000",snare:"0000000020000000",ride:"1000100010001000"},c:{kick:"2000000020000000",snare:"0000000020000000",ride:"1010101010101010",crash:"2000000000000000"},o:{kick:"2000000000000000",snare:"0000000020000000",ride:"1000000010000000"}},
    rock:{s:0,i:{kick:"2000001000000000",snare:"0000200000002000",hat:"1010101010101010"},v:{kick:"2000001000000000",snare:"0000200000002000",hat:"1111111111111111"},c:{kick:"2000101020001010",snare:"0000200000002000",hat:"1010101010101010",crash:"2000000000000000"},o:{kick:"2000001000100010",snare:"0000200000002000",hat:"1010101010101010"}},
    pop:{s:0,i:{kick:"2000200020002000",snare:"0000200000002000",hat:"1010101010101010"},v:{kick:"2000200020002000",snare:"0000200000002000",hat:"1010101010101010"},c:{kick:"2010201020102010",snare:"0000200000002000",hat:"1010101010101010",clap:"0000200000002000",crash:"2000000000000000"},o:{kick:"2000200020002000",snare:"0000200000002000",ride:"1010101010101010"}},
    southern:{s:.16,i:{kick:"2000001020000000",snare:"0000200300002000",hat:"1010101010101010",crash:"2000000000000000"},v:{kick:"2000001020000000",snare:"0000200300002003",hat:"1010101010101010"},c:{kick:"2000101020001010",snare:"0000200000002000",hat:"1010101010101012",crash:"2000000000000000"},o:{kick:"2000001020000000",snare:"0000200000002000",hat:"1010101010101010"}},
  };
  const LABELS={country:"Country train",folk:"Folk two-step",ballad:"Half-time ballad",rock:"Rock",pop:"Four-on-the-floor",southern:"Southern shuffle"};
  const DEF={country:132,folk:108,ballad:72,rock:116,pop:120,southern:100};
  function feelFromGenre(g,bpm){g=(g||"").toLowerCase();
    if(/country|americana|bluegrass/.test(g))return"country";
    if(/folk|acoustic|singer/.test(g))return"folk";
    if(/southern/.test(g))return"southern";
    if(/ballad|blues|soul|jazz/.test(g))return"ballad";
    if(/metal|punk|grunge|alternative|indie/.test(g))return"rock";
    if(/rock/.test(g))return bpm&&bpm<90?"ballad":"rock";
    if(/pop|dance|disco|hip.?hop|r&b|funk/.test(g))return"pop";
    if(bpm&&bpm<80)return"ballad"; return"rock";
  }
  function partsFor(feel){const f=G[feel]||G.rock,fl=FILLS[feel]||FILLS.rock;
    return[{id:"intro",name:"Intro",bars:2,swing:f.s,groove:f.i,fill:fl},{id:"verse",name:"Verse",bars:2,swing:f.s,groove:f.v,fill:fl},{id:"chorus",name:"Chorus",bars:2,swing:f.s*.85,groove:f.c,fill:fl},{id:"outro",name:"Outro",bars:2,swing:f.s,groove:f.o,fill:fl}];
  }
  function makeSong(m){const feel=m.feel||"rock"; let bpm=+m.bpm||DEF[feel];
    if(feel!=="country"&&feel!=="pop"&&bpm>132)bpm/=2; if(bpm>185)bpm/=2;
    bpm=Math.round(Math.min(240,Math.max(40,bpm)));
    let parts=partsFor(feel);
    if(m.id==="leaving-on-a-jet-plane"){
      const fl=FILLS.folk;
      parts=[{id:"intro",name:"Intro",bars:2,swing:.04,groove:{kick:"2000000000000000",hat:"1000100010001000"},fill:fl},{id:"verse",name:"Verse",bars:2,swing:.05,groove:{kick:"2000000000000000",rim:"0000000020000000",hat:"1000100010001000"},fill:fl},{id:"chorus",name:"Chorus",bars:2,swing:.05,groove:{kick:"2000000020000000",snare:"0000000020000000",hat:"1000100010001000",crash:"2000000000000000"},fill:fl},{id:"outro",name:"Outro",bars:2,swing:.05,groove:{kick:"2000000000000000",ride:"1000100010001000"},fill:fl}];
    }
    if(m.id==="country-roads"){
      const fl=FILLS.folk;
      parts=[{id:"intro",name:"Intro",bars:2,swing:.1,groove:{kick:"2000000020000000",rim:"0000200000002000",hat:"1000100010001000"},fill:fl},{id:"verse",name:"Verse",bars:2,swing:.1,groove:{kick:"2000000020000000",rim:"0000200000002000",hat:"1000100010001000"},fill:fl},{id:"chorus",name:"Chorus",bars:2,swing:.08,groove:{kick:"2000100020001000",snare:"0000200000002000",hat:"1000100010001000",crash:"2000000000000000"},fill:fl},{id:"outro",name:"Outro",bars:2,swing:.1,groove:{kick:"2000000020000000",rim:"0000200000002000",ride:"1000100010001000"},fill:fl}];
    }
    return {id:m.id,title:m.title,artist:m.artist,bpm,feel,parts};
  }

  function vel(d){return d==="2"?1:d==="1"?0.72:d==="3"?0.3:0}
  function hit(track,step){if(!track)return 0; return vel(track[step%track.length]||"0")}
