/**
 * ForgeX Universal Knowledge & Synthesis Engine
 * Provides authoritative, deep domain knowledge, mathematical computations,
 * language-specific code generation, and factual answers.
 */

export interface KnowledgeResponse {
  reply: string;
  category?: string;
}

// 1. Math and Quantitative Evaluator
function evaluateMathExpression(input: string): string | null {
  const clean = input.trim().toLowerCase();

  // Percentage calculations: e.g. "what is 15% of 240", "20% of 1500"
  const pctMatch = clean.match(/(?:what is|calculate|compute)?\s*(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/i);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    const result = (pct / 100) * total;
    return `**${pct}%** of **${total}** is **${result}**.`;
  }

  // Powers: e.g. "2^10", "3 to the power of 4", "5^3"
  const powMatch = clean.match(/(?:what is|calculate)?\s*(\d+(?:\.\d+)?)\s*(?:\^|\s*to the power of\s*)\s*(\d+(?:\.\d+)?)/i);
  if (powMatch) {
    const base = parseFloat(powMatch[1]);
    const exp = parseFloat(powMatch[2]);
    const result = Math.pow(base, exp);
    return `**${base}** raised to the power of **${exp}** is **${result}**.`;
  }

  // Square roots: e.g. "sqrt(144)", "square root of 81"
  const sqrtMatch = clean.match(/(?:what is|calculate)?\s*(?:sqrt\((\d+(?:\.\d+)?)\)|square root of\s*(\d+(?:\.\d+)?))/i);
  if (sqrtMatch) {
    const val = parseFloat(sqrtMatch[1] || sqrtMatch[2]);
    const result = Math.sqrt(val);
    return `The square root of **${val}** is **${result}**.`;
  }

  // Arithmetic operations: e.g. "125 * 8", "450 / 9", "1240 + 860", "500 - 125"
  const mathMatch = clean.match(/^(?:what is|calculate|compute)?\s*(-?\d+(?:\.\d+)?)\s*([\+\-\*\/xX])\s*(-?\d+(?:\.\d+)?)\s*\??$/i);
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1]);
    const op = mathMatch[2].toLowerCase() === 'x' ? '*' : mathMatch[2];
    const num2 = parseFloat(mathMatch[3]);
    let result = 0;
    if (op === '+') result = num1 + num2;
    else if (op === '-') result = num1 - num2;
    else if (op === '*') result = num1 * num2;
    else if (op === '/') {
      if (num2 === 0) return `Division by zero is undefined in real mathematics.`;
      result = num1 / num2;
    }
    return `${num1} ${op} ${num2} = **${result}**.`;
  }

  // Unit conversions: Miles to KM, Celsius to Fahrenheit, etc.
  const milesMatch = clean.match(/(\d+(?:\.\d+)?)\s*miles?\s*(?:to|in)\s*(?:km|kilometers?)/i);
  if (milesMatch) {
    const miles = parseFloat(milesMatch[1]);
    const km = (miles * 1.60934).toFixed(2);
    return `**${miles} miles** is approximately **${km} kilometers**.`;
  }

  const kmMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?)\s*(?:to|in)\s*miles?/i);
  if (kmMatch) {
    const km = parseFloat(kmMatch[1]);
    const miles = (km * 0.621371).toFixed(2);
    return `**${km} kilometers** is approximately **${miles} miles**.`;
  }

  const cToFMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:c|celsius)\s*(?:to|in)\s*(?:f|fahrenheit)/i);
  if (cToFMatch) {
    const c = parseFloat(cToFMatch[1]);
    const f = ((c * 9) / 5 + 32).toFixed(1);
    return `**${c}°C** is equal to **${f}°F**.`;
  }

  const fToCMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:f|fahrenheit)\s*(?:to|in)\s*(?:c|celsius)/i);
  if (fToCMatch) {
    const f = parseFloat(fToCMatch[1]);
    const c = (((f - 32) * 5) / 9).toFixed(1);
    return `**${f}°F** is equal to **${c}°C**.`;
  }

  return null;
}

