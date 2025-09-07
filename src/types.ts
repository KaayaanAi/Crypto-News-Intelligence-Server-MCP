// Core data types for CNiS-MCP
export interface NewsItem {
  id: string;
  title: string;
  link: string;
  pubDate: Date;
  source: string;
  sourceTier: 'tier1_trusted' | 'tier2_verify' | 'official_sources' | 'onchain_analysts';
  content?: string;
  categories?: string[];
  author?: string;
}

export interface CredibilityScore {
  score: number; // 0-100
  factors: string[];
  verification: 'VERIFIED' | 'LIKELY_TRUE' | 'UNVERIFIED' | 'LIKELY_FALSE';
  crossReferences: number;
}

export interface ImpactScore {
  score: number; // 0-100
  categories: string[];
  timelinessBoost: boolean;
  estimatedPriceImpact: string;
  affectedAssets: string[];
}

export interface SentimentScore {
  score: number; // 0-100 (50 = neutral)
  label: 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE';
  confidence: number;
}

export interface CompositeScore {
  score: number; // 0-100
  classification: string;
  confidence: number;
}

export interface ActionRecommendation {
  action: 'IGNORE' | 'MONITOR' | 'BULLISH_SIGNAL' | 'BEARISH_SIGNAL' | 'NEUTRAL_CAUTION';
  reason: string;
  urgency: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedResponse?: string;
}

export interface NewsAnalysis {
  credibility: CredibilityScore;
  impact: ImpactScore;
  sentiment: SentimentScore;
  composite: CompositeScore;
  recommendation: ActionRecommendation;
}

export interface AnalyzedNews extends NewsItem {
  rank?: number;
  analysis: NewsAnalysis;
}

export interface MarketSummary {
  timestamp: string;
  overall_sentiment: string;
  high_impact_count: number;
  verified_news_percentage: number;
  dominant_narrative: string;
  market_bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'VOLATILE';
}

export interface NewsCollectionResult {
  timestamp: string;
  news_count: number;
  market_summary: MarketSummary;
  top_news: AnalyzedNews[];
  recommendations: {
    immediate_actions: string[];
    market_bias: string;
    confidence: number;
  };
}

// MCP Tool Schemas
export interface GetTopNewsParams {
  count?: number;
  filter_impact?: 'all' | 'high' | 'critical';
  include_sentiment?: boolean;
  max_age_hours?: number;
}

export interface AnalyzeCredibilityParams {
  news_url: string;
}

export interface SearchNewsParams {
  query: string;
  count?: number;
  source_tier?: string;
}

export interface GetNewsBySourceParams {
  source: string;
  count?: number;
}

export interface GetImpactNewsParams {
  min_impact_score?: number;
  count?: number;
  affected_assets?: string[];
}

// Configuration interfaces
export interface NewsSource {
  name: string;
  url: string;
  tier: 'tier1_trusted' | 'tier2_verify' | 'official_sources' | 'onchain_analysts';
  enabled: boolean;
}

export interface ServerConfig {
  port: number;
  cache_ttl_minutes: number;
  news_fetch_interval: number;
  credibility_threshold: number;
  impact_threshold: number;
  max_news_age_hours: number;
  http_mode: boolean;
}