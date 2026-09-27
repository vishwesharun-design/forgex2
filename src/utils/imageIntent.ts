/**
 * Universal Image Generation Intent Detector
 * Accurately determines if a user message is requesting image creation,
 * regardless of phrasing, auxiliary verbs, or natural language variations.
 */

export function detectImageGenerationIntent(text: string): { isImage: boolean; prompt: string } {
  if (!text || typeof text !== 'string') return { isImage: false, prompt: '' };
  const clean = text.trim();
  if (!clean) return { isImage: false, prompt: '' };

  // 1. Explicit slash commands (/image, /img, /flux, /picture, /pic, /draw, /paint, /art, /generate)
  const slashMatch = clean.match(/^\/(?:image|img|flux|picture|pic|draw|paint|art|generate|visual|render)\b\s*(.*)$/i);
  if (slashMatch) {
    const p = (slashMatch[1] || '').trim();
    return { isImage: true, prompt: p || 'A stunning creative visual masterpiece with intricate details' };
  }

  // 2. Colon prefix (image:, img:, draw:, paint:, visual:, wallpaper:, flux:, picture:)
  const colonMatch = clean.match(/^(?:image|img|draw|paint|picture|photo|artwork|illustration|visual|wallpaper|render|flux)\s*:\s*(.+)$/i);
  if (colonMatch && colonMatch[1]) {
    return { isImage: true, prompt: colonMatch[1].trim().replace(/[?!.]+$/, '') };
  }

  // 3. Short standalone phrases requesting creation without arguments
  // e.g. "create an image", "generate a picture", "draw something", "can u create one"
  if (/^(?:hey|hi|hello)?\s*(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:u\s+|you\s+)?(?:create|generate|make|draw|paint|give(?:\s+me)?|show(?:\s+me)?)(?:\s+something|\s+one|\s+an?\s+image|\s+an?\s+picture|\s+an?\s+art|\s+an?\s+artwork|\s+an?\s+visual)?\s*[?!.]*$/i.test(clean)) {
    return { isImage: true, prompt: 'A breathtaking futuristic digital artwork masterpiece with vibrant neon lighting and intricate details' };
  }

  // 4. Broad Action Verb + Image Noun + Subject
  // Examples:
  // "give me an image of a red sports car"
  // "can you give me an image of a cat"
  // "create an image showing an astronaut on mars"
  // "generate photos of cyberpunk streets"
  // "make a picture depicting deep ocean life"
  // "draw me an illustration of a dragon"
  // "show me a wallpaper of snowy mountains"
  const actionNounMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:i\s+(?:want|need|would\s+like)(?:\s+you)?\s+(?:to\s+)?)?(?:generate|create|make|draw|paint|render|show(?:\s+me)?|give(?:\s+me)?|send(?:\s+me)?|produce|design|craft|illustrate|sketch|visualize|imagine|display|provide(?:\s+me)?)\s+(?:an?\s+|some\s+|the\s+)?(?:images?|pictures?|pics?|photos?|photographs?|illustrations?|drawings?|artworks?|graphics?|wallpapers?|portraits?|scenes?|visuals?|art|renders?)\s*(?:of|with|depicting|showing|featuring|having|containing|about|that\s+shows|where|for)?\s*(.*)$/i
  );
  if (actionNounMatch) {
    const rawPrompt = (actionNounMatch[1] || '').trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm)\b/i.test(rawPrompt)) {
      const finalPrompt = rawPrompt.replace(/[?!.]+$/, '').trim() || 'A stunning creative visual composition with vibrant lighting';
      return { isImage: true, prompt: finalPrompt };
    }
  }

  // 5. Direct artistic verbs without image noun:
  // "draw me a cat", "paint a sunset over mountains", "sketch a futuristic mech", "visualize a magical kingdom"
  const directVerbMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:draw|paint|sketch|illustrate|visualize|imagine|render)\s+(?:me\s+)?(?:a|an|the|some)?\s*(.+?)[?!.]*$/i
  );
  if (directVerbMatch && directVerbMatch[1]) {
    const candidate = directVerbMatch[1].trim();
    if (!/^(?:a\s+)?(?:function|script|code|component|table|list|diagram|chart|graph|flowchart|essay|story|poem|song)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 6. Direct "create / generate / make me <subject>"
  const directCreateMatch = clean.match(
    /^(?:hey|hi|hello)?\s*(?:please\s+)?(?:can|could|would|will)?\s*(?:you|u)?\s*(?:please\s+)?(?:create|generate|make)\s+(?:me\s+)?(?:a|an)\s+([^.\n?!]+)[?!.]*$/i
  );
  if (directCreateMatch && directCreateMatch[1]) {
    const candidate = directCreateMatch[1].trim();
    if (!/^(?:function|script|code|component|table|list|essay|story|poem|song|dockerfile|database|schema|website|app|class|algorithm|test|report|summary|presentation|document)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 7. Direct "image / picture / photo / wallpaper of <subject>"
  const nounOfMatch = clean.match(
    /^(?:an?\s+|the\s+)?(?:images?|pictures?|pics?|photos?|photographs?|wallpapers?|illustrations?|drawings?|artworks?|portraits?|renders?|graphics?|visuals?)\s+(?:of|with|depicting|showing|featuring|for|about)\s+(.+?)[?!.]*$/i
  );
  if (nounOfMatch && nounOfMatch[1]) {
    const candidate = nounOfMatch[1].trim();
    if (!/^(?:code|function|script|component|table|list|essay|story|poem|song)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  // 8. Style descriptors: "a realistic photo of...", "cinematic shot of...", "digital art of..."
  const photoStyleMatch = clean.match(
    /^(?:a|an)\s+(?:realistic\s+photo|photorealistic\s+image|cinematic\s+shot|digital\s+art|concept\s+art|watercolor\s+painting|oil\s+painting|3d\s+render|detailed\s+drawing)\s+(?:of|with|showing|depicting)?\s*(.+?)[?!.]*$/i
  );
  if (photoStyleMatch && photoStyleMatch[1]) {
    return { isImage: true, prompt: clean.replace(/[?!.]+$/, '').trim() };
  }

  // 9. Edit / transform patterns: "edit this image to...", "modify image...", "change to..."
  const editMatch = clean.match(
    /^(?:please\s+)?(?:can|could)?\s*(?:you|u)?\s*(?:edit|modify|alter|change|transform|remix)\s+(?:this\s+|the\s+)?(?:image|picture|photo)?\s*(?:to|with|into)?\s*(.+?)[?!.]*$/i
  ) || clean.match(/^(?:now\s+)?(?:make\s+it|change\s+it\s+to|turn\s+it\s+into|edit\s+it\s+to|regenerate\s+with)\s+(.+?)[?!.]*$/i);
  if (editMatch && editMatch[1]) {
    const candidate = editMatch[1].trim();
    if (!/^(?:function|script|code|component|table|list|essay|story|poem|song|test)\b/i.test(candidate)) {
      return { isImage: true, prompt: candidate };
    }
  }

  return { isImage: false, prompt: '' };
}
