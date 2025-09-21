import { 
  NewsItem, 
  CredibilityScore, 
  ImpactScore, 
  SentimentScore, 
  NewsAnalysis,
  CompositeScore,
  ActionRecommendation,
  AnalyzedNews 
} from './types.js';
import { 
  CREDIBILITY_INDICATORS, 
  IMPACT_KEYWORDS, 
  IMPACT_MULTIPLIERS,
  ASSET_PATTERNS,
  SENTIMENT_KEYWORDS,
  SERVER_CONFIG
} from './config.js';

export class NewsAnalyzer {

  /**
   * Analyze credibility of a news item
   */
  analyzeCredibility(item: NewsItem): CredibilityScore {
    let score = 50; // Base credibility score
    const factors: string[] = [];

    // Source reputation boost
    const sourceScore = this.getSourceScore(item);
    score += sourceScore.points;
    factors.push(...sourceScore.factors);

    // Check for spam/clickbait indicators
    const spamScore = this.detectSpamIndicators(item);
    score -= spamScore.penalty;
    factors.push(...spamScore.factors);

    // Time decay for unverified sources
    const timeScore = this.applyTimeDecay(item, score);
    score = timeScore.adjustedScore;
    if (timeScore.applied) {
      factors.push('Time decay applied for unverified news');
    }

    // Official source boost
    if (item.sourceTier === 'official_sources') {
      score = Math.max(score, 85);
      factors.push('Official government/regulatory source');
    }

    // Cross-reference bonus (simulated - would need full implementation)
    const crossRefBonus = this.simulateCrossReference(item);
    score += crossRefBonus;
    if (crossRefBonus > 0) {
      factors.push(`Cross-referenced across ${crossRefBonus/5} sources`);
    }

    // Ensure score is within bounds
    score = Math.min(Math.max(score, 0), 100);

    return {
      score: Math.round(score),
      factors,
      verification: this.getVerificationStatus(score),
      crossReferences: Math.floor(crossRefBonus / 5)
    };
  }

  /**
   * Analyze potential market impact
   */
  analyzeImpact(item: NewsItem): ImpactScore {
    let baseScore = 30; // Base impact score
    const detectedCategories: string[] = [];
    
    const contentToAnalyze = `${item.title} ${item.content || ''}`.toLowerCase();

    // Detect high-impact categories
    for (const [category, keywords] of Object.entries(IMPACT_KEYWORDS)) {
      for (const keyword of keywords) {
        if (contentToAnalyze.includes(keyword.toLowerCase())) {
          baseScore += 15;
          detectedCategories.push(category);
          break; // Only count each category once
        }
      }
    }

    // Apply category multipliers
    let finalScore = baseScore;
    for (const category of detectedCategories) {
      const multiplier = IMPACT_MULTIPLIERS[category as keyof typeof IMPACT_MULTIPLIERS] || 1.0;
      finalScore *= multiplier;
    }

    // Time sensitivity boost
    const timeBoost = this.calculateTimeBoost(item);
    finalScore *= timeBoost.multiplier;

    // Source tier impact adjustment
    const sourceTierMultiplier = this.getSourceImpactMultiplier(item.sourceTier);
    finalScore *= sourceTierMultiplier;

    return {
      score: Math.min(Math.round(finalScore), 100),
      categories: detectedCategories,
      timelinessBoost: timeBoost.applied,
      estimatedPriceImpact: this.estimatePriceImpact(finalScore),
      affectedAssets: this.identifyAffectedAssets(contentToAnalyze)
    };
  }

  /**
   * Analyze sentiment of news
   */
  analyzeSentiment(item: NewsItem): SentimentScore {
    const contentToAnalyze = `${item.title} ${item.content || ''}`.toLowerCase();
    let sentimentScore = 50; // Neutral base
    let positiveCount = 0;
    let negativeCount = 0;

    // Count positive sentiment words
    for (const word of SENTIMENT_KEYWORDS.positive) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentToAnalyze.match(regex);
      if (matches) {
        positiveCount += matches.length;
      }
    }

