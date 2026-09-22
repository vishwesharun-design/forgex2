import { DocumentItem, DocumentFileType, DocQAMessage, QuizQuestion } from '../types';
import { authService } from './authService';

function getDocStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_documents_${userId}`;
}

function getDocQAStorageKey(): string {
  const userId = authService.getCurrentUserId();
  return `forgex_doc_qa_history_${userId}`;
}

const DEFAULT_DOCS: DocumentItem[] = [
  {
    id: 'doc-sample-1',
    name: 'AI_State_of_Computing_2026.md',
    fileType: 'markdown',
    fileSize: 4210,
    uploadTime: Date.now() - 3600000 * 2,
    textContent: `# State of Artificial Intelligence & Spatial Computing (2026 Report)

## Executive Summary
The acceleration of multimodal foundation models has shifted software development toward autonomous compound AI systems. Real-time reasoning pipelines now bridge text, spatial vision, dynamic code generation, and low-latency audio synthesis.

## 1. Key Architectural Trends
- **Autonomous Subagent Swarms**: Specialized micro-agents communicating via structured RPC contracts replace monolithic single-turn LLMs.
- **Multimodal Video & World Models**: Models generate high-fidelity physical simulations, camera motion vectors, and frame-accurate timing.
- **Local Neural Compilation**: High-density quantization allows 8B parameter models to execute client-side at over 60 tokens/second.

## 2. Key Metrics & Benchmark Comparisons
| Technology Layer | 2024 Baseline | 2026 Benchmark | Year-over-Year Velocity |
| :--- | :--- | :--- | :--- |
| Multimodal Audio Latency | 650 ms | 120 ms | -81.5% |
| Autonomous Code Accuracy | 48.2% | 89.4% | +85.5% |
| Context Horizon Token Depth | 128k tokens | 2M tokens | +1460% |
| Memory Footprint (FP8) | 32 GB VRAM | 11 GB VRAM | -65.6% |

## 3. Strategic Recommendations
1. Decouple orchestration logic from specific model providers to maintain multi-model agility.
2. Integrate continuous grounding with real-time web verification to mitigate synthetic hallucination.
3. Standardize structured output schemas to assure downstream tool invocation integrity.`,
  },
  {
    id: 'doc-sample-2',
    name: 'Quarterly_Product_Roadmap.txt',
    fileType: 'txt',
    fileSize: 2850,
    uploadTime: Date.now() - 3600000 * 5,
    textContent: `FORGEX PRODUCT DEVELOPMENT & INFRASTRUCTURE ROADMAP - Q3/Q4

1. STRATEGIC OBJECTIVE
Deliver the most cohesive, unified multi-studio AI creation platform spanning generative creative media, software engineering, autonomous task agents, and deep research intelligence.

2. TARGET MILESTONES:
- Milestone Alpha: Studio Navigation Architecture
  * Eliminate horizontal navigation bottlenecks.
  * Implement categorized studio views (Creative, Intelligence, Productivity).
  * Ensure full mobile and desktop scrollability across all viewports.

- Milestone Beta: Real-Time Audio & Synthesizer Integration
  * Web Audio API polyphonic engine for musical generation.
  * Real-time microphone voice chat loops with visual waveform rendering.

- Milestone Gamma: Presentation & Visual Whiteboard
  * Automated JSON deck parsing with live slide rendering.
  * Bidirectional mindmap node graph with interactive dragging.

