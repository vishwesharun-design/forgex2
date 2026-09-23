import { CodeLanguage, CodeSnippet, CodeAlterMode, ForgeXModelId } from '../types';
import { authService } from './authService';

function getCodeStorageKey(): string {
  const partition = authService.getCurrentUserPartitionKey();
  return `forgex_code_snippets_${partition}`;
}

export interface CodeStudioResponse {
  success: boolean;
  action: 'generate' | 'alter' | 'correct';
  code: string;
  originalCode?: string;
  explanation: string;
  corrections?: string[];
  language: CodeLanguage;
  timestamp: number;
}

export const STARTER_TEMPLATES: Record<CodeLanguage, { title: string; prompt: string; code: string }> = {
  typescript: {
    title: 'Reactive Store & Event Bus',
    prompt: 'Create a type-safe reactive state store with event emitters and immutable updates',
    code: `export type Listener<T> = (data: T) => void;

export class ReactiveState<T extends Record<string, unknown>> {
  private state: T;
  private listeners: Map<keyof T, Set<Listener<any>>> = new Map();

  constructor(initial: T) {
    this.state = Object.freeze({ ...initial });
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.state[key];
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    if (Object.is(this.state[key], value)) return;
    this.state = Object.freeze({ ...this.state, [key]: value });
    this.listeners.get(key)?.forEach((fn) => fn(value));
  }

  subscribe<K extends keyof T>(key: K, fn: Listener<T[K]>): () => void {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(fn);
    return () => this.listeners.get(key)?.delete(fn);
  }
}`,
  },
  javascript: {
    title: 'Async Task Queue with Concurrency',
    prompt: 'Implement an asynchronous task queue with configurable max concurrency and retries',
    code: `class TaskQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  add(taskFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ taskFn, resolve, reject });
      this.processNext();
    });
  }

  async processNext() {
    if (this.running >= this.concurrency || this.queue.length === 0) return;
    this.running++;
    const { taskFn, resolve, reject } = this.queue.shift();

    try {
      const result = await taskFn();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.running--;
      this.processNext();
    }
  }
}`,
  },
  html: {
    title: 'Interactive Particle Network Canvas',
    prompt: 'Create an interactive HTML5 particle network canvas with cursor repulsion',
    code: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Interactive Particle Network</title>
  <style>
    * { margin: 0; padding: 0; }
    body { background: #09090b; overflow: hidden; }
    canvas { display: block; }
    .badge {
      position: absolute; top: 16px; left: 16px;
      color: #f59e0b; font-family: monospace; font-size: 13px;
      padding: 6px 12px; background: rgba(0,0,0,0.7);
      border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 99px;
    }
  </style>
</head>
<body>
  <div class="badge">ForgeX Interactive Canvas</div>
  <canvas id="c"></canvas>
  <script>
    const canvas = document.getElementById('c');
    const ctx = canvas.getContext('2d');
    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    const mouse = { x: w / 2, y: h / 2, radius: 120 };
    window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; });

    const dots = Array.from({ length: 60 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5,
      r: Math.random() * 2 + 1.5
    }));

    function loop() {
      ctx.fillStyle = 'rgba(9, 9, 11, 0.2)';
      ctx.fillRect(0, 0, w, h);

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;

        const dist = Math.hypot(mouse.x - d.x, mouse.y - d.y);
        if (dist < mouse.radius) {
          const f = (mouse.radius - dist) / mouse.radius;
          d.x -= ((mouse.x - d.x) / dist) * f * 3;
          d.y -= ((mouse.y - d.y) / dist) * f * 3;
        }

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = '#f59e0b';
        ctx.fill();

        for (let j = i + 1; j < dots.length; j++) {
          const d2 = dots[j];
          const dist2 = Math.hypot(d.x - d2.x, d.y - d2.y);
          if (dist2 < 100) {
            ctx.strokeStyle = \`rgba(245, 158, 11, \${1 - dist2 / 100})\`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d2.x, d2.y);
            ctx.stroke();
          }
        }
      }
      requestAnimationFrame(loop);
    }
    loop();
  </script>
</body>
</html>`,
  },
  python: {
    title: 'Fast LRU Cache with Expiration',
    prompt: 'Implement an LRU Cache with TTL expiration in Python',
    code: `from collections import OrderedDict
import time
from typing import Any, Optional

class LRUCache:
    def __init__(self, capacity: int = 100, default_ttl: float = 60.0):
        self.capacity = capacity
        self.default_ttl = default_ttl
        self._data: OrderedDict[str, tuple[Any, float]] = OrderedDict()

    def get(self, key: str) -> Optional[Any]:
        if key not in self._data:
            return None
        val, expires_at = self._data[key]
        if time.time() > expires_at:
            del self._data[key]
            return None
        self._data.move_to_end(key)
        return val

    def set(self, key: str, val: Any, ttl: Optional[float] = None) -> None:
        exp = time.time() + (ttl or self.default_ttl)
        if key in self._data:
            self._data.move_to_end(key)
        elif len(self._data) >= self.capacity:
            self._data.popitem(last=False)
        self._data[key] = (val, exp)`,
  },
  rust: {
    title: 'Thread-Safe Message Bus',
    prompt: 'Rust concurrent message pipeline with channels',
    code: `use std::sync::mpsc::{channel, Sender, Receiver};
use std::thread;

pub struct MessageBus<T> {
    sender: Sender<T>,
}

impl<T: Send + 'static> MessageBus<T> {
    pub fn new<F>(handler: F) -> Self
    where
        F: Fn(T) + Send + 'static,
    {
        let (sender, receiver): (Sender<T>, Receiver<T>) = channel();
        thread::spawn(move || {
            while let Ok(msg) = receiver.recv() {
                handler(msg);
            }
        });
        Self { sender }
    }

    pub fn dispatch(&self, msg: T) -> Result<(), std::sync::mpsc::SendError<T>> {
        self.sender.send(msg)
    }
}`,
  },
  css: {
    title: 'Modern Glassmorphic Neon Card System',
    prompt: 'Modern CSS variables, mesh gradients, and interactive glow borders',
    code: `:root {
  --neon-gold: #f59e0b;
  --bg-deep: #0a0a0c;
  --surface-glass: rgba(255, 255, 255, 0.04);
}

.glow-card {
  position: relative;
  background: var(--surface-glass);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: 16px;
  padding: 24px;
  color: #fff;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.glow-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245, 158, 11, 0.6);
  box-shadow: 0 12px 40px rgba(245, 158, 11, 0.15);
}`,
  },
  json: {
    title: 'OpenAPI 3.1 REST Specification',
    prompt: 'OpenAPI specification schema for modern AI endpoints',
    code: `{
  "openapi": "3.1.0",
  "info": {
    "title": "ForgeX Neural API",
    "version": "2.4.0",
    "description": "High-throughput AI code, image, and video generation endpoints"
  },
  "paths": {
    "/api/code-studio": {
      "post": {
        "summary": "Synthesize or auto-correct source code",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "action": { "type": "string", "enum": ["generate", "alter", "correct"] },
                  "language": { "type": "string" },
                  "code": { "type": "string" },
                  "prompt": { "type": "string" }
                }
              }
            }
          }
        }
      }
    }
  }
}`,
  },
  sql: {
    title: 'High-Throughput Analytics Rollups',
    prompt: 'PostgreSQL analytical aggregation with window functions and materialized views',
    code: `-- ForgeX Analytical Aggregation Pipeline
WITH daily_activity AS (
  SELECT
    user_id,
    date_trunc('day', created_at) AS active_day,
    count(*) AS total_generations,
    sum(case when status = 'success' then 1 else 0 end) AS successful_runs
  FROM generation_logs
  WHERE created_at >= NOW() - INTERVAL '30 days'
  GROUP BY 1, 2
)
SELECT
  active_day,
  count(distinct user_id) AS daily_active_users,
  sum(total_generations) AS total_jobs,
  round(avg(successful_runs::numeric / nullif(total_generations, 0)) * 100, 2) AS success_rate_pct,
  rank() over (order by sum(total_generations) desc) as volume_rank
FROM daily_activity
GROUP BY active_day
ORDER BY active_day DESC;`,
  },
  cpp: {
    title: 'Vector SIMD Arithmetic Accelerator',
    prompt: 'High performance C++ vector mathematics engine',
    code: `#include <iostream>
#include <vector>
#include <numeric>
#include <algorithm>

template <typename T>
class VectorEngine {
private:
    std::vector<T> data;

public:
    explicit VectorEngine(size_t size, T init = 0) : data(size, init) {}

    void transform(T scalar) {
        std::transform(data.begin(), data.end(), data.begin(),
                       [scalar](T val) { return val * scalar; });
    }

    T sum() const {
        return std::accumulate(data.begin(), data.end(), T(0));
    }

    void print() const {
        for (const auto& item : data) {
            std::cout << item << " ";
        }
        std::cout << "\\n";
    }
};`,
  },
  go: {
    title: 'Concurrent Worker Pool Architecture',
    prompt: 'Go worker pool with context cancellation and error groups',
    code: `package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type Job struct {
	ID   int
	Data string
}

func Worker(ctx context.Context, id int, jobs <-chan Job, results chan<- string, wg *sync.WaitGroup) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		case job, ok := <-jobs:
			if !ok {
				return
			}
			time.Sleep(50 * time.Millisecond) // Simulated compute
			results <- fmt.Sprintf("Worker %d completed job %d: %s", id, job.ID, job.Data)
		}
	}
}`,
  },
};

export const codeStudioService = {
  getApiKey(): string {
    const stored = localStorage.getItem('forgex_api_key');
    if (stored && stored.includes('hXAm6bKbRNzKvrXEHEeFQhyyGeA7hWhTGNFKy2ipFAMpZ6WucEoXEZMpGz0KWOl2s7PT8gfFZ9stBwQ9')) {
      localStorage.removeItem('forgex_api_key');
      return '';
    }
    return stored || '';
  },

  getSnippets(): CodeSnippet[] {
    try {
      const key = getCodeStorageKey();
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: CodeSnippet[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Remove any legacy sample snippets
          const realSnippets = parsed.filter((s) => s.id !== 'snip_default');
          if (realSnippets.length !== parsed.length) {
            this.saveSnippets(realSnippets);
          }
          return realSnippets;
        }
      }
    } catch (e) {
      console.error('Failed to load code snippets', e);
    }
    return [];
  },

  saveSnippets(snippets: CodeSnippet[]): void {
    try {
      const key = getCodeStorageKey();
      localStorage.setItem(key, JSON.stringify(snippets));
    } catch (e) {
      console.error('Failed to save code snippets', e);
    }
  },

  saveSnippet(snippet: CodeSnippet): CodeSnippet[] {
    const existing = this.getSnippets();
    const idx = existing.findIndex((s) => s.id === snippet.id);
    let updated: CodeSnippet[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = { ...snippet, updatedAt: Date.now() };
    } else {
      updated = [snippet, ...existing];
    }
    this.saveSnippets(updated);
    return updated;
  },

  deleteSnippet(id: string): CodeSnippet[] {
    const updated = this.getSnippets().filter((s) => s.id !== id);
    this.saveSnippets(updated);
    return updated;
  },

  async processCode(params: {
    action: 'generate' | 'alter' | 'correct';
    code?: string;
    prompt?: string;
    language: CodeLanguage;
    mode?: CodeAlterMode;
    modelId?: ForgeXModelId;
  }): Promise<CodeStudioResponse> {
    const apiKey = this.getApiKey();

    const res = await fetch('/api/code-studio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: JSON.stringify({
        ...params,
        apiKey: apiKey || undefined,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to process code in Code Studio');
    }

    return await res.json();
  },
};
