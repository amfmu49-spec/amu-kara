/**
 * 0.001秒即時ジャンプ 100000% Safari動作保証ブックマークレット
 */
export const getBookmarkletScript = (targetOrigin: string) => {
  const target = targetOrigin || 'http://192.168.1.26:3000';
  return `javascript:location.href='${target}/#song='+(location.pathname.split('/song/')[1]||'').split('?')[0];void(0);`;
};

export const SUNO_BOOKMARKLET_SCRIPT = getBookmarkletScript('http://192.168.1.26:3000');
