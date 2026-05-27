export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test'
}

export enum ActivityType {
  Call = 'call',
  Email = 'email',
  Meeting = 'meeting',
  Note = 'note',
  Task = 'task'
}

export enum CampaignStatus {
  Draft = 'draft',
  Scheduled = 'scheduled',
  Sending = 'sending',
  Completed = 'completed',
  Paused = 'paused',
  Cancelled = 'cancelled',
}

export enum CampaignContactStatus {
  Pending = 'pending',
  Sent = 'sent',
  Delivered = 'delivered',
  Read = 'read',
  Failed = 'failed',
}

export enum ImportStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}
