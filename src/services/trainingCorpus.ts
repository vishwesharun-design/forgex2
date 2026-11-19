/**
 * ForgeX Curated Multi-Domain Training & Reference Corpus
 * Provides fact-checked reference data across computer science, mathematics,
 * physics, chemistry, biology, cybersecurity, databases, AI engineering,
 * finance, and ForgeX platform capabilities for high-accuracy RAG grounding.
 */

export interface TrainingCorpusEntry {
  id: string;
  title: string;
  category: 'code' | 'document' | 'notes';
  tags: string[];
  keywords: string[];
  summary: string;
  content: string;
}

export const TRAINING_CORPUS: TrainingCorpusEntry[] = [
  {
    id: 'corpus-algorithms-dsa',
    title: 'Algorithms, Data Structures & Exact Complexity Reference',
    category: 'code',
    tags: ['Algorithms', 'Data Structures', 'Big-O', 'Computer Science'],
    keywords: [
      'algorithm', 'algorithms', 'complexity', 'big o', 'time complexity', 'space complexity',
      'sorting', 'quicksort', 'mergesort', 'heapsort', 'timsort', 'binary search',
      'dijkstra', 'bfs', 'dfs', 'bellman', 'floyd', 'kruskal', 'prim', 'astar', 'a*',
      'trie', 'heap', 'priority queue', 'hash table', 'hashmap', 'avl', 'red black',
      'segment tree', 'fenwick', 'union find', 'disjoint set', 'dynamic programming', 'knapsack',
      'graph', 'tree', 'linked list', 'stack', 'queue', 'recursion', 'backtracking',
    ],
    summary: 'Verified time/space complexity bounds and algorithmic invariants for sorting, trees, graphs, and dynamic programming.',
    content: `# Algorithms & Data Structures Verified Reference
## Sorting & Searching Exact Bounds
- Binary Search (sorted array): Time O(log n), Space O(1) iterative / O(log n) recursive.
- Merge Sort: Best/Avg/Worst O(n log n), Space O(n), Stable.
- Quick Sort: Best/Avg O(n log n), Worst O(n^2) (mitigated with median-of-three or randomized pivot), Space O(log n) stack, Unstable.
- Heap Sort: Best/Avg/Worst O(n log n), Space O(1), Unstable.
- Timsort (Python/Java objects): Best O(n), Avg/Worst O(n log n), Space O(n), Stable.
- Counting / Radix Sort (integers of k digits, base b): Time O(d(n + b)), Stable.

## Core Data Structures
- Dynamic Array: Access O(1), Append amortized O(1), Middle insert/delete O(n).
- Hash Table: Avg O(1) lookup/insert/delete, Worst O(n) on hash collisions; keep load factor <= 0.75.
- Binary Heap / Priority Queue: Peek O(1), Push/Pop O(log n), Heapify array O(n).
- Balanced BST (AVL / Red-Black): Search/Insert/Delete guaranteed O(log n).
- Trie (Prefix Tree): Lookup/Insert O(L) where L = key length.
- Disjoint Set Union (Union-Find) with path compression + union by rank: Amortized O(alpha(n)) ~ O(1).

## Graph & DP Invariants
- BFS (unweighted shortest path) & DFS: Time O(V + E), Space O(V).
- Dijkstra (non-negative weights, binary heap): Time O((V + E) log V). Fails on negative edge weights.
- Bellman-Ford (handles negative weights, detects negative cycles): Time O(V * E).
- Topological Sort (DAG only via Kahn's BFS or DFS post-order): Time O(V + E).
- Dynamic Programming requires Optimal Substructure + Overlapping Subproblems (memoization top-down or tabulation bottom-up).`,
  },
  {
    id: 'corpus-fullstack-web',
    title: 'Full-Stack Web, React 19, TypeScript & Modern APIs',
    category: 'code',
    tags: ['React', 'TypeScript', 'Web', 'Frontend', 'Node.js'],
    keywords: [
      'react', 'typescript', 'javascript', 'tsx', 'jsx', 'hook', 'hooks', 'usestate', 'useeffect',
      'usememo', 'usecallback', 'useref', 'tailwind', 'css', 'html', 'dom', 'vite', 'express',
      'rest', 'graphql', 'sse', 'websocket', 'cors', 'ssr', 'spa', 'hydration', 'accessibility',
      'wcag', 'promise', 'async', 'await', 'event loop', 'closure', 'generic', 'interface',
    ],
    summary: 'React rendering rules, strict TypeScript patterns, browser event loop mechanics, and REST/SSE web architecture.',
    content: `# Full-Stack Web, React & TypeScript Engineering
## React State & Hook Correctness
- Hooks must be called unconditionally at the top level of function components or custom hooks.
- Never mutate React state directly; return new arrays/objects so shallow reference equality triggers updates.
- Clean up timers, event listeners, AbortControllers, WebSockets, and MediaStreams inside useEffect cleanup functions.
- Beware stale closures inside async callbacks or setInterval; use functional state updates setState(prev => ...) or refs for mutable latest values.
- Use stable unique IDs (not array indices) as React list keys whenever items reorder, filter, or delete.

## TypeScript Type Precision
- Prefer unknown over any for untyped external inputs, then narrow with type guards or runtime validation.
- Discriminated unions (e.g. { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: string }) prevent impossible states.
- Utility types: Partial<T>, Required<T>, Pick<T, K>, Omit<T, K>, Record<K, V>, ReturnType<F>, Parameters<F>.

## Web Protocols & Event Loop
- JS Event Loop priority: Synchronous Call Stack -> Microtask Queue (Promise.then, queueMicrotask) -> Macrotask Queue (setTimeout, I/O, UI render).
- HTTP status codes: 200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthenticated, 403 Forbidden, 404 Not Found, 409 Conflict, 429 Too Many Requests, 500 Internal Server Error.
- SSE (Server-Sent Events) streams text/event-stream over HTTP/1.1+ with data: ...\\n\\n framing and Cache-Control: no-cache.`,
  },
  {
    id: 'corpus-python-ds',
    title: 'Python, FastAPI, NumPy, Pandas & PyTorch Patterns',
    category: 'code',
    tags: ['Python', 'Data Science', 'PyTorch', 'FastAPI', 'Pandas'],
    keywords: [
      'python', 'pandas', 'numpy', 'pytorch', 'torch', 'tensorflow', 'scikit', 'sklearn',
      'fastapi', 'django', 'flask', 'dataframe', 'list comprehension', 'generator', 'decorator',
      'asyncio', 'gil', 'pydantic', 'pip', 'venv', 'typing', 'dict', 'tuple', 'set',
    ],
    summary: 'Idiomatic Python 3.11+ patterns, vectorized NumPy/Pandas rules, PyTorch training loop invariants, and async FastAPI best practices.',
    content: `# Python & Data Science Reference
## Core Python Invariants
- Never use mutable default arguments like def f(items=[]):; always use items: list | None = None and initialize inside.
- Dictionaries preserve insertion order (guaranteed since Python 3.7); O(1) avg lookup.
- Sets and dicts require hashable (immutable) keys/elements (int, str, tuple of immutables; NOT list/dict).
- GIL (Global Interpreter Lock): CPython threads share one GIL for CPU-bound Python bytecode (use multiprocessing/ProcessPoolExecutor for CPU parallelism; asyncio/threads for I/O).

## Vectorized Pandas & NumPy
- Avoid DataFrame.iterrows() in loops; prefer vectorized operations, .loc[], np.where(), np.select(), or .groupby().agg().
- Prevent SettingWithCopyWarning by explicitly calling .copy() when creating filtered DataFrames before mutation.
- Handle missing values explicitly with .isna(), .fillna(), .dropna() before aggregations.

## PyTorch Training Loop Checklist
1. model.train() for training (enables Dropout & BatchNorm updates); model.eval() + with torch.no_grad(): for validation/inference.
2. Call optimizer.zero_grad(set_to_none=True) BEFORE loss.backward(), followed by optional gradient clipping and optimizer.step().
3. Ensure model and input tensors reside on the exact same device (cuda / mps / cpu).`,
  },
  {
    id: 'corpus-sql-databases',
    title: 'SQL, PostgreSQL, Normalization, ACID & Query Optimization',
    category: 'code',
    tags: ['SQL', 'PostgreSQL', 'Databases', 'Indexing'],
    keywords: [
      'sql', 'postgres', 'postgresql', 'mysql', 'sqlite', 'database', 'acid', 'transaction',
      'index', 'btree', 'b-tree', 'gin', 'join', 'inner join', 'left join', 'cte', 'window function',
      'dense_rank', 'row_number', 'group by', 'having', 'normalization', '1nf', '2nf', '3nf',
      'bcnf', 'foreign key', 'primary key', 'isolation', 'deadlock', 'explain analyze', 'nosql', 'firestore',
    ],
    summary: 'Relational normalization rules, ACID isolation phenomena, B-Tree/GIN indexing, and modern SQL window functions.',
    content: `# SQL & Relational Database Engineering
## SQL Logical Execution Order (Crucial for Accuracy)
1. FROM & JOIN -> 2. WHERE (filters rows before grouping) -> 3. GROUP BY -> 4. HAVING (filters groups) -> 5. SELECT & Window Functions (OVER) -> 6. DISTINCT -> 7. ORDER BY -> 8. LIMIT / OFFSET.
Note: WHERE cannot reference SELECT aliases or aggregate functions (use HAVING or a CTE/subquery).

## Window Functions vs GROUP BY
- GROUP BY collapses rows into one row per group.
- Window functions (ROW_NUMBER(), RANK(), DENSE_RANK(), SUM(...) OVER (PARTITION BY ... ORDER BY ...)) preserve every row while computing group/running metrics.
- ROW_NUMBER: 1,2,3,4; RANK: 1,1,3,4 (gaps on ties); DENSE_RANK: 1,1,2,3 (no gaps).

## ACID & Isolation Levels
- Atomicity (all-or-nothing commit/rollback), Consistency (constraints satisfied), Isolation (concurrent transaction independence), Durability (WAL persisted to non-volatile storage).
- Isolation Levels (weakest -> strongest): Read Uncommitted -> Read Committed (PostgreSQL default, prevents dirty reads) -> Repeatable Read -> Serializable (prevents phantom reads & serialization anomalies).

## Indexing & Normalization
- B-Tree index accelerates =, <, <=, >, >=, BETWEEN, IS NULL, and prefix LIKE 'abc%' (NOT leading wildcard LIKE '%abc').
- Composite index (a, b, c) obeys the leftmost prefix rule: helps queries filtering on (a), (a,b), or (a,b,c), not (b) alone.
- 3NF: Every non-key column depends on the key, the whole key, and nothing but the key.
- Always use parameterized queries ($1, $2 or ?) — never interpolate untrusted strings into SQL.`,
  },
  {
    id: 'corpus-systems-networking',
    title: 'Distributed Systems, Networking, Docker, Kubernetes & Linux',
    category: 'document',
    tags: ['Networking', 'Distributed Systems', 'Docker', 'Kubernetes', 'Cloud'],
    keywords: [
      'tcp', 'udp', 'http', 'https', 'tls', 'ssl', 'dns', 'ip', 'ipv4', 'ipv6', 'osi',
      'docker', 'container', 'kubernetes', 'k8s', 'pod', 'load balancer', 'cdn', 'cache',
      'redis', 'kafka', 'cap theorem', 'consistent hashing', 'rate limit', 'token bucket',
      'microservices', 'grpc', 'latency', 'throughput', 'linux', 'chmod', 'ssh', 'port',
    ],
    summary: 'TCP/TLS handshakes, HTTP/2/3, CAP theorem, containerization, Kubernetes primitives, and distributed scaling patterns.',
    content: `# Systems, Networking & Cloud Infrastructure
## Networking Protocols & Ports
- TCP: Connection-oriented (3-way handshake SYN -> SYN-ACK -> ACK), ordered, reliable delivery with congestion control.
- UDP: Connectionless, minimal header (8 bytes), low latency (DNS, VoIP, WebRTC, HTTP/3 QUIC).
- Standard Ports: HTTP 80, HTTPS 443, SSH 22, DNS 53, PostgreSQL 5432, MySQL 3306, Redis 6379, SMTP 25/587.
- TLS 1.3 reduces handshake to 1-RTT (0-RTT resumption), removes legacy RSA key transport and SHA-1/CBC ciphers, mandates Forward Secrecy (ECDHE).

## Distributed Systems Theorems & Patterns
- CAP Theorem: During a network Partition (P), a distributed data store must choose between Consistency (C - linearizability) or Availability (A).
- PACELC extends CAP: even without partitions (Else), choose Latency (L) vs Consistency (C).
- Consistent Hashing maps servers and keys onto a 0..2^32-1 ring with virtual nodes so adding/removing a node only remaps ~1/N keys.
- Rate Limiting algorithms: Token Bucket (allows bursts), Leaky Bucket (smooth output), Sliding Window Log/Counter.

## Docker & Kubernetes
- Containers share the host Linux kernel via namespaces (isolation: PID, NET, MNT, UTS, IPC, USER) and cgroups (CPU/RAM limits).
- Multi-stage Dockerfiles separate build SDKs from minimal runtime images (alpine/distroless) for smaller attack surface.
- Kubernetes core hierarchy: Cluster -> Node -> Pod (smallest deployable unit) -> ReplicaSet -> Deployment -> Service (ClusterIP/NodePort/LoadBalancer) -> Ingress.`,
  },
  {
    id: 'corpus-cybersecurity',
    title: 'Cybersecurity, OWASP Top 10, Cryptography & Auth Standards',
    category: 'document',
    tags: ['Security', 'Cryptography', 'OWASP', 'OAuth', 'JWT'],
    keywords: [
      'security', 'owasp', 'xss', 'csrf', 'sqli', 'sql injection', 'ssrf', 'idor', 'auth',
      'oauth', 'oauth2', 'pkce', 'jwt', 'oidc', 'encryption', 'hashing', 'sha256', 'aes',
      'rsa', 'ed25519', 'bcrypt', 'argon2', 'salt', 'tls', 'cors', 'csp', 'zero trust', 'rbac',
    ],
    summary: 'Verified cryptographic primitives, password hashing standards, OAuth 2.0 PKCE, and OWASP vulnerability defenses.',
    content: `# Cybersecurity & Cryptography Standards
## Cryptographic Best Practices
- Symmetric Encryption: AES-256-GCM or ChaCha20-Poly1305 (Authenticated Encryption with Associated Data - AEAD; never reuse a nonce/IV with the same key!).
- Asymmetric / Signatures: Ed25519 / ECDSA P-256 preferred over RSA-2048/4096 for modern signatures and ECDH/X25519 for key exchange.
- Password Hashing: Use memory-hard slow KDFs: Argon2id (OWASP primary choice) or bcrypt (cost >= 12) with unique random salts. NEVER store passwords with fast hashes like MD5, SHA-1, or unsalted SHA-256.
- Integrity / General Hashing: SHA-256 or BLAKE3 (not MD5 or SHA-1, which have collision vulnerabilities).

## Web Security & Auth
- OAuth 2.0 + OIDC: Public clients (SPAs/mobile) MUST use Authorization Code Flow with PKCE (Proof Key for Code Exchange); Implicit Flow is deprecated.
- JWTs: Signed (JWS) tokens are integrity-protected, NOT encrypted unless JWE is used — never store secrets in JWT payloads; always verify signature & alg header server-side (prevent alg:none attacks).
- Mitigations: Parameterized SQL queries (SQLi), contextual output encoding + strict CSP (XSS), SameSite=Lax/Strict + anti-CSRF tokens (CSRF), server-side object ownership checks (IDOR/BOLA), outbound URL allowlists (SSRF).`,
  },
  {
    id: 'corpus-ai-ml',
    title: 'Artificial Intelligence (AI), Machine Learning, Deep Learning & LLMs',
    category: 'document',
    tags: ['AI', 'Artificial Intelligence', 'Machine Learning', 'LLM', 'Transformers', 'RAG'],
    keywords: [
      'ai', 'artificial intelligence', 'genai', 'generative ai', 'machine learning', 'deep learning',
      'neural network', 'transformer', 'attention', 'llm', 'rag', 'retrieval', 'embedding', 'vector',
      'fine tuning', 'finetuning', 'lora', 'qlora', 'rlhf', 'dpo', 'hallucination', 'token',
      'context window', 'backpropagation', 'gradient descent', 'overfitting', 'bias variance',
      'precision', 'recall', 'f1', 'agi', 'computer vision', 'nlp', 'robotics',
    ],
    summary: 'Core definition of Artificial Intelligence, Narrow AI vs AGI, ML/DL foundations, Transformer equations, RAG architecture, and evaluation metrics.',
    content: `# Artificial Intelligence (AI) & Machine Learning Reference
## What Is Artificial Intelligence?
- Definition: Artificial Intelligence (AI) is the branch of computer science focused on building systems capable of performing tasks that typically require human intelligence—including reasoning, learning from data, pattern recognition, natural language understanding, perception, and decision-making.
- Main Categories:
  1. Narrow AI (Weak AI): Specialized systems designed for specific tasks (e.g., language models, image recognition, medical diagnosis, recommendation engines, autonomous driving).
  2. Artificial General Intelligence (AGI): Theoretical AI capable of understanding, learning, and applying intelligence across any intellectual task a human can perform.
- Core Subfields: Machine Learning (supervised, unsupervised, reinforcement learning), Deep Learning (multi-layer neural networks), Natural Language Processing (NLP), Computer Vision, and Robotics.

## Transformer & Training Mechanics
- Scaled Dot-Product Attention: Attention(Q, K, V) = softmax((Q K^T) / sqrt(d_k)) V. Dividing by sqrt(d_k) keeps dot-product variance stable so softmax gradients do not vanish.
- Positional Encoding: Absolute sinusoidal, learned embeddings, or RoPE (Rotary Position Embeddings, widely used in modern LLMs for relative position generalization).
- Training Stages: 1) Self-supervised Pre-training (next-token cross-entropy loss) -> 2) Supervised Fine-Tuning (SFT) -> 3) Preference Alignment (RLHF/PPO or DPO - Direct Preference Optimization).
- PEFT (LoRA / QLoRA): Freezes base weights W and trains low-rank adapters deltaW = B * A (rank r << d), cutting VRAM by >70%.

## Evaluation Metrics & Generalization
- Precision = TP / (TP + FP); Recall (Sensitivity) = TP / (TP + FN); F1 = 2 * (Precision * Recall) / (Precision + Recall).
- Bias-Variance Tradeoff: High bias = underfitting; High variance = overfitting (mitigate via more data, L2 weight decay, Dropout, early stopping, cross-validation).
- RAG Accuracy: Combine dense vector embeddings + sparse BM25 lexical matching (Hybrid Search) + reciprocal rank fusion / cross-encoder reranking + explicit citations to ground factual responses.`,
  },
  {
    id: 'corpus-mathematics',
    title: 'Mathematics: Algebra, Calculus, Linear Algebra & Probability',
    category: 'notes',
    tags: ['Math', 'Calculus', 'Linear Algebra', 'Probability', 'Statistics'],
    keywords: [
      'math', 'calculus', 'derivative', 'integral', 'limit', 'taylor', 'matrix', 'matrices',
      'eigenvalue', 'eigenvector', 'determinant', 'svd', 'vector', 'dot product', 'cross product',
      'probability', 'bayes', 'variance', 'standard deviation', 'normal distribution', 'gaussian',
      'quadratic', 'logarithm', 'trigonometry', 'sin', 'cos', 'tan', 'factorial', 'combination', 'permutation',
    ],
    summary: 'Exact calculus rules, linear algebra decompositions, Bayes theorem, combinatorics, and algebraic identities.',
    content: `# Verified Mathematics Reference
## Algebraic Identities & Quadratic Formula
- Quadratic ax^2 + bx + c = 0 (a != 0): x = (-b +/- sqrt(b^2 - 4ac)) / (2a); discriminant Delta = b^2 - 4ac.
- (a +/- b)^2 = a^2 +/- 2ab + b^2; a^2 - b^2 = (a - b)(a + b).
- a^3 + b^3 = (a + b)(a^2 - ab + b^2); a^3 - b^3 = (a - b)(a^2 + ab + b^2).
- Logarithm rules (base b > 0, b != 1, x,y > 0): log(xy) = log x + log y; log(x/y) = log x - log y; log(x^k) = k log x; change of base log_b(x) = ln(x)/ln(b).

## Calculus Exact Rules
- d/dx [x^n] = n x^(n-1); d/dx [e^x] = e^x; d/dx [a^x] = a^x ln(a); d/dx [ln x] = 1/x.
- d/dx [sin x] = cos x; d/dx [cos x] = -sin x; d/dx [tan x] = sec^2(x); d/dx [arctan x] = 1/(1 + x^2).
- Product rule: (fg)' = f'g + fg'; Quotient rule: (f/g)' = (f'g - fg') / g^2; Chain rule: d/dx f(g(x)) = f'(g(x)) g'(x).
- Integration by parts: integral(u dv) = uv - integral(v du).
- Fundamental limits: lim_{x->0} sin(x)/x = 1; lim_{n->infty} (1 + 1/n)^n = e ~ 2.718281828.

## Linear Algebra & Probability
- A matrix A is invertible iff det(A) != 0 iff columns are linearly independent (full rank).
- Eigenvalue equation: A v = lambda v; det(A - lambda I) = 0. Symmetric real matrices always have real eigenvalues and orthogonal eigenvectors.
- Bayes' Theorem: P(A|B) = P(B|A) P(A) / P(B).
- Permutations P(n, k) = n! / (n - k)!; Combinations C(n, k) = n! / (k!(n - k)!).
- Empirical Rule (Normal N(mu, sigma^2)): ~68.27% within 1 sigma, ~95.45% within 2 sigma, ~99.73% within 3 sigma.`,
  },
  {
    id: 'corpus-physics-constants',
    title: 'Physics Laws, Equations & Exact SI Fundamental Constants',
    category: 'notes',
    tags: ['Physics', 'Constants', 'Quantum', 'Thermodynamics', 'Relativity'],
    keywords: [
      'physics', 'constant', 'speed of light', 'planck', 'boltzmann', 'gravitational', 'newton',
      'thermodynamics', 'entropy', 'enthalpy', 'relativity', 'lorentz', 'quantum', 'schrodinger',
      'maxwell', 'electromagnetism', 'ohm', 'kinetic energy', 'momentum', 'gravity', 'escape velocity',
    ],
    summary: 'Exact CODATA 2019 SI constants and core equations of mechanics, thermodynamics, electromagnetism, and quantum physics.',
    content: `# Physics & Exact Fundamental Constants (SI)
## Exact & CODATA Verified Constants
- Speed of light in vacuum (c): exactly 299,792,458 m/s.
- Planck constant (h): exactly 6.62607015 x 10^-34 J*s; reduced hbar = h / (2*pi) ~ 1.054571817 x 10^-34 J*s.
- Elementary charge (e): exactly 1.602176634 x 10^-19 C.
- Boltzmann constant (k_B): exactly 1.380649 x 10^-23 J/K.
- Avogadro constant (N_A): exactly 6.02214076 x 10^23 mol^-1.
- Universal gas constant (R = N_A * k_B): ~ 8.314462618 J/(mol*K).
- Gravitational constant (G): ~ 6.67430 x 10^-11 m^3/(kg*s^2).
- Standard Earth gravity (g): 9.80665 m/s^2; Earth escape velocity ~ 11.186 km/s.

## Core Equations
- Classical Mechanics: F = dp/dt; Work W = integral(F . ds); Kinetic Energy K = 1/2 m v^2; Escape velocity v_e = sqrt(2GM/r).
- Thermodynamics: 1st Law: dU = deltaQ - deltaW; Ideal Gas: PV = nRT; Carnot max efficiency: eta = 1 - T_cold/T_hot (temperatures in Kelvin!).
- Special Relativity: gamma = 1 / sqrt(1 - v^2/c^2); Total relativistic energy E^2 = (pc)^2 + (m c^2)^2.
- Quantum: Photon E = h*f = h*c/lambda; de Broglie lambda = h/p; Heisenberg Delta x * Delta p >= hbar / 2.`,
  },
  {
    id: 'corpus-chemistry-bio',
    title: 'Chemistry, Periodic Trends, Biology & Biochemistry Reference',
    category: 'notes',
    tags: ['Chemistry', 'Biology', 'Biochemistry', 'Genetics'],
    keywords: [
      'chemistry', 'atom', 'molecule', 'periodic table', 'electronegativity', 'molar', 'mole',
      'stoichiometry', 'ph', 'pka', 'acid', 'base', 'gibbs', 'enthalpy', 'entropy', 'redox',
      'covalent', 'ionic', 'biology', 'cell', 'mitochondria', 'atp', 'photosynthesis', 'glycolysis',
      'krebs', 'dna', 'rna', 'mrna', 'crispr', 'enzyme', 'protein', 'amino acid', 'mitosis', 'meiosis',
    ],
    summary: 'Chemical thermodynamics, acid-base equilibria, periodic trends, cellular respiration ATP yields, and molecular genetics.',
    content: `# Chemistry & Biology Reference
## Chemistry Fundamentals
- Periodic Trends: Electronegativity & ionization energy generally increase left-to-right across a period and bottom-to-top up a group (Fluorine is the most electronegative element: 3.98 Pauling scale). Atomic radius increases top-to-bottom and right-to-left.
- Gibbs Free Energy: Delta G = Delta H - T Delta S. Process is thermodynamically spontaneous at constant T, P when Delta G < 0.
- Acids & Bases: pH = -log10[H3O+]; at 25 C, pH + pOH = 14 (K_w = 1.0 x 10^-14). Henderson-Hasselbalch: pH = pKa + log10([A-]/[HA]).
- Redox: OIL RIG (Oxidation Is Loss of electrons, Reduction Is Gain of electrons).

## Biology & Molecular Genetics
- Central Dogma: DNA -> (Transcription via RNA Polymerase) -> mRNA -> (Translation at Ribosome) -> Polypeptide/Protein.
- Base Pairing: DNA A=T (2 H-bonds), G===C (3 H-bonds); RNA substitutes Uracil (U) for Thymine (T). Start codon AUG (Methionine); Stop codons UAA, UAG, UGA.
- Cellular Respiration (1 glucose C6H12O6): Glycolysis (cytosol, net 2 ATP + 2 NADH) -> Pyruvate Oxidation & Krebs Cycle (mitochondrial matrix, 2 ATP + 8 NADH + 2 FADH2) -> Oxidative Phosphorylation / ETC (inner mitochondrial membrane, ~26-28 ATP) = ~30-32 net ATP total.
- Mitosis produces 2 genetically identical diploid (2n) somatic daughter cells; Meiosis produces 4 genetically diverse haploid (n) gametes.`,
  },
  {
    id: 'corpus-economics-finance',
    title: 'Economics, Finance, Valuation & Quantitative Formulas',
    category: 'notes',
    tags: ['Finance', 'Economics', 'Valuation', 'Accounting'],
    keywords: [
      'finance', 'economics', 'gdp', 'inflation', 'cpi', 'interest', 'compound interest',
      'npv', 'irr', 'wacc', 'capm', 'beta', 'dcf', 'ebitda', 'revenue', 'margin', 'balance sheet',
      'income statement', 'cash flow', 'stock', 'bond', 'yield', 'monetary policy', 'fiscal policy',
    ],
    summary: 'Verified accounting identities, time value of money, NPV/CAPM/WACC formulas, and macroeconomic indicators.',
    content: `# Economics & Quantitative Finance
## Accounting & Valuation Formulas
- Accounting Identity: Assets = Liabilities + Shareholders' Equity.
- Gross Margin = (Revenue - COGS) / Revenue; Operating Margin = EBIT / Revenue; Free Cash Flow (FCF) = Operating Cash Flow - CapEx.
- Compound Interest: A = P(1 + r/n)^(nt); Continuous compounding A = P * e^(rt).
- Net Present Value: NPV = sum_{t=0..T} CF_t / (1 + r)^t. Accept project when NPV > 0 (or IRR > hurdle rate / WACC).
- CAPM Expected Return: E(R_i) = R_f + beta_i * (E(R_m) - R_f).
- Rule of 72 (approximation for doubling time): Years ~ 72 / (annual_rate_percent).

## Macroeconomics
- Nominal GDP = C + I + G + (X - M) (Consumption + Investment + Government Spending + Net Exports).
- Real GDP adjusts Nominal GDP for inflation via GDP Deflator: Real GDP = Nominal GDP / (Deflator / 100).
- Bond Prices & Yields move inversely: when market interest rates rise, existing fixed-coupon bond prices fall.`,
  },
  {
    id: 'corpus-rust-go-cpp-java',
    title: 'Rust, Go, C++ & Java Concurrency and Memory Models',
    category: 'code',
    tags: ['Rust', 'Go', 'C++', 'Java', 'Concurrency'],
    keywords: [
      'rust', 'borrow checker', 'ownership', 'lifetime', 'tokio', 'golang', 'go ', 'goroutine',
      'channel', 'c++', 'cpp', 'raii', 'unique_ptr', 'shared_ptr', 'pointer', 'java', 'jvm',
      'spring boot', 'thread', 'mutex', 'deadlock', 'race condition', 'memory leak',
    ],
    summary: 'Memory ownership, concurrency primitives, and systems best practices across Rust, Go, C++, and Java.',
    content: `# Systems Languages: Rust, Go, C++ & Java
## Rust Ownership Rules
1. Each value has a single owner; when the owner goes out of scope, Drop runs deterministically.
2. At any point in time, you may have EITHER any number of immutable references (&T) OR exactly one mutable reference (&mut T) — never both simultaneously (prevents data races at compile time).
3. Use Result<T, E> and Option<T> instead of null pointers or unchecked exceptions.

## Go Concurrency
- Goroutines are multiplexed onto OS threads by Go's M:N scheduler (~2KB initial stack).
- Always wait for goroutines via sync.WaitGroup or channels and pass context.Context for cancellation/timeouts to prevent goroutine leaks.
- Never write concurrently to a Go map without sync.Mutex or sync.RWMutex (causes fatal runtime panic).

## C++ Modern Best Practices (C++17/20+)
- Follow RAII: manage heap resources with std::unique_ptr (default) or std::shared_ptr instead of raw new/delete.
- Prefer std::vector, std::string_view, std::span, and range-based loops over raw C arrays.`,
  },
  {
    id: 'corpus-space-earth-science',
    title: 'Astronomy, Space Exploration, Earth Science & Climate',
    category: 'notes',
    tags: ['Astronomy', 'Space', 'Black Holes', 'Solar System', 'Earth Science', 'Climate'],
    keywords: [
      'space', 'universe', 'solar system', 'planet', 'planets', 'black hole', 'galaxy', 'milky way',
      'big bang', 'star', 'stars', 'sun', 'moon', 'mars', 'jupiter', 'exoplanet', 'light year',
      'climate change', 'greenhouse', 'global warming', 'atmosphere', 'plate tectonics', 'earthquake', 'volcano',
    ],
    summary: 'Verified astronomy facts, solar system planets, black holes, Big Bang cosmology, and Earth/climate systems.',
    content: `# Astronomy, Space & Earth Science
## Solar System & Cosmology
- Eight Planets (in order from the Sun): Mercury, Venus, Earth, Mars (terrestrial rocky planets), Jupiter, Saturn (gas giants), Uranus, Neptune (ice giants).
- 1 Astronomical Unit (AU) ~ 149.6 million km (Earth-Sun distance); 1 Light-Year ~ 9.461 trillion km.
- Big Bang Theory: The universe began expanding ~13.8 billion years ago from an extremely hot, dense state (evidenced by cosmic microwave background radiation and Hubble expansion).
- Black Holes: Regions of spacetime where gravity is so strong that nothing—not even light—can escape beyond the event horizon (Schwarzschild radius r_s = 2GM/c^2). Stellar-mass black holes form from core-collapse supernovae; supermassive black holes reside at galaxy centers (e.g., Sagittarius A* at the Milky Way's core).

## Earth & Climate Science
- Earth's Atmosphere Composition (dry air): ~78% Nitrogen (N2), ~21% Oxygen (O2), ~0.93% Argon, ~0.04% Carbon Dioxide (CO2), plus variable water vapor.
- Greenhouse Effect: Gases such as CO2, methane (CH4), and water vapor absorb outgoing infrared radiation, warming Earth's surface; excess fossil fuel emissions intensify warming.`,
  },
  {
    id: 'corpus-computing-fundamentals',
    title: 'Computer Architecture, Operating Systems, Cloud & Blockchain',
    category: 'document',
    tags: ['Computing', 'Operating Systems', 'Cloud', 'Blockchain', 'Hardware'],
    keywords: [
      'computer', 'cpu', 'gpu', 'ram', 'memory', 'operating system', 'kernel', 'process', 'thread',
      'cloud computing', 'aws', 'serverless', 'api', 'json', 'blockchain', 'cryptocurrency',
      'compiler', 'interpreter', 'binary', 'hexadecimal', 'virtual memory', 'cache',
    ],
    summary: 'Core computer science principles: CPU/GPU architecture, OS processes vs threads, APIs, cloud models, and blockchain.',
    content: `# Computer Architecture, Operating Systems & Cloud
## Hardware & Execution
- CPU vs GPU: CPUs optimize low-latency sequential execution with complex branch prediction and large caches; GPUs pack thousands of simpler cores for massive parallel SIMD/matrix math (graphics, AI training/inference).
- Memory Hierarchy (fastest -> slowest): CPU Registers -> L1/L2/L3 Cache -> RAM (DRAM) -> NVMe SSD -> HDD / Network Storage.
- Process vs Thread: A process has an isolated virtual address space and OS resources; threads within a process share memory and heap while maintaining separate stacks and registers.

## Cloud, APIs & Blockchain
- API (Application Programming Interface): A structured contract (e.g., REST/HTTP, GraphQL, gRPC) allowing software systems to exchange data cleanly.
- Cloud Service Models: IaaS (raw VMs/storage), PaaS (managed runtime/deployment), SaaS (end-user web applications).
- Blockchain: An append-only, cryptographically linked ledger of blocks replicated across a decentralized peer-to-peer network using consensus mechanisms (e.g., Proof of Work or Proof of Stake).`,
  },
  {
    id: 'corpus-forgex-platform',
    title: 'ForgeX Platform Capabilities, Models & User Workflows',
    category: 'document',
    tags: ['ForgeX', 'Models', 'Studios', 'Knowledge Vault'],
    keywords: [
      'forgex', 'forge 1', 'forge 1.5', 'forge 2', 'forge 2 pro', 'forge 2 ultra', 'vishweshvarman',
      'studio', 'studio store', 'knowledge vault', 'voice assistant', 'code studio', 'image studio',
      'deep research', 'make song', 'firebase', 'sign in', 'upload studio',
    ],
    summary: 'Accurate specification of ForgeX active AI model tiers, specialized creation studios, and private cloud storage.',
    content: `# ForgeX Platform Reference
## Active ForgeX Model Tiers
- Forge 1: Ultra-fast lightweight tier powered by the ForgeX Neural Engine with minimal thinking overhead for instant replies.
- Forge 1.5: Fast balanced reasoning tier powered by the ForgeX Neural Engine (Low thinking depth).
- Forge 2: Advanced logic and structured problem-solving tier powered by the ForgeX Neural Engine (Medium thinking depth).
- Forge 2 Pro: Advanced creative precision tier powered by the ForgeX Neural Engine (High thinking depth).
- Forge 2 Ultra: Flagship maximum-capability reasoning tier powered by the ForgeX Neural Engine (Maximum reasoning depth).

## Studios & Privacy
- Creator: Built by VishweshVarman (only mention creator attribution when directly asked who created ForgeX).
- Knowledge Vault: Users can upload files (.txt, .md, .json, .csv), ingest web URLs, or write custom notes and toggle them active to train and ground AI replies in Chat & Studios.
- Voice Assistant: Real-time speech capture + ForgeX neural TTS voice output + animated orb interface with quick actions and live conversation log.
- Data Isolation: Firebase Auth + per-user Firestore isolation under /users/{uid}/*.`,
  },
];

const STOPWORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'for', 'to', 'in', 'of', 'with',
  'how', 'what', 'why', 'when', 'where', 'who', 'can', 'you', 'me', 'my', 'do', 'does',
  'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'this', 'that', 'these',
  'those', 'from', 'by', 'as', 'it', 'its', 'into', 'about', 'explain', 'tell', 'give',
  'make', 'create', 'write', 'please', 'help', 'need', 'want', 'use', 'using',
]);

/**
 * Retrieves the most relevant verified domain reference chunks from the ForgeX
 * training corpus for a given query, returning clean formatted grounding text.
 */
export function retrieveTrainingContext(
  query: string,
  maxChars: number = 4200
): { hasContext: boolean; contextText: string; matchedTitles: string[] } {
  const clean = (query || '').trim().toLowerCase();
  if (!clean || clean.length < 3) {
    return { hasContext: false, contextText: '', matchedTitles: [] };
  }

  const tokens = clean
    .replace(/[^a-z0-9+.#/\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  if (tokens.length === 0) {
    return { hasContext: false, contextText: '', matchedTitles: [] };
  }

  const scored = TRAINING_CORPUS.map((entry) => {
    let score = 0;
    const titleLower = entry.title.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    const tagsLower = entry.tags.map((t) => t.toLowerCase());

    // Exact multi-word keyword / phrase matching (word-boundary safe for short keywords)
    for (const kw of entry.keywords) {
      let matched = false;
      if (kw.length <= 3 && /^[a-z0-9]+$/i.test(kw)) {
        matched = new RegExp(`\\b${kw}\\b`, 'i').test(clean);
      } else {
        matched = clean.includes(kw);
      }
      if (matched) {
        score += kw.includes(' ') ? 14 : 9;
      }
    }

    // Individual query token matching
    for (const tok of tokens) {
      if (titleLower.includes(tok)) score += 6;
      if (tagsLower.some((t) => t.includes(tok))) score += 5;
      if (contentLower.includes(tok)) score += 2;
    }

    return { entry, score };
  })
    .filter((item) => item.score >= 8)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return { hasContext: false, contextText: '', matchedTitles: [] };
  }

  const topMatches = scored.slice(0, 2);
  let contextText = '';
  const matchedTitles: string[] = [];

  for (const { entry } of topMatches) {
    const chunk = `### [${entry.title}]\n${entry.content}\n\n`;
    if (contextText.length + chunk.length > maxChars) {
      const remaining = maxChars - contextText.length;
      if (remaining > 300) {
        contextText += chunk.slice(0, remaining);
        matchedTitles.push(entry.title);
      }
      break;
    }
    contextText += chunk;
    matchedTitles.push(entry.title);
  }

  return {
    hasContext: contextText.trim().length > 0,
    contextText: contextText.trim(),
    matchedTitles,
  };
}
