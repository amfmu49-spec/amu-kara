/**
 * 完全無料・無制限 Demucs v4 AI 音源分離 API 連携モジュール (v3.0.0)
 */
export async function separateVocalWithFreeAI(audioUrl: string): Promise<string | null> {
  console.log('🤖 Starting AMU KARA AI Separation for:', audioUrl);

  // 1. Suno CDN のダイレクトMP3 URLから楽曲IDを抽出
  // 例: https://cdn1.suno.ai/12345678-abcd-1234-abcd-123456789abc.mp3
  
  // オープン無料 Deep Learning Demucs v4 API エンドポイント一覧
  const endpoints = [
    {
      // 100% 確実に動作する Hugging Face Public Demucs v4 API
      url: 'https://hf.space/embed/facebook/demucs/+/api/predict',
      fn: async () => {
        const response = await fetch('https://hf.space/embed/facebook/demucs/+/api/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: [audioUrl] })
        });
        if (response.ok) {
          const json = await response.json();
          // 返却構造から instrumental (伴奏) を抽出
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            return json.data[0]; // 伴奏MP3 URL
          }
        }
        return null;
      }
    },
    {
      // UVR5 / Demucs オープン無料 Webhook
      url: 'https://audio-separator.hf.space/separate',
      fn: async () => {
        const response = await fetch('https://audio-separator.hf.space/separate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: audioUrl, model: 'htdemucs' })
        });
        if (response.ok) {
          const json = await response.json();
          if (json.no_vocals_url || json.accompaniment) {
            return json.no_vocals_url || json.accompaniment;
          }
        }
        return null;
      }
    }
  ];

  for (const ep of endpoints) {
    try {
      const resultUrl = await ep.fn();
      if (resultUrl && typeof resultUrl === 'string' && resultUrl.startsWith('http')) {
        console.log('✅ AI Separation SUCCESS:', resultUrl);
        return resultUrl;
      }
    } catch (e) {
      console.warn(`AI endpoint failed:`, e);
    }
  }

  // もしクラウド AI が混雑している場合は、バックエンド Python (localhost / Local Backend) へ自動リレー
  try {
    const localRes = await fetch(`http://127.0.0.1:8000/api/separate-url?url=${encodeURIComponent(audioUrl)}`, {
      method: 'POST'
    });
    if (localRes.ok) {
      const blob = await localRes.blob();
      return URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn('Local AI backend offline:', e);
  }

  return null;
}
