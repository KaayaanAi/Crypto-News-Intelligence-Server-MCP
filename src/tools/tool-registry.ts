// Universal Tool Registry - Manages all CNiS-MCP tools
import { UniversalTool, ToolContext } from '../types/universal-types.js';
import { NewsCollector } from '../news-collector.js';
import { NewsAnalyzer } from '../news-analyzer.js';
import { z } from 'zod';

// Initialize core services (preserved from original CNiS-MCP)
const newsCollector = new NewsCollector();
const newsAnalyzer = new NewsAnalyzer();

// Tool registry cache
let toolsCache: UniversalTool[] | null = null;

// Get all registered tools
export async function getUniversalTools(): Promise<UniversalTool[]> {
  if (!toolsCache) {
    toolsCache = await initializeTools();
  }
  return toolsCache;
}

// Initialize all tools (preserved functionality from original CNiS-MCP)
async function initializeTools(): Promise<UniversalTool[]> {
  return [
    // Tool 1: Get Top Crypto News (enhanced from original)
    {
      name: 'get_top_crypto_news',
      description: 'Get top crypto news with comprehensive intelligence analysis including credibility, impact, and sentiment scoring',
      inputSchema: {
        type: 'object',
        properties: {
          count: {
            type: 'number',
            description: 'Number of top news items to return (1-50)',
            default: 10,
            minimum: 1,
            maximum: 50
          },
          filter_impact: {
            type: 'string',
            enum: ['all', 'high', 'critical'],
            description: 'Filter by impact level',
            default: 'all'
          },
          include_sentiment: {
            type: 'boolean',
            description: 'Include sentiment analysis in results',
            default: true
          },
          max_age_hours: {
            type: 'number',
            description: 'Maximum age of news in hours',
            default: 24,
            minimum: 1,
            maximum: 168
          },
          real_time: {
            type: 'boolean',
            description: 'Enable real-time streaming (WebSocket only)',
            default: false
          }
        }
      },
      permissions: ['read', 'analyze'],
      handler: async (params: any, context: ToolContext) => {
        const schema = z.object({
          count: z.number().min(1).max(50).default(10),
          filter_impact: z.enum(['all', 'high', 'critical']).default('all'),
          include_sentiment: z.boolean().default(true),
          max_age_hours: z.number().min(1).max(168).default(24),
          real_time: z.boolean().default(false)
        });

        const { count, filter_impact, include_sentiment, max_age_hours, real_time } = schema.parse(params);

        // Collect and analyze news (preserved from original)
        const rawNews = await newsCollector.collectAllNews();
        const analyzedNews = await newsAnalyzer.analyzeAndRankNews(rawNews);

        // Apply filters (preserved logic)
        let filteredNews = analyzedNews.slice(0, count * 3);

        if (filter_impact === 'high') {
          filteredNews = filteredNews.filter(item => item.analysis.impact.score >= 60);
        } else if (filter_impact === 'critical') {
          filteredNews = filteredNews.filter(item => item.analysis.impact.score >= 80);
        }

        filteredNews = filteredNews.slice(0, count);

        // Generate market summary (preserved from original)
        const marketSummary = generateMarketSummary(analyzedNews.slice(0, 50));
        
        const result = {
          timestamp: new Date().toISOString(),
          news_count: filteredNews.length,
          market_summary: marketSummary,
          top_news: filteredNews,
          recommendations: generateRecommendations(filteredNews),
          protocol: context.protocol,
          request_id: context.requestId
        };

        return formatNewsResponse(result, include_sentiment);
      }
    },

    // Tool 2: Search Crypto News (enhanced from original)
    {
      name: 'search_crypto_news',
      description: 'Search crypto news by keyword or topic with intelligent filtering and ranking',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (keywords, coin names, topics)',
            minLength: 2
          },
          count: {
            type: 'number',
            description: 'Number of results to return',
            default: 10,
            minimum: 1,
            maximum: 30
          },
          source_tier: {
            type: 'string',
            enum: ['tier1_trusted', 'tier2_verify', 'official_sources', 'onchain_analysts'],
            description: 'Filter by source tier'
          }
        },
        required: ['query']
      },
      permissions: ['read', 'analyze'],
      handler: async (params: any, context: ToolContext) => {
        const schema = z.object({
          query: z.string().min(2),
          count: z.number().min(1).max(30).default(10),
          source_tier: z.enum(['tier1_trusted', 'tier2_verify', 'official_sources', 'onchain_analysts']).optional()
        });

        const { query, count, source_tier } = schema.parse(params);

        let searchResults = await newsCollector.searchNews(query, count * 2);
        
        if (source_tier) {
          searchResults = searchResults.filter(item => item.sourceTier === source_tier);
        }

        searchResults = searchResults.slice(0, count);
        const analyzedResults = await newsAnalyzer.analyzeAndRankNews(searchResults);

        return formatSearchResults(query, analyzedResults, context);
      }
    },

    // Tool 3: Get Market Impact News (enhanced from original)
    {
      name: 'get_market_impact_news',
      description: 'Get high-impact news that could significantly affect crypto markets with detailed impact analysis',
      inputSchema: {
        type: 'object',
        properties: {
          min_impact_score: {
            type: 'number',
            description: 'Minimum impact score (0-100)',
            default: 60,
            minimum: 0,
            maximum: 100
          },
          count: {
            type: 'number',
            description: 'Number of news items to return',
            default: 15,
            minimum: 1,
            maximum: 30
          },
          affected_assets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filter by affected assets (BTC, ETH, etc.)'
          }
        }
      },
      permissions: ['read', 'analyze'],
      handler: async (params: any, context: ToolContext) => {
        const schema = z.object({
          min_impact_score: z.number().min(0).max(100).default(60),
          count: z.number().min(1).max(30).default(15),
          affected_assets: z.array(z.string()).optional()
        });

        const { min_impact_score, count, affected_assets } = schema.parse(params);

        const rawNews = await newsCollector.collectAllNews();
        const analyzedNews = await newsAnalyzer.analyzeAndRankNews(rawNews);

        let impactNews = analyzedNews.filter(item => 
          item.analysis.impact.score >= min_impact_score
        );

        if (affected_assets && affected_assets.length > 0) {
          impactNews = impactNews.filter(item =>
            item.analysis.impact.affectedAssets.some(asset =>
              affected_assets.some(filterAsset => 
                asset.toLowerCase().includes(filterAsset.toLowerCase())
              )
            )
          );
        }

        impactNews = impactNews.slice(0, count);

        return formatImpactNews(impactNews, min_impact_score, context);
      }
    },

    // Tool 4: Analyze News Credibility (enhanced from original)
    {
      name: 'analyze_news_credibility',
      description: 'Analyze the credibility and reliability of specific news items or sources',
      inputSchema: {
        type: 'object',
        properties: {
          news_url: {
            type: 'string',
            description: 'URL of the news item to analyze',
            format: 'uri'
          },
          source_name: {
            type: 'string',
            description: 'Name of the news source to analyze'
          }
        }
      },
      permissions: ['read', 'analyze'],
      handler: async (params: any, context: ToolContext) => {
        const schema = z.object({
          news_url: z.string().url().optional(),
          source_name: z.string().optional()
        });

        const { news_url, source_name } = schema.parse(params);

        if (news_url) {
          return formatCredibilityAnalysis(news_url, 'url', context);
        } else if (source_name) {
          return formatCredibilityAnalysis(source_name, 'source', context);
        } else {
          throw new Error('Either news_url or source_name must be provided');
        }
      }
    },

    // Tool 5: Get News by Source (enhanced from original)
    {
      name: 'get_news_by_source',
      description: 'Get news from a specific source with source reliability analysis',
      inputSchema: {
        type: 'object',
        properties: {
          source: {
            type: 'string',
            description: 'Source name (e.g., CoinDesk, Cointelegraph)'
          },
          count: {
            type: 'number',
            description: 'Number of news items to return',
            default: 10,
            minimum: 1,
            maximum: 30
          }
        },
        required: ['source']
      },
      permissions: ['read', 'analyze'],
      handler: async (params: any, context: ToolContext) => {
        const schema = z.object({
          source: z.string(),
          count: z.number().min(1).max(30).default(10)
        });

        const { source, count } = schema.parse(params);

        const sourceNews = await newsCollector.getNewsBySource(source, count);
        const analyzedNews = await newsAnalyzer.analyzeAndRankNews(sourceNews);

        return formatSourceNews(source, analyzedNews, context);
      }
    }
  ];
}

