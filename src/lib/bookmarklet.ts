/**
 * iOS Safari 無反応完全防止版 ブックマークレット (;void(0); ＆ 画面内ID自動検出)
 */
export const SUNO_BOOKMARKLET_SCRIPT = `javascript:(function(){try{var id='';var m=location.href.match(/\\/song\\/([a-f0-9\\-]{36})/i)||location.href.match(/\\/song\\/([^\\/\\?#]+)/i);if(m&&m[1]){id=m[1];}if(!id){var a=document.querySelector('a[href*="/song/"]');if(a){var m2=(a.getAttribute('href')||'').match(/\\/song\\/([^\\/\\?#]+)/i);if(m2&&m2[1])id=m2[1];}}if(!id){var au=document.querySelector('audio[src*="cdn1.suno.ai"]');if(au){var m3=(au.getAttribute('src')||'').match(/cdn1\\.suno\\.ai\\/([a-f0-9\\-]{36})/i);if(m3&&m3[1])id=m3[1];}}if(!id){alert('Sunoの曲ページを開くか、曲を選択して実行してください');return;}top.location.href='https://amfmu49-spec.github.io/amu-kara/#song='+id;}catch(e){alert('実行エラー:'+e.message);}})();void(0);`;
