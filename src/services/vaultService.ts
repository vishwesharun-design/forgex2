import { VaultDocument } from '../types';
import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';

const DEFAULT_DOCS: VaultDocument[] = [
  {
    id: 'vault-doc-1',
    title: 'ForgeX Architecture & Technical Blueprint',
    category: 'document',
    content: `# ForgeX System Architecture & Design Principles

ForgeX is an all-in-one AI creation and intelligence platform created by VishweshVarman.

## Core Capabilities
- Multi-Model Reasoning: Flagship Forge 2 Ultra (powered by Gemini 3.8 Flash), Forge 1.5, and specialized multimodal vision models.
- Black Forest Labs FLUX: High-precision latent diffusion image generation supporting 16:9, 1:1, 9:16, 4:3, and 3:4 aspect ratios.
- AI Song Studio: Web Audio synthesizer with polyphonic chord progressions, arpeggios, and lyrics generation.
- Deep Research: Autonomous multi-step research reports grounded in real-time Google search verification.
- Code Studio: Full-stack code editing, real-time debugging, and syntax auto-correction across 15+ programming languages.
- Live Voice Mode: High-fidelity speech synthesis (gemini-3.8-flash-lite-tts), acoustic VAD, and real-time conversation.
- Knowledge Vault: Private retrieval-augmented generation (RAG) system with granular document grounding toggles.

## Security & Data Privacy
- Zero-trust authentication via Firebase Auth.
- Every user's history and documents are isolated under /users/{uid}/* collections.
- Strict protection against leaking backend credentials or private internal environment secrets.`,
    tags: ['Architecture', 'ForgeX', 'AI Platform'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    charCount: 1140,
    summary: 'Overview of ForgeX system architecture, multimodal models, security boundaries, and platform capabilities.',
    isActive: true,
  },
  {
    id: 'vault-doc-2',
    title: 'Modern Full-Stack Engineering & TypeScript Guidelines',
    category: 'code',
    content: `# Modern Full-Stack Engineering Standards

## 1. Type Safety & Domain Modeling
- Always define explicit types and avoid any.
- Use discriminated unions for complex state transitions.
- Prefer immutability via Object.freeze or readonly properties for core states.

## 2. API Design & Resilient Error Handling
- Never expose sensitive API keys or credentials to client bundles.
- Proxy external third-party API calls through server-side endpoints.
- Return structured error JSON payloads: { success: false, error: message }.
- Implement fallback pipelines so user interfaces degrade gracefully without blank screens.

## 3. High-Performance React State
- Keep component re-renders minimal by keeping state close to consumers.
- Use useRef for values that do not impact rendering (timers, tracking flags).
- Ensure AudioContext and MediaStream tracks are properly cleaned up upon unmount to prevent memory leaks.`,
    tags: ['TypeScript', 'Best Practices', 'Architecture'],
    createdAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    charCount: 890,
    summary: 'Engineering best practices covering strict TypeScript modeling, API error resilience, and performant React lifecycles.',
    isActive: true,
  },
  {
    id: 'vault-doc-3',
    title: 'High-Impact Product Launch & GTM Strategy',
    category: 'notes',
    content: `# Product Launch & Go-to-Market Playbook

## Phase 1: Pre-Launch Validation
- Identify high-frequency pain points through user interviews.
- Build interactive prototypes before scaling infrastructure.
- Establish baseline telemetry metrics: Daily Active Users, Time to Value (TTV), retention curves.

## Phase 2: Launch Orchestration
- Deliver crisp value proposition: Headline must articulate the primary outcome in under 10 words.
- Multi-channel announcement: Developer communities, product directories, social demonstrations.
- Offer frictionless onboarding: Immediate value in under 30 seconds without mandatory setup barriers.

## Phase 3: Post-Launch Growth Loops
- Fast feedback iteration: Release polish updates every 48 hours based on user telemetry.
- Viral loops: Delightful shareable artifacts (generated images, music tracks, research cards).
- Customer advocacy: Engage directly with power creators and highlight community showcase projects.`,
    tags: ['Strategy', 'GTM', 'Product Growth'],
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    updatedAt: Date.now() - 1000 * 60 * 60 * 12,
    charCount: 960,
    summary: 'Actionable 3-phase go-to-market playbook covering validation, multi-channel launch, and organic viral growth loops.',
    isActive: false,
  },
];

class VaultService {
  private documents: VaultDocument[] = [];
  private currentUserId: string = 'guest';

  constructor() {
    this.loadFromStorage();
  }

  private getStorageKey(): string {
    return `forgex_vault_${this.currentUserId}`;
  }

  public setUserId(userId: string | null | undefined): void {
    const newId = userId && userId.trim() ? userId.trim() : 'guest';
    if (this.currentUserId !== newId) {
      this.currentUserId = newId;
      this.loadFromStorage();
      if (newId !== 'guest') {
        this.syncWithFirestore().catch(() => {});
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(this.getStorageKey());
      if (saved) {
        this.documents = JSON.parse(saved);
        return;
      }
    } catch (e) {
      console.warn('Failed to parse vault storage:', e);
    }
    // Default seed
    this.documents = [...DEFAULT_DOCS];
    this.saveToStorage();
  }

  private saveToStorage(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.documents));
    } catch (e) {
      console.warn('Failed to save vault storage:', e);
    }
  }

  public getDocuments(): VaultDocument[] {
    return [...this.documents];
  }

  public getDocumentById(id: string): VaultDocument | undefined {
    return this.documents.find((d) => d.id === id);
  }

  public getActiveDocuments(): VaultDocument[] {
    return this.documents.filter((d) => d.isActive);
  }

  public addDocument(docData: Omit<VaultDocument, 'id' | 'createdAt' | 'updatedAt' | 'charCount'>): VaultDocument {
    const cleanContent = (docData.content || '').trim();
    const newDoc: VaultDocument = {
      ...docData,
      id: `vault-doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: this.currentUserId,
      content: cleanContent,
      charCount: cleanContent.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: docData.isActive ?? true,
    };

    this.documents = [newDoc, ...this.documents];
    this.saveToStorage();
    this.saveDocToFirestore(newDoc).catch(() => {});
    return newDoc;
  }

  public updateDocument(id: string, updates: Partial<VaultDocument>): VaultDocument | null {
    const idx = this.documents.findIndex((d) => d.id === id);
    if (idx === -1) return null;

    const existing = this.documents[idx];
    const updatedContent = updates.content !== undefined ? updates.content.trim() : existing.content;
    const updated: VaultDocument = {
      ...existing,
      ...updates,
      content: updatedContent,
      charCount: updatedContent.length,
      updatedAt: Date.now(),
    };

    this.documents[idx] = updated;
    this.saveToStorage();
    this.saveDocToFirestore(updated).catch(() => {});
    return updated;
  }

  public toggleDocumentActive(id: string): boolean {
    const docItem = this.documents.find((d) => d.id === id);
    if (!docItem) return false;
    docItem.isActive = !docItem.isActive;
    docItem.updatedAt = Date.now();
    this.saveToStorage();
    this.saveDocToFirestore(docItem).catch(() => {});
    return docItem.isActive;
  }

  public toggleAllActive(active: boolean): void {
    this.documents = this.documents.map((d) => ({
      ...d,
      isActive: active,
      updatedAt: Date.now(),
    }));
    this.saveToStorage();
    if (this.currentUserId !== 'guest') {
      this.documents.forEach((d) => this.saveDocToFirestore(d).catch(() => {}));
    }
  }

  public deleteDocument(id: string): boolean {
    const initialLen = this.documents.length;
    this.documents = this.documents.filter((d) => d.id !== id);
    if (this.documents.length !== initialLen) {
      this.saveToStorage();
      this.deleteDocFromFirestore(id).catch(() => {});
      return true;
    }
    return false;
  }

  /**
   * Retrieves relevant context excerpts from active Knowledge Vault documents
   * based on keyword and semantic relevance scoring.
   */
  public getGroundingContext(
    userPrompt: string = '',
    maxChars: number = 3600
  ): {
    hasContext: boolean;
    contextText: string;
    sources: { id: string; title: string; category: string }[];
  } {
    const activeDocs = this.getActiveDocuments();
    if (activeDocs.length === 0) {
      return { hasContext: false, contextText: '', sources: [] };
    }

    const queryTokens = userPrompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    // Score active documents based on token matches in title, content, and tags
    const scoredDocs = activeDocs.map((docItem) => {
      let score = 0;
      const lowerTitle = docItem.title.toLowerCase();
      const lowerContent = docItem.content.toLowerCase();
      const lowerTags = docItem.tags.map((t) => t.toLowerCase()).join(' ');

      if (queryTokens.length === 0) {
        // If query is generic, weight by recent update time
        score = 1;
      } else {
        for (const token of queryTokens) {
          if (lowerTitle.includes(token)) score += 8;
          if (lowerTags.includes(token)) score += 5;
          const matchCount = (lowerContent.match(new RegExp(`\\b${token}\\b`, 'g')) || []).length;
          score += Math.min(matchCount * 2, 10);
        }
      }

      return { doc: docItem, score };
    });

    // Sort by relevance score
    scoredDocs.sort((a, b) => b.score - a.score);

    const relevantDocs = scoredDocs.slice(0, 4);
    let aggregatedContext = '';
    const sources: { id: string; title: string; category: string }[] = [];

    for (const item of relevantDocs) {
      const d = item.doc;
      sources.push({ id: d.id, title: d.title, category: d.category });

      // Truncate individual documents cleanly so all top sources get represented
      const docExcerpt = d.content.length > 1200 ? `${d.content.slice(0, 1200)}...` : d.content;
      aggregatedContext += `### [Vault Document: ${d.title}] (Category: ${d.category})\n${docExcerpt}\n\n`;

      if (aggregatedContext.length >= maxChars) {
        break;
      }
    }

    return {
      hasContext: aggregatedContext.trim().length > 0,
      contextText: aggregatedContext.slice(0, maxChars).trim(),
      sources,
    };
  }

  /**
   * Helper to fetch and extract clean readable text from external links
   */
  public async ingestUrl(url: string): Promise<{ title: string; content: string; summary: string }> {
    const cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      throw new Error('Please provide a valid http or https URL.');
    }

    const storedApiKey = localStorage.getItem('forgex_api_key') || '';
    const res = await fetch('/api/vault/ingest-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(storedApiKey ? { 'x-api-key': storedApiKey } : {}),
      },
      body: JSON.stringify({ url: cleanUrl }),
    });

    if (!res.ok) {
      throw new Error('Failed to ingest URL. Make sure the webpage is publicly accessible.');
    }

    const data = await res.json();
    return {
      title: data.title || cleanUrl.replace(/^https?:\/\//, '').split('/')[0],
      content: data.content || '',
      summary: data.summary || '',
    };
  }

  // Firestore Sync Layer
  private async saveDocToFirestore(vaultDoc: VaultDocument): Promise<void> {
    if (!this.currentUserId || this.currentUserId === 'guest') return;
    try {
      const docRef = doc(db, 'users', this.currentUserId, 'vault', vaultDoc.id);
      await setDoc(docRef, vaultDoc, { merge: true });
    } catch (e) {
      console.warn('Firestore save vault doc notice:', e);
    }
  }

  private async deleteDocFromFirestore(docId: string): Promise<void> {
    if (!this.currentUserId || this.currentUserId === 'guest') return;
    try {
      const docRef = doc(db, 'users', this.currentUserId, 'vault', docId);
      await deleteDoc(docRef);
    } catch (e) {
      console.warn('Firestore delete vault doc notice:', e);
    }
  }

  public async syncWithFirestore(): Promise<VaultDocument[]> {
    if (!this.currentUserId || this.currentUserId === 'guest') return this.documents;
    try {
      const colRef = collection(db, 'users', this.currentUserId, 'vault');
      const snap = await getDocs(colRef);
      if (!snap.empty) {
        const firestoreDocs: VaultDocument[] = [];
        snap.forEach((d) => {
          firestoreDocs.push(d.data() as VaultDocument);
        });
        if (firestoreDocs.length > 0) {
          firestoreDocs.sort((a, b) => b.updatedAt - a.updatedAt);
          this.documents = firestoreDocs;
          this.saveToStorage();
        }
      }
    } catch (e) {
      console.warn('Firestore sync vault notice:', e);
    }
    return this.documents;
  }
}

export const vaultService = new VaultService();
