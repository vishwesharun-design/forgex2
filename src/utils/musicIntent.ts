/**
 * Natural-language Music / Song Generation Intent Detector
 * Routes user prompts requesting music, songs, beats, or soundtracks
 * directly to the ForgeX Song Synthesizer instead of text chat or image generation.
 */

export interface MusicIntentResult {
  isMusic: boolean;
  prompt: string;
}

const SPOTIFY_OR_EXISTING_RE =
  /\b(?:spotify|search\s+(?:for\s+)?(?:a\s+)?(?:song|songs|music|track|tracks)|play\s+(?:the\s+)?(?:song|track|hits?|playlist)|top\s+\d+\s+songs?|billboard|real\s+songs?|existing\s+songs?)\b/i;

const QUESTION_OR_INFO_RE =
  /^(?:who\s+(?:wrote|sang|composed|made|created|performs)|what(?:'s|\s+is|\s+are|\s+was|\s+were)\s+(?:the\s+)?(?:name|lyrics|chords|meaning|bpm|genre|best|top|history)|when\s+(?:was|did)|where\s+(?:can|did)|why\s+(?:does|did|is|are)|how\s+(?:to|do\s+you|does|many|long)|explain\b|tell\s+me\s+(?:about|the\s+history)|list\s+(?:top|best|popular))/i;

const VISUAL_MEDIA_RE =
  /\b(?:album\s+(?:cover|art)|cover\s+(?:art|image|photo)|music\s+video|picture\s+of|photo\s+of|image\s+of|drawing\s+of|wallpaper)\b/i;

const LYRICS_ONLY_RE =
  /\b(?:lyrics?\s+only|only\s+(?:the\s+)?lyrics?|just\s+(?:write|give\s+me)\s+(?:the\s+)?lyrics?)\b/i;

const MUSIC_NOUN =
  '(?:songs?|music|musical\\s+track|track|tracks|beat|beats|melody|melodies|soundtrack|instrumental|symphony|lullaby|rap\\s+song|rap|anthem|tune|jingle|bgm|background\\s+music|audio\\s+track)';

export function detectMusicGenerationIntent(text: string): MusicIntentResult {
  if (!text || typeof text !== 'string') {
    return { isMusic: false, prompt: '' };
  }
  const clean = text.trim();
  if (!clean) return { isMusic: false, prompt: '' };

  if (
    SPOTIFY_OR_EXISTING_RE.test(clean) ||
    QUESTION_OR_INFO_RE.test(clean) ||
    VISUAL_MEDIA_RE.test(clean) ||
    LYRICS_ONLY_RE.test(clean)
  ) {
    return { isMusic: false, prompt: '' };
  }

  // 1. Slash commands: /song ..., /music ..., /beat ..., /make-song ...
  const slashMatch = clean.match(/^\/(?:song|music|beat|compose|make-?song)\b\s*(.*)$/i);
  if (slashMatch) {
    return {
      isMusic: true,
      prompt: (slashMatch[1] || '').trim() || 'Midnight synthwave groove with atmospheric melody',
    };
  }

  // 2. Colon prefixes: song: ..., music: ..., beat: ...
  const colonMatch = clean.match(/^(?:song|music|beat|track|compose)\s*:\s*(.+)$/i);
  if (colonMatch && colonMatch[1]) {
    return {
      isMusic: true,
      prompt: colonMatch[1].trim(),
    };
  }

  // 3. Action verb + music noun (e.g. "generate music", "make a lo-fi song", "create a chill beat about rain")
  const actionMusicRegex = new RegExp(
    `^(?:hey|hi|hello)?\\s*(?:please\\s+)?(?:can|could|would|will)?\\s*(?:you|u)?\\s*(?:please\\s+)?(?:i\\s+(?:want|need|would\\s+like)(?:\\s+you)?\\s+(?:to\\s+)?)?(?:generate|create|make|compose|produce|synthesize|sing|write\\s+and\\s+(?:sing|play|compose|make)|build|drop|cook\\s+up|give\\s+me|play\\s+me\\s+an?\\s+ai|play\\s+me\\s+a\\s+new)\\s+(?:me\\s+)?(?:an?\\s+|some\\s+|the\\s+|new\\s+)?(?:[a-z0-9-]+\\s+){0,4}${MUSIC_NOUN}\\b(.*)$`,
    'i'
  );
  const actionMatch = clean.match(actionMusicRegex);
  if (actionMatch) {
    return {
      isMusic: true,
      prompt: clean.replace(/^(?:please\s+)?(?:can\s+you\s+)?/i, '').trim(),
    };
  }

  // 4. Direct compose/synthesize intent (e.g. "compose an ambient space voyage", "synthesize lo-fi")
  const composeMatch = clean.match(
    /^(?:please\s+)?(?:can\s+you\s+)?(?:compose|synthesize)\s+(?:me\s+)?(?:an?\s+|some\s+)?(.+)$/i
  );
  if (composeMatch && composeMatch[1]) {
    return {
      isMusic: true,
      prompt: composeMatch[1].trim(),
    };
  }

  // 5. Short direct nouns ("lo-fi song about rain", "synthwave music track", "ai song")
  const directMusicRegex = new RegExp(
    `^(?:an?\\s+|new\\s+|ai\\s+)?(?:[a-z0-9-]+\\s+){0,3}${MUSIC_NOUN}(?:\\s+(?:about|for|with|in|of)\\s+.+)?$`,
    'i'
  );
  if (clean.split(/\s+/).length <= 12 && directMusicRegex.test(clean)) {
    return {
      isMusic: true,
      prompt: clean,
    };
  }

  return { isMusic: false, prompt: '' };
}
