import {
  AIAgent,
  ActionConfirmationRequest,
  AgentStep,
  CanvasBoard,
  CodeLanguage,
  DataAnalysisReport,
  DocumentItem,
  ForgeXModelId,
  GeneratedSong,
  PresentationDeck,
  QuizQuestion,
  SongGenre,
  SongMood,
  SpotifyTrack,
  WritingCategory,
  WritingTone,
} from '../types';
import { codeStudioService } from './codeStudioService';
import { musicService } from './musicService';
import { presentationService } from './presentationService';
import { canvasService } from './canvasService';
import { dataAnalysisService, SAMPLE_DATASETS } from './dataAnalysisService';
import { writingStudioService } from './writingStudioService';
import { documentService } from './documentService';
import { agentService } from './agentService';
import { vaultService } from './vaultService';
import { SPOTIFY_TRACKS } from '../data/spotifyMusicData';

export interface ChatAttachmentInput {
  type: 'file' | 'image';
  name: string;
  url?: string;
  rawText?: string;
}

function inferCodeLanguage(prompt: string, rawText?: string): CodeLanguage {
  const combined = `${prompt}\n${rawText || ''}`.toLowerCase();
  if (/\bpython\b|\.py\b/.test(combined)) return 'python';
  if (/\bhtml\b|landing page|webpage|website|ui component|button|form|card|game|canvas\b/.test(combined)) return 'html';
  if (/\bcss\b|stylesheet|tailwind|flexbox|grid/.test(combined)) return 'css';
  if (/\brust\b|\.rs\b|cargo/.test(combined)) return 'rust';
  if (/\bgo\b|golang|\.go\b/.test(combined)) return 'go';
  if (/\bc\+\+\b|\bcpp\b|\.cpp\b/.test(combined)) return 'cpp';
  if (/\bsql\b|postgres|select\s+.*from/.test(combined)) return 'sql';
  if (/\bjson\b|openapi|schema/.test(combined)) return 'json';
  if (/\bjavascript\b|\.js\b/.test(combined)) return 'javascript';
  return 'typescript';
}

export async function executeInlineCodeTool(
  prompt: string,
  attachments: ChatAttachmentInput[],
  modelId: ForgeXModelId
): Promise<string> {
  const textAttachment = attachments.find((a) => a.type === 'file' && a.rawText);
  const fencedMatch = prompt.match(/```(?:[a-zA-Z0-9_-]*)\n([\s\S]*?)```/);
  const providedCode = fencedMatch?.[1]?.trim() || textAttachment?.rawText?.slice(0, 12000) || '';
  const language = inferCodeLanguage(prompt, providedCode);

  let action: 'generate' | 'alter' | 'correct' = 'generate';
  let alterMode: 'correct' | 'refactor' | 'optimize' | 'types' | 'custom' = 'custom';
  if (providedCode) {
    if (/\b(fix|debug|correct|error|bug|broken)\b/i.test(prompt)) {
      action = 'correct';
      alterMode = 'correct';
    } else if (/\brefactor\b/i.test(prompt)) {
      action = 'alter';
      alterMode = 'refactor';
    } else if (/\boptimize\b|performance|faster/i.test(prompt)) {
      action = 'alter';
      alterMode = 'optimize';
    } else if (/\btype|typescript|interface\b/i.test(prompt)) {
      action = 'alter';
      alterMode = 'types';
    } else {
      action = 'alter';
      alterMode = 'custom';
    }
  }

  const res = await codeStudioService.processCode({
    action,
    code: providedCode || undefined,
    prompt,
    language,
    mode: alterMode,
    modelId,
  });

  const parts: string[] = [];
  if (res.explanation) {
    parts.push(res.explanation.trim());
  }
  if (res.corrections && res.corrections.length > 0) {
    parts.push(
      `### Key Notes\n${res.corrections.map((c) => `- ${c}`).join('\n')}`
    );
  }
  if (res.code) {
    parts.push(`\`\`\`${res.language || language}\n${res.code}\n\`\`\``);
  }
  return parts.join('\n\n') || 'Code generated.';
}

