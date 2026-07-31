export interface LyricLine {
  id: number;
  startTime: number; // 秒単位
  endTime: number;   // 秒単位
  text: string;
}

/**
 * SRT形式のテキスト文字列をパースし、LyricLineの配列に変換します。
 * 例:
 * 1
 * 00:00:01,500 --> 00:00:04,200
 * 歌いたい歌詞のテキスト
 */
export function parseSRT(srtContent: string): LyricLine[] {
  if (!srtContent || !srtContent.trim()) return [];

  const normalized = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.trim().split(/\n\n+/);
  const lines: LyricLine[] = [];

  let idCounter = 1;

  for (const block of blocks) {
    const blockLines = block.trim().split('\n');
    if (blockLines.length < 2) continue;

    let timeLine = '';
    let textLines: string[] = [];

    // blockLines[0] がインデックス番号、blockLines[1] がタイムスタンプである場合が多い
    if (blockLines[0].includes('-->')) {
      timeLine = blockLines[0];
      textLines = blockLines.slice(1);
    } else if (blockLines[1] && blockLines[1].includes('-->')) {
      timeLine = blockLines[1];
      textLines = blockLines.slice(2);
    } else {
      continue;
    }

    const times = timeLine.split('-->');
    if (times.length !== 2) continue;

    const startTime = parseSrtTime(times[0].trim());
    const endTime = parseSrtTime(times[1].trim());
    let text = textLines.join(' ').trim();
    // メタタグ [Verse 1], [Chorus], (Solo) などを徹底除去
    text = text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();

    if (text && text.length > 0) {
      // 直前の行と完全に同内容でタイムスタンプが近い場合の重なり重複を除去
      const prevLine = lines[lines.length - 1];
      if (prevLine && prevLine.text === text && Math.abs(prevLine.startTime - startTime) < 0.5) {
        prevLine.endTime = Math.max(prevLine.endTime, endTime);
      } else {
        lines.push({
          id: idCounter++,
          startTime,
          endTime,
          text,
        });
      }
    }
  }

  return lines;
}

function parseSrtTime(timeStr: string): number {
  // HH:MM:SS,mmm または HH:MM:SS.mmm
  const regex = /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/;
  const match = timeStr.match(regex);
  if (!match) return 0;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  const millis = parseInt(match[4], 10);

  return hours * 3600 + minutes * 60 + seconds + millis / 1000;
}