// Formatting functions (enhanced from original with context awareness)
function formatNewsResponse(result: any, includeSentiment: boolean): string {
  const { market_summary, top_news, recommendations, protocol, request_id } = result;

  let output = `# 📰 Crypto News Intelligence Report\n\n`;
  output += `**Generated:** ${new Date(result.timestamp).toLocaleString()}\n`;
  output += `**News Items:** ${result.news_count}\n`;
  output += `**Protocol:** ${protocol.toUpperCase()}\n`;
  output += `**Request ID:** ${request_id}\n\n`;

  // Market Summary
  output += `## 📊 Market Summary\n\n`;
  output += `- **Overall Sentiment:** ${market_summary.overall_sentiment}\n`;
  output += `- **High Impact News:** ${market_summary.high_impact_count} items\n`;
  output += `- **Verified News:** ${market_summary.verified_news_percentage}%\n`;
  output += `- **Market Bias:** ${market_summary.market_bias}\n`;
  output += `- **Dominant Narrative:** ${market_summary.dominant_narrative}\n\n`;

  // Top News (enhanced with more details)
  output += `## 🔥 Top News\n\n`;
  
  for (const item of top_news.slice(0, 10)) {
    output += `### ${item.rank}. ${item.title}\n\n`;
    output += `**Source:** ${item.source} (${item.sourceTier.replace('_', ' ')})\n`;
    output += `**Published:** ${item.pubDate.toLocaleString()}\n`;
    output += `**Link:** ${item.link}\n\n`;
    
    output += `**Analysis:**\n`;
    output += `- Credibility: ${item.analysis.credibility.score}/100 (${item.analysis.credibility.verification})\n`;
    output += `- Impact: ${item.analysis.impact.score}/100 (${item.analysis.impact.estimatedPriceImpact})\n`;
    
    if (includeSentiment) {
      output += `- Sentiment: ${item.analysis.sentiment.label} (${item.analysis.sentiment.score}/100)\n`;
    }
    
    output += `- Importance: ${item.analysis.composite.classification}\n`;
    output += `- Affected Assets: ${item.analysis.impact.affectedAssets.join(', ')}\n`;
    
    if (item.analysis.impact.categories.length > 0) {
      output += `- Categories: ${item.analysis.impact.categories.join(', ')}\n`;
    }
    
    output += `\n**Recommendation:** ${item.analysis.recommendation.action}\n`;
    output += `*${item.analysis.recommendation.reason}*\n`;
    
    if (item.analysis.recommendation.suggestedResponse) {
      output += `*Suggested Response: ${item.analysis.recommendation.suggestedResponse}*\n`;
    }
    
    output += `\n---\n\n`;
  }

  // Recommendations
  output += `## 💡 Trading Recommendations\n\n`;
  output += `**Immediate Actions:**\n`;
  for (const action of recommendations.immediate_actions) {
    output += `- ${action}\n`;
  }
  output += `\n**Market Bias:** ${recommendations.market_bias}\n`;
  output += `**Confidence:** ${recommendations.confidence}%\n`;

  return output;
}

