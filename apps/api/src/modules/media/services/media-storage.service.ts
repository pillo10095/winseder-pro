import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

export interface StorageConfig {
  provider: 's3' | 'minio';
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
}

@Injectable()
export class MediaStorageService {
  private readonly logger = new Logger(MediaStorageService.name);
  private readonly client: S3Client;
  private readonly config: StorageConfig;

  constructor(configService: ConfigService) {
    this.config = {
      provider: (configService.get<string>('STORAGE_PROVIDER') as 's3' | 'minio') || 'minio',
      endpoint: configService.get<string>('STORAGE_ENDPOINT'),
      region: configService.get<string>('STORAGE_REGION') || 'us-east-1',
      bucket: configService.get<string>('STORAGE_BUCKET') || 'wisender-media',
      accessKeyId: configService.get<string>('STORAGE_ACCESS_KEY') || 'minioadmin',
      secretAccessKey: configService.get<string>('STORAGE_SECRET_KEY') || 'minioadmin',
      forcePathStyle: configService.get<string>('STORAGE_PROVIDER') === 'minio',
    };

    this.client = new S3Client({
      endpoint: this.config.endpoint,
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: this.config.forcePathStyle,
    });

    this.logger.log(`Storage initialized: ${this.config.provider} (bucket: ${this.config.bucket})`);
  }

  async upload(key: string, body: Buffer | Readable, mimeType: string): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: body,
      ContentType: mimeType,
    });

    await this.client.send(command);
    this.logger.debug(`Uploaded: ${key}`);
  }

  async download(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return response.Body as Readable;
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    await this.client.send(command);
    this.logger.debug(`Deleted: ${key}`);
  }

  getBucket(): string {
    return this.config.bucket;
  }
}