export async function executeInlineMusicTool(
  prompt: string,
  modelId: ForgeXModelId
): Promise<GeneratedSong> {
  const lower = prompt.toLowerCase();
  let genre: SongGenre = 'Synthwave';
  if (/\blo-?fi\b|study|chillhop|rain/.test(lower)) genre = 'Lo-Fi';
  else if (/\bcinematic\b|orchestr|epic|film|soundtrack|score/.test(lower)) genre = 'Cinematic';
  else if (/\bedm\b|house|techno|dance|club|rave|dubstep/.test(lower)) genre = 'EDM';
  else if (/\brock\b|guitar|metal|punk|indie/.test(lower)) genre = 'Rock';
  else if (/\bacoustic\b|folk|unplugged|piano/.test(lower)) genre = 'Acoustic';
  else if (/\bambient\b|meditat|sleep|calm|space/.test(lower)) genre = 'Ambient';
  else if (/\bhip-?hop\b|rap|trap|beat/.test(lower)) genre = 'Hip-Hop';
  else if (/\bclassical\b|symphony|violin|baroque/.test(lower)) genre = 'Classical';

  let mood: SongMood = 'Uplifting';
  if (/\benergetic\b|hype|fast|pump|workout|power/.test(lower)) mood = 'Energetic';
  else if (/\bchill\b|relax|calm|soft|lofi|peaceful/.test(lower)) mood = 'Chill';
  else if (/\bdark\b|shadow|noir|intense|haunting/.test(lower)) mood = 'Dark';
  else if (/\bdreamy\b|ethereal|float|space|synth/.test(lower)) mood = 'Dreamy';
  else if (/\bsad\b|melanchol|emotional|lonely|blue/.test(lower)) mood = 'Melancholic';

  const bpmMap: Record<SongGenre, number> = {
    Synthwave: 116,
    'Lo-Fi': 82,
    Cinematic: 92,
    EDM: 128,
    Rock: 132,
    Acoustic: 96,
    Ambient: 72,
    'Hip-Hop': 94,
    Classical: 88,
  };

  return await musicService.generateSong({
    prompt,
    genre,
    mood,
    tempoBpm: bpmMap[genre],
    durationSeconds: 180,
    modelId,
    includeLyrics: true,
    hasVoice: true,
    voiceProfile: 'Aoede',
    vocalStyle: 'Melodic Singing',
  });
}

