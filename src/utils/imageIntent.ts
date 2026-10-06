/**
 * Universal Image Generation Intent Detector
 * Accurately determines if a user message is requesting image creation,
 * including handwritten notebook study notes, artistic renderings, and natural language creation.
 */

export interface ImageIntentResult {
  isImage: boolean;
  prompt: string;
  style?: string;
}

export function detectImageGenerationIntent(text: string): ImageIntentResult {
  if (!text || typeof text !== 'string') return { isImage: false, prompt: '' };
  const clean = text.trim();
  if (!clean) return { isImage: false, prompt: '' };

  const lower = clean.toLowerCase();

  // Negative filter: Quizzes, coding, feedback/complaints ("not working", "keeps generating this"), trivia, tests, etc. should NEVER trigger image creation!
  const isExcludedIntent = 
    /not\s+working|keeps?\s+generating\s+this|why\s+is\s+it|broken|error|fix\s+this|issue\s+with/i.test(clean) ||
    /^(?:quiz|quizzes|trivia|question|questions|test|practice\s+questions|function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm)\b/i.test(
      clean.replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:create|make|give\s+me|generate)\s+(?:a\s+|an\s+|some\s+)?/i, '').trim()
    );
  if (isExcludedIntent) {
    return { isImage: false, prompt: '' };
  }

  // 1. HANDWRITTEN STUDY NOTES / NOTEBOOK NOTES INTENT ("notes like this", "handwritten notes", "hand wirtten notes", etc.)
  const isExplicitHandwrittenRequest = 
    /(?:hand[\s-]*(?:written|wirtten|writen|writing|wrtn|crafted)?[\s-]*(?:study[\s-]*)?notes?|notes?[\s-]*(?:like\s+this|like\s+image|like\s+photo|like\s+screenshot)|study\s+notes?|notebook\s+notes?)/i.test(clean) ||
    (/(?:create|make|generate|draw|give(?:\s+me)?|show(?:\s+me)?)\s+(?:me\s+)?(?:an?\s+|some\s+)?(?:hand[\s-]*(?:written|wirtten|writen|writing)?\s*)?(?:study\s+|notebook\s+)?notes?/i.test(clean));

  if (isExplicitHandwrittenRequest) {
    const handwrittenMatch = clean.match(
      /(?:(?:make|create|generate|draw|give(?:\s+me)?|show(?:\s+me)?|produce|design)\s+)?(?:my\s+ai\s+)?(?:an?\s+|some\s+)?(?:hand[\s-]*(?:written|wirtten|writen|writing|wrtn)?\s*)?(?:study\s+|notebook\s+|revision\s+)?notes?(?:\s+(?:on|about|of|for|like)\s+(.+))?/i
    );

    let rawTopic = (handwrittenMatch && handwrittenMatch[1] ? handwrittenMatch[1] : '').trim();
    // Clean up "like this", "like this (3)", "(3)", "like image", etc.
    rawTopic = rawTopic.replace(/like\s+this(?:\s*\(\d+\))?|like\s+the\s+image(?:\s*\d+)?|like\s+the\s+photo|like\s+screenshot|\(\d+\)|\[\d+\]|please|for\s+me|my\s+ai|should\s+be\s+able\s+to|there\s+should\s+be\s+no\s+spelling\s+mistack|everything\s+should\s+be\s+understandable|no\s+spelling\s+mistakes?|still\s+the\s+texts\s+are\s+not\s+clear|cant\s+even\s+understand\s+the\s+texts|only\s+the\s+topic\s+i\s+can\s+see|hand[\s-]*(?:written|wirtten|writen)?/gi, '').trim();
    rawTopic = rawTopic.replace(/^(?:of|on|about|for)\s+/i, '').trim();
    rawTopic = rawTopic.replace(/[?!.]+$/, '').trim();

    const isIonic = /ionic|bonding|chemistry|chemical|nacl/i.test(clean);
    const isPhotosynthesis = /photosynth|chloroplast|calvin/i.test(clean);

    let topic = rawTopic && rawTopic.length > 2
      ? rawTopic
      : isIonic
      ? 'Ionic Bonding : Formation, Properties, Dot and Cross Diagrams & Key Points'
      : isPhotosynthesis
      ? 'Photosynthesis : Light Reactions, Calvin Cycle & Chloroplast Structure'
      : 'Chapter 7 : The Mathematics of Maybe : Introduction to Probability';

    return {
      isImage: true,
      prompt: topic,
      style: 'Handwritten Notes',
    };
  }

  // 2. Explicit slash commands (/image, /img, /flux, /picture, /pic, /draw, /paint, /art, /generate)
  const slashMatch = clean.match(/^\/(?:image|img|flux|picture|pic|draw|paint|art|generate|visual|render)\b\s*(.*)$/i);
  if (slashMatch) {
    const p = (slashMatch[1] || '').trim();
    return { isImage: true, prompt: p || 'A stunning creative visual masterpiece with intricate details' };
  }

  // 3. Colon prefix (image:, img:, draw:, paint:, visual:, wallpaper:, flux:, picture:)
  const colonMatch = clean.match(/^(?:image|img|draw|paint|picture|photo|artwork|illustration|visual|wallpaper|render|flux)\s*:\s*(.+)$/i);
  if (colonMatch && colonMatch[1]) {
    return { isImage: true, prompt: colonMatch[1].trim().replace(/[?!.]+$/, '') };
  }

  // 4. Short standalone phrases requesting creation without arguments
  // e.g. "create an image", "generate a picture", "draw something", "can u create one", "make an image"
  if (/^(?:hey|hi|hello)?\s*(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:u\s+|you\s+)?(?:create|generate|make|draw|paint|give(?:\s+me)?|show(?:\s+me)?)(?:\s+something|\s+one|\s+an?\s+image|\s+an?\s+picture|\s+an?\s+art|\s+an?\s+artwork|\s+an?\s+visual|\s+an?\s+photo)?\s*[?!.]*$/i.test(clean)) {
    return { isImage: true, prompt: 'A breathtaking futuristic digital artwork masterpiece with vibrant neon lighting and intricate details' };
  }

  // 5. Broad Action Verb + Image Noun + Subject (works with create, make, generate, give, draw, etc.)
  // Examples:
  // "give me an image of a red sports car"
  // "can you give me an image of a cat"
  // "create an image showing an astronaut on mars"
  // "generate photos of cyberpunk streets"
  // "make a picture depicting deep ocean life"
  // "draw me an illustration of a dragon"
  // "show me a wallpaper of snowy mountains"
  // "make an image of..."
  // "create a picture of..."
  const actionNounMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:i\s+(?:want|need|would\s+like)(?:\s+you)?\s+(?:to\s+)?)?(?:generate|create|make|draw|paint|render|show(?:\s+me)?|give(?:\s+me)?|send(?:\s+me)?|produce|design|craft|illustrate|sketch|visualize|imagine|display|provide(?:\s+me)?)\s+(?:an?\s+|some\s+|the\s+)?(?:images?|pictures?|pics?|photos?|photographs?|illustrations?|drawings?|artworks?|graphics?|wallpapers?|portraits?|scenes?|visuals?|art|renders?)\s*(?:of|with|depicting|showing|featuring|having|containing|about|that\s+shows|where|for)?\s*(.*)$/i
  );
  if (actionNounMatch) {
    const rawPrompt = (actionNounMatch[1] || '').trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm|quiz|test|trivia)\b/i.test(rawPrompt)) {
      const finalPrompt = rawPrompt.replace(/[?!.]+$/, '').trim() || 'A stunning creative visual composition with vibrant lighting';
      return { isImage: true, prompt: finalPrompt };
    }
  }

  // 6. Direct artistic verbs:
  // "draw me a cat", "paint a sunset over mountains", "sketch a futuristic mech", "visualize a magical kingdom"
  const directVerbMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:draw|paint|sketch|illustrate|visualize|imagine|render)\s+(?:me\s+)?(?:a|an|the|some)?\s*(.+?)[?!.]*$/i
  );
  if (directVerbMatch && directVerbMatch[1]) {
    const candidate = directVerbMatch[1].trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|diagram|chart|graph|flowchart|essay|story|poem|song|quiz|test)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 7. Direct "create / generate / make [me] <visual subject>"
  // Handles both "create a cat", "make me an astronaut", AND "create red sports cars", "make handwritten notes", "create cyberpunk city"
  const directCreateMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:create|generate|make)\s+(?:me\s+)?(?:a\s+|an\s+|some\s+|the\s+)?([^.\n?!]+)[?!.]*$/i
  );
  if (directCreateMatch && directCreateMatch[1]) {
    const candidate = directCreateMatch[1].trim();
    if (!/^(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm|test|tests|report|summary|presentation|document|quiz|quizzes|trivia|questions?)\b/i.test(candidate)) {
      // Check if it describes visual subject
      const isVisualSubject = /(?:wallpaper|portrait|drawing|painting|photo|scenery|landscape|car|vehicle|city|building|animal|cat|dog|dragon|robot|mech|character|nature|sunset|space|galaxy|flower|tree|ocean|mountain|notes?|sketch|render|artwork|illustration)/i.test(candidate) ||
        candidate.split(' ').length <= 8;

      if (isVisualSubject) {
        return { isImage: true, prompt: candidate };
      }
    }
  }

  // 8. Direct "image / picture / photo / wallpaper of <subject>"
  const nounOfMatch = clean.match(
    /^(?:an?\s+|the\s+)?(?:images?|pictures?|pics?|photos?|photographs?|wallpapers?|illustrations?|drawings?|artworks?|portraits?|renders?|graphics?|visuals?)\s+(?:of|with|depicting|showing|featuring|for|about)\s+(.+?)[?!.]*$/i
  );
  if (nounOfMatch && nounOfMatch[1]) {
    const candidate = nounOfMatch[1].trim();
    if (!/^(?:code|function|script|component|table|list|essay|story|poem|song|quiz|test)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 9. Style descriptors: "a realistic photo of...", "cinematic shot of...", "digital art of..."
  const photoStyleMatch = clean.match(
    /^(?:a|an)\s+(?:realistic\s+photo|photorealistic\s+image|cinematic\s+shot|digital\s+art|concept\s+art|watercolor\s+painting|oil\s+painting|3d\s+render|detailed\s+drawing)\s+(?:of|with|showing|depicting)?\s*(.+?)[?!.]*$/i
  );
  if (photoStyleMatch && photoStyleMatch[1]) {
    return { isImage: true, prompt: clean.replace(/[?!.]+$/, '').trim() };
  }

  // 10. Edit / transform patterns: "edit this image to...", "modify image...", "change to..."
  const editMatch = clean.match(
    /^(?:please\s+)?(?:can|could)?\s*(?:you|u)?\s*(?:edit|modify|alter|change|transform|remix)\s+(?:this\s+|the\s+)?(?:image|picture|photo)?\s*(?:to|with|into)?\s*(.+?)[?!.]*$/i
  ) || clean.match(/^(?:now\s+)?(?:make\s+it|change\s+it\s+to|turn\s+it\s+into|edit\s+it\s+to|regenerate\s+with)\s+(.+?)[?!.]*$/i);
  if (editMatch && editMatch[1]) {
    const candidate = editMatch[1].trim();
    if (!/^(?:function|script|code|component|table|list|essay|story|poem|song|test|quiz)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  return { isImage: false, prompt: '' };
}

