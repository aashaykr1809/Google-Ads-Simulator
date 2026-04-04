import { CampaignSettings, SimulationResult } from './types';

export function runSimulation(settings: CampaignSettings): SimulationResult {
  const logs: string[] = [];
  logs.push(`Initializing simulation for campaign: ${settings.name}`);
  logs.push(`Targeting audience: ${settings.targetAudience} in ${settings.location}`);
  logs.push(`Industry: ${settings.industry}, Company Size: ${settings.companySize}, Device: ${settings.device}`);
  logs.push(`Simulation duration: ${settings.duration} days`);
  
  // 1. Keyword Strength & Volume Calculation
  let totalVolumePotential = 0;
  let avgKeywordQuality = 0;

  settings.keywords.forEach(kw => {
    let multiplier = 1.0;
    if (kw.matchType === 'broad') multiplier = 1.5; // High reach
    if (kw.matchType === 'exact') multiplier = 0.4; // Low reach, high precision
    if (kw.matchType === 'phrase') multiplier = 0.8;

    const kwVolume = (kw.volume || 1000) * multiplier;
    totalVolumePotential += kwVolume;
    avgKeywordQuality += (kw.difficulty ? (100 - kw.difficulty) / 100 : 0.5);
  });
  
  avgKeywordQuality = settings.keywords.length > 0 ? avgKeywordQuality / settings.keywords.length : 0.5;
  logs.push(`Calculated market reach based on ${settings.keywords.length} keywords with mixed match types.`);

  // 2. Audience & Targeting Factors
  let targetingMultiplier = 1.0;
  if (settings.industry === 'B2B SaaS') targetingMultiplier *= 0.9; // More competitive
  if (settings.companySize === 'Enterprise') targetingMultiplier *= 0.8; // Harder to reach
  if (settings.device === 'Mobile') targetingMultiplier *= 1.2; // Higher volume
  
  // 3. Creative Strength (RSA Simulation)
  const headlineScore = Math.min(settings.headlines.length / 10, 1.2);
  const descriptionScore = Math.min(settings.descriptions.length / 3, 1.1);
  const creativeStrength = headlineScore * descriptionScore * (0.9 + Math.random() * 0.2);
  
  logs.push(`Creative strength evaluated: ${(creativeStrength * 100).toFixed(0)}% based on ad asset variety.`);

  // 4. Market Dynamics & Impressions (Scaled by duration)
  const dailyBudget = settings.budget;
  const totalBudget = dailyBudget * settings.duration;
  const baseImpressions = Math.min(totalVolumePotential * settings.duration, totalBudget * 100);
  const marketVolatility = 0.85 + Math.random() * 0.3;
  
  let impressions = Math.floor(baseImpressions * avgKeywordQuality * marketVolatility * targetingMultiplier);
  
  // Bidding Strategy Impact on Impressions
  if (settings.bidStrategy === 'maximize_clicks') impressions *= 1.3;
  if (settings.bidStrategy === 'target_cpa') impressions *= 0.9;

  logs.push(`Generated ${impressions.toLocaleString()} potential impressions over ${settings.duration} days.`);

  // 5. CTR calculation
  let baseCtr = 0.025; 
  if (settings.device === 'Mobile') baseCtr *= 0.8; // Mobile often has lower CTR for search
  if (settings.device === 'Desktop') baseCtr *= 1.2;
  
  const matchTypeCtrBonus = settings.keywords.some(k => k.matchType === 'exact') ? 1.15 : 1.0;
  
  const ctr = baseCtr * creativeStrength * matchTypeCtrBonus * (0.95 + Math.random() * 0.1);
  const clicks = Math.floor(impressions * ctr);
  logs.push(`Achieved a CTR of ${(ctr * 100).toFixed(2)}%, resulting in ${clicks.toLocaleString()} clicks.`);

  // 6. Cost calculation
  let avgCpc = 1.8; 
  if (settings.industry === 'B2B SaaS') avgCpc *= 2.5; // High CPC industry
  if (settings.companySize === 'Enterprise') avgCpc *= 1.5;
  
  if (settings.bidStrategy === 'maximize_clicks') avgCpc *= 0.8;
  if (settings.bidStrategy === 'target_roas') avgCpc *= 1.4;

  // Manual CPC Logic
  if (settings.bidStrategy === 'manual_cpc' && settings.maxCpc) {
    const marketCpc = avgCpc;
    avgCpc = Math.min(marketCpc, settings.maxCpc);
    // If maxCpc is significantly lower than market, impressions drop
    if (settings.maxCpc < marketCpc * 0.7) {
      impressions *= (settings.maxCpc / marketCpc);
      logs.push(`⚠️ Low Max CPC limit ($${settings.maxCpc}) reduced impression share.`);
    }
  }

  // Target CPA / ROAS Logic
  if (settings.bidStrategy === 'target_cpa' && settings.targetCpa) {
    // Higher target CPA allows more aggressive bidding
    avgCpc *= (settings.targetCpa / 50); 
  }
  if (settings.bidStrategy === 'target_roas' && settings.targetRoas) {
    // Higher target ROAS usually means more restrictive bidding
    avgCpc *= (2.0 / settings.targetRoas);
  }

  const totalCost = Math.min(totalBudget, clicks * avgCpc * (0.9 + Math.random() * 0.2));
  const actualCpc = clicks > 0 ? totalCost / clicks : 0;
  const actualCpm = impressions > 0 ? (totalCost / impressions) * 1000 : 0;
  logs.push(`Total spend: $${totalCost.toFixed(2)} at an average CPC of $${actualCpc.toFixed(2)} (CPM: $${actualCpm.toFixed(2)}).`);

  // 7. Conversion calculation
  let baseConvRate = 0.035; 
  if (settings.industry === 'B2B SaaS') baseConvRate *= 0.7; // Lower conversion rate but higher value
  if (settings.companySize === 'Enterprise') baseConvRate *= 0.5;
  
  const matchTypeConvBonus = settings.keywords.some(k => k.matchType === 'exact') ? 1.4 : 1.0;
  
  const convRate = baseConvRate * creativeStrength * matchTypeConvBonus * (0.8 + Math.random() * 0.4);
  const conversions = Math.floor(clicks * convRate);
  logs.push(`Conversion rate of ${(convRate * 100).toFixed(2)}% led to ${conversions} conversions.`);

  const conversionValue = settings.industry === 'B2B SaaS' ? 500 : 60;
  const roas = conversions > 0 ? (conversions * conversionValue) / totalCost : 0;

  return {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: Date.now(),
    campaignSettings: { ...settings },
    metrics: {
      impressions,
      clicks,
      conversions,
      cost: totalCost,
      ctr,
      cpc: actualCpc,
      cpm: actualCpm,
      conversionRate: convRate,
      roas
    },
    logs
  };
}