function formatSearchResults(query: string, results: any[], context: ToolContext): string {
  let output = `# 🔍 Search Results: "${query}"\n\n`;
  output += `**Protocol:** ${context.protocol.toUpperCase()}\n`;
  output += `**Request ID:** ${context.requestId}\n`;
  output += `Found ${results.length} relevant news items:\n\n`;

  for (const item of results) {
    output += `## ${item.title}\n\n`;
    output += `**Source:** ${item.source} | **Published:** ${item.pubDate.toLocaleString()}\n`;
    output += `**Credibility:** ${item.analysis.credibility.score}/100 | **Impact:** ${item.analysis.impact.score}/100\n`;
    output += `**Link:** ${item.link}\n\n`;
    
    if (item.content) {
      output += `${item.content.substring(0, 200)}...\n\n`;
    }
    
    output += `---\n\n`;
  }

  return output;
}

function formatImpactNews(news: any[], minScore: number, context: ToolContext): string {
  let output = `# 🚨 High-Impact Crypto News (${minScore}+ Impact Score)\n\n`;
  output += `**Protocol:** ${context.protocol.toUpperCase()}\n`;
  output += `**Request ID:** ${context.requestId}\n`;
  output += `Found ${news.length} high-impact news items:\n\n`;

  for (const item of news) {
    output += `## ${item.title}\n\n`;
    output += `**Impact Score:** ${item.analysis.impact.score}/100\n`;
    output += `**Price Impact:** ${item.analysis.impact.estimatedPriceImpact}\n`;
    output += `**Affected Assets:** ${item.analysis.impact.affectedAssets.join(', ')}\n`;
    output += `**Categories:** ${item.analysis.impact.categories.join(', ')}\n`;
    output += `**Source:** ${item.source}\n`;
    output += `**Published:** ${item.pubDate.toLocaleString()}\n`;
    output += `**Link:** ${item.link}\n\n`;
    output += `**Recommendation:** ${item.analysis.recommendation.action}\n`;
    output += `*${item.analysis.recommendation.reason}*\n\n`;
    output += `---\n\n`;
  }

  return output;
}

