(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,52683,e=>{"use strict";var t=e.i(47167),a=e.i(43476),r=e.i(71645);function s({audioUrl:e,bgImageUrl:t,lyrics:n,title:l,onReset:i}){let o=(0,r.useRef)(null),[c,d]=(0,r.useState)(0),[p,x]=(0,r.useState)(0),[u,m]=(0,r.useState)(!1),[h,f]=(0,r.useState)(0);(0,r.useEffect)(()=>{if(o.current){let e=Math.pow(2,h/12);o.current.playbackRate=e;let t=o.current;"preservesPitch"in t&&(t.preservesPitch=!1),"mozPreservesPitch"in t&&(t.mozPreservesPitch=!1),"webkitPreservesPitch"in t&&(t.webkitPreservesPitch=!1)}},[h]);let g=n.find(e=>c>=e.startTime&&c<=e.endTime),b=Math.max(0,n.findIndex(e=>e.id===g?.id)-1),v=n.slice(b,b+3),j=e=>{let t=Math.floor(e/60),a=Math.floor(e%60);return`${t}:${a<10?"0":""}${a}`};return(0,a.jsxs)("div",{className:"relative w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-hidden font-sans selection:bg-pink-500 selection:text-white",children:[(0,a.jsxs)("div",{className:"absolute inset-0 pointer-events-none",children:[t?(0,a.jsx)("img",{src:t,alt:"Song Cover",className:"w-full h-full object-cover filter blur-lg opacity-25 scale-110 transition-opacity duration-1000"}):(0,a.jsx)("div",{className:"w-full h-full bg-gradient-to-br from-pink-50/50 via-slate-50 to-cyan-50/50"}),(0,a.jsx)("div",{className:"absolute inset-0 bg-gradient-to-b from-slate-50/90 via-white/80 to-slate-50/95"})]}),(0,a.jsx)("div",{className:"relative z-20 h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 shadow-sm"}),(0,a.jsxs)("header",{className:"relative z-10 p-3 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm",children:[(0,a.jsx)("button",{onClick:i,className:"px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-300 backdrop-blur-md active:scale-95 transition shadow-sm",children:"← 戻る"}),(0,a.jsxs)("div",{className:"flex flex-col items-center",children:[(0,a.jsx)("img",{src:"logo_cropped.png",alt:"AMU KARA Logo",className:"h-10 w-auto rounded-lg shadow-sm"}),l&&(0,a.jsxs)("div",{className:"flex items-center gap-1.5 mt-0.5 max-w-[220px]",children:[t&&(0,a.jsx)("img",{src:t,alt:"Cover",className:"w-4 h-4 rounded-full object-cover border border-pink-400 shrink-0"}),(0,a.jsx)("p",{className:"text-[10px] text-pink-600 font-bold truncate",children:l})]})]}),(0,a.jsx)("div",{className:"w-16"})," "]}),(0,a.jsx)("main",{className:"relative z-10 flex-1 flex flex-col justify-center items-center px-6 text-center py-8",children:0===n.length?(0,a.jsx)("div",{className:"p-6 bg-white/80 border border-slate-200 rounded-3xl backdrop-blur-md shadow-sm",children:(0,a.jsx)("p",{className:"text-slate-500 text-xs font-bold",children:"歌詞データを取り込み中です..."})}):(0,a.jsx)("div",{className:"space-y-6 max-w-xl w-full",children:v.map(e=>{let t=g?.id===e.id,r=0;if(t){let t=e.endTime-e.startTime,a=c-e.startTime;r=t>0?Math.min(Math.max(a/t,0),1):1}else c>e.endTime&&(r=1);return(0,a.jsx)("div",{className:`transition-all duration-300 transform ${t?"scale-105 font-black opacity-100":"scale-95 opacity-30 blur-[0.2px]"}`,children:(0,a.jsxs)("div",{className:"relative inline-block text-xl sm:text-2xl tracking-wider leading-relaxed text-center",children:[(0,a.jsx)("span",{className:"text-slate-400 select-none",children:e.text}),(0,a.jsx)("span",{className:"absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 overflow-hidden select-none pointer-events-none drop-shadow-[0_2px_8px_rgba(236,72,153,0.3)]",style:{clipPath:`inset(0 ${100-100*r}% 0 0)`},children:e.text})]})},e.id)})})}),(0,a.jsxs)("footer",{className:"relative z-10 p-5 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 space-y-4 shadow-xl",children:[(0,a.jsxs)("div",{className:"flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-inner",children:[(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)("span",{className:"text-xs font-bold text-slate-700",children:"🎹 キー変更:"}),(0,a.jsx)("span",{className:`text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm ${0===h?"bg-slate-200 text-slate-700":h>0?"bg-gradient-to-r from-pink-500 to-purple-600 text-white":"bg-gradient-to-r from-purple-600 to-cyan-500 text-white"}`,children:h>0?`+${h}`:h})]}),(0,a.jsxs)("div",{className:"flex items-center gap-2",children:[(0,a.jsx)("button",{onClick:()=>f(e=>Math.max(-6,e-1)),className:"w-8 h-8 rounded-xl bg-white active:bg-slate-100 border border-slate-300 text-xs font-bold text-cyan-600 flex items-center justify-center shadow-sm",children:"♭ -1"}),(0,a.jsx)("button",{onClick:()=>f(0),className:"px-3 h-8 rounded-xl bg-white active:bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-600 shadow-sm",children:"原曲キー"}),(0,a.jsx)("button",{onClick:()=>f(e=>Math.min(6,e+1)),className:"w-8 h-8 rounded-xl bg-white active:bg-slate-100 border border-slate-300 text-xs font-bold text-pink-600 flex items-center justify-center shadow-sm",children:"♯ +1"})]})]}),(0,a.jsxs)("div",{className:"space-y-1",children:[(0,a.jsx)("input",{type:"range",min:0,max:p||100,value:c,onChange:e=>{let t=parseFloat(e.target.value);d(t),o.current&&(o.current.currentTime=t)},className:"w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500 shadow-inner"}),(0,a.jsxs)("div",{className:"flex justify-between text-[10px] text-slate-500 font-mono font-bold",children:[(0,a.jsx)("span",{children:j(c)}),(0,a.jsx)("span",{children:j(p)})]})]}),(0,a.jsx)("div",{className:"flex justify-center pt-1",children:(0,a.jsx)("button",{onClick:()=>{o.current&&(u?(o.current.pause(),m(!1)):(o.current.play(),m(!0)))},className:"group relative w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 p-0.5 shadow-xl shadow-pink-500/25 active:scale-95 transition transform hover:scale-105",children:(0,a.jsx)("div",{className:"w-full h-full rounded-full bg-white flex items-center justify-center group-hover:bg-opacity-90 transition",children:u?(0,a.jsxs)("svg",{className:"w-6 h-6 text-pink-600 fill-current",viewBox:"0 0 24 24",children:[(0,a.jsx)("rect",{x:"6",y:"4",width:"4",height:"16",rx:"1"}),(0,a.jsx)("rect",{x:"14",y:"4",width:"4",height:"16",rx:"1"})]}):(0,a.jsx)("svg",{className:"w-6 h-6 text-pink-600 fill-current ml-1",viewBox:"0 0 24 24",children:(0,a.jsx)("path",{d:"M8 5v14l11-7z"})})})})}),(0,a.jsx)("audio",{ref:o,src:e,onTimeUpdate:()=>{o.current&&d(o.current.currentTime)},onLoadedMetadata:()=>{o.current&&x(o.current.duration)},onEnded:()=>m(!1)})]}),(0,a.jsx)("div",{className:"relative z-20 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 shadow-sm"})]})}function n(e){if(!e||!e.trim())return[];let t=e.replace(/\r\n/g,"\n").replace(/\r/g,"\n").trim().split(/\n\n+/),a=[],r=1;for(let e of t){let t=e.trim().split("\n");if(t.length<2)continue;let s="",n=[];if(t[0].includes("-->"))s=t[0],n=t.slice(1);else{if(!(t[1]&&t[1].includes("-->")))continue;s=t[1],n=t.slice(2)}let i=s.split("-->");if(2!==i.length)continue;let o=l(i[0].trim()),c=l(i[1].trim()),d=n.join(" ").trim();if((d=d.replace(/\[.*?\]/g,"").replace(/\(.*?\)/g,"").trim())&&d.length>0){let e=a[a.length-1];e&&e.text===d&&.5>Math.abs(e.startTime-o)?e.endTime=Math.max(e.endTime,c):a.push({id:r++,startTime:o,endTime:c,text:d})}}return a}function l(e){let t=e.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);return t?3600*parseInt(t[1],10)+60*parseInt(t[2],10)+parseInt(t[3],10)+parseInt(t[4],10)/1e3:0}let i=`javascript:(function(){
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
            
            // DOMスクレイピングとAPIレスポンスの両方からカバーアートURLを100%抽出
            var imgDom = document.querySelector('img[src*="cdn1.suno.ai"], img[src*="cdn2.suno.ai"], img[src*="image"]') || document.querySelector('img');
            var domImgUrl = imgDom ? imgDom.src : '';

            var imageUrl = clipData.image_large_url || clipData.image_url || domImgUrl || ('https://cdn1.suno.ai/image_' + songId + '.png');
            if (imageUrl) {
              imageUrl = imageUrl.replace('_300x300', '_large').replace('_100x100', '_large');
            }

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
              var txt = (item.text || item.word || '').trim();
              if (txt.indexOf('[') === 0 || txt.indexOf('(') === 0) continue;
              txt = txt.replace(/\\[.*?\\]/g, '').replace(/\\(.*?\\)/g, '').trim();

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

            alert('🎤 Sunoから楽曲・高精度歌詞・ジャケ写を抽出しました！\\n\\nAMU KARA へ移動して高音質AIボーカル分離＆カラオケを開始します🚀');

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
})();`;e.s(["default",0,function(){let[e,l]=(0,r.useState)(""),[o,c]=(0,r.useState)(!1),[d,p]=(0,r.useState)(null),[x,u]=(0,r.useState)(null),[m,h]=(0,r.useState)([]),[f,g]=(0,r.useState)(!1),[b,v]=(0,r.useState)(""),j=t.default.env.NEXT_PUBLIC_BACKEND_URL||"http://192.168.1.26:8000",w=(0,r.useCallback)(async(e,t,a,r)=>{if(!e&&!t)return void alert("Sunoの楽曲URLを入力するか、ブックマークレットから実行してください。");g(!0),v("ボーカル抽出 AI 処理を実行中...");try{let e="";if(t)try{let a=await fetch(`${j}/api/separate-url?url=${encodeURIComponent(t)}`,{method:"POST"});if(a.ok){let t=await a.blob();e=URL.createObjectURL(t)}else e=t}catch(a){console.warn("分離エラー。元音源でフォールバック再生します。",a),e=t}p(e),a&&u(a),r.length>0&&h(r),g(!1),c(!0)}catch(e){console.error(e),alert("処理中にエラーが発生しました。"),g(!1)}},[j]);return((0,r.useEffect)(()=>{(async()=>{try{let e=window.location.hash,t=null;if(e.startsWith("#lrc=")){let t=decodeURIComponent(e.replace("#lrc=","")),a=n(t);h(a),window.history.replaceState(null,"",window.location.pathname)}else if(e.startsWith("#data=")){let a=decodeURIComponent(e.replace("#data=","")),r=decodeURIComponent(escape(atob(a)));t=JSON.parse(r)}else if(e.startsWith("#sunoData=")){let a=decodeURIComponent(e.replace("#sunoData=",""));t=JSON.parse(a)}if(t){let e=t.srt||t.srtText||"",a=t.audioUrl||t.mp3Url||"",r=t.imageUrl||null,s=t.title||"Suno AI Track",i=[];e&&(i=n(e),h(i)),a&&p(a),r&&u(r),l(s),window.history.replaceState(null,"",window.location.pathname),a&&await w(null,a,r,i)}}catch(e){console.error("URLデータ連携エラー:",e)}})()},[w]),o&&d)?(0,a.jsx)(s,{audioUrl:d,bgImageUrl:x,lyrics:m,title:e,onReset:()=>{c(!1),p(null)}}):(0,a.jsxs)("main",{className:"app-container",children:[(0,a.jsxs)("header",{style:{textAlign:"center",margin:"16px 0 8px 0",display:"flex",flexDirection:"column",alignItems:"center"},children:[(0,a.jsx)("img",{src:"logo_cropped.png",alt:"AMU KARA Logo",className:"app-logo"}),(0,a.jsx)("p",{style:{fontSize:"12px",color:"#64748b",marginTop:"10px",fontWeight:"bold",letterSpacing:"0.05em"},children:"全自動 AI ボーカル抽出 ＆ 高精度カラオケ"})]}),(0,a.jsxs)("div",{className:"main-card",children:[(0,a.jsx)("div",{className:"ai-top-line"}),(0,a.jsxs)("div",{style:{padding:"8px 0"},children:[(0,a.jsxs)("div",{style:{fontSize:"13px",fontWeight:"bold",color:"#334155",marginBottom:"8px",display:"flex",alignItems:"center",gap:"6px"},children:[(0,a.jsx)("span",{children:"✨"}),(0,a.jsx)("span",{children:"Suno全自動連携ブックマークレット"})]}),(0,a.jsx)("p",{style:{fontSize:"11px",color:"#64748b",lineHeight:"1.5",marginBottom:"12px"},children:"下のコードをコピーしてブラウザのブックマークのURL欄に保存してください。Sunoの曲ページ（suno.com/song/...）で押すと1タップで自動スタートします。"}),(0,a.jsx)("textarea",{id:"bookmarklet-textarea",readOnly:!0,rows:4,value:i,className:"code-box"}),(0,a.jsx)("button",{type:"button",onClick:()=>{let e=document.getElementById("bookmarklet-textarea");if(e){e.focus(),e.select(),e.setSelectionRange(0,99999);try{document.execCommand("copy")?alert("✅ ブックマークレットをコピーしました！\n\nSuno（suno.com）の曲画面で実行してください。"):alert("上のコードを選択してコピーしてください。")}catch(e){alert("上のコードを選択してコピーしてください。")}}},className:"copy-btn",children:"📋 ブックマークレットをコピー"})]})]}),f&&(0,a.jsxs)("div",{style:{position:"fixed",inset:0,zIndex:999,background:"rgba(15, 23, 42, 0.85)",backdropFilter:"blur(8px)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",color:"#ffffff",textAlign:"center",padding:"24px"},children:[(0,a.jsx)("div",{style:{width:"48px",height:"48px",border:"4px solid #ec4899",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite",marginBottom:"16px"}}),(0,a.jsx)("h2",{style:{fontSize:"18px",fontWeight:"bold",margin:"0 0 8px 0"},children:"音声分離 AI 処理中..."}),(0,a.jsx)("p",{style:{fontSize:"12px",color:"#cbd5e1",margin:0},children:b})]})]})}],52683)}]);