export function executeInlineSpotifySearch(query: string): {
  tracks: SpotifyTrack[];
  summary: string;
} {
  const clean = query.trim().toLowerCase();
  const isGeneric =
    !clean ||
    /^(play|hits?|songs?|music|all|top|popular|playlist|tracks?|listen|stream)$/i.test(clean);

  if (isGeneric) {
    const featured = SPOTIFY_TRACKS.slice(0, 8);
    return {
      tracks: featured,
      summary: `Showing top ${featured.length} featured tracks ready for inline playback.`,
    };
  }

  const tokens = clean.split(/\s+/).filter((t) => t.length > 1);
  const scored = SPOTIFY_TRACKS.map((track) => {
    const haystack = [
      track.title,
      track.creator,
      track.album,
      track.genre,
      track.mood,
      track.category,
      track.categoryLabel,
      track.description,
      ...(track.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    let score = 0;
    if (haystack.includes(clean)) score += 10;
    for (const tok of tokens) {
      if (track.title.toLowerCase().includes(tok)) score += 5;
      if (track.creator.toLowerCase().includes(tok)) score += 5;
      if (track.genre.toLowerCase().includes(tok) || track.mood.toLowerCase().includes(tok)) score += 3;
      if (haystack.includes(tok)) score += 2;
    }
    return { track, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.track);

  if (scored.length > 0) {
    const picked = scored.slice(0, 10);
    return {
      tracks: picked,
      summary: `Found ${picked.length} matching ${picked.length === 1 ? 'track' : 'tracks'} for "${query.trim()}".`,
    };
  }

  const fallback = SPOTIFY_TRACKS.slice(0, 6);
  return {
    tracks: fallback,
    summary: `No exact match for "${query.trim()}" — here are curated tracks you can stream inline.`,
  };
}

export async function executeInlinePresentationTool(
  prompt: string,
  isDark: boolean
): Promise<PresentationDeck> {
  const slideMatch = prompt.match(/\b([3-9]|1[0-2])\s*slides?\b/i);
  const slideCount = slideMatch ? Number(slideMatch[1]) : 6;
  const cleanTopic = prompt.replace(/\b([3-9]|1[0-2])\s*slides?\b/gi, '').trim() || prompt;
  return await presentationService.generateDeck(
    cleanTopic,
    slideCount,
    isDark ? 'dark-amber' : 'minimal-clean'
  );
}

export async function executeInlineCanvasTool(prompt: string): Promise<CanvasBoard> {
  const lower = prompt.toLowerCase();
  const canvasType: 'mindmap' | 'flowchart' | 'brainstorm' =
    /\bflowchart\b|\bflow\b|\bprocess\b|\barchitecture\b|\bpipeline\b/.test(lower)
      ? 'flowchart'
      : /\bbrainstorm\b|\bideas?\b/.test(lower)
      ? 'brainstorm'
      : 'mindmap';
  return await canvasService.generateCanvas(prompt, canvasType);
}

export async function executeInlineDataAnalysisTool(
  prompt: string,
  attachments: ChatAttachmentInput[]
): Promise<{
  report: DataAnalysisReport;
  datasetSummary: {
    name: string;
    rowCount: number;
    columnCount: number;
    headers: string[];
    sampleRows: Record<string, string | number>[];
  };
}> {
  const dataFile = attachments.find(
    (a) =>
      a.type === 'file' &&
      a.rawText &&
      (/\.(csv|tsv|json)$/i.test(a.name) || a.rawText.includes(',') || a.rawText.trim().startsWith('['))
  );

  let rawData = '';
  let fileName = 'Dataset.csv';

  if (dataFile?.rawText) {
    rawData = dataFile.rawText;
    fileName = dataFile.name;
  } else if (
    (prompt.includes(',') && prompt.includes('\n')) ||
    (prompt.trim().startsWith('[') && prompt.trim().endsWith(']'))
  ) {
    rawData = prompt;
    fileName = 'Inline_Prompt_Data.csv';
  } else {
    const lower = prompt.toLowerCase();
    const matchedSample =
      /cloud|latency|service|error/.test(lower)
        ? SAMPLE_DATASETS[2]
        : /marketing|ecommerce|e-commerce|channel|roas|conversion/.test(lower)
        ? SAMPLE_DATASETS[1]
        : SAMPLE_DATASETS[0];
    rawData = matchedSample.data;
    fileName = matchedSample.name;
  }

  const parsed = dataAnalysisService.parseDataset(rawData, fileName);
  const report = await dataAnalysisService.analyzeDataset(parsed, {
    customQuestion: prompt,
  });

  return {
    report,
    datasetSummary: {
      name: parsed.name,
      rowCount: parsed.rowCount,
      columnCount: parsed.columnCount,
      headers: parsed.headers,
      sampleRows: parsed.rows.slice(0, 15),
    },
  };
}

export async function executeInlineWritingTool(prompt: string): Promise<{
  content: string;
  category: WritingCategory;
  tone: WritingTone;
}> {
  const lower = prompt.toLowerCase();
  let category: WritingCategory = 'Article';
  if (/\bemail\b|\bletter\b/.test(lower)) category = 'Email';
  else if (/\bblog\b/.test(lower)) category = 'Blog';
  else if (/\bessay\b/.test(lower)) category = 'Essay';
  else if (/\bstory\b|\bnarrative\b|\bfiction\b/.test(lower)) category = 'Story';
  else if (/\bresume\b|\bcv\b/.test(lower)) category = 'Resume';
  else if (/\bscript\b|\bscreenplay\b/.test(lower)) category = 'Script';
  else if (/\bdoc(?:umentation)?\b|\bmanual\b|\bguide\b/.test(lower)) category = 'Documentation';

  let tone: WritingTone = 'Professional';
  if (/\bcasual\b|\bfriendly\b|\bconversational\b/.test(lower)) tone = 'Casual';
  else if (/\bpersuasive\b|\bsales\b|\bpitch\b/.test(lower)) tone = 'Persuasive';
  else if (/\bacademic\b|\bformal\b|\bresearch\b/.test(lower)) tone = 'Academic';
  else if (/\bcreative\b|\bpoetic\b|\bimaginative\b/.test(lower)) tone = 'Creative';
  else if (/\bconfident\b|\bbold\b/.test(lower)) tone = 'Confident';
  else if (/\bempathetic\b|\bwarm\b|\bsincere\b/.test(lower)) tone = 'Empathetic';

  const content = await writingStudioService.generateWriting({
    category,
    tone,
    topic: prompt,
  });

  return { content, category, tone };
}

export async function executeInlineDocumentTool(
  prompt: string,
  attachments: ChatAttachmentInput[]
): Promise<{ result: string; quiz?: QuizQuestion[] }> {
  const docs: DocumentItem[] = attachments
    .filter((a) => a.type === 'file' && a.rawText)
    .map((a, idx) => ({
      id: `chat_doc_${Date.now()}_${idx}`,
      name: a.name,
      fileType: (a.name.split('.').pop()?.toLowerCase() as any) || 'txt',
      fileSize: a.rawText?.length || 0,
      uploadTime: Date.now(),
      textContent: a.rawText || '',
    }));

  if (docs.length === 0) {
    // Use active Vault docs or saved Document AI docs if available
    const activeVault = vaultService.getActiveDocuments();
    if (activeVault.length > 0) {
      activeVault.slice(0, 4).forEach((v) => {
        docs.push({
          id: v.id,
          name: v.title,
          fileType: 'markdown',
          fileSize: v.charCount,
          uploadTime: v.createdAt,
          textContent: v.content,
        });
      });
    } else {
      const savedDocs = documentService.getDocuments();
      docs.push(...savedDocs.slice(0, 3));
    }
  }

  if (docs.length === 0) {
    return {
      result:
        'Attach a document (`.pdf`, `.txt`, `.md`, `.csv`, `.json`) using the `+` menu or drag & drop, then tell me to summarize, extract tables, generate study notes, or build a quiz.',
    };
  }

  const lower = prompt.toLowerCase();
  let action:
    | 'summarize'
    | 'qa'
    | 'extract-tables'
    | 'generate-notes'
    | 'generate-quiz'
    | 'compare'
    | 'analyze-data' = 'qa';
  if (/\bquiz\b|\bquestions?\b|\btest me\b/.test(lower)) action = 'generate-quiz';
  else if (/\btable\b|\bextract\b/.test(lower)) action = 'extract-tables';
  else if (/\bnotes?\b|\bcornell\b|\bstudy\b/.test(lower)) action = 'generate-notes';
  else if (/\bcompare\b|\bdiff\b|\bversus\b/.test(lower) && docs.length > 1) action = 'compare';
  else if (/\bsummar/i.test(lower) || !prompt.trim()) action = 'summarize';

  return await documentService.runDocumentAction({
    action,
    documents: docs,
    query: prompt,
    prompt,
  });
}

export function getInlineRuntimeAgent(modelId: ForgeXModelId): AIAgent {
  const existing = agentService.getAgents().find((a) => a.isActive);
  if (existing) return existing;
  return {
    id: 'inline-chat-agent',
    name: 'ForgeX Autonomous Agent',
    role: 'General Assistant',
    description: 'Inline autonomous agent inside ForgeX Chat',
    avatarIcon: 'Bot',
    systemPrompt:
      'Execute user tasks step by step using verified web search, browser reading, data crunching, and code tools cleanly.',
    enabledTools: ['web_search', 'browser_open', 'browser_read', 'code_execute', 'doc_reader'],
    permissions: {
      browser: true,
      webSearch: true,
      files: true,
      email: false,
      computerControl: false,
      codeExecution: true,
    },
    temperature: 0.4,
    modelId,
    isActive: true,
    isCustom: true,
    capabilities: ['Web Search', 'Browser Read', 'Code Execution'],
    createdAt: Date.now(),
  };
}

export async function executeInlineAgentTool(
  taskPrompt: string,
  modelId: ForgeXModelId,
  confirmAction?: {
    actionId: string;
    toolName: string;
    parameters: Record<string, any>;
    confirmed: boolean;
  },
  onStepUpdate?: (stepText: string) => void
): Promise<{
  reply: string;
  steps: AgentStep[];
  logs: string[];
  requiresConfirmation?: ActionConfirmationRequest;
  openBrowser?: boolean;
  browserUrl?: string;
}> {
  const agent = getInlineRuntimeAgent(modelId);
  const res = await agentService.sendAgentMessage(
    agent,
    taskPrompt,
    [],
    confirmAction,
    onStepUpdate
  );
  return {
    reply: res.reply,
    steps: res.steps || [],
    logs: res.actionLogs || [],
    requiresConfirmation: res.requiresConfirmation,
    openBrowser: res.openBrowser,
    browserUrl: res.browserUrl,
  };
}
