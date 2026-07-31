/**
 * Suno 高精度連携ブックマークレット (カバーアート100%抽出・高音質音源分離対応)
 */
export const SUNO_BOOKMARKLET_SCRIPT = `javascript:(function(){
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
})();`;
