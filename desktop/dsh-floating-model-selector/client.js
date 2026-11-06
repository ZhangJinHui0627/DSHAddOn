window.__ModuleLoader__.load({
  id: "dsh-floating-model-selector",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    var React = require("react");
    var ReactDOM = require("react-dom");
    var h = React.createElement;
    var SLOT = "conversation.input.right";
    var ENTRY = "floating-model-selector";
    var STYLE_ID = "dsh-floating-model-selector-style";
    var POS_KEY = "dsh-floating-model-selector:position:v1";
    var EMPTY = Object.freeze({ current: null, groups: [], status: "idle", pending: null, error: null });
    var ENERGY_START = 1 / 3;
    var ENERGY_END = 2 / 3;
    var PARTICLE_COUNT = 22;

    var CSS = [
      ".fms-panel{position:fixed;z-index:2147483000;box-sizing:border-box;padding:12px 14px 13px;transition:width .14s ease;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.24));border-radius:16px;background:var(--dsw-alias-bg-layer-1,rgba(255,255,255,.97));color:var(--dsw-alias-label-primary,#1f2937);box-shadow:0 14px 40px rgba(0,0,0,.24);backdrop-filter:blur(18px);font:inherit;}",
      ".fms-head{display:flex;align-items:center;gap:9px;margin:-2px -2px 9px;padding:2px 2px 8px;border-bottom:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.18));cursor:move;touch-action:none;user-select:none;}",
      ".fms-grip{opacity:.48;font-size:17px;line-height:1;letter-spacing:-3px;margin-right:3px;}",
      ".fms-title{font-size:12px;font-weight:700;flex:1;}",
      ".fms-live{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,.65);}",
      ".fms-row{display:flex;align-items:center;gap:8px;min-height:32px;}",
      ".fms-label{flex:0 0 76px;font-size:12px;font-weight:650;opacity:.78;}",
      ".fms-model-button{min-width:0;overflow:hidden;flex:1;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.22));border-radius:9px;background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.06));color:inherit;font:inherit;text-align:left;cursor:pointer;}",
      ".fms-model-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;}",
      ".fms-chevron{opacity:.55;flex:none;transition:transform .16s ease;}",
      ".fms-chevron-open{transform:rotate(180deg);}",
      ".fms-effort-value{margin-left:auto;font-size:12px;font-weight:700;color:#9333ea;}",
      ".fms-model-list{position:fixed;z-index:2147483001;box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;padding:6px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.25));border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);box-shadow:0 10px 30px rgba(0,0,0,.22);}",
      ".fms-model-search{position:sticky;top:0;z-index:1;box-sizing:border-box;width:100%;padding:8px 9px;margin:0 0 4px;border:1px solid var(--dsw-alias-border-l1,rgba(128,128,128,.22));border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;font:inherit;font-size:12px;outline:none;}",
      ".fms-model-search:focus{border-color:#8b5cf6;box-shadow:0 0 0 2px rgba(139,92,246,.15);}",
      ".fms-model-empty{padding:12px 8px;text-align:center;font-size:12px;opacity:.6;}",
      ".fms-group-label{padding:8px 8px 4px;font-size:10px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;opacity:.55;}",
      ".fms-option{display:block;width:100%;padding:7px 8px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;}",
      ".fms-option:hover{background:var(--dsw-alias-bg-layer-2,rgba(128,128,128,.10));}",
      ".fms-option[data-selected=\"1\"]{background:color-mix(in srgb,#8b5cf6 14%,transparent);color:#7c3aed;font-weight:700;}",
      ".fms-track{position:relative;height:23px;margin:9px 0 2px;border-radius:999px;overflow:hidden;touch-action:none;user-select:none;cursor:pointer;background:var(--dsw-alias-bg-layer-2,rgba(100,116,139,.24));box-shadow:inset 0 1px 3px rgba(0,0,0,.14);}",
      ".fms-fill{position:absolute;inset:0 auto 0 0;border-radius:inherit;transition:width .08s linear;}",
      ".fms-energy{position:absolute;inset:0 auto 0 0;overflow:hidden;border-radius:inherit;pointer-events:none;transition:width .08s linear,opacity .12s linear;}",
      ".fms-sweep{position:absolute;inset:-40% -60%;background:linear-gradient(110deg,transparent 38%,rgba(216,180,254,.35) 48%,rgba(255,255,255,.58) 50%,rgba(168,85,247,.3) 53%,transparent 62%);animation:fms-sweep 2.8s linear infinite;}",
      ".fms-stars{position:absolute;inset:0 auto 0 0;overflow:hidden;border-radius:inherit;pointer-events:none;transition:width .08s linear;}",
      ".fms-star{position:absolute;left:100%;width:100%;height:100%;animation:fms-drift var(--dur) linear infinite;animation-delay:var(--delay);}",
      ".fms-star-dot{position:absolute;left:0;top:var(--top);width:calc(1.2px + 1.8px * var(--bright));height:calc(1.2px + 1.8px * var(--bright));border-radius:50%;background:#fff;opacity:var(--bright);box-shadow:0 0 5px rgba(255,255,255,.9);}",
      ".fms-tick{position:absolute;top:50%;width:3px;height:3px;margin:-1.5px 0 0 -1.5px;border-radius:50%;background:rgba(255,255,255,.72);pointer-events:none;}",
      ".fms-knob{position:absolute;top:50%;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:#fff;border:1px solid rgba(255,255,255,.8);box-shadow:0 1px 5px rgba(0,0,0,.3);pointer-events:none;transition:left .08s linear;}",
      ".fms-error{min-height:16px;margin-top:5px;color:#dc2626;font-size:11px;}",
      ".fms-caption{margin-top:5px;font-size:10px;opacity:.55;}",
      "@keyframes fms-drift{0%{transform:translateX(0);opacity:0}7%{opacity:1}93%{opacity:1}100%{transform:translateX(-100%);opacity:0}}",
      "@keyframes fms-sweep{0%{transform:translateX(-60%)}100%{transform:translateX(60%)}}",
      "@media(prefers-color-scheme:dark){.fms-panel{background:var(--dsw-alias-bg-layer-1,rgba(30,30,34,.96));color:var(--dsw-alias-label-primary,#eee)}}"
    ].join("\n");

    function installStyles() {
      if (typeof document === "undefined") return;
      var el = document.getElementById(STYLE_ID);
      if (el) {
        el.textContent = CSS;
        return;
      }
      var style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }
    function mix(a,b,t) { return [0,1,2].map(function(i){return Math.round(a[i]+(b[i]-a[i])*t);}); }
    function rgb(c) { return "rgb("+c[0]+","+c[1]+","+c[2]+")"; }
    function fillColor(p) {
      var blue=[77,147,248], violet=[147,51,234], deep=[76,29,149], x=clamp01(p);
      if(x<=ENERGY_START)return rgb(blue);
      if(x<=.72)return rgb(mix(blue,violet,(x-ENERGY_START)/(.72-ENERGY_START)));
      return rgb(mix(violet,deep,(x-.72)/.28));
    }
    function energy(p) { return clamp01((clamp01(p)-ENERGY_START)/(1-ENERGY_START)); }

    function emptyState() { return { current:null, groups:[], status:"idle", pending:null, error:null }; }
    function createAccess(ctx,sessionId) {
      var directory=null,unsub=null,last=emptyState(),closed=false,retry=0,timer=null;
      var listeners=new Set();
      function notify(){listeners.forEach(function(fn){try{fn()}catch(e){}})}
      function resolve(){
        if(closed||!sessionId)return null;
        var fresh=null;
        try{fresh=ctx.modelDirectories.directoryFor(sessionId)}catch(e){}
        if(!fresh||!fresh.store||typeof fresh.store.getSnapshot!=="function")fresh=null;
        if(fresh===directory)return directory;
        if(unsub){try{unsub()}catch(e){}unsub=null}
        directory=fresh;
        if(directory){retry=0;try{unsub=directory.store.subscribe(notify)}catch(e){};try{Promise.resolve(directory.load&&directory.load()).catch(function(){})}catch(e){}}
        return directory;
      }
      function schedule(){if(closed||timer||retry>=6)return;var delay=[120,240,500,1000,1800,3000][retry++];timer=setTimeout(function(){timer=null;if(resolve())notify();else schedule()},delay)}
      return {
        subscribe:function(fn){listeners.add(fn);if(!resolve())schedule();return function(){listeners.delete(fn)}},
        getSnapshot:function(){var d=resolve();if(!d){schedule();return last}try{var s=d.store.getSnapshot();if(s&&typeof s==="object")last=s}catch(e){}return last},
        select:function(selection){var d=resolve();if(!d||typeof d.select!=="function")return Promise.resolve({ok:false,error:"模型目录不可用"});try{return Promise.resolve(d.select(selection))}catch(e){return Promise.reject(e)}},
        dispose:function(){closed=true;if(timer)clearTimeout(timer);if(unsub)try{unsub()}catch(e){}listeners.clear()}
      };
    }

    function modelOf(snapshot){
      var cur=snapshot&&snapshot.current;if(!cur)return null;
      var groups=snapshot&&Array.isArray(snapshot.groups)?snapshot.groups:[];
      for(var i=0;i<groups.length;i++){var g=groups[i];if(g.id!==cur.provider)continue;for(var j=0;j<(g.models||[]).length;j++){var m=g.models[j];if(m.id===cur.model)return {group:g,model:m}}}
      return null;
    }

    function SeatHider(props){
      var anchorRef=React.useRef(null), selected=props.selected;
      var modelName=String(selected&&((selected.model.name)||(selected.model.id))||"");
      var effortNames=(selected&&selected.model.reasoning&&selected.model.reasoning.efforts||[]).map(function(x){return String(x.name||x.id||"")});
      React.useEffect(function(){
        var saved=new Map(),observer=null;
        function restore(){saved.forEach(function(display,el){if(el&&el.style)el.style.display=display});saved.clear()}
        function scan(){
          var anchor=anchorRef.current;if(!anchor)return;
          var composer=anchor;
          while(composer&&composer.nodeType===1&&composer.getAttribute("data-composer-card")===null)composer=composer.parentElement;
          if(!composer)return;
          var seats=composer.querySelectorAll('button[aria-haspopup="menu"]'),target=null;
          for(var i=0;i<seats.length;i++){
            var text=String(seats[i].textContent||"").replace(/\s+/g," ").trim();
            if((modelName&&text.indexOf(modelName)>=0)||effortNames.some(function(n){return n&&text.indexOf(n)>=0})){target=seats[i];break}
          }
          for(var pair of saved){if(pair[0]!==target){if(pair[0]&&pair[0].style)pair[0].style.display=pair[1];saved.delete(pair[0])}}
          if(target&&!saved.has(target)){saved.set(target,target.style.display||"");target.style.display="none"}
        }
        scan();
        var MO=window.MutationObserver;if(MO&&document.body){observer=new MO(scan);observer.observe(document.body,{childList:true,subtree:true})}
        return function(){if(observer)observer.disconnect();restore()};
      },[modelName,effortNames.join("|")]);
      return h("span",{ref:anchorRef,hidden:true,"aria-hidden":"true"});
    }

    function FloatingPanel(props){
      var ctx=props.__ctx,sessionId=props.sessionId;
      var access=React.useMemo(function(){return sessionId&&ctx?createAccess(ctx,sessionId):null},[ctx,sessionId]);
      React.useEffect(function(){return function(){if(access)access.dispose()}},[access]);
      var subscribe=React.useCallback(function(fn){return access?access.subscribe(fn):function(){}},[access]);
      var getSnapshot=React.useCallback(function(){return access?access.getSnapshot():emptyState()},[access]);
      var state=React.useSyncExternalStore(subscribe,getSnapshot,getSnapshot);
      var selected=modelOf(state),model=selected&&selected.model,group=selected&&selected.group;
      var levels=model&&model.reasoning&&Array.isArray(model.reasoning.efforts)?model.reasoning.efforts.filter(function(x){return x&&typeof x.id==="string"}):[];
      var effective=state.current&&state.current.reasoningEffort||model&&model.reasoning&&model.reasoning.defaultEffort||levels[0]&&levels[0].id||null;
      var currentIndex=Math.max(0,levels.findIndex(function(x){return x.id===effective}));
      var pairDraft=React.useState(null),draft=pairDraft[0],setDraft=pairDraft[1];
      var pairList=React.useState(false),modelList=pairList[0],setModelList=pairList[1];var pairQuery=React.useState(""),modelQuery=pairQuery[0],setModelQuery=pairQuery[1];var pairMenuPos=React.useState(null),menuPos=pairMenuPos[0],setMenuPos=pairMenuPos[1];
      var pairBusy=React.useState(false),busy=pairBusy[0],setBusy=pairBusy[1];
      var pairError=React.useState(""),error=pairError[0],setError=pairError[1];
      var pairPos=React.useState(function(){try{var p=JSON.parse(localStorage.getItem(POS_KEY)||"null");if(Number.isFinite(p&&p.left)&&Number.isFinite(p&&p.top))return p}catch(e){}return {left:Math.max(12,(window.innerWidth||1200)-410),top:Math.max(12,(window.innerHeight||800)-300)}});
      var pos=pairPos[0],setPos=pairPos[1];
      var panelRef=React.useRef(null),trackRef=React.useRef(null),dragRef=React.useRef(null),modelButtonRef=React.useRef(null),modelListRef=React.useRef(null),modelSearchRef=React.useRef(null);
      var shownIndex=draft===null?currentIndex:draft,pct=levels.length<=1?1:shownIndex/(levels.length-1),energyValue=energy(pct);
      var knobLeft="calc(10px + "+pct+" * (100% - 20px))";
      var groups=Array.isArray(state.groups)?state.groups:[];
      function beginDrag(e){if(e.button!==0||e.target.closest("button,select,input"))return;var r=panelRef.current&&panelRef.current.getBoundingClientRect();if(!r)return;e.preventDefault();dragRef.current={x:e.clientX,y:e.clientY,left:r.left,top:r.top,pos:{left:r.left,top:r.top}};if(e.currentTarget.setPointerCapture)e.currentTarget.setPointerCapture(e.pointerId)}
      function moveDrag(e){var d=dragRef.current;if(!d)return;var w=panelRef.current&&panelRef.current.offsetWidth||390,hh=panelRef.current&&panelRef.current.offsetHeight||300;var next={left:Math.max(0,Math.min(window.innerWidth-w,d.left+e.clientX-d.x)),top:Math.max(0,Math.min(window.innerHeight-hh,d.top+e.clientY-d.y))};d.pos=next;setPos(next)}
      function endDrag(){var d=dragRef.current;if(!d)return;dragRef.current=null;try{localStorage.setItem(POS_KEY,JSON.stringify(d.pos))}catch(e){}}
      React.useEffect(function(){function clamp(){setPos(function(p){var w=panelRef.current&&panelRef.current.offsetWidth||390,hh=panelRef.current&&panelRef.current.offsetHeight||300;return {left:Math.max(0,Math.min(window.innerWidth-w,p.left)),top:Math.max(0,Math.min(window.innerHeight-hh,p.top))}})}window.addEventListener("resize",clamp);return function(){window.removeEventListener("resize",clamp)}},[]);
      async function chooseModel(g,m){if(!access||!g||!m)return;setBusy(true);setError("");var selection={provider:g.id,model:m.id};var def=m.reasoning&&m.reasoning.defaultEffort;if(typeof def==="string")selection.reasoningEffort=def;try{var res=await access.select(selection);if(res&&res.ok===false)throw new Error(res.error&&res.error.message||"模型切换失败");setModelList(false);setModelQuery("");setDraft(null)}catch(e){setError(String(e&&e.message||e))}finally{setBusy(false)}}
      async function chooseEffort(index){if(!access||!state.current||!levels[index])return;setBusy(true);setError("");try{var res=await access.select({provider:state.current.provider,model:state.current.model,reasoningEffort:levels[index].id});if(res&&res.ok===false)throw new Error(res.error&&res.error.message||"推理档位切换失败")}catch(e){setError(String(e&&e.message||e))}finally{setBusy(false);setDraft(null)}}
      function indexAt(e){var r=trackRef.current&&trackRef.current.getBoundingClientRect();if(!r||levels.length<1)return 0;var p=clamp01((e.clientX-r.left)/r.width);return levels.length===1?0:Math.round(p*(levels.length-1))}
      function down(e){if(!levels.length)return;e.preventDefault();if(e.currentTarget.setPointerCapture)e.currentTarget.setPointerCapture(e.pointerId);setDraft(indexAt(e))}
      function move(e){if((e.buttons&1)!==0&&draft!==null)setDraft(indexAt(e))}
      function up(e){if(draft===null)return;var i=indexAt(e);setDraft(i);chooseEffort(i)}
      function key(e){if(e.key!=="ArrowLeft"&&e.key!=="ArrowRight")return;e.preventDefault();var i=Math.max(0,Math.min(levels.length-1,currentIndex+(e.key==="ArrowRight"?1:-1)));chooseEffort(i)}
      var stars=[];var starCount=Math.round(energyValue*PARTICLE_COUNT);for(var s=0;s<starCount;s++){var bright=.5+.5*((((s+1)*61*2654435761%4294967296)>>>8)%1000)/1000;var duration=1.6+(s%7)*.14;stars.push(h("span",{key:"star-"+s,className:"fms-star",style:{"--top":(13+((s*37)%74))+"%","--bright":bright.toFixed(2),"--dur":duration+"s","--delay":(-((s*17)%100)/100*duration)+"s"}},h("span",{className:"fms-star-dot"})))}
      var modelLabel=model?(group.name||group.id)+" · "+(model.name||model.id):"模型目录加载中…";
      function positionModelList(){var b=modelButtonRef.current;if(!b)return;var r=b.getBoundingClientRect(),vw=window.innerWidth||1200,vh=window.innerHeight||800,margin=12,gap=6,width=Math.min(Math.max(r.width,260),vw-margin*2),below=vh-r.bottom-margin,above=r.top-margin,openAbove=below<220&&above>below,maxHeight=Math.max(100,Math.min(330,openAbove?above:below)),top=openAbove?Math.max(margin,r.top-maxHeight-gap):r.bottom+gap;if(top+maxHeight>vh-margin)top=Math.max(margin,vh-margin-maxHeight);var left=Math.max(margin,Math.min(r.left,vw-width-margin));setMenuPos({left:left,top:top,width:width,maxHeight:maxHeight});}
      function toggleModelList(){if(modelList){setModelList(false);setModelQuery("");return;}positionModelList();setModelList(true);}
      var query=modelQuery.trim().toLowerCase();
      var visibleGroups=groups.map(function(g){var groupName=String(g.name||g.id||"");var models=(g.models||[]).filter(function(m){return !query||groupName.toLowerCase().indexOf(query)>=0||String(g.id||"").toLowerCase().indexOf(query)>=0||String(m.name||"").toLowerCase().indexOf(query)>=0||String(m.id||"").toLowerCase().indexOf(query)>=0;});return {group:g,models:models};}).filter(function(x){return x.models.length>0;});
      React.useEffect(function(){if(!modelList)return;positionModelList();var button=modelButtonRef.current;function outside(e){if(button&&button.contains(e.target))return;if(modelListRef.current&&modelListRef.current.contains(e.target))return;setModelList(false);setModelQuery("");}function keydown(e){if(e.key==="Escape"){setModelList(false);setModelQuery("");}}function reposition(){positionModelList()}document.addEventListener("pointerdown",outside,true);document.addEventListener("keydown",keydown);window.addEventListener("resize",reposition);window.addEventListener("scroll",reposition,true);return function(){document.removeEventListener("pointerdown",outside,true);document.removeEventListener("keydown",keydown);window.removeEventListener("resize",reposition);window.removeEventListener("scroll",reposition,true)}},[modelList,modelLabel,pos.left,pos.top]);
      React.useEffect(function(){if(modelList&&modelSearchRef.current)modelSearchRef.current.focus()},[modelList]);
      var labelLen=String(modelLabel||"").length;var idealWidth=196+Math.round(labelLen*7.2);var maxWidth=Math.min(560,(window.innerWidth||1200)-24);var panelWidth=Math.max(300,Math.min(maxWidth,idealWidth));var panel=h("section",{ref:panelRef,className:"fms-panel",style:{left:pos.left+"px",top:pos.top+"px",width:panelWidth+"px",boxSizing:"border-box"},role:"region","aria-label":"悬浮模型选择器"},
        h("header",{className:"fms-head",onPointerDown:beginDrag,onPointerMove:moveDrag,onPointerUp:endDrag,onPointerCancel:endDrag},h("span",{className:"fms-grip"},"⠿"),h("strong",{className:"fms-title"},"模型与推理等级"),h("span",{className:"fms-live"})),
        h("div",{className:"fms-row"},h("span",{className:"fms-label"},"模型"),h("button",{ref:modelButtonRef,type:"button",className:"fms-model-button",onClick:toggleModelList,"aria-expanded":modelList?"true":"false",disabled:busy},h("span",{className:"fms-model-name"},modelLabel),h("svg",{className:"fms-chevron"+(modelList?" fms-chevron-open":""),viewBox:"0 0 16 16",width:"14",height:"14","aria-hidden":"true"},h("path",{d:"M4 6l4 4 4-4",fill:"none",stroke:"currentColor",strokeWidth:"1.7",strokeLinecap:"round",strokeLinejoin:"round"})))),
        h("div",{className:"fms-row fms-effort-row"},h("span",{className:"fms-label"},"推理等级"),h("span",{className:"fms-effort-value",style:{color:energyValue>0?"#a855f7":"var(--dsw-alias-label-primary,#334155)"}},levels[shownIndex]&&levels[shownIndex].name||"无档位")),
        levels.length?h("div",{ref:trackRef,className:"fms-track",role:"slider",tabIndex:busy?-1:0,"aria-label":"推理等级","aria-valuemin":0,"aria-valuemax":levels.length-1,"aria-valuenow":shownIndex,"aria-valuetext":levels[shownIndex]&&levels[shownIndex].name||"",onPointerDown:down,onPointerMove:move,onPointerUp:up,onPointerCancel:up,onKeyDown:key,title:levels[shownIndex]&&levels[shownIndex].name||"推理等级"},h("div",{className:"fms-fill",style:{width:knobLeft,background:"linear-gradient(90deg,#4d93f8,"+fillColor(pct)+")"}}),h("div",{className:"fms-energy",style:{width:knobLeft,opacity:energyValue}},h("div",{className:"fms-sweep"})),h("div",{className:"fms-stars",style:{width:knobLeft,opacity:(.6+.4*energyValue).toFixed(2)}},stars),levels.map(function(x,i){return h("i",{key:"tick-"+x.id,className:"fms-tick",style:{left:(levels.length===1?100:i/(levels.length-1)*100)+"%"}})}),h("div",{className:"fms-knob",style:{left:knobLeft}})):h("div",{className:"fms-empty"},"当前模型未声明推理档位"),
        error?h("div",{className:"fms-error",role:"status"},error):null,
        h("div",{className:"fms-caption"},"拖动标题栏移动面板 · 位置保存在此浏览器")
      );
      var menuElement=modelList&&menuPos?ReactDOM.createPortal(
        h("div",{ref:modelListRef,className:"fms-model-list",style:{left:menuPos.left+"px",top:menuPos.top+"px",width:menuPos.width+"px",maxHeight:menuPos.maxHeight+"px"}},
          h("input",{ref:modelSearchRef,type:"text",className:"fms-model-search",placeholder:"搜索模型或供应商…",value:modelQuery,onChange:function(e){setModelQuery(e.target.value)}}),
          visibleGroups.length?visibleGroups.map(function(item){
            var g=item.group;
            return h("div",{key:g.id},
              h("div",{className:"fms-group-label"},g.name||g.id),
              item.models.map(function(m){
                var chosen=state.current&&state.current.provider===g.id&&state.current.model===m.id;
                return h("button",{key:m.id,type:"button",className:"fms-option","data-selected":chosen?"1":"0",onClick:function(){chooseModel(g,m)}},m.name||m.id);
              })
            );
          }):h("div",{className:"fms-model-empty"},"未匹配到相关模型")
        ),
        document.body
      ):null;
      return h(React.Fragment,null,h(SeatHider,{selected:selected}),ReactDOM.createPortal(panel,document.body),menuElement);
    }

    function apply(ctx) {
      installStyles();
      try {
        ctx.slots.inject(SLOT,function(){
          return ctx.slots.register({name:SLOT,id:ENTRY,order:40,label:function(){return "悬浮模型选择器"},inject:function(sessionId){return {sessionId:sessionId}}},function(props){return h(FloatingPanel,Object.assign({},props,{__ctx:ctx}))});
        });
      } catch(error) { try{console.error("[dsh-floating-model-selector] slot registration failed",error)}catch(e){} }
    }
    exports.apply=apply;
    exports.inject=["slots","sessions","modelDirectories","remote","remote.session"];
    exports.name="dsh-floating-model-selector-client";
    return module.exports;
  },
});
