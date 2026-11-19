import { DEFAULT_PERSONALIZATION, DEFAULT_SETTINGS, PersonalizationSettings, UserSettings } from '../types';

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem('forgex_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        personalization: {
          ...DEFAULT_PERSONALIZATION,
          ...(parsed?.personalization || {}),
        },
      };
    }
  } catch {
    // Ignore malformed localStorage
  }
  return {
    ...DEFAULT_SETTINGS,
    personalization: { ...DEFAULT_PERSONALIZATION },
  };
}

export function getStoredPersonalization(): PersonalizationSettings {
  return getStoredSettings().personalization || { ...DEFAULT_PERSONALIZATION };
}

export function buildPersonalizationInstruction(override?: Partial<PersonalizationSettings>): string {
  const prefs: PersonalizationSettings = {
    ...getStoredPersonalization(),
    ...(override || {}),
  };

  const lines: string[] = [];

  if (prefs.baseTone && prefs.baseTone !== 'Default') {
    const toneGuides: Record<string, string> = {
      Professional: 'Adopt a polished, clear, authoritative, and professional tone.',
      Friendly: 'Adopt a warm, approachable, conversational, and helpful tone.',
      Candid: 'Be direct, honest, unvarnished, and straightforward with clear assessments.',
      Efficient: 'Be crisp, focused, and action-oriented with zero fluff.',
      Quirky: 'Bring imaginative wit and lighthearted cleverness while staying accurate.',
      Concise: 'Keep explanations tight, compact, and straight to the core answer.',
    };
    if (toneGuides[prefs.baseTone]) {
      lines.push(`- Base Style & Tone (${prefs.baseTone}): ${toneGuides[prefs.baseTone]}`);
    }
  }

  if (prefs.warmth === 'More') {
    lines.push('- Warmth: Be noticeably encouraging, personable, and empathetic.');
  } else if (prefs.warmth === 'Less') {
    lines.push('- Warmth: Stay neutral, matter-of-fact, and objective.');
  }

  if (prefs.enthusiasm === 'More') {
    lines.push('- Enthusiasm: Express lively energy and positive momentum.');
  } else if (prefs.enthusiasm === 'Less') {
    lines.push('- Enthusiasm: Maintain calm, understated, even-keeled phrasing.');
  }

  if (prefs.emojiLevel === 'More') {
    lines.push(
      '- Emoji Usage (More): Naturally include relevant emojis in headings, feature bullets, and key takeaways (e.g. 🔵, 🧱, 🏆, ⚡, ✨, 📌) to make replies visually scannable. Never place emojis inside code blocks or JSON.'
    );
  } else if (prefs.emojiLevel === 'Less') {
    lines.push('- Emoji Usage (Less): Avoid emojis in replies unless explicitly requested by the user.');
  } else {
    lines.push(
      '- Emoji Usage (Default): Include tasteful, context-appropriate emojis in key bullets or highlights where helpful, never inside code blocks.'
    );
  }

  if (prefs.visualAnswers === 'More') {
    lines.push(
      '- Visual Answers (More): Prefer rich visual aids—comparison tables, interactive charts (```chart), structured cards, and clear step diagrams—whenever applicable.'
    );
  } else if (prefs.visualAnswers === 'Less') {
    lines.push('- Visual Answers (Less): Prefer clean linear prose over charts or visual diagrams unless requested.');
  }

  if (prefs.headersAndLists === 'More') {
    lines.push(
      '- Headers & Lists (More): Structure responses with crisp headings, airy bullet lists, and generous blank-line spacing between every paragraph, heading, and list block.'
    );
  } else if (prefs.headersAndLists === 'Less') {
    lines.push(
      '- Headers & Lists (Less): Favor smooth, cohesive paragraphs separated by blank lines, using lists only when strictly necessary.'
    );
  }

  const custom = (prefs.customInstructions || '').trim();
  if (custom) {
    lines.push(`- User Custom Instructions (always follow unless unsafe): ${custom}`);
  }

  if (lines.length === 0) return '';

  return [
    '=== USER PERSONALIZATION & FORMATTING PREFERENCES ===',
    ...lines,
    'Always leave clear blank lines between paragraphs, headings, code blocks, and bullet sections for clean breathing room.',
  ].join('\n');
}
