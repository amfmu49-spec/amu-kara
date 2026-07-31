/**
 * 超軽量・絶対失敗しない Song ID 直接連携ブックマークレット
 */
export const SUNO_BOOKMARKLET_SCRIPT = `javascript:(function(){try{var p=location.pathname;if(p.indexOf('/song/')!==0){alert('Sunoの楽曲ページ(suno.com/song/...)で実行してください');return;}var parts=p.split('/');var id=parts[parts.length-1];if(!id){alert('Song IDが見つかりません');return;}location.href='https://amfmu49-spec.github.io/amu-kara/#song='+id;}catch(e){alert('エラー:'+e.message);}})();`;
