import { NewsSource, ServerConfig } from './types.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Free RSS Feed Sources - 100% Free, No API Keys Required
export const RSS_FEEDS: NewsSource[] = [
  // Tier 1 - Most Trusted Sources
  {
    name: 'CoinDesk',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
    tier: 'tier1_trusted',
    enabled: true
  },
  {
    name: 'Cointelegraph',
    url: 'https://cointelegraph.com/rss',
    tier: 'tier1_trusted',
    enabled: true
  },
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    tier: 'tier1_trusted',
    enabled: true
  },
  {
    name: 'The Block',
    url: 'https://www.theblock.co/rss.xml',
    tier: 'tier1_trusted',
    enabled: true
  },
  {
    name: 'Bitcoin Magazine',
    url: 'https://bitcoinmagazine.com/.rss/full/',
    tier: 'tier1_trusted',
    enabled: true
  },
  {
    name: 'CryptoSlate',
    url: 'https://cryptoslate.com/feed/',
    tier: 'tier1_trusted',
    enabled: true
  },

  // Tier 2 - Verify Before Trust
  {
    name: 'CryptoNews',
    url: 'https://cryptonews.com/news/feed/',
    tier: 'tier2_verify',
    enabled: true
  },
  {
    name: 'BeInCrypto',
    url: 'https://beincrypto.com/feed/',
    tier: 'tier2_verify',
    enabled: true
  },
  {
    name: 'U.Today',
    url: 'https://u.today/rss',
    tier: 'tier2_verify',
    enabled: true
  },

  // Official Sources - Government/Regulatory
  {
    name: 'SEC Press Releases',
    url: 'https://www.sec.gov/news/pressreleases.rss',
    tier: 'official_sources',
    enabled: true
  },

  // On-Chain Analysts - Data-Driven
  {
    name: 'Glassnode Insights',
    url: 'https://insights.glassnode.com/rss/',
    tier: 'onchain_analysts',
    enabled: true
  }
];

// High Impact Keywords for Analysis
export const IMPACT_KEYWORDS = {
  regulation: ['SEC', 'ban', 'approve', 'lawsuit', 'regulation', 'legal', 'court', 'judge', 'ruling'],
  monetary: ['Fed', 'Federal Reserve', 'interest rate', 'inflation', 'CPI', 'dollar', 'USD', 'monetary policy'],
  institutional: ['BlackRock', 'MicroStrategy', 'Tesla', 'ETF', 'Grayscale', 'institutional', 'adoption'],
  technical: ['hack', 'exploit', 'vulnerability', '51% attack', 'breach', 'security', 'bug', 'critical'],
  major_events: ['halving', 'merger', 'upgrade', 'mainnet', 'launch', 'hard fork', 'network'],
  whale_activity: ['whale', 'billion', 'massive transfer', 'dormant wallet', 'large transaction'],
  market_structure: ['exchange', 'trading', 'liquidity', 'volume', 'market maker', 'orderbook']
};

// Credibility Indicators
export const CREDIBILITY_INDICATORS = {
  trusted_sources: [
    'CoinDesk', 'The Block', 'Decrypt', 'SEC.gov', 
    'Federal Reserve', 'Glassnode', 'CryptoQuant', 'Bitcoin Magazine'
  ],
  spam_phrases: [
    '🚀 to the moon', '100x guaranteed', 'insider information',
    'buy now', 'don\'t miss out', 'limited time', 'get rich quick',
    'secret method', 'guaranteed profit', 'insider tip'
  ],
  suspicious_patterns: [
    /\$\d+.*guaranteed/i,
    /buy.*before.*pumps/i,
    /secret.*method/i,
    /guaranteed.*return/i
  ]
};

// Impact Multipliers for Different Categories
export const IMPACT_MULTIPLIERS = {
  regulation: 3.0,
  monetary: 2.5,
  institutional: 2.0,
  technical: 2.2,
  major_events: 1.8,
  whale_activity: 1.5,
  market_structure: 1.3
};

// Server Configuration
export const SERVER_CONFIG: ServerConfig = {
  port: parseInt(process.env.PORT || '3000'),
  cache_ttl_minutes: parseInt(process.env.CACHE_TTL_MINUTES || '15'),
  news_fetch_interval: parseInt(process.env.NEWS_FETCH_INTERVAL || '900000'), // 15 minutes
  credibility_threshold: parseInt(process.env.CREDIBILITY_THRESHOLD || '40'),
  impact_threshold: parseInt(process.env.IMPACT_THRESHOLD || '50'),
  max_news_age_hours: parseInt(process.env.MAX_NEWS_AGE_HOURS || '24'),
  http_mode: process.env.HTTP_MODE === 'true'
};

// Asset Detection Patterns
export const ASSET_PATTERNS = {
  bitcoin: /bitcoin|btc|₿/i,
  ethereum: /ethereum|eth|ether/i,
  binance: /binance|bnb|bsc/i,
  solana: /solana|sol/i,
  cardano: /cardano|ada/i,
  polygon: /polygon|matic/i,
  avalanche: /avalanche|avax/i,
  chainlink: /chainlink|link/i,
  polkadot: /polkadot|dot/i,
  dogecoin: /dogecoin|doge/i,
  market_wide: /crypto|cryptocurrency|digital.*asset|blockchain/i
};

// Sentiment Keywords
export const SENTIMENT_KEYWORDS = {
  positive: [
    'bullish', 'rally', 'surge', 'pump', 'moon', 'breakthrough', 
    'adoption', 'partnership', 'integration', 'upgrade', 'launch',
    'success', 'milestone', 'achievement', 'growth', 'expansion'
  ],
  negative: [
    'bearish', 'crash', 'dump', 'plunge', 'decline', 'fall',
    'hack', 'exploit', 'ban', 'restriction', 'lawsuit', 'fraud',
    'scam', 'failure', 'concern', 'risk', 'volatility', 'uncertainty'
  ]
};

export default {
  RSS_FEEDS,
  IMPACT_KEYWORDS,
  CREDIBILITY_INDICATORS,
  IMPACT_MULTIPLIERS,
  SERVER_CONFIG,
  ASSET_PATTERNS,
  SENTIMENT_KEYWORDS
};