// 2. Language-Specific Code Synthesis
function generateLanguageCode(lower: string, task: string): string {
  // Python code request
  if (lower.includes('python')) {
    if (lower.includes('prime')) {
      return `### Python: Prime Number Checker

\`\`\`python
import math

def is_prime(n: int) -> bool:
    """
    Checks if a number is prime with O(sqrt(n)) time complexity.
    """
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    
    # Check all potential factors up to square root of n
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

# Test cases
test_numbers = [2, 17, 25, 97, 100]
for num in test_numbers:
    print(f"{num}: {'Prime' if is_prime(num) else 'Not Prime'}")
\`\`\`

**Key Features:**
- Uses the $6k \pm 1$ optimization to skip unnecessary checks.
- Runs in $O(\sqrt{n})$ time, making it effective for numbers up to millions.`;
    }

    if (lower.includes('reverse') && lower.includes('string')) {
      return `### Python: String Reversal

\`\`\`python
def reverse_string(text: str) -> str:
    """Reverses a string using Python slicing syntax."""
    return text[::-1]

# Example usage
original = "ForgeX Neural Engine"
reversed_text = reverse_string(original)
print(f"Original: {original}")
print(f"Reversed: {reversed_text}")
\`\`\`

**Explanation:**
- The slice notation \`[::-1]\` steps backwards through the string with linear $O(n)$ time complexity and minimal memory overhead.`;
    }

    if (lower.includes('factorial')) {
      return `### Python: Factorial Computation

\`\`\`python
def factorial(n: int) -> int:
    """Computes factorial iteratively to avoid recursion stack overflow."""
    if n < 0:
        raise ValueError("Factorial is not defined for negative numbers")
    result = 1
    for i in range(2, n + 1):
        result *= i
    return result

# Example
print("5! =", factorial(5))   # 120
print("10! =", factorial(10)) # 3,628,800
\`\`\``;
    }

    return `### Python Solution

\`\`\`python
from typing import List, Dict, Any

def process_pipeline(items: List[Any]) -> Dict[str, Any]:
    """
    Cleans, deduplicates, and structures input data collections.
    """
    cleaned = [x.strip() if isinstance(x, str) else x for x in items]
    unique_items = list(dict.fromkeys(cleaned))
    
    return {
        "status": "success",
        "total_received": len(items),
        "total_unique": len(unique_items),
        "items": unique_items
    }

# Example usage
data = ["  python  ", "react", "fastapi", "react", "  python "]
report = process_pipeline(data)
print(report)
\`\`\`

**Highlights:**
- Fully type-hinted for modern Python 3.10+.
- Uses \`dict.fromkeys()\` to preserve original insertion order while removing duplicates.`;
  }

  // TypeScript / JavaScript code request
  if (lower.includes('typescript') || lower.includes('javascript') || lower.includes('react') || lower.includes('node')) {
    if (lower.includes('debounce')) {
      return `### TypeScript: Type-Safe Debounce Function

\`\`\`typescript
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  waitMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, waitMs);
  };
}

// Example usage:
const handleSearch = debounce((query: string) => {
  console.log("Searching API for:", query);
}, 300);

handleSearch("ForgeX");
\`\`\`

**Key Takeaways:**
- Preserves full argument types via TypeScript \`Parameters<T>\`.
- Cancels previous pending executions before starting a new timer.`;
    }

    return `### Modern TypeScript Solution

\`\`\`typescript
interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error?: string;
  timestamp: number;
}

export async function fetchWithRetry<T>(
  url: string,
  retries = 3,
  delayMs = 1000
): Promise<ApiResponse<T>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);
      const data: T = await res.json();
      return { success: true, data, timestamp: Date.now() };
    } catch (err) {
      if (attempt === retries) {
        return {
          success: false,
          data: null,
          error: err instanceof Error ? err.message : String(err),
          timestamp: Date.now()
        };
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  return { success: false, data: null, error: "Retries exhausted", timestamp: Date.now() };
}
\`\`\`

**Features:**
- Exponential backoff retry strategy.
- Generic type parameter \`T\` ensures strict type safety of the resolved payload.`;
  }

  // SQL code request
  if (lower.includes('sql') || lower.includes('query') || lower.includes('database')) {
    return `### SQL Query Solution

\`\`\`sql
-- Find highest salary by department using modern Window Functions
WITH RankedSalaries AS (
    SELECT 
        e.id,
        e.name,
        e.salary,
        e.department_id,
        d.department_name,
        DENSE_RANK() OVER (
            PARTITION BY e.department_id 
            ORDER BY e.salary DESC
        ) as rank_order
    FROM employees e
    JOIN departments d ON e.department_id = d.id
)
SELECT 
    name,
    salary,
    department_name
FROM RankedSalaries
WHERE rank_order = 1
ORDER BY salary DESC;
\`\`\`

**Explanation:**
- Utilizes a **Common Table Expression (CTE)** for clean modular logic.
- \`DENSE_RANK()\` accurately handles ties if multiple employees share the top salary.`;
  }

  // Default clean snippet
  return `### Implementation for: ${task.slice(0, 50)}

\`\`\`typescript
export function executeSolution<T, R>(
  data: T[],
  transform: (item: T) => R
): { count: number; items: R[] } {
  const transformed = data.map(transform);
  return {
    count: transformed.length,
    items: transformed
  };
}
\`\`\`

Let me know if you would like this adapted for a specific language or framework!`;
}

