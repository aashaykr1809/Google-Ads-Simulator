export type MatchType = 'broad' | 'phrase' | 'exact';

export interface Keyword {
  text: string;
  matchType: MatchType;
  volume?: number;
  avgCpc?: number;
  difficulty?: number;
}

export interface CampaignSettings {
  name: string;
  budget: number;
  bidStrategy: 'manual_cpc' | 'maximize_conversions' | 'target_roas' | 'target_cpa' | 'maximize_clicks';
  maxCpc?: number;
  targetCpa?: number;
  targetRoas?: number;
  keywords: Keyword[];
  headlines: string[];
  descriptions: string[];
  finalUrl: string;
  targetAudience: string;
  ageRange: string[];
  gender: string[];
  interests: string[];
  demographics: string[];
  location: string;
  industry: string;
  companySize: string;
  device: string;
  duration: number;
}

export interface SimulationResult {
  id: string;
  timestamp: number;
  campaignSettings: CampaignSettings;
  metrics: {
    impressions: number;
    clicks: number;
    conversions: number;
    cost: number;
    ctr: number;
    cpc: number;
    cpm: number;
    conversionRate: number;
    roas: number;
  };
  logs: string[];
}

export const TERMINOLOGY = {
  budget: {
    title: "Daily Budget",
    definition: "The average amount you're willing to spend each day for your campaign.",
    impact: "Higher budgets allow for more impressions and clicks, but require efficient bidding to ensure ROI. If your budget is too low, your ads might stop showing early in the day."
  },
  bidStrategy: {
    title: "Bidding Strategy",
    definition: "How you want Google to manage your bids in the ad auction.",
    options: {
      manual_cpc: "Manual CPC: You set the maximum price you're willing to pay for a click. Best for control.",
      maximize_conversions: "Maximize Conversions: Google uses AI to get as many conversions as possible within your budget.",
      target_roas: "Target ROAS: Google sets bids to help get as much conversion value as possible at the target return on ad spend you set.",
      target_cpa: "Target CPA: Google sets bids to help get as many conversions as possible at or below the target cost-per-action (CPA) you set.",
      maximize_clicks: "Maximize Clicks: Google sets bids to help get as many clicks as possible within your budget."
    }
  },
  matchType: {
    title: "Keyword Match Types",
    definition: "Match types determine how closely a search query needs to match your keyword for your ad to show.",
    significance: "Choosing the right match type is a balancing act between reach (how many people see your ad) and relevance (how well the ad matches what they're looking for).",
    options: {
      broad: {
        title: "Broad Match",
        description: "Ads may show on searches that relate to your keyword. Highest reach, lowest precision.",
        impact: "Best for brand awareness and discovering new search terms. However, it can lead to irrelevant clicks and higher spend if not monitored with negative keywords."
      },
      phrase: {
        title: "Phrase Match",
        description: "Ads may show on searches that include the meaning of your keyword. Balanced reach and precision.",
        impact: "More targeted than broad match but more flexible than exact match. It ensures your ad shows for searches that include your keyword's core meaning."
      },
      exact: {
        title: "Exact Match",
        description: "Ads may show on searches that have the same meaning as your keyword. Lowest reach, highest precision.",
        impact: "Best for high-intent keywords where you want maximum control. It typically results in the highest conversion rates and lowest waste, but limited volume."
      }
    }
  },
  responsiveAds: {
    title: "Responsive Search Ads (RSA)",
    definition: "RSAs allow you to enter multiple headlines and descriptions. Google's AI tests different combinations to see which perform best.",
    impact: "More headlines and descriptions give Google more options to match your ad to a user's specific search query, typically improving CTR."
  },
  keywords: {
    title: "Keywords",
    definition: "Words or phrases used to match your ads with the terms people are searching for.",
    impact: "Relevant keywords ensure your ads reach the right audience. Broad keywords get more reach, while specific keywords usually have higher conversion rates."
  },
  ctr: {
    title: "Click-Through Rate (CTR)",
    definition: "The percentage of people who clicked your ad after seeing it.",
    formula: "(Clicks / Impressions) * 100",
    meaning: "A high CTR (e.g., >3%) indicates that your ad is relevant and engaging to the audience."
  },
  cpc: {
    title: "Cost Per Click (CPC)",
    definition: "The average amount you pay each time someone clicks your ad.",
    formula: "Total Cost / Clicks",
    meaning: "Lower CPC means you're getting traffic more cheaply, but extremely low CPC might mean lower quality traffic."
  },
  cpm: {
    title: "Cost Per Mille (CPM)",
    definition: "The cost you pay for 1,000 impressions of your ad.",
    formula: "(Total Cost / Impressions) * 1000",
    meaning: "CPM is useful for comparing the cost of different ad placements or campaigns regardless of their CTR."
  },
  conversionRate: {
    title: "Conversion Rate",
    definition: "The percentage of clicks that resulted in a valuable action (like a purchase).",
    formula: "(Conversions / Clicks) * 100",
    meaning: "This measures how effective your landing page is at turning visitors into customers."
  },
  roas: {
    title: "Return on Ad Spend (ROAS)",
    definition: "A marketing metric that measures the amount of revenue your business earns for each dollar it spends on advertising.",
    formula: "Revenue / Ad Spend",
    meaning: "A ROAS of 4.0 means you earn $4 for every $1 spent. It's the ultimate measure of profitability."
  },
  cpa: {
    title: "Cost Per Acquisition (CPA)",
    definition: "The average cost you pay for each conversion (acquisition).",
    formula: "Total Spend / Conversions",
    meaning: "Lower CPA means you are acquiring customers more efficiently."
  },
  cac: {
    title: "Customer Acquisition Cost (CAC)",
    definition: "The total cost of acquiring a new customer.",
    formula: "Total Marketing Spend / New Customers",
    meaning: "CAC helps you understand the long-term viability of your business model when compared to Customer Lifetime Value (LTV)."
  },
  arpu: {
    title: "Avg. Revenue Per User (ARPU)",
    definition: "The average amount of revenue generated per user or customer.",
    formula: "Total Revenue / Total Users",
    meaning: "ARPU is a key metric for understanding the value each user brings to your business."
  }
};
