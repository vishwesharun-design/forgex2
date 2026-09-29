import { DocumentItem, DocumentFileType, DocQAMessage, QuizQuestion } from '../types';
import { authService } from './authService';

function getDocStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_documents_${partition}`;
}

function getDocQAStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_doc_qa_history_${partition}`;
}

export const documentService = {
  getDocuments(): DocumentItem[] {
    try {
      const key = getDocStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove any legacy sample documents
          const realDocs = parsed.filter((d: DocumentItem) => !d.id.startsWith('doc-sample-'));
          if (realDocs.length !== parsed.length) {
            this.saveDocuments(realDocs);
          }
          return realDocs;
        }
      }
      return [];
    } catch (_e) {
      return [];
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
      const stored = localStorage.getItem(key);
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
    else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) fileType = 'image';
    else if (['md', 'markdown'].includes(ext)) fileType = 'markdown';

    let textContent = '';
    let previewUrl: string | undefined = undefined;
    let base64Data: string | undefined = undefined;
    let mimeType: string = file.type || '';

    // Convert file to Base64 data URL for multimodal binary processing (PDF & Images)
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    });

    if (dataUrl && dataUrl.includes(',')) {
      base64Data = dataUrl.split(',')[1];
      const detectedMime = dataUrl.split(',')[0].replace(/^data:/, '').split(';')[0];
      if (detectedMime) mimeType = detectedMime;
    }

    if (fileType === 'image') {
      previewUrl = dataUrl;
      mimeType = mimeType || 'image/jpeg';
      textContent = `[Image Document: ${file.name}]`;
    } else if (fileType === 'pdf') {
      mimeType = 'application/pdf';
      try {
        const rawText = await file.text();
        const textMatches = rawText.match(/[A-Za-z0-9,.:;'"\-\(\)\/\$%\s]{4,}/g) || [];
        textContent = textMatches.join(' ').slice(0, 30000);
      } catch (_e) {
        textContent = `[PDF Document: ${file.name}]`;
      }
    } else if (fileType === 'docx' || fileType === 'pptx') {
      try {
        const rawText = await file.text();
        // Extract text from Office XML tags <w:t> or <a:t> if present
        const xmlTextMatches = rawText.match(/<[wa]:t[^>]*>([^<]+)<\/[wa]:t>/g);
        if (xmlTextMatches && xmlTextMatches.length > 0) {
          textContent = xmlTextMatches
            .map((t) => t.replace(/<[^>]+>/g, ''))
            .join(' ')
            .slice(0, 35000);
        } else {
          const words = rawText.match(/[A-Za-z0-9,.:;'"\-\(\)\/\$%\s]{4,}/g) || [];
          textContent = words.join(' ').slice(0, 30000);
        }
      } catch (_e) {
        textContent = `[Document: ${file.name}]`;
      }
    } else {
      // Plain text, markdown, csv, json, code
      try {
        textContent = await file.text();
      } catch (_readErr) {
        textContent = `[File ${file.name} uploaded]`;
      }
    }

    const docItem: DocumentItem = {
      id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      name,
      fileType,
      fileSize: size,
      uploadTime: Date.now(),
      textContent: textContent.trim(),
      base64Data,
      mimeType,
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
          base64Data: d.base64Data,
          mimeType: d.mimeType,
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