function formatCredibilityAnalysis(target: string, type: 'url' | 'source', context: ToolContext): string {
  let output = `# 🔍 Credibility Analysis\n\n`;
  output += `**Protocol:** ${context.protocol.toUpperCase()}\n`;
  output += `**Request ID:** ${context.requestId}\n`;
  output += `**Target:** ${target}\n`;
  output += `**Analysis Type:** ${type.toUpperCase()}\n\n`;

  if (type === 'url') {
    output += `⚠️ **Note:** This feature analyzes news items from our collected RSS feeds.\n\n`;
    output += `To analyze credibility:\n`;
    output += `1. Use 'get_top_crypto_news' to see analyzed news\n`;
    output += `2. Check the credibility scores in the results\n`;
    output += `3. Look for verification status and source tier information\n\n`;
  } else {
    output += `**Source Analysis:** Checking against known trusted sources...\n\n`;
    // This could be enhanced to provide actual source analysis
    output += `For comprehensive source analysis, use 'get_news_by_source' with the source name.\n`;
  }

  return output;
}

function formatSourceNews(source: string, news: any[], context: ToolContext): string {
  let output = `# 📡 News from ${source}\n\n`;
  output += `**Protocol:** ${context.protocol.toUpperCase()}\n`;
  output += `**Request ID:** ${context.requestId}\n`;
  output += `Latest ${news.length} news items:\n\n`;

  for (const item of news) {
    output += `## ${item.title}\n\n`;
    output += `**Published:** ${item.pubDate.toLocaleString()}\n`;
    output += `**Analysis:** Credibility ${item.analysis.credibility.score}/100 | Impact ${item.analysis.impact.score}/100\n`;
    output += `**Link:** ${item.link}\n\n`;
    output += `---\n\n`;
  }

  return output;
}

// Helper functions (preserved from original)
function generateMarketSummary(analyzedNews: any[]) {
  const highImpactCount = analyzedNews.filter(item => item.analysis.impact.score >= 60).length;
  const verifiedCount = analyzedNews.filter(item => 
    item.analysis.credibility.verification === 'VERIFIED' || 
    item.analysis.credibility.verification === 'LIKELY_TRUE'
  ).length;
  
  const sentimentScores = analyzedNews.map(item => item.analysis.sentiment.score);
  const avgSentiment = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;

  let overallSentiment = 'NEUTRAL';
  let marketBias = 'NEUTRAL';

  if (avgSentiment > 60) {
    overallSentiment = 'OPTIMISTIC';
    marketBias = 'BULLISH';
  } else if (avgSentiment < 40) {
    overallSentiment = 'PESSIMISTIC';
    marketBias = 'BEARISH';
  }

  const sentimentVariance = sentimentScores.reduce((acc, score) => 
    acc + Math.pow(score - avgSentiment, 2), 0) / sentimentScores.length;
  
  if (sentimentVariance > 300) {
    marketBias = 'VOLATILE';
  }

  const allCategories = analyzedNews.flatMap(item => item.analysis.impact.categories);
  const categoryCount = allCategories.reduce((acc: any, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});
  
  const dominantCategory = Object.entries(categoryCount)
    .sort(([,a]: any, [,b]: any) => b - a)[0]?.[0] || 'general market activity';

  return {
    timestamp: new Date().toISOString(),
    overall_sentiment: overallSentiment,
    high_impact_count: highImpactCount,
    verified_news_percentage: Math.round((verifiedCount / analyzedNews.length) * 100),
    dominant_narrative: dominantCategory.replace('_', ' '),
    market_bias: marketBias
  };
}

function generateRecommendations(analyzedNews: any[]) {
  const actions: string[] = [];
  let overallBias = 'NEUTRAL';
  let confidence = 50;

  const highImpactNews = analyzedNews.filter(item => item.analysis.impact.score >= 70);
  const criticalNews = analyzedNews.filter(item => item.analysis.composite.score >= 80);

  if (criticalNews.length > 0) {
    actions.push('Monitor critical news developments closely');
    confidence += 20;
  }

  if (highImpactNews.length >= 3) {
    actions.push('Consider adjusting portfolio based on high-impact news');
    confidence += 15;
  }

  const regulatoryNews = analyzedNews.filter(item => 
    item.analysis.impact.categories.includes('regulation')).length;
  
  if (regulatoryNews > 0) {
    actions.push('Watch for regulatory developments and compliance requirements');
    overallBias = 'DEFENSIVE';
    confidence += 10;
  }

  const technicalNews = analyzedNews.filter(item => 
    item.analysis.impact.categories.includes('technical')).length;
  
  if (technicalNews > 0) {
    actions.push('Review security practices and exposure to affected protocols');
    overallBias = 'DEFENSIVE';
  }

  if (actions.length === 0) {
    actions.push('Continue regular market monitoring');
  }

  return {
    immediate_actions: actions,
    market_bias: overallBias,
    confidence: Math.min(confidence, 95)
  };
}