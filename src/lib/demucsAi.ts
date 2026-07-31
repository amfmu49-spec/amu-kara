/**
 * 完全無料・無制限 Demucs v4 AI ボーカル分離 API 連携ライブラリ
 */
export async function separateVocalWithFreeAI(audioUrl: string): Promise<string | null> {
  console.log('✨ Free Demucs v4 AI Vocal Separation started for:', audioUrl);

  // 完全無料のオープン AI 音源分離エンドポイントリスト (フェイルオーバー付き)
  const freeAiEndpoints = [
    {
      url: 'https://mvsep.com/api/v1/separate',
      type: 'mvsep'
    },
    {
      url: 'https://facebook-demucs.hf.space/api/predict',
      type: 'hf_demucs'
    },
    {
      url: 'https://audio-separator-free.hf.space/run/predict',
      type: 'hf_gradio'
    }
  ];

  for (const ep of freeAiEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12秒タイムアウト

      const res = await fetch(ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [audioUrl, "Demucs v4 (No Vocal)"] }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const result = await res.json();
        // 伴奏トラックURLの抽出
        if (result && result.data && Array.isArray(result.data)) {
          const accompanimentUrl = result.data.find((item: unknown) => 
            typeof item === 'string' && (item.includes('no_vocals') || item.includes('accompaniment') || item.includes('instrumental') || item.endsWith('.wav') || item.endsWith('.mp3'))
          ) || result.data[0];

          if (typeof accompanimentUrl === 'string' && accompanimentUrl.startsWith('http')) {
            console.log('✅ AI Separation successful via:', ep.url);
            return accompanimentUrl;
          }
        }
      }
    } catch (e) {
      console.warn(`[AI Engine ${ep.type}] Endpoint busy or timeout, switching to next fallback AI...`, e);
    }
  }

  // もしクラウドAIが混雑中の場合は null を返してクライアント側音響DSPで代替再生
  return null;
}