3. RESOURCE ALLOCATION:
- Infrastructure & Server Endpoints: 35%
- Studio UI Ergonomics & Responsiveness: 40%
- Test Coverage & Fault-Tolerant Fallbacks: 25%`,
  },
];

export const documentService = {
  getDocuments(): DocumentItem[] {
    try {
      const key = getDocStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_documents');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(key, legacy);
        }
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return DEFAULT_DOCS;
    } catch (_e) {
      return DEFAULT_DOCS;
    }
  },

  saveDocuments(docs: DocumentItem[]): void {
    const key = getDocStorageKey();
    localStorage.setItem(key, JSON.stringify(docs));
  },

  addDocument(doc: DocumentItem): void {
    const list = this.getDocuments();
    const existingIdx = list.findIndex((d) => d.id === doc.id);
    if (existingIdx >= 0) {
      list[existingIdx] = doc;
    } else {
      list.unshift(doc);
    }
    this.saveDocuments(list);
  },

  deleteDocument(id: string): DocumentItem[] {
    const list = this.getDocuments().filter((d) => d.id !== id);
    this.saveDocuments(list);
    return list;
  },

  getQAHistory(): DocQAMessage[] {
    try {
      const key = getDocQAStorageKey();
      let stored = localStorage.getItem(key);
      if (!stored && (key.includes('vishwesh') || key.includes('guest'))) {
        const legacy = localStorage.getItem('forgex_doc_qa_history');
        if (legacy) {
          stored = legacy;
          localStorage.setItem(key, legacy);
        }
      }
      return stored ? JSON.parse(stored) : [];
    } catch (_e) {
      return [];
    }
  },

  saveQAHistory(history: DocQAMessage[]): void {
    const key = getDocQAStorageKey();
    localStorage.setItem(key, JSON.stringify(history));
  },

  addQAMessage(msg: DocQAMessage): void {
    const hist = this.getQAHistory();
    hist.push(msg);
    this.saveQAHistory(hist);
  },

  async parseUploadedFile(file: File): Promise<DocumentItem> {
    const name = file.name;
    const size = file.size;
    const ext = name.split('.').pop()?.toLowerCase() || '';

    let fileType: DocumentFileType = 'txt';
    if (ext === 'pdf') fileType = 'pdf';
    else if (ext === 'docx') fileType = 'docx';
    else if (ext === 'pptx') fileType = 'pptx';
    else if (ext === 'csv') fileType = 'csv';
    else if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) fileType = 'image';
    else if (['md', 'markdown'].includes(ext)) fileType = 'markdown';

    let textContent = '';
    let previewUrl: string | undefined = undefined;

    if (fileType === 'image') {
      previewUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || '');
        reader.readAsDataURL(file);
      });
      textContent = `[Image Document: ${file.name}, Dimensions / Optical Visual Document for Multi-modal analysis]`;
    } else {
      try {
        const rawText = await file.text();
        // If PDF or binary doc, extract readable text streams
        if (fileType === 'pdf' || fileType === 'docx' || fileType === 'pptx') {
          // Clean non-printable bytes to retain UTF-8 human text
          const cleanAscii = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
          // Find coherent words
          const words = cleanAscii.match(/[A-Za-z0-9,.:;'"\-\(\)\/\$%\s]{4,}/g) || [];
          textContent = words.join(' ').slice(0, 30000);
          if (textContent.length < 50) {
            textContent = `Extracted binary document metadata: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Contains formatted document structure ready for neural query inspection.`;
          }
        } else {
          textContent = rawText;
        }
      } catch (_readErr) {
        textContent = `File ${file.name} uploaded successfully (${(file.size / 1024).toFixed(1)} KB).`;
      }
    }

    const docItem: DocumentItem = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name,
      fileType,
      fileSize: size,
      uploadTime: Date.now(),
      textContent: textContent.trim(),
      previewUrl,
    };

    return docItem;
  },

  async runDocumentAction(params: {
    action: 'summarize' | 'qa' | 'extract-tables' | 'generate-notes' | 'generate-quiz' | 'compare' | 'analyze-data';
    documents: DocumentItem[];
    query?: string;
    prompt?: string;
  }): Promise<{ result: string; quiz?: QuizQuestion[] }> {
    const storedApiKey = localStorage.getItem('forgex_api_key') || '';

    const res = await fetch('/api/file-ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({
        action: params.action,
        documents: params.documents.map((d) => ({
          name: d.name,
          fileType: d.fileType,
          textContent: d.textContent,
        })),
        query: params.query,
        prompt: params.prompt,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Document AI request failed.');
    }

    return await res.json();
  },
};
