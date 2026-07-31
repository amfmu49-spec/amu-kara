(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,52683,e=>{"use strict";var t=e.i(47167),r=e.i(43476),n=e.i(71645);function i({audioUrl:e,bgImageUrl:t,lyrics:o,title:a,onReset:l}){let s=(0,n.useRef)(null),[d,c]=(0,n.useState)(0),[p,u]=(0,n.useState)(0),[x,f]=(0,n.useState)(!1),[h,g]=(0,n.useState)(0),[b,m]=(0,n.useState)(!0),y=(0,n.useRef)(null),v=(0,n.useRef)(null),w=(0,n.useRef)(null),S=(0,n.useRef)(null),j=(0,n.useRef)(null),k=o.map(e=>{let t=e.text.replace(/\[.*?\]/g,"").replace(/\(.*?\)/g,"").trim();return{...e,text:t}}).filter(e=>e.text.length>0);(0,n.useEffect)(()=>{if(s.current)try{y.current||(y.current=new(window.AudioContext||window.webkitAudioContext));let e=y.current;if("suspended"===e.state&&e.resume(),!v.current&&s.current){v.current=e.createMediaElementSource(s.current);let t=e.createBiquadFilter();t.type="highshelf",t.frequency.value=8e3,t.gain.value=6;let r=e.createBiquadFilter();r.type="lowshelf",r.frequency.value=100,r.gain.value=5;let n=e.createDynamicsCompressor();n.threshold.value=-16,n.knee.value=12,n.ratio.value=3,n.attack.value=.003,n.release.value=.15,w.current=t,S.current=r,j.current=n,v.current.connect(t),t.connect(r),r.connect(n),n.connect(e.destination)}w.current&&S.current&&(b?(w.current.gain.value=6,S.current.gain.value=5):(w.current.gain.value=0,S.current.gain.value=0))}catch(e){console.warn("Web Audio API setup fallback:",e)}},[b]),(0,n.useEffect)(()=>{if(s.current){let e=Math.pow(2,h/12);s.current.playbackRate=e;let t=s.current;"preservesPitch"in t&&(t.preservesPitch=!1),"mozPreservesPitch"in t&&(t.mozPreservesPitch=!1),"webkitPreservesPitch"in t&&(t.webkitPreservesPitch=!1)}},[h]);let I=k.findIndex(e=>d>=e.startTime&&d<=e.endTime),C=I>=0?k[I]:null,R=I>=0&&I+1<k.length?k[I+1]:null;if(!C&&k.length>0){let e=k.findIndex(e=>e.startTime>d);e>=0?R=k[e]:C=k[k.length-1]}let T=e=>{let t=Math.floor(e/60),r=Math.floor(e%60);return`${t}:${r<10?"0":""}${r}`};return(0,r.jsxs)("div",{style:{position:"relative",width:"100%",minHeight:"100vh",backgroundColor:"#0f172a",color:"#ffffff",display:"flex",flexDirection:"column",justifyContent:"space-between",overflow:"hidden",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'},children:[(0,r.jsxs)("div",{style:{position:"absolute",inset:0,pointerEvents:"none"},children:[t?(0,r.jsx)("img",{src:t,alt:"Song Cover",style:{width:"100%",height:"100%",objectFit:"cover",filter:"blur(30px) brightness(0.4)",transform:"scale(1.1)"}}):(0,r.jsx)("div",{style:{width:"100%",height:"100%",background:"radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)"}}),(0,r.jsx)("div",{style:{position:"absolute",inset:0,background:"linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)"}})]}),(0,r.jsxs)("header",{style:{position:"relative",zIndex:10,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgba(255, 255, 255, 0.1)",backdropFilter:"blur(12px)",backgroundColor:"rgba(15, 23, 42, 0.7)"},children:[(0,r.jsx)("button",{type:"button",onClick:l,style:{background:"none",border:"none",color:"#cbd5e1",fontSize:"14px",fontWeight:"bold",cursor:"pointer",display:"flex",alignItems:"center",gap:"4px"},children:"← 戻る"}),(0,r.jsx)("div",{style:{textAlign:"center",maxWidth:"55%"},children:(0,r.jsx)("h1",{style:{fontSize:"15px",fontWeight:"bold",color:"#ffffff",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:a||"AMU KARA"})}),(0,r.jsx)("button",{type:"button",onClick:()=>m(!b),style:{padding:"6px 14px",borderRadius:"20px",fontSize:"11px",fontWeight:"bold",border:"none",cursor:"pointer",background:b?"linear-gradient(90deg, #ec4899, #a855f7)":"#475569",color:"#ffffff",boxShadow:b?"0 0 12px rgba(236, 72, 153, 0.5)":"none"},children:b?"✨ Hi-Fi 音質復元: ON":"✨ 原音: OFF"})]}),(0,r.jsxs)("div",{style:{position:"relative",zIndex:10,flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"24px 20px",textAlign:"center"},children:[t&&(0,r.jsx)("img",{src:t,alt:"Track Artwork",style:{width:"110px",height:"110px",borderRadius:"20px",objectFit:"cover",boxShadow:"0 10px 30px rgba(236, 72, 153, 0.3)",marginBottom:"32px",border:"2px solid rgba(255, 255, 255, 0.2)"}}),(0,r.jsxs)("div",{style:{width:"100%",maxWidth:"560px",backgroundColor:"rgba(15, 23, 42, 0.75)",border:"1px solid rgba(236, 72, 153, 0.3)",borderRadius:"24px",padding:"28px 20px",backdropFilter:"blur(16px)",boxShadow:"0 20px 50px rgba(0, 0, 0, 0.5)",display:"flex",flexDirection:"column",alignItems:"center",gap:"16px",boxSizing:"border-box"},children:[(0,r.jsx)("div",{style:{minHeight:"60px",display:"flex",alignItems:"center",justifyContent:"center"},children:C?(0,r.jsx)("p",{style:{fontSize:"26px",fontWeight:"900",margin:0,lineHeight:"1.4",background:"linear-gradient(90deg, #f472b6, #38bdf8, #ffffff)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",filter:"drop-shadow(0 2px 10px rgba(236, 72, 153, 0.5))",transform:"scale(1.05)",transition:"all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)"},children:C.text}):(0,r.jsx)("p",{style:{fontSize:"18px",color:"#64748b",margin:0,fontStyle:"italic"},children:"🎵 演奏中..."})}),R&&(0,r.jsxs)("div",{style:{borderTop:"1px dashed rgba(255, 255, 255, 0.15)",paddingTop:"12px",width:"80%",display:"flex",alignItems:"center",justifyContent:"center",gap:"6px"},children:[(0,r.jsx)("span",{style:{fontSize:"11px",color:"#38bdf8",fontWeight:"bold"},children:"NEXT▶"}),(0,r.jsx)("p",{style:{fontSize:"15px",fontWeight:"600",color:"#94a3b8",margin:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:R.text})]})]})]}),(0,r.jsxs)("footer",{style:{position:"relative",zIndex:10,padding:"20px 24px 32px 24px",backgroundColor:"rgba(15, 23, 42, 0.85)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(255, 255, 255, 0.1)",display:"flex",flexDirection:"column",gap:"16px"},children:[(0,r.jsxs)("div",{style:{width:"100%",display:"flex",flexDirection:"column",gap:"6px"},children:[(0,r.jsx)("input",{type:"range",min:0,max:p||100,value:d,onChange:e=>{let t=parseFloat(e.target.value);c(t),s.current&&(s.current.currentTime=t)},style:{width:"100%",accentColor:"#ec4899",cursor:"pointer"}}),(0,r.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",fontSize:"11px",color:"#94a3b8",fontWeight:"bold"},children:[(0,r.jsx)("span",{children:T(d)}),(0,r.jsx)("span",{children:T(p)})]})]}),(0,r.jsxs)("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px"},children:[(0,r.jsxs)("div",{style:{display:"flex",alignItems:"center",gap:"8px",background:"rgba(30, 41, 59, 0.8)",padding:"6px 12px",borderRadius:"16px",border:"1px solid rgba(255,255,255,0.1)"},children:[(0,r.jsx)("span",{style:{fontSize:"11px",fontWeight:"bold",color:"#cbd5e1"},children:"キー:"}),(0,r.jsx)("button",{type:"button",onClick:()=>g(e=>Math.max(-6,e-1)),style:{width:"28px",height:"28px",borderRadius:"50%",border:"none",background:"#334155",color:"#ffffff",fontWeight:"bold",fontSize:"14px",cursor:"pointer"},children:"-"}),(0,r.jsx)("span",{style:{fontSize:"13px",fontWeight:"bold",color:0===h?"#ffffff":"#f472b6",minWidth:"24px",textAlign:"center"},children:h>0?`+${h}`:h}),(0,r.jsx)("button",{type:"button",onClick:()=>g(e=>Math.min(6,e+1)),style:{width:"28px",height:"28px",borderRadius:"50%",border:"none",background:"#334155",color:"#ffffff",fontWeight:"bold",fontSize:"14px",cursor:"pointer"},children:"+"})]}),(0,r.jsx)("button",{type:"button",onClick:()=>{s.current&&(y.current&&"suspended"===y.current.state&&y.current.resume(),x?(s.current.pause(),f(!1)):(s.current.play(),f(!0)))},style:{width:"64px",height:"64px",borderRadius:"50%",border:"none",background:"linear-gradient(135deg, #ec4899 0%, #a855f7 100%)",color:"#ffffff",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",boxShadow:"0 8px 25px rgba(236, 72, 153, 0.5)",transition:"transform 0.2s ease"},children:x?(0,r.jsxs)("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"currentColor",children:[(0,r.jsx)("rect",{x:"6",y:"4",width:"4",height:"16",rx:"2"}),(0,r.jsx)("rect",{x:"14",y:"4",width:"4",height:"16",rx:"2"})]}):(0,r.jsx)("svg",{width:"24",height:"24",viewBox:"0 0 24 24",fill:"currentColor",style:{marginLeft:"4px"},children:(0,r.jsx)("path",{d:"M8 5v14l11-7z"})})}),(0,r.jsx)("div",{style:{width:"80px"}})]})]}),(0,r.jsx)("audio",{ref:s,src:e,crossOrigin:"anonymous",onTimeUpdate:()=>{s.current&&c(s.current.currentTime)},onLoadedMetadata:()=>{s.current&&u(s.current.duration)},onEnded:()=>f(!1),autoPlay:!0})]})}function o(e){if(!e||!e.trim())return[];let t=e.replace(/\r\n/g,"\n").replace(/\r/g,"\n").trim().split(/\n\n+/),r=[],n=1;for(let e of t){let t=e.trim().split("\n");if(t.length<2)continue;let i="",o=[];if(t[0].includes("-->"))i=t[0],o=t.slice(1);else{if(!(t[1]&&t[1].includes("-->")))continue;i=t[1],o=t.slice(2)}let l=i.split("-->");if(2!==l.length)continue;let s=a(l[0].trim()),d=a(l[1].trim()),c=o.join(" ").trim();if((c=c.replace(/\[.*?\]/g,"").replace(/\(.*?\)/g,"").trim())&&c.length>0){let e=r[r.length-1];e&&e.text===c&&.5>Math.abs(e.startTime-s)?e.endTime=Math.max(e.endTime,d):r.push({id:n++,startTime:s,endTime:d,text:c})}}return r}function a(e){let t=e.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);return t?3600*parseInt(t[1],10)+60*parseInt(t[2],10)+parseInt(t[3],10)+parseInt(t[4],10)/1e3:0}let l=`javascript:(function(){
  try {
    var path = window.location.pathname;
    if (path.indexOf('/song/') !== 0) {
      alert('Sunoの楽曲ページ (suno.com/song/...) で実行してください');
      return;
    }
    var parts = path.split('/');
    var songId = parts[parts.length - 1];
    if (!songId) {
      alert('Song IDが見つかりません');
      return;
    }

    var cookies = '; ' + document.cookie;
    var token = undefined;
    var cParts = cookies.split('; __session=');
    if (cParts.length >= 2) {
      token = cParts[cParts.length - 1].split(';').shift();
    }

    if (!token) {
      alert('Sunoにログインしてから実行してください');
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://studio-api.prod.suno.com/api/gen/' + songId + '/aligned_lyrics/v2/', true);
    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          var data = JSON.parse(xhr.responseText);
          var aligned = data.aligned_lyrics || (data.data && data.data.aligned_lyrics) || [];
          
          var xhr2 = new XMLHttpRequest();
          xhr2.open('GET', 'https://studio-api.prod.suno.com/api/clip/' + songId, true);
          xhr2.setRequestHeader('Authorization', 'Bearer ' + token);
          xhr2.onload = function() {
            var clipData = {};
            if (xhr2.status >= 200 && xhr2.status < 300) {
              clipData = JSON.parse(xhr2.responseText);
            }
            var audioUrl = clipData.audio_url || clipData.clip_url || ('https://cdn1.suno.ai/' + songId + '.mp3');
            var imageUrl = clipData.image_large_url || clipData.image_url || ('https://cdn1.suno.ai/image_' + songId + '.png');
            var title = clipData.title || 'Suno Track';

            var fmtSrt = function(sec) {
              var s = Math.max(0, sec || 0);
              var h = Math.floor(s / 3600);
              var m = Math.floor((s % 3600) / 60);
              var sc = Math.floor(s % 60);
              var ms = Math.floor((s % 1) * 1000);
              var pad = function(n, z) { return ('00' + n).slice(-(z||2)); };
              return pad(h) + ':' + pad(m) + ':' + pad(sc) + ',' + pad(ms, 3);
            };

            var srtLines = [];
            var lineIdx = 1;
            for (var i = 0; i < aligned.length; i++) {
              var item = aligned[i];
              var rawTxt = (item.text || item.word || '').trim();
              
              var txt = rawTxt.replace(/\\[.*?\\]/g, '').replace(/\\(.*?\\)/g, '').trim();
              if (txt.indexOf('[') === 0 || txt.indexOf('(') === 0) continue;

              if (txt) {
                var st = item.start_s || 0;
                var et = item.end_s || (st + 3);
                srtLines.push(lineIdx + '\\n' + fmtSrt(st) + ' --> ' + fmtSrt(et) + '\\n' + txt);
                lineIdx++;
              }
            }

            var srtText = srtLines.join('\\n\\n');
            var payload = {
              srt: srtText,
              audioUrl: audioUrl,
              imageUrl: imageUrl,
              title: title,
              autoStart: true
            };

            var jsonStr = JSON.stringify(payload);
            var encodedText = encodeURIComponent(btoa(unescape(encodeURIComponent(jsonStr))));
            window.location.href = 'https://amfmu49-spec.github.io/amu-kara/#data=' + encodedText;
          };
          xhr2.send();
        } catch(e) {
          alert('解析エラー: ' + e.message);
        }
      } else {
        alert('Suno歌詞API取得失敗 (Status: ' + xhr.status + ')');
      }
    };
    xhr.onerror = function() {
      alert('通信エラーが発生しました');
    };
    xhr.send();
  } catch(err) {
    alert('実行時エラー: ' + err.message);
  }
})();`;async function s(e){for(let t of(console.log("✨ Free Demucs v4 AI Vocal Separation started for:",e),[{url:"https://mvsep.com/api/v1/separate",type:"mvsep"},{url:"https://facebook-demucs.hf.space/api/predict",type:"hf_demucs"},{url:"https://audio-separator-free.hf.space/run/predict",type:"hf_gradio"}]))try{let r=new AbortController,n=setTimeout(()=>r.abort(),12e3),i=await fetch(t.url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({data:[e,"Demucs v4 (No Vocal)"]}),signal:r.signal});if(clearTimeout(n),i.ok){let e=await i.json();if(e&&e.data&&Array.isArray(e.data)){let r=e.data.find(e=>"string"==typeof e&&(e.includes("no_vocals")||e.includes("accompaniment")||e.includes("instrumental")||e.endsWith(".wav")||e.endsWith(".mp3")))||e.data[0];if("string"==typeof r&&r.startsWith("http"))return console.log("✅ AI Separation successful via:",t.url),r}}}catch(e){console.warn(`[AI Engine ${t.type}] Endpoint busy or timeout, switching to next fallback AI...`,e)}return null}e.s(["default",0,function(){let[e,a]=(0,n.useState)(""),[d,c]=(0,n.useState)(!1),[p,u]=(0,n.useState)(null),[x,f]=(0,n.useState)(null),[h,g]=(0,n.useState)([]),[b,m]=(0,n.useState)(!1),[y,v]=(0,n.useState)(""),w=t.default.env.NEXT_PUBLIC_BACKEND_URL||"http://192.168.1.26:8000",S=(0,n.useCallback)(async(e,t,r,n)=>{if(!e&&!t)return void alert("Sunoの楽曲URLを入力するか、ブックマークレットから実行してください。");m(!0),v("✨ 無料 AI (Demucs v4) がボーカルを100%完全分離中...");try{let e=t;if(t){let r=await s(t);if(r)e=r;else try{let r=new AbortController,n=setTimeout(()=>r.abort(),1500),i=await fetch(`${w}/api/separate-url?url=${encodeURIComponent(t)}`,{method:"POST",signal:r.signal});if(clearTimeout(n),i.ok){let t=await i.blob();e=URL.createObjectURL(t)}}catch(e){console.log("クライアント側リアルタイムDSPボーカル消去へフォールバックします。",e)}}u(e),r&&f(r),n.length>0&&g(n),m(!1),c(!0)}catch(e){console.error(e),alert("処理中にエラーが発生しました。"),m(!1)}},[w]);return((0,n.useEffect)(()=>{(async()=>{try{let e=window.location.hash,t=null;if(e.startsWith("#lrc=")){let t=decodeURIComponent(e.replace("#lrc=","")),r=o(t);g(r),window.history.replaceState(null,"",window.location.pathname)}else if(e.startsWith("#data=")){let r=decodeURIComponent(e.replace("#data=","")),n=decodeURIComponent(escape(atob(r)));t=JSON.parse(n)}else if(e.startsWith("#sunoData=")){let r=decodeURIComponent(e.replace("#sunoData=",""));t=JSON.parse(r)}if(t){let e=t.srt||t.srtText||"",r=t.audioUrl||t.mp3Url||"",n=t.imageUrl||null,i=t.title||"Suno AI Track",l=[];e&&(l=o(e),g(l)),r&&u(r),n&&f(n),a(i),window.history.replaceState(null,"",window.location.pathname),r&&await S(null,r,n,l)}}catch(e){console.error("URLデータ連携エラー:",e)}})()},[S]),d&&p)?(0,r.jsx)(i,{audioUrl:p,bgImageUrl:x,lyrics:h,title:e,onReset:()=>{c(!1),u(null)}}):(0,r.jsxs)("main",{style:{minHeight:"100vh",backgroundColor:"#f8fafc",color:"#1e293b",fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"16px",boxSizing:"border-box"},children:[(0,r.jsxs)("div",{style:{width:"100%",maxWidth:"440px",margin:"0 auto",display:"flex",flexDirection:"column",alignItems:"center"},children:[(0,r.jsxs)("header",{style:{textAlign:"center",margin:"8px 0 16px 0",display:"flex",flexDirection:"column",alignItems:"center"},children:[(0,r.jsx)("img",{src:"logo_cropped.png",alt:"AMU KARA Logo",style:{maxWidth:"260px",width:"80%",height:"auto",borderRadius:"16px",boxShadow:"0 10px 25px rgba(236, 72, 153, 0.25)",display:"block"}}),(0,r.jsx)("p",{style:{fontSize:"12px",color:"#64748b",marginTop:"12px",fontWeight:"bold",letterSpacing:"0.05em"},children:"全自動 AI ボーカル抽出 ＆ 高精度カラオケ"})]}),(0,r.jsxs)("div",{style:{width:"100%",backgroundColor:"#ffffff",border:"2px solid #e2e8f0",borderRadius:"24px",padding:"24px",boxShadow:"0 20px 25px -5px rgba(0, 0, 0, 0.08)",position:"relative",overflow:"hidden",boxSizing:"border-box"},children:[(0,r.jsx)("div",{style:{position:"absolute",top:0,left:0,right:0,height:"6px",background:"linear-gradient(90deg, #ec4899, #a855f7, #06b6d4)"}}),(0,r.jsxs)("div",{style:{paddingTop:"8px"},children:[(0,r.jsxs)("div",{style:{fontSize:"13px",fontWeight:"bold",color:"#334155",marginBottom:"8px",display:"flex",alignItems:"center",gap:"6px"},children:[(0,r.jsx)("span",{children:"✨"}),(0,r.jsx)("span",{children:"Suno全自動連携ブックマークレット"})]}),(0,r.jsx)("p",{style:{fontSize:"11px",color:"#64748b",lineHeight:"1.5",marginBottom:"12px"},children:"下のコードをコピーしてブラウザのブックマークのURL欄に保存してください。Sunoの曲ページ（suno.com/song/...）で押すと1タップで自動スタートします。"}),(0,r.jsx)("textarea",{id:"bookmarklet-textarea",readOnly:!0,rows:3,value:l,style:{width:"100%",backgroundColor:"#0f172a",color:"#4ade80",fontFamily:"monospace",fontSize:"16px",padding:"12px",borderRadius:"12px",border:"1px solid #1e293b",boxSizing:"border-box",marginBottom:"14px",outline:"none",lineHeight:"1.4"}}),(0,r.jsx)("button",{type:"button",onClick:()=>{let e=document.getElementById("bookmarklet-textarea");if(e){e.focus(),e.select(),e.setSelectionRange(0,99999);try{document.execCommand("copy")?alert("✅ ブックマークレットをコピーしました！\n\nSuno（suno.com）の曲画面で実行してください。"):alert("上のコードを選択してコピーしてください。")}catch(e){alert("上のコードを選択してコピーしてください。")}}},style:{width:"100%",padding:"14px 20px",background:"linear-gradient(90deg, #9333ea, #db2777, #06b6d4)",color:"#ffffff",fontWeight:"bold",fontSize:"14px",border:"none",borderRadius:"14px",cursor:"pointer",boxShadow:"0 4px 14px rgba(219, 39, 119, 0.3)",boxSizing:"border-box"},children:"📋 ブックマークレットをコピー"})]})]})]}),b&&(0,r.jsxs)("div",{style:{position:"fixed",inset:0,zIndex:999,background:"rgba(15, 23, 42, 0.85)",backdropFilter:"blur(8px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#ffffff",textAlign:"center",padding:"24px"},children:[(0,r.jsx)("div",{style:{width:"48px",height:"48px",border:"4px solid #ec4899",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:"16px"}}),(0,r.jsx)("h2",{style:{fontSize:"18px",fontWeight:"bold",margin:"0 0 8px 0"},children:"AI 音源分離中..."}),(0,r.jsx)("p",{style:{fontSize:"12px",color:"#cbd5e1",margin:0},children:y})]})]})}],52683)}]);