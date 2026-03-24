export type ScraperJobConfig = {
  jobId: 'scraper_nomura' | 'scraper_dc'
  workflowId: string
  workflowTarget: 'nomura' | 'dc'
  title: string
  description: string
  color: string
}

export const SCRAPER_JOB_CONFIGS: ScraperJobConfig[] = [
  {
    jobId: 'scraper_nomura',
    workflowId: 'investment_scraper.yml',
    workflowTarget: 'nomura',
    title: '持ち株会同期',
    description: '野村の持ち株会残高を Flola に同期します。',
    color: 'violet',
  },
  {
    jobId: 'scraper_dc',
    workflowId: 'investment_scraper.yml',
    workflowTarget: 'dc',
    title: 'DC年金同期',
    description: '確定拠出年金の残高を Flola に同期します。',
    color: 'indigo',
  },
]

export const SCRAPER_JOB_CONFIG_MAP = Object.fromEntries(
  SCRAPER_JOB_CONFIGS.map((config) => [config.jobId, config])
) as Record<ScraperJobConfig['jobId'], ScraperJobConfig>
