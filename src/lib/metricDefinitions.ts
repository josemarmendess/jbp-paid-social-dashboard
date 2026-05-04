/**
 * Single source of truth for metric definitions shown in the Info tooltips.
 * Keep these in sync with how `aggregate.ts` actually computes each value
 * so the in-product help never contradicts the math.
 */
export const METRIC_DEFS = {
  // Volume
  spend: "Total amount spent on Meta Ads in the selected period.",
  leads:
    "Count of involve.me_ProjectCompleted events captured by the pixel. Counted on the date the lead was generated.",
  bookedJobs:
    "Count of jobs in ServiceTitan with Creation Date in the selected period, attributed to Social Media.",
  soldJobs: "Count of jobs with Sold On date in the selected period.",
  salesRevenue:
    "Sum of the Sales field for jobs with Sold On in the selected period.",
  spendOnRevenue:
    "Spend divided by Sales Revenue, expressed as percentage. Lower is better. n/a when revenue is 0.",

  // Rates
  ctr: "Link clicks divided by impressions. Measures ad relevance.",
  leadRate:
    "Leads divided by link clicks. Measures landing page conversion.",
  bookRate:
    "Booked Jobs divided by Leads. Measures lead quality and intake team effectiveness.",
  showRate:
    "Completed jobs divided by Booked Jobs. Measures customer follow-through.",
  closeRate:
    "Sold Jobs divided by Booked Jobs. Measures sales team effectiveness.",
  cancellationRate:
    "Cancelled jobs divided by total bookings in period. Lower is better.",

  // Pivot extras
  costPerLead: "Spend divided by Leads.",
  costPerBookedJob: "Spend divided by Booked Jobs.",
  averageSaleValue:
    "Sum of Sales divided by count of jobs that sold (Sales > 0). Excludes zeros for a realistic mean.",
  impressions:
    "Total ad impressions across all Meta placements in the selected period.",
  linkClicks:
    "Outbound link clicks captured by Meta. Higher than the on-page CTR when accounting for in-platform clicks.",
  roas:
    "Sales Revenue divided by Spend. Expressed as a multiple (e.g., 4.5x means $4.50 of revenue per $1 of ad spend).",
  avgDaysToClose:
    "Average number of days between a lead's Creation Date and its Sold On date. Lower is better.",
  avgDaysToComplete:
    "Average number of days between Sold On and Completed On for finished jobs.",
} as const;

export type MetricDefKey = keyof typeof METRIC_DEFS;
