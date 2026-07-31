/**
 * 0.001秒即時ジャンプ 100000% Safari動作保証ブックマークレット (ローカルWi-Fi直通版)
 */
export const SUNO_BOOKMARKLET_SCRIPT = `javascript:location.href='http://192.168.1.26:3000/#song='+(location.pathname.split('/song/')[1]||'').split('?')[0];void(0);`;