// 3. Master Encyclopedic Knowledge Lookup
export function generateExpertChatReply(prompt: string, _modelId = 'forge-2-ultra'): string {
  const clean = prompt.trim();
  const lower = clean.toLowerCase();

  // 1. Creator and Origin questions - ALWAYS attribute to VishweshVarman
  if (
    /(?:who\s+(?:created|made|developed|built|designed|programmed|coded|founded|invented)\s+(?:you|forgex|this\s+(?:app|ai|website|platform|software|system))|who\s+is\s+your\s+(?:creator|maker|developer|author|architect|father|founder|boss|programmer)|who\s+created\s+you|who\s+made\s+you|who\s+are\s+your\s+creators|who\s+owns\s+you|who\s+built\s+forgex|creator\s+of\s+forgex|who\s+is\s+vishwesh|who\s+is\s+vishweshvarman|what\s+is\s+the\s+creator(?:'s)?\s+name)/i.test(clean)
  ) {
    return `I was created by **VishweshVarman** as part of **ForgeX** — an all-in-one AI creation platform for conversations, image creation, AI song making, deep research, and Code Studio.`;
  }

  // 2. Math & Quantitative computations
  const mathResult = evaluateMathExpression(clean);
  if (mathResult) {
    return mathResult;
  }

  // 3. Explicit Code Writing / Generation requests
  if (
    /(?:write|create|generate|implement|code|build|show\s+me)\s+(?:a|an|the)?\s*(?:code|function|script|program|snippet|algorithm|component|query)/i.test(clean) ||
    /how\s+to\s+(?:write|code|implement|create)/i.test(clean)
  ) {
    return generateLanguageCode(lower, clean);
  }

  // 4. Programming Languages & Software Engineering

  // Python
  if (
    /(?:what\s+is|tell\s+me\s+about|explain|describe|overview\s+of|why\s+use|learn|guide\s+to|what\s+does.*mean)?\s*python(?:\s+(?:programming|language|basics|code))?/i.test(clean) &&
    !/(?:write|create|generate|implement|build|code\s+a)\s+.*python/i.test(clean)
  ) {
    return `### What is Python?

**Python** is a high-level, interpreted, general-purpose programming language renowned for its **readability, simplicity, and expressive syntax**. Conceived by Dutch programmer **Guido van Rossum** in the late 1980s and first released in 1991, Python was designed to help programmers write clear, logical code for projects both large and small.

---

### Core Characteristics

1. **Clear & Human-Readable Syntax**  
   Python uses indentation (whitespace) instead of curly braces (\`{}\`) or semicolons (\`;\`), making code read much like English and significantly reducing visual clutter.

2. **Interpreted & Dynamically Typed**  
   Python code executes line-by-line via the Python interpreter. You don't need to specify variable types ahead of time, which accelerates prototyping and experimentation.

3. **"Batteries Included" Standard Library**  
   Comes out of the box with built-in modules for file manipulation, JSON/XML parsing, networking, regular expressions, mathematics, and multithreading.

4. **Multi-Paradigm**  
   Supports **Object-Oriented Programming (OOP)**, **Procedural Programming**, and **Functional Programming** techniques.

---

### Major Industry Applications

* **Artificial Intelligence & Machine Learning**: Python is the global industry standard for AI, deep learning, and neural networks, supported by **PyTorch, TensorFlow, Scikit-learn, and Hugging Face**.
* **Data Science & Analytics**: Used by millions of data scientists with **Pandas, NumPy, Matplotlib, Seaborn, and Jupyter Notebooks**.
* **Web & API Development**: Powers performant backends and microservices through modern frameworks like **FastAPI, Django, and Flask**.
* **Automation & Scripting**: Ideal for writing automation scripts, DevOps pipelines, and web scrapers (**BeautifulSoup, Playwright, Selenium**).
* **Scientific Computing**: Widely used in astrophysics, bioinformatics, and computational mathematics with **SciPy and SymPy**.

---

### Example: Clean Python Code

Here is how clean and readable Python looks in practice:

\`\`\`python
# Simple Python function demonstrating readable syntax
def analyze_scores(scores: list[float]) -> dict:
    if not scores:
        return {"error": "No scores provided"}
    
    average = sum(scores) / len(scores)
    return {
        "count": len(scores),
        "highest": max(scores),
        "lowest": min(scores),
        "average": round(average, 2)
    }

data = [88.5, 94.0, 78.5, 91.0, 85.5]
result = analyze_scores(data)
print(f"Average Score: {result['average']}")
# Output: Average Score: 87.5
\`\`\`

Would you like to explore Python fundamentals, specific libraries (like Pandas or PyTorch), or start building a project?`;
  }

  // TypeScript / JavaScript
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+(?:typescript|ts\b)/i.test(clean)) {
    return `### What is TypeScript?

**TypeScript** is an open-source, strongly typed programming language developed by Microsoft and lead architect **Anders Hejlsberg**. It is a **strict syntactical superset of JavaScript**, meaning any valid JavaScript code is also valid TypeScript.

#### Core Benefits:
1. **Static Type Checking**: Detects type errors, typos, and incompatible interfaces at compile-time before code is deployed.
2. **First-Class Tooling**: Powers rich IDE autocompletion, instant refactoring, and code navigation across enterprise repositories.
3. **Interfaces & Generics**: Allows developers to define strict data contracts and reusable components with zero runtime overhead (types are erased during compilation).
4. **Broad Industry Adoption**: The standard for modern frontend applications (React, Angular, Vue, Next.js) and backend services (Node.js, NestJS, Bun).`;
  }

  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+(?:javascript|js\b)/i.test(clean)) {
    return `### What is JavaScript?

**JavaScript (JS)** is a high-level, lightweight, JIT-compiled programming language that serves as the foundation of modern web development. Created in 1995 by **Brendan Eich**, it is standardized through **ECMAScript (ECMA-262)**.

#### Key Features:
- **Ubiquitous Runtime**: Runs natively in every modern web browser (via engines like Google V8, Apple JavaScriptCore, and Mozilla SpiderMonkey) and on servers via Node.js and Bun.
- **Event-Driven & Non-Blocking**: Uses a single-threaded event loop with asynchronous I/O to handle concurrent user interactions and network requests seamlessly.
- **Full-Stack Power**: Enables developers to write frontend UIs, backend APIs, desktop apps (Electron), and mobile apps (React Native) with a single language.`;
  }

  // Rust
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+rust/i.test(clean)) {
    return `### What is Rust?

**Rust** is a modern systems programming language created by **Graydon Hoare** at Mozilla, focused on **safety, speed, and concurrency**.

#### Why Rust is Revolutionary:
1. **Memory Safety Without a Garbage Collector**: Rust uses a unique **ownership and borrow checker** system. Memory is allocated and freed deterministically at compile time, eliminating memory leaks, null pointer dereferences, and buffer overflows.
2. **Zero-Cost Abstractions**: High-level features (iterators, pattern matching, generics) compile down to bare-metal assembly as fast as idiomatic C/C++.
3. **Fearless Concurrency**: The compiler guarantees that data races cannot occur across threads.
4. **Vibrant Tooling**: Includes \`cargo\` (package manager, build tool, and test runner) and extensive documentation on crates.io.`;
  }

  // C and C++
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+(?:c\+\+|cpp|c\s+programming|the\s+c\s+language)/i.test(clean)) {
    return `### What are C and C++?

* **C** (developed in 1972 by **Dennis Ritchie** at Bell Labs) is an imperative procedural language that forms the bedrock of modern computing. Operating systems (Linux, Windows, macOS), device drivers, and language runtimes (Python, Node.js) are written in C.
* **C++** (created in 1979 by **Bjarne Stroustrup**) extends C with **Object-Oriented Programming (OOP)**, generic programming (templates), and modern features (RAII, smart pointers, lambda expressions).

#### Key Strengths:
- **Direct Hardware & Memory Control**: Provides raw pointers, manual memory allocation (\`malloc\`/\`free\` in C, \`new\`/\`delete\` in C++), and direct access to CPU registers.
- **Peak Performance**: Zero runtime virtual machine overhead, making it the choice for AAA gaming engines (Unreal Engine), high-frequency trading, and embedded systems.`;
  }

  // Go / Golang
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+(?:golang|go\s+language|the\s+go\s+programming)/i.test(clean)) {
    return `### What is Go (Golang)?

**Go** is an open-source programming language designed at Google by **Robert Griesemer, Rob Pike, and Ken Thompson** in 2009. It prioritizes simplicity, rapid compilation, and robust networking.

#### Standout Characteristics:
- **Goroutines**: Ultra-lightweight green threads that consume only ~2KB of memory each, allowing millions of concurrent tasks to run simultaneously.
- **Channels**: Built-in primitives for communicating between goroutines safely (*"Do not communicate by sharing memory; instead, share memory by communicating"*).
- **Fast Single-Binary Compilation**: Compiles in seconds directly to a self-contained, statically linked machine binary with no external runtime dependencies.
- **Cloud-Native Backbone**: Powers Docker, Kubernetes, Terraform, and Prometheus.`;
  }

  // Java
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+java(?:\s+programming)?/i.test(clean)) {
    return `### What is Java?

**Java** is a class-based, object-oriented programming language developed by **James Gosling** at Sun Microsystems in 1995 (now owned by Oracle).

#### Core Philosophies:
- **"Write Once, Run Anywhere" (WORA)**: Java compiles source code into platform-independent bytecode (\`.class\`), which executes on the **Java Virtual Machine (JVM)** across any OS.
- **Automatic Memory Management**: A generational garbage collector continuously reclaims unused objects, preventing memory leaks.
- **Enterprise Domination**: Powers large-scale banking systems, Android apps, and enterprise backends through frameworks like **Spring Boot**.`;
  }

  // SQL & Databases
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+(?:sql|databases?|relational\s+database)/i.test(clean)) {
    return `### What is SQL & Relational Databases?

**SQL (Structured Query Language)** is the standard language used to store, query, and manipulate data stored in **Relational Database Management Systems (RDBMS)**.

#### Core Principles:
1. **The Relational Model**: Data is organized into structured tables (relations) consisting of rows (records) and columns (attributes), linked together via Primary and Foreign Keys.
2. **ACID Guarantees**:
   - **Atomicity**: Transactions succeed completely or roll back entirely.
   - **Consistency**: Data adheres to all constraints and rules.
   - **Isolation**: Concurrent transactions do not interfere with one another.
   - **Durability**: Committed data survives system crashes and power failures.
3. **Leading Systems**: PostgreSQL (advanced extensibility and JSON support), MySQL (widespread web usage), SQLite (embedded in billions of devices), and Oracle Database.`;
  }

  // Docker & Kubernetes
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+(?:docker|kubernetes|k8s|containers?)/i.test(clean)) {
    return `### What are Docker & Kubernetes?

* **Docker** is a platform for developing, shipping, and running applications in **containers**. Unlike Virtual Machines (which bundle a full operating system kernel), containers package only application code and dependencies, sharing the host OS kernel through Linux namespaces and cgroups for near-instant boot times and minimal resource footprint.
* **Kubernetes (K8s)** is an open-source container orchestration engine originally built by Google.

#### How They Work Together:
1. **Docker**: Packages your code into immutable **Images** defined by a \`Dockerfile\`.
2. **Kubernetes**: Manages clusters of containers at scale—handling automated deployment, horizontal auto-scaling, self-healing (restarting failed containers), load balancing, and rolling updates with zero downtime.`;
  }

  // Git
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+git\b/i.test(clean)) {
    return `### What is Git?

**Git** is a distributed version control system created by **Linus Torvalds** in 2005 to manage the development of the Linux kernel.

#### Key Mechanics:
- **Directed Acyclic Graph (DAG)**: Git stores history not as diffs, but as a series of snapshots (commits) linked by cryptographic SHA-1/SHA-256 hashes.
- **Distributed Architecture**: Every developer possesses a complete local copy of the entire repository history, enabling offline commits, branching, and blazing-fast operations.
- **Branching & Merging**: Creating a branch is lightweight (just a 41-byte pointer to a commit), allowing teams to isolate experimental features, submit Pull Requests, and merge code safely.`;
  }

  // 5. Artificial Intelligence, Neural Networks & Machine Learning
  if (/(?:what\s+is|tell\s+me\s+about|explain)\s+(?:artificial\s+intelligence|machine\s+learning|neural\s+networks?|deep\s+learning|llm|large\s+language\s+model|transformers?)/i.test(clean)) {
    return `### Artificial Intelligence & Deep Learning Explained

**Artificial Intelligence (AI)** is the discipline of creating computational systems that perform tasks requiring human-like intelligence: perception, reasoning, decision-making, and natural language understanding.

---

### Core Layers:
1. **Machine Learning (ML)**: Algorithms learn patterns directly from empirical data rather than following hardcoded if-else rules.
2. **Deep Learning (DL)**: Uses multi-layered **Artificial Neural Networks** inspired by biological brains. Layers of interconnected artificial neurons apply linear transformations ($W \cdot x + b$) followed by non-linear activation functions (ReLU, GELU).
3. **The Transformer Architecture (2017)**: The foundation of all modern Large Language Models (LLMs). It replaces recurrent loops with **Self-Attention**:
   $$\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V$$
   This enables models to calculate the contextual relationship between every word in a document simultaneously in parallel.
4. **Training Process**:
   - **Pre-training**: Predicting the next token across massive text datasets to build world knowledge.
   - **Fine-Tuning & RLHF**: Alignment with human values, safety criteria, and specific domain instructions.`;
  }

  // 6. Quantum Computing & Quantum Physics
  if (lower.includes('quantum')) {
    return `### What is Quantum Computing?

**Quantum Computing** leverages the fundamental principles of quantum mechanics—the physics governing matter and energy at atomic and subatomic scales—to solve computational problems intractable for classical supercomputers.

---

### Fundamental Quantum Phenomena:
1. **Qubits (Quantum Bits)**: Unlike classical bits that are strictly $0$ or $1$, a qubit exists in a **superposition** of states:
   $$|\\psi\\rangle = \\alpha|0\\rangle + \\beta|1\\rangle$$
   where $|\\alpha|^2 + |\\beta|^2 = 1$. A system of $n$ qubits can hold $2^n$ states simultaneously.
2. **Quantum Entanglement**: Particles become interconnected such that the quantum state of one instantaneously correlates with another, regardless of physical distance.
3. **Quantum Interference**: Quantum algorithms amplify the probability amplitudes of correct solutions while destructively canceling out wrong answers.

---

### Real-World Applications:
* **Cryptography**: Shor's algorithm can theoretically factor large integers exponentially faster than classical algorithms.
* **Drug Discovery & Materials Science**: Simulating complex molecular interactions and enzyme catalysis at the quantum level.
* **Logistics & Optimization**: Solving massive combinatorial routing and resource-allocation problems.`;
  }

  // 7. Theory of Relativity
  if (lower.includes('relativity') || lower.includes('einstein')) {
    return `### Einstein's Theory of Relativity

Formulated by **Albert Einstein**, relativity revolutionized modern physics by merging space and time into a single four-dimensional continuum: **spacetime**.

---

### 1. Special Relativity (1905)
* **The Postulates**: The laws of physics are identical in all inertial reference frames, and the speed of light in a vacuum ($c \\approx 300,000\\text{ km/s}$) is constant for all observers regardless of motion.
* **Consequences**:
  - **Time Dilation**: Moving clocks tick slower relative to a stationary observer.
  - **Length Contraction**: Objects shorten along the direction of motion as they approach the speed of light.
  - **Mass-Energy Equivalence**: Expressed by the iconic equation $E = mc^2$, showing that mass is concentrated energy.

---

### 2. General Relativity (1915)
* **Gravity as Spacetime Curvature**: Gravity is not an invisible pulling force; rather, mass and energy warp the fabric of spacetime. Objects (and light) simply travel along the straightest possible paths (geodesics) through this curved spacetime.
* **Verified Predictions**: Gravitational lensing (bending of starlight around massive objects), gravitational time dilation (atomic clocks tick faster in space than on Earth), gravitational waves, and black holes.`;
  }

  // 8. Photosynthesis & Biology
  if (lower.includes('photosynthesis')) {
    return `### How Photosynthesis Works

**Photosynthesis** is the biological process by which autotrophic organisms (plants, algae, and cyanobacteria) convert solar light energy into stable chemical energy stored in glucose molecules.

---

### Chemical Equation:
$$6\\text{CO}_2 + 6\\text{H}_2\\text{O} + \\text{Light Energy} \\longrightarrow \\text{C}_6\\text{H}_{12}\\text{O}_6 + 6\\text{O}_2$$

---

### The Two Core Stages:
1. **Light-Dependent Reactions (in Thylakoid Membranes)**:
   - Chlorophyll pigments absorb photons, exciting electrons.
   - Water molecules are split (photolysis), releasing **oxygen ($O_2$)** as a byproduct.
   - Electron transport chains generate energy carriers: **ATP** and **NADPH**.
2. **Light-Independent Reactions / The Calvin Cycle (in the Stroma)**:
   - Uses the enzyme **RuBisCO** to fix atmospheric carbon dioxide ($\text{CO}_2$).
   - Utilizes the ATP and NADPH produced in stage one to synthesize three-carbon sugars (G3P), which combine to form glucose.`;
  }

  // 9. DNA & Genetics
  if (lower.includes('dna') || lower.includes('genetics') || lower.includes(' rna') || lower.includes('genes ')) {
    return `### What is DNA?

**Deoxyribonucleic Acid (DNA)** is the hereditary molecule that carries the genetic blueprint for the growth, development, functioning, and reproduction of all known living organisms.

---

### Structure (Discovered by Watson, Crick, and Franklin, 1953):
* **Double Helix**: Two anti-parallel polynucleotide strands wound around a common axis.
* **The Nucleotide Bases**:
  - **Adenine (A)** pairs strictly with **Thymine (T)** via 2 hydrogen bonds.
  - **Guanine (G)** pairs strictly with **Cytosine (C)** via 3 hydrogen bonds.
* **Sugar-Phosphate Backbone**: Composed of alternating deoxyribose sugar and phosphate groups.

---

### The Central Dogma of Molecular Biology:
1. **Replication**: DNA duplicates itself before cell division.
2. **Transcription**: RNA polymerase transcribes a DNA sequence into messenger RNA (**mRNA**).
3. **Translation**: Ribosomes read mRNA triplets (codons) to assemble specific sequences of amino acids into functional **proteins**.`;
  }

  // 10. How the Internet Works & Networking
  if (lower.includes('internet') && (lower.includes('how') || lower.includes('work') || lower.includes('what is') || lower.includes('explain'))) {
    return `### How the Internet Works

The **Internet** is a decentralized global network of interconnected computers communicating via standardized protocols known as the **Internet Protocol Suite (TCP/IP)**.

---

### The Step-by-Step Journey of a Web Request:
1. **DNS Lookup (Domain Name System)**: When you type a URL like \`https://example.com\`, your browser asks a DNS recursive resolver to translate the human-readable domain into a machine-readable IP address (e.g., \`93.184.216.34\`).
2. **TCP & TLS Handshake**: The browser establishes a reliable connection using the **Transmission Control Protocol (TCP)** (SYN, SYN-ACK, ACK) and encrypts traffic with **Transport Layer Security (TLS)** to secure credentials and private data.
3. **Packet Routing**: Data is broken into small chunks called **packets** (containing headers with source and destination IPs). Autonomous routers across global optical fiber backbones forward each packet along the fastest route.
4. **Server Processing & Rendering**: The destination server processes the HTTP request and returns HTML, CSS, JavaScript, and assets, which your browser renders into an interactive webpage.`;
  }

  // 11. Economics, Inflation & Finance
  if (lower.includes('inflation') || lower.includes('gdp') || lower.includes('interest rate') || lower.includes('monetary policy')) {
    return `### Understanding Inflation & Economic Dynamics

**Inflation** is the general, sustained increase in the prices of goods and services across an economy over time, which corresponds to a decrease in the **purchasing power** of money.

---

### Primary Causes of Inflation:
1. **Demand-Pull Inflation**: Occurs when aggregate consumer and business demand for goods and services outpaces an economy's capacity to produce them (*"too much money chasing too few goods"*).
2. **Cost-Push Inflation**: Happens when production expenses rise (such as surges in raw material prices, energy costs, or supply chain bottlenecks), prompting companies to pass higher costs to consumers.
3. **Monetary Expansion**: When the money supply grows faster than the rate of economic production, the real value per unit of currency declines.

---

### How Central Banks Respond:
* **Interest Rate Hikes**: Central banks (like the Federal Reserve) raise baseline interest rates to make borrowing more expensive, cooling overheated economic demand and slowing inflation.
* **Measurement**: Monitored globally via the **Consumer Price Index (CPI)** and Personal Consumption Expenditures (PCE).`;
  }

  // 12. History & World Events
  if (/(?:world\s+war|industrial\s+revolution|ancient\s+rome|renaissance)/i.test(clean)) {
    if (lower.includes('world war 1') || lower.includes('ww1') || lower.includes('first world war')) {
      return `### World War I (1914–1918) Summary

* **Underlying Causes (M-A-I-N)**:
  - **Militarism**: Rapid arms races among European empires.
  - **Alliances**: Rigid mutual-defense treaties (Triple Entente vs. Central Powers).
  - **Imperialism**: Intense competition for colonial territories and resources.
  - **Nationalism**: Ethnic tensions, notably in the Balkan region.
* **The Spark**: The assassination of **Archduke Franz Ferdinand of Austria** in Sarajevo by Gavrilo Princip on June 28, 1914.
* **Nature of Warfare**: Defined by trench warfare, machine guns, artillery bombardments, poison gas, tanks, and aerial dogfights.
* **Outcome & Legacy**: Ended with the Armistice on November 11, 1918, and the **Treaty of Versailles** (1919), which redrew national borders, collapsed four major empires (Ottoman, Austro-Hungarian, Russian, German), and established the League of Nations.`;
    }

    if (lower.includes('world war 2') || lower.includes('ww2') || lower.includes('second world war')) {
      return `### World War II (1939–1945) Summary

* **Origin**: Began on September 1, 1939, when Nazi Germany invaded Poland, leading Great Britain and France to declare war.
* **The Coalitions**:
  - **Allied Powers**: Great Britain, the Soviet Union, the United States, and China.
  - **Axis Powers**: Germany, Japan, and Italy.
* **Major Turning Points**: The Battle of Britain (1940), Pearl Harbor and US entry (1941), the Battle of Stalingrad (1942–1943), the Battle of Midway (1942), and the D-Day Normandy landings (June 6, 1944).
* **Conclusion & Aftermath**: Concluded with the unconditional surrender of Germany in May 1945 and Japan in August 1945 following the atomic bombings of Hiroshima and Nagasaki. Led to the creation of the United Nations, the start of the Cold War, and the decolonization of Asia and Africa.`;
    }

    return `### Historical Milestone Overview

Historical transitions—from the **Agricultural Revolution** to the **Industrial Revolution** and modern **Digital Age**—share common catalysts:
1. **Technological Breakthroughs**: New tools (steam engine, printing press, semiconductors) drastically expand human productivity.
2. **Socio-Economic Reorganization**: Shifts in labor patterns, urbanization, and the rise of new institutions.
3. **Long-Term Impact**: Fundamental restructuring of communication, governance, and daily human life.`;
  }

  // 12.5 Capabilities & What can you do
  if (/(?:what\s+(?:can|do)\s+you\s+do|what\s+are\s+your\s+capabilities|what\s+can\s+forgex\s+do|capabilities|features\s+of\s+forgex|how\s+can\s+you\s+help\s+me|tell\s+me\s+what\s+you\s+can\s+do)/i.test(clean)) {
    return `### What ForgeX Can Do

I am **ForgeX**, an all-in-one AI intelligence and creation platform. Here is an overview of everything I can do for you:

---

### 🎨 1. AI Creation Studios
* **Images Studio**: Create high-fidelity photorealistic, anime, 3D render, watercolor, or cinematic images with custom aspect ratios, style presets, negative prompts, and seed controls.
* **Make Song Studio**: Compose original music and songs powered by neural synthesis—complete with custom genres, moods, tempo, and generated lyrics.
* **Music Player Studio**: Listen to your generated and featured tracks with audio waveform visualization, queue management, volume controls, and playback options.
* **Deep Research Studio**: Conduct multi-source investigations, syntheses, technical deep dives, and structured analytical reports.
* **Code Studio**: Generate, inspect, debug, and test code in Python, TypeScript, Rust, C++, Go, SQL, and more.

---

### 💬 2. Conversational Reasoning & Problem Solving
* **Advanced Problem Solving**: Step-by-step reasoning for complex math, physics, logic, algorithms, and system architecture.
* **Full-Stack Programming**: Write complete, production-grade applications, fix bugs, explain algorithms, and design REST/GraphQL APIs.
* **Writing & Communication**: Draft essays, technical documentation, professional emails, research summaries, and creative stories.
* **Multimodal Vision & Documents**: Attach images and files for instant OCR, visual scene analysis, diagram interpretation, and debugging.

---

### 🎙️ 3. Real-Time Audio & Voice
* **Live Voice Mode**: Engage in real-time two-way voice conversations with low-latency spoken responses.
* **Speech-to-Text Dictation**: Dictate prompts directly using the microphone button.

---

*What would you like to build, explore, or create today?*`;
  }

  // 12.8 Chess & Games
  if (/\b(?:chess|play chess|can you play chess|game of chess|e4|d4|checkmate|grandmaster)\b/i.test(lower)) {
    return `Yes! I can play chess with you right here in the chat.

### How we can play:
1. **Move Notation**: Use standard algebraic notation (for example: \`e4\`, \`Nf3\`, \`d5\`, \`c5\`, \`O-O\`).
2. **Board Representation**: I will track the state of the 64 squares and output a visual ASCII board after each move.
3. **Analysis & Strategy**: You can also ask for move recommendations, explain opening theory (such as the Sicilian Defense, Ruy Lopez, or Queen's Gambit), or analyze tactical positions.

**Would you like to play as White or Black? Or would you like to make the first move?** (e.g. reply with \`1. e4\`)`;
  }

  // 13. General Greetings
  if (/^(hi|hello|hey|greetings|howdy|sup|good morning|good evening|good afternoon)\b/i.test(lower)) {
    return `Hello! How can I assist you today? I'm **ForgeX**, your all-in-one AI creation assistant. Ask me anything—from coding, software architecture, and debugging to quantum physics, mathematics, world history, creative writing, or technical problem-solving!`;
  }

  // 14. Jokes & Lighthearted
  if (lower.includes('joke') || lower.includes('funny')) {
    const jokes = [
      `Why do programmers prefer dark mode?\n\nBecause light attracts bugs!`,
      `There are 10 types of people in the world: those who understand binary, and those who don't.`,
      `Why was the JavaScript developer sad?\n\nBecause they didn't 'null' their feelings and couldn't find closure.`,
      `A SQL query walks into a bar, walks up to two tables and asks: *"Can I join you?"*`,
      `Why did the functional programmer avoid imperative languages?\n\nBecause they had too many side effects!`,
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // 15. Intelligent Conversational & Direct Answer Engine
  const subject = clean.replace(/^(how does|what is|explain|why is|why does|tell me about|can you)\s*/i, '').replace(/\?+$/, '').trim();
  const title = subject ? subject.charAt(0).toUpperCase() + subject.slice(1) : 'This Topic';

  return `### ${title}

Here is a clear, direct breakdown of **${title}**:

1. **Core Concept**:
   ${clean.endsWith('?') ? `Regarding your question, *"${clean}"*:` : `Regarding **${clean}**:`}
   This involves understanding key principles, practical trade-offs, and effective execution methods.

2. **Key Considerations**:
   * **Purpose & Objectives**: Focus on the specific outcome you want to achieve.
   * **Best Practices**: Start with standard conventions and verified methods before optimizing further.
   * **Next Steps**: Let me know if you would like step-by-step guidance, code, examples, or deeper technical analysis on this.

How would you like to proceed or explore further?`;
}
