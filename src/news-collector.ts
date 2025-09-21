import Parser from 'rss-parser';
import { createHash } from 'crypto';
import { NewsItem } from './types.js';
import { RSS_FEEDS, SERVER_CONFIG } from './config.js';

export class NewsCollector {
  private parser: Parser;
  private cache: Map<string, { data: NewsItem[], timestamp: number }>;
  private readonly CACHE_KEY = 'all_news';

  constructor() {
    this.parser = new Parser({
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'CNiS-MCP/1.0.0 (Crypto News Intelligence Server)'
      }
    });
    this.cache = new Map();
  }

  /**
   * Collect news from all enabled RSS feeds
   */
  async collectAllNews(): Promise<NewsItem[]> {
    // Check cache first
    const cached = this.cache.get(this.CACHE_KEY);
    if (cached && this.isCacheValid(cached.timestamp)) {
      console.log('📰 Using cached news data');
      return cached.data;
    }

    // For testing/development environments, return mock data quickly
    if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
      const mockNews = this.generateMockNews();
      this.cache.set(this.CACHE_KEY, { data: mockNews, timestamp: Date.now() });
      console.log(`📰 Using mock news data (${mockNews.length} items)`);
      return mockNews;
    }

    console.log('🔄 Fetching fresh news from RSS feeds...');
    const allNews: NewsItem[] = [];
    const enabledFeeds = RSS_FEEDS.filter(feed => feed.enabled);

    // Collect from all feeds in parallel for speed
    const fetchPromises = enabledFeeds.map(source => 
      this.fetchFromSource(source).catch(error => {
        console.error(`❌ Failed to fetch ${source.name}:`, error.message);
        return []; // Return empty array on error, don't break the whole process
      })
    );

    try {
      const results = await Promise.allSettled(fetchPromises);
      
      for (const result of results) {
        if (result.status === 'fulfilled') {
          allNews.push(...result.value);
        }
      }

      console.log(`📊 Collected ${allNews.length} news items from ${enabledFeeds.length} sources`);
      
      // Deduplicate and filter
      const processedNews = this.processNews(allNews);
      
      // Update cache
      this.cache.set(this.CACHE_KEY, {
        data: processedNews,
        timestamp: Date.now()
      });

      return processedNews;

    } catch (error) {
      console.error('❌ Error collecting news:', error);
      
      // Return cached data if available, even if stale
      if (cached) {
        console.log('⚠️ Returning stale cached data due to fetch error');
        return cached.data;
      }
      
      throw new Error(`Failed to collect news: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Fetch news from a single RSS source
   */
  private async fetchFromSource(source: any): Promise<NewsItem[]> {
    const feed = await this.parser.parseURL(source.url);
    const items: NewsItem[] = [];

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;

      const newsItem: NewsItem = {
        id: this.generateId(item.link),
        title: this.cleanTitle(item.title),
        link: item.link,
        pubDate: new Date(item.pubDate || item.isoDate || Date.now()),
        source: source.name,
        sourceTier: source.tier,
        content: this.cleanContent(item.contentSnippet || item.content || item.summary || ''),
        categories: item.categories || [],
        author: item.creator || item.author || item.dc?.creator
      };

      // Only include recent news (within max age)
      const hoursOld = (Date.now() - newsItem.pubDate.getTime()) / (1000 * 60 * 60);
      if (hoursOld <= SERVER_CONFIG.max_news_age_hours) {
        items.push(newsItem);
      }
    }

    console.log(`✅ ${source.name}: ${items.length} items`);
    return items;
  }

  /**
   * Process and deduplicate news items
   */
  private processNews(news: NewsItem[]): NewsItem[] {
    // Step 1: Filter out very old news
    const recentNews = news.filter(item => {
      const hoursOld = (Date.now() - item.pubDate.getTime()) / (1000 * 60 * 60);
      return hoursOld <= SERVER_CONFIG.max_news_age_hours;
    });

    // Step 2: Deduplicate by title similarity
    const dedupedNews = this.deduplicateNews(recentNews);

    // Step 3: Sort by publication date (newest first)
    dedupedNews.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

    console.log(`🧹 Processed: ${news.length} → ${recentNews.length} → ${dedupedNews.length} items`);
    return dedupedNews;
  }

  /**
   * Remove duplicate news based on title similarity
   */
  private deduplicateNews(news: NewsItem[]): NewsItem[] {
    const seen = new Map<string, NewsItem>();
    
    for (const item of news) {
      const normalizedTitle = this.normalizeTitle(item.title);
      const existing = seen.get(normalizedTitle);
      
      if (!existing) {
        seen.set(normalizedTitle, item);
      } else {
        // Keep the one from the more trusted source, or the newer one
        const shouldReplace = this.shouldReplace(existing, item);
        if (shouldReplace) {
          seen.set(normalizedTitle, item);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Determine if we should replace existing news with new item
   */
  private shouldReplace(existing: NewsItem, newItem: NewsItem): boolean {
    // Priority 1: Source tier (official > tier1 > tier2)
    const tierPriority = {
      'official_sources': 4,
      'onchain_analysts': 3,
      'tier1_trusted': 2,
      'tier2_verify': 1
    };

    const existingPriority = tierPriority[existing.sourceTier] || 0;
    const newPriority = tierPriority[newItem.sourceTier] || 0;

    if (newPriority > existingPriority) return true;
    if (newPriority < existingPriority) return false;

    // Priority 2: Newer date
    return newItem.pubDate > existing.pubDate;
  }

  /**
   * Normalize title for deduplication
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with spaces
      .replace(/\s+/g, ' ') // Multiple spaces to single space
      .trim()
      .split(' ')
      .slice(0, 6) // First 6 words
      .join(' ');
  }

  /**
   * Clean and standardize title
   */
  private cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/^\s*-\s*/, '') // Remove leading dashes
      .trim();
  }

  /**
   * Clean and standardize content
   */
  private cleanContent(content: string): string {
    if (!content) return '';
    
    return content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limit content length
  }

  /**
   * Generate unique ID for news item
   */
  private generateId(link: string): string {
    return createHash('md5').update(link).digest('hex').substring(0, 12);
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(timestamp: number): boolean {
    const cacheAge = (Date.now() - timestamp) / (1000 * 60); // Age in minutes
    return cacheAge < SERVER_CONFIG.cache_ttl_minutes;
  }

  /**
   * Clear cache manually
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('🧹 News cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number, lastUpdate: string | null } {
    const cached = this.cache.get(this.CACHE_KEY);
    return {
      size: cached?.data?.length || 0,
      lastUpdate: cached ? new Date(cached.timestamp).toISOString() : null
    };
  }

  /**
   * Search news by keyword
   */
  public async searchNews(query: string, limit: number = 10): Promise<NewsItem[]> {
    const allNews = await this.collectAllNews();
    const lowerQuery = query.toLowerCase();
    
    return allNews
      .filter(item => 
        item.title.toLowerCase().includes(lowerQuery) ||
        (item.content && item.content.toLowerCase().includes(lowerQuery))
      )
      .slice(0, limit);
  }

  /**
   * Get news from specific source
   */
  public async getNewsBySource(sourceName: string, limit: number = 10): Promise<NewsItem[]> {
    const allNews = await this.collectAllNews();

    return allNews
      .filter(item => item.source.toLowerCase().includes(sourceName.toLowerCase()))
      .slice(0, limit);
  }

  /**
   * Generate mock news data for testing
   */
  private generateMockNews(): NewsItem[] {
    const mockNews: NewsItem[] = [
      {
        id: 'mock001',
        title: 'Bitcoin Reaches New All-Time High of $75,000',
        link: 'https://example.com/bitcoin-ath',
        pubDate: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        source: 'CoinDesk',
        sourceTier: 'tier1_trusted',
        content: 'Bitcoin has surged to a new all-time high of $75,000, driven by increased institutional adoption and favorable regulatory developments.',
        categories: ['Bitcoin', 'Price', 'ATH'],
        author: 'Test Author'
      },
      {
        id: 'mock002',
        title: 'Ethereum 2.0 Staking Rewards Reach 6% APY',
        link: 'https://example.com/eth-staking',
        pubDate: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        source: 'Cointelegraph',
        sourceTier: 'tier1_trusted',
        content: 'Ethereum 2.0 validators are now earning an average of 6% annual yield, making staking more attractive for institutional investors.',
        categories: ['Ethereum', 'Staking', 'DeFi'],
        author: 'Test Author'
      },
      {
        id: 'mock003',
        title: 'SEC Approves First Bitcoin ETF with Spot Holdings',
        link: 'https://example.com/bitcoin-etf',
        pubDate: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
        source: 'The Block',
        sourceTier: 'tier1_trusted',
        content: 'The Securities and Exchange Commission has approved the first Bitcoin ETF that holds actual Bitcoin, marking a major milestone for crypto adoption.',
        categories: ['Bitcoin', 'ETF', 'SEC', 'Regulation'],
        author: 'Test Author'
      },
      {
        id: 'mock004',
        title: 'Major Bank Announces Crypto Custody Services',
        link: 'https://example.com/bank-custody',
        pubDate: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
        source: 'Bitcoin Magazine',
        sourceTier: 'tier1_trusted',
        content: 'A major international bank has announced it will offer cryptocurrency custody services to institutional clients, signaling growing mainstream adoption.',
        categories: ['Banking', 'Custody', 'Institutional'],
        author: 'Test Author'
      },
      {
        id: 'mock005',
        title: 'DeFi Protocol Suffers $50M Exploit Due to Smart Contract Bug',
        link: 'https://example.com/defi-exploit',
        pubDate: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
        source: 'Decrypt',
        sourceTier: 'tier1_trusted',
        content: 'A popular DeFi protocol has lost $50 million in a sophisticated exploit that targeted a vulnerability in its smart contract code.',
        categories: ['DeFi', 'Security', 'Exploit'],
        author: 'Test Author'
      }
    ];

    return mockNews;
  }
}