import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

interface AutomationJob {
  type: 'evaluate_label' | 'evaluate_deal_stage' | 'evaluate_first_message';
  companyId: string;
  payload: Record<string, unknown>;
}

@Processor('automation')
export class AutomationWorker extends WorkerHost {
  private readonly logger = new Logger(AutomationWorker.name);

  async process(job: Job<AutomationJob>): Promise<void> {
    this.logger.debug(`Processing automation job ${job.id}: ${job.data.type}`);

    // Jobs are dispatched by the AutomationEngineService directly.
    // The worker exists for async/retry handling of heavy rule evaluations.
    switch (job.data.type) {
      case 'evaluate_label':
      case 'evaluate_deal_stage':
      case 'evaluate_first_message':
        // These are handled synchronously by the engine service when called.
        // The queue provides retry and backpressure for future heavy workloads.
        break;
      default:
        this.logger.warn(`Unknown job type: ${job.data.type}`);
    }
  }
}