    // Count negative sentiment words
    for (const word of SENTIMENT_KEYWORDS.negative) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = contentToAnalyze.match(regex);
      if (matches) {
        negativeCount += matches.length;
      }
    }

    // Calculate sentiment score
    const totalSentiment = positiveCount + negativeCount;
    if (totalSentiment > 0) {
      sentimentScore = 50 + ((positiveCount - negativeCount) / totalSentiment) * 50;
    }

    // Apply source tier adjustment (official sources are more neutral)
    if (item.sourceTier === 'official_sources') {
      sentimentScore = sentimentScore * 0.8 + 50 * 0.2; // Pull towards neutral
    }

    // Ensure bounds
    sentimentScore = Math.min(Math.max(sentimentScore, 0), 100);

    return {
      score: Math.round(sentimentScore),
      label: this.getSentimentLabel(sentimentScore),
      confidence: this.calculateSentimentConfidence(positiveCount, negativeCount, totalSentiment)
    };
  }

  /**
   * Create comprehensive analysis of news item
   */
  analyzeNews(item: NewsItem): NewsAnalysis {
    const credibility = this.analyzeCredibility(item);
    const impact = this.analyzeImpact(item);
    const sentiment = this.analyzeSentiment(item);
    const composite = this.calculateCompositeScore(credibility, impact, sentiment);
    const recommendation = this.generateRecommendation(credibility, impact, sentiment);

    return {
      credibility,
      impact,
      sentiment,
      composite,
      recommendation
    };
  }

  /**
   * Analyze multiple news items and rank them
   */
  async analyzeAndRankNews(newsItems: NewsItem[]): Promise<AnalyzedNews[]> {
    const analyzedNews: AnalyzedNews[] = [];

    for (const item of newsItems) {
      const analysis = this.analyzeNews(item);
      analyzedNews.push({
        ...item,
        analysis
      });
    }

    // Sort by composite score (highest first)
    analyzedNews.sort((a, b) => b.analysis.composite.score - a.analysis.composite.score);

    // Add rank
    analyzedNews.forEach((item, index) => {
      item.rank = index + 1;
    });

    return analyzedNews;
  }

  // Private helper methods

  private getSourceScore(item: NewsItem): { points: number; factors: string[] } {
    const factors: string[] = [];
    let points = 0;

    if (CREDIBILITY_INDICATORS.trusted_sources.some(source => 
      item.source.toLowerCase().includes(source.toLowerCase()))) {
      points += 30;
      factors.push('Trusted news source');
    }

    // Source tier bonuses
    switch (item.sourceTier) {
      case 'tier1_trusted':
        points += 20;
        factors.push('Tier 1 trusted source');
        break;
      case 'tier2_verify':
        points += 10;
        factors.push('Tier 2 source (verify recommended)');
        break;
      case 'official_sources':
        points += 35;
        factors.push('Official regulatory/government source');
        break;
      case 'onchain_analysts':
        points += 25;
        factors.push('On-chain data analyst');
        break;
    }

    return { points, factors };
  }

  private detectSpamIndicators(item: NewsItem): { penalty: number; factors: string[] } {
    const factors: string[] = [];
    let penalty = 0;

    const titleLower = item.title.toLowerCase();
    const contentLower = (item.content || '').toLowerCase();

    // Check for spam phrases
    for (const phrase of CREDIBILITY_INDICATORS.spam_phrases) {
      if (titleLower.includes(phrase.toLowerCase()) || contentLower.includes(phrase.toLowerCase())) {
        penalty += 20;
        factors.push('Contains clickbait/spam phrases');
        break;
      }
    }

    // Check for suspicious patterns
    for (const pattern of CREDIBILITY_INDICATORS.suspicious_patterns) {
      if (pattern.test(titleLower) || pattern.test(contentLower)) {
        penalty += 25;
        factors.push('Suspicious promotional pattern detected');
        break;
      }
    }

    return { penalty, factors };
  }

  private applyTimeDecay(item: NewsItem, currentScore: number): { adjustedScore: number; applied: boolean } {
    const hoursOld = (Date.now() - item.pubDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursOld > 24 && currentScore < 70 && item.sourceTier !== 'official_sources') {
      return {
        adjustedScore: currentScore - 10,
        applied: true
      };
    }
    
    return {
      adjustedScore: currentScore,
      applied: false
    };
  }

  private simulateCrossReference(item: NewsItem): number {
    // In a real implementation, this would check for similar news across sources
    // For now, we'll simulate based on source tier and keywords
    let bonus = 0;
    
    if (item.sourceTier === 'tier1_trusted') {
      bonus += Math.random() > 0.5 ? 10 : 0; // 50% chance of cross-reference
    }
    
    return bonus;
  }

  private getVerificationStatus(score: number): 'VERIFIED' | 'LIKELY_TRUE' | 'UNVERIFIED' | 'LIKELY_FALSE' {
    if (score >= 80) return 'VERIFIED';
    if (score >= 60) return 'LIKELY_TRUE';
    if (score >= 40) return 'UNVERIFIED';
    return 'LIKELY_FALSE';
  }

  private calculateTimeBoost(item: NewsItem): { multiplier: number; applied: boolean } {
    const hoursOld = (Date.now() - item.pubDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursOld < 1) return { multiplier: 1.3, applied: true };
    if (hoursOld < 6) return { multiplier: 1.1, applied: true };
    if (hoursOld > 24) return { multiplier: 0.8, applied: true };
    
    return { multiplier: 1.0, applied: false };
  }

  private getSourceImpactMultiplier(sourceTier: string): number {
    switch (sourceTier) {
      case 'official_sources': return 1.4;
      case 'tier1_trusted': return 1.2;
      case 'onchain_analysts': return 1.1;
      default: return 1.0;
    }
  }

  private estimatePriceImpact(score: number): string {
    if (score >= 80) return 'HIGH (±5-15%)';
    if (score >= 60) return 'MEDIUM (±2-5%)';
    if (score >= 40) return 'LOW (±1-2%)';
    return 'MINIMAL (<1%)';
  }

  private identifyAffectedAssets(content: string): string[] {
    const assets = [];
    
    for (const [asset, pattern] of Object.entries(ASSET_PATTERNS)) {
      if (pattern.test(content)) {
        assets.push(asset.toUpperCase());
      }
    }
    
    return assets.length > 0 ? assets : ['MARKET_WIDE'];
  }

  private getSentimentLabel(score: number): 'VERY_NEGATIVE' | 'NEGATIVE' | 'NEUTRAL' | 'POSITIVE' | 'VERY_POSITIVE' {
    if (score >= 80) return 'VERY_POSITIVE';
    if (score >= 65) return 'POSITIVE';
    if (score >= 35) return 'NEUTRAL';
    if (score >= 20) return 'NEGATIVE';
    return 'VERY_NEGATIVE';
  }

  private calculateSentimentConfidence(positive: number, negative: number, total: number): number {
    if (total === 0) return 30; // Low confidence for neutral
    
    const dominance = Math.abs(positive - negative) / total;
    return Math.min(30 + dominance * 70, 100);
  }

  private calculateCompositeScore(
    credibility: CredibilityScore, 
    impact: ImpactScore, 
    sentiment: SentimentScore
  ): CompositeScore {
    // Weighted scoring - credibility is most important
    const weights = {
      credibility: 0.4,
      impact: 0.35,
      sentiment: 0.25
    };
    
    const score = 
      credibility.score * weights.credibility +
      impact.score * weights.impact +
      Math.abs(sentiment.score - 50) * 2 * weights.sentiment; // Sentiment strength matters more than direction
    
    return {
      score: Math.round(score),
      classification: this.classifyImportance(score),
      confidence: this.calculateOverallConfidence(credibility, impact, sentiment)
    };
  }

  private classifyImportance(score: number): string {
    if (score >= 80) return 'CRITICAL - IMMEDIATE ATTENTION';
    if (score >= 65) return 'HIGH - MONITOR CLOSELY';
    if (score >= 50) return 'MEDIUM - NOTEWORTHY';
    if (score >= 35) return 'LOW - BACKGROUND INFO';
    return 'MINIMAL - NOISE';
  }

  private calculateOverallConfidence(
    credibility: CredibilityScore, 
    impact: ImpactScore, 
    sentiment: SentimentScore
  ): number {
    // Higher credibility and more impact categories = higher confidence
    let confidence = credibility.score * 0.6;
    confidence += (impact.categories.length * 10);
    confidence += (sentiment.confidence * 0.4);
    
    return Math.min(Math.round(confidence), 100);
  }

  private generateRecommendation(
    credibility: CredibilityScore,
    impact: ImpactScore,
    sentiment: SentimentScore
  ): ActionRecommendation {
    // Low credibility = ignore
    if (credibility.score < SERVER_CONFIG.credibility_threshold) {
      return {
        action: 'IGNORE',
        reason: 'Low credibility source or likely false information',
        urgency: 'NONE'
      };
    }

    // High impact + high credibility = take action
    if (impact.score >= 70 && credibility.score >= 70) {
      let action: ActionRecommendation['action'] = 'NEUTRAL_CAUTION';
      
      if (sentiment.score > 60) {
        action = 'BULLISH_SIGNAL';
      } else if (sentiment.score < 40) {
        action = 'BEARISH_SIGNAL';
      }

      return {
        action,
        reason: `High impact ${impact.categories.join(', ')} news from trusted source`,
        urgency: impact.score >= 80 ? 'CRITICAL' : 'HIGH',
        suggestedResponse: this.getSuggestedResponse(action, impact, sentiment)
      };
    }

    // Medium importance scenarios
    if (credibility.score >= 60 && impact.score >= 50) {
      return {
        action: 'MONITOR',
        reason: 'Moderate importance news requiring attention',
        urgency: 'MEDIUM'
      };
    }

    // Default case
    return {
      action: 'MONITOR',
      reason: 'Background information worth noting',
      urgency: 'LOW'
    };
  }

  private getSuggestedResponse(
    action: ActionRecommendation['action'],
    impact: ImpactScore,
    _sentiment: SentimentScore
  ): string {
    switch (action) {
      case 'BULLISH_SIGNAL':
        return impact.categories.includes('regulation') 
          ? 'Consider increasing exposure if regulatory clarity improves'
          : 'Monitor for entry opportunities on positive momentum';
      
      case 'BEARISH_SIGNAL':
        return impact.categories.includes('technical') 
          ? 'Review security exposure and consider risk reduction'
          : 'Consider profit-taking or defensive positioning';
      
      case 'NEUTRAL_CAUTION':
        return 'Maintain current positions while monitoring developments';
      
      default:
        return 'Continue regular monitoring';
    }
  }
}