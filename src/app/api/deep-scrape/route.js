// Deep Scraper - Advanced Web Scraping and Analysis
// Replicates the Python deep_scraper.py functionality

// ---------- Config ----------
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36";
const MAX_SEARCH_RESULTS = 8;
const MAX_CRAWL_DEPTH = 2;  // 0 = don't follow internal links, 1 = follow internal links once, etc.
const REQUEST_TIMEOUT = 10000;

export async function POST(request) {
  try {
    const { query } = await request.json();
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return Response.json(
        { error: 'Query is required and must be a non-empty string' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    const debug = { steps: [], search_results: [] };
    
    // Initialize deep scraper
    const scraper = new DeepScraper();
    const result = await scraper.deepScrape(trimmedQuery, debug);
    
    return Response.json(result);

  } catch (error) {
    console.error('Deep scrape error:', error);
    return Response.json(
      { error: 'Internal server error during deep scrape' },
      { status: 500 }
    );
  }
}

// ---------- Helper Functions ----------
function cleanText(text, maxLen = 800) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length > maxLen ? cleaned.substring(0, maxLen) + '...' : cleaned;
}

function findMoneyNear(text, token) {
  const idx = text.toLowerCase().indexOf(token.toLowerCase());
  if (idx === -1) return null;
  
  const window = text.substring(Math.max(0, idx - 200), idx + 200);
  const match = window.match(/(\$?\d{1,3}(?:,\d{3})*(?:\.\d{1,4})?)/);
  return match ? match[1] : null;
}

function extractJsonLd(html) {
  const jsonLdScripts = [];
  const scriptMatches = html.match(/<script[^>]*type=['"](application\/ld\+json)['"][^>]*>(.*?)<\/script>/gs);
  
  if (scriptMatches) {
    for (const match of scriptMatches) {
      try {
        const jsonContent = match.replace(/<script[^>]*>|<\/script>/g, '').trim();
        const parsed = JSON.parse(jsonContent);
        jsonLdScripts.push(parsed);
      } catch (e) {
        continue;
      }
    }
  }
  
  return jsonLdScripts;
}

function isGoogleBlockedHtml(html) {
  const blockedPhrases = [
    "unusual traffic", "we have detected", "detected unusual activity", 
    "please show you're not a robot", "/sorry/index"
  ];
  return blockedPhrases.some(phrase => html.toLowerCase().includes(phrase));
}

// ---------- Content Analyzer ----------
function analyzeHtmlForQuery(html, url, query) {
  try {
    // Remove script/style/noscript tags
    let cleanHtml = html.replace(/<(script|style|noscript)[^>]*>.*?<\/\1>/gis, '');
    
    // Extract visible text
    let fullText = cleanHtml.replace(/<[^>]*>/g, ' ')
                            .replace(/\s+/g, ' ')
                            .trim();
    
    // Basic relevance check: count query words in full_text
    const queryWords = query.toLowerCase().match(/\b\w{2,}\b/g) || [];
    if (queryWords.length === 0) {
      return { snippet: fullText.substring(0, 1500), score: 1.0 };
    }
    
    const matches = queryWords.filter(word => fullText.toLowerCase().includes(word)).length;
    const score = matches / (queryWords.length + 0.0001);
    
    if (score < 0.1) {
      return null; // Not relevant enough
    }
    
    // Return full text for better analysis
    return { snippet: fullText, score };
  } catch (error) {
    console.error('Error analyzing HTML:', error);
    return null;
  }
}

// ---------- Main Deep Scraper Class ----------
class DeepScraper {
  constructor() {
    this.visited = new Set();
  }

  async performSearch(query, debug) {
    debug.steps.push('Searching Google for relevant URLs...');
    
    try {
      const searchResponse = await fetch(`/integrations/google-search/search?q=${encodeURIComponent(query)}`);
      
      if (!searchResponse.ok) {
        debug.steps.push(`Google search failed: ${searchResponse.status}`);
        return [];
      }
      
      const searchData = await searchResponse.json();
      const results = searchData.items?.map(item => item.link).slice(0, MAX_SEARCH_RESULTS) || [];
      
      debug.steps.push(`Found ${results.length} search results`);
      return results;
    } catch (error) {
      debug.steps.push(`Search error: ${error.message}`);
      return [];
    }
  }

  async fetchHtmlRequests(url, debug) {
    try {
      debug.steps.push(`Fetching ${url} via fast HTTP request`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const response = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const html = await response.text();
        debug.steps.push(`Successfully fetched ${url} (${html.length} chars)`);
        return html;
      }
    } catch (error) {
      debug.steps.push(`Fast fetch failed for ${url}: ${error.message}`);
    }
    
    return null;
  }

  async fetchHtmlWithScraper(url, debug) {
    try {
      debug.steps.push(`Scraping ${url} with web scraper (JS rendering)`);
      
      const response = await fetch('/integrations/web-scraping/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url,
          getText: false // Get HTML for better analysis
        })
      });

      if (!response.ok) {
        debug.steps.push(`Web scraper failed for ${url}: ${response.status}`);
        return null;
      }

      const html = await response.text();
      debug.steps.push(`Successfully scraped ${url} with JS rendering (${html.length} chars)`);
      return html;
    } catch (error) {
      debug.steps.push(`Scraper error for ${url}: ${error.message}`);
      return null;
    }
  }

  async extractFromJsRuntime(url, query, debug) {
    // Since we can't run Playwright directly, we'll simulate the runtime inspection
    // by looking for structured data in the scraped HTML
    debug.steps.push(`Inspecting runtime data for ${url}`);
    
    try {
      const html = await this.fetchHtmlWithScraper(url, debug);
      if (!html) return null;
      
      // 1) Check JSON-LD scripts
      const jsonLdData = extractJsonLd(html);
      for (const jsonData of jsonLdData) {
        const jsonText = JSON.stringify(jsonData);
        if (query.toLowerCase().split(' ').some(word => jsonText.toLowerCase().includes(word))) {
          debug.steps.push(`Found relevant JSON-LD data in ${url}`);
          return { snippet: cleanText(jsonText, 1200), score: 0.9 };
        }
      }
      
      // 2) Look for data attributes with potential values
      const dataAttributeMatches = html.match(/data-(?:price|value|last|current)[^>]*?=["']([^"']*?)["']/gi);
      if (dataAttributeMatches) {
        for (const match of dataAttributeMatches) {
          const value = match.match(/=["']([^"']*?)["']/)[1];
          if (value && (query.toLowerCase().split(' ').some(word => value.toLowerCase().includes(word)) || /\$?\d/.test(value))) {
            debug.steps.push(`Found relevant data attribute in ${url}: ${value}`);
            return { snippet: cleanText(value, 400), score: 0.85 };
          }
        }
      }
      
      // 3) Look for inline JSON or window variables
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      if (scriptMatches) {
        for (const script of scriptMatches) {
          const scriptContent = script.replace(/<script[^>]*>|<\/script>/gi, '');
          
          // Look for common window variable patterns
          const windowVarPatterns = [
            /__INITIAL_STATE__\s*=\s*({.*?});/,
            /__PRELOADED_STATE__\s*=\s*({.*?});/,
            /__NEXT_DATA__\s*=\s*({.*?});/,
            /window\.\w+\s*=\s*({.*?});/
          ];
          
          for (const pattern of windowVarPatterns) {
            const match = scriptContent.match(pattern);
            if (match && match[1]) {
              try {
                const parsed = JSON.parse(match[1]);
                const dataText = JSON.stringify(parsed);
                if (query.toLowerCase().split(' ').some(word => dataText.toLowerCase().includes(word))) {
                  debug.steps.push(`Found relevant window variable data in ${url}`);
                  return { snippet: cleanText(dataText, 1200), score: 0.95 };
                }
              } catch (e) {
                continue;
              }
            }
          }
        }
      }
      
    } catch (error) {
      debug.steps.push(`Runtime inspection error for ${url}: ${error.message}`);
    }
    
    return null;
  }

  async crawlInternalLinks(baseUrl, baseHtml, query, debug) {
    if (MAX_CRAWL_DEPTH === 0) return null;
    
    debug.steps.push(`Crawling internal links on ${baseUrl}`);
    
    try {
      const baseDomain = new URL(baseUrl).hostname;
      const linkMatches = baseHtml.match(/<a[^>]*href=["']([^"']*?)["'][^>]*>/gi) || [];
      const internalLinks = [];
      
      for (const linkMatch of linkMatches) {
        const hrefMatch = linkMatch.match(/href=["']([^"']*?)["']/i);
        if (!hrefMatch) continue;
        
        let href = hrefMatch[1];
        let fullUrl;
        
        if (href.startsWith('/')) {
          fullUrl = new URL(href, baseUrl).toString();
        } else if (href.startsWith('http')) {
          fullUrl = href;
        } else {
          continue;
        }
        
        try {
          const linkDomain = new URL(fullUrl).hostname;
          if (linkDomain === baseDomain && !this.visited.has(fullUrl)) {
            internalLinks.push(fullUrl);
            if (internalLinks.length >= 6) break; // Limit internal links
          }
        } catch (e) {
          continue;
        }
      }
      
      debug.steps.push(`Found ${internalLinks.length} internal links to check`);
      
      // Check each internal link
      for (const internalUrl of internalLinks) {
        if (this.visited.has(internalUrl)) continue;
        this.visited.add(internalUrl);
        
        // Try fast fetch first
        const html = await this.fetchHtmlRequests(internalUrl, debug);
        if (html) {
          const analysis = analyzeHtmlForQuery(html, internalUrl, query);
          if (analysis) {
            debug.steps.push(`Found relevant content in internal link: ${internalUrl}`);
            return { ...analysis, source: internalUrl };
          }
        }
        
        // Try web scraper
        const scrapedHtml = await this.fetchHtmlWithScraper(internalUrl, debug);
        if (scrapedHtml) {
          const analysis = analyzeHtmlForQuery(scrapedHtml, internalUrl, query);
          if (analysis) {
            debug.steps.push(`Found relevant content via scraper in internal link: ${internalUrl}`);
            return { ...analysis, source: internalUrl };
          }
        }
        
        // Try runtime inspection
        const runtimeResult = await this.extractFromJsRuntime(internalUrl, query, debug);
        if (runtimeResult) {
          debug.steps.push(`Found relevant runtime data in internal link: ${internalUrl}`);
          return { ...runtimeResult, source: internalUrl };
        }
      }
      
    } catch (error) {
      debug.steps.push(`Internal crawl error: ${error.message}`);
    }
    
    return null;
  }

  async deepScrape(query, debug) {
    debug.steps.push('Starting deep scrape orchestration...');
    
    // Step 1: Perform search
    const searchResults = await this.performSearch(query, debug);
    debug.search_results = searchResults;
    
    if (searchResults.length === 0) {
      debug.steps.push('No search results found');
      return {
        found: false,
        snippet: '',
        score: 0.0,
        source: null,
        debug
      };
    }
    
    // Step 2: Process each URL with multiple extraction methods
    for (const url of searchResults) {
      if (this.visited.has(url)) continue;
      this.visited.add(url);
      
      debug.steps.push(`Processing ${url} with multi-layer extraction`);
      
      // Method 1: Fast no-JS fetch
      const fastHtml = await this.fetchHtmlRequests(url, debug);
      if (fastHtml) {
        const analysis = analyzeHtmlForQuery(fastHtml, url, query);
        if (analysis) {
          debug.steps.push(`Found relevant content via fast fetch: ${url}`);
          
          // Generate AI answer
          const aiAnswer = await this.generateAIAnswer(query, analysis.snippet, debug);
          
          return {
            found: true,
            snippet: analysis.snippet,
            score: analysis.score,
            source: url,
            answer: aiAnswer,
            debug
          };
        }
      }
      
      // Method 2: JS-rendered HTML via web scraper
      const scrapedHtml = await this.fetchHtmlWithScraper(url, debug);
      if (scrapedHtml) {
        const analysis = analyzeHtmlForQuery(scrapedHtml, url, query);
        if (analysis) {
          debug.steps.push(`Found relevant content via web scraper: ${url}`);
          
          const aiAnswer = await this.generateAIAnswer(query, analysis.snippet, debug);
          
          return {
            found: true,
            snippet: analysis.snippet,
            score: analysis.score,
            source: url,
            answer: aiAnswer,
            debug
          };
        }
      }
      
      // Method 3: Runtime inspection (window vars, JSON-LD, etc.)
      const runtimeResult = await this.extractFromJsRuntime(url, query, debug);
      if (runtimeResult) {
        debug.steps.push(`Found relevant runtime data: ${url}`);
        
        const aiAnswer = await this.generateAIAnswer(query, runtimeResult.snippet, debug);
        
        return {
          found: true,
          snippet: runtimeResult.snippet,
          score: runtimeResult.score,
          source: url,
          answer: aiAnswer,
          debug
        };
      }
      
      // Method 4: Internal link crawling
      const sourceHtml = scrapedHtml || fastHtml;
      if (sourceHtml && MAX_CRAWL_DEPTH > 0) {
        const internalResult = await this.crawlInternalLinks(url, sourceHtml, query, debug);
        if (internalResult) {
          debug.steps.push(`Found relevant content via internal crawling: ${internalResult.source}`);
          
          const aiAnswer = await this.generateAIAnswer(query, internalResult.snippet, debug);
          
          return {
            found: true,
            snippet: internalResult.snippet,
            score: internalResult.score,
            source: internalResult.source,
            answer: aiAnswer,
            debug
          };
        }
      }
    }
    
    debug.steps.push('No relevant content found in any source');
    return {
      found: false,
      snippet: '',
      score: 0.0,
      source: null,
      debug
    };
  }

  async generateAIAnswer(query, context, debug) {
    try {
      debug.steps.push('Generating AI analysis of extracted content...');
      
      const response = await fetch('/integrations/anthropic-claude-sonnet-3-5/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Now in all of this data which is the context you will find the exact answer for the question asked. This is the question: ${query} and this is the context to find answer based on the question: ${context}

YOU WILL GIVE THE ANSWER CONCISELY AND PRECISELY AND EXACTLY AS THE USER WANTS IT WITHOUT LACK NEITHER OVERFLOWING DATA`
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const result = await response.json();
      const answer = result.choices[0]?.message?.content;
      
      if (answer) {
        debug.steps.push('AI analysis completed successfully');
        return answer;
      }
      
      debug.steps.push('AI analysis returned empty result');
      return null;
    } catch (error) {
      debug.steps.push(`AI analysis failed: ${error.message}`);
      console.error('AI answer generation failed:', error);
      return null;
    }
  }
}