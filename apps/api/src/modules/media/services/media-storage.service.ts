import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import { finished } from 'node:stream/promises';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  provider: 's3' | 'minio' | 'local';
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
  private readonly client: S3Client | null = null;
  private readonly config: StorageConfig;
  private readonly localDir: string;

  constructor(configService: ConfigService) {
    this.config = {
      provider: (configService.get<string>('STORAGE_PROVIDER') as 's3' | 'minio' | 'local') || 'local',
      endpoint: configService.get<string>('STORAGE_ENDPOINT'),
      region: configService.get<string>('STORAGE_REGION') || 'us-east-1',
      bucket: configService.get<string>('STORAGE_BUCKET') || 'wisender-media',
      accessKeyId: configService.get<string>('STORAGE_ACCESS_KEY') || 'minioadmin',
      secretAccessKey: configService.get<string>('STORAGE_SECRET_KEY') || 'minioadmin',
      forcePathStyle: configService.get<string>('STORAGE_PROVIDER') === 'minio',
    };

    this.localDir = path.resolve(process.cwd(), 'storage', 'media');
    fs.mkdirSync(this.localDir, { recursive: true });

    if (this.config.provider !== 'local') {
      this.client = new S3Client({
        endpoint: this.config.endpoint,
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
        forcePathStyle: this.config.forcePathStyle,
      });
    }

    this.logger.log(`Storage initialized: ${this.config.provider} (bucket: ${this.config.bucket})`);
  }

  async upload(key: string, body: Buffer | Readable, _mimeType: string): Promise<void> {
    if (this.client) {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: _mimeType,
      });
      await this.client.send(command);
    } else {
      const filePath = path.join(this.localDir, key);
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      if (body instanceof Buffer) {
        fs.writeFileSync(filePath, body);
      } else if (body instanceof Readable) {
        const ws = fs.createWriteStream(filePath);
        body.pipe(ws);
        await finished(ws);
      }
    }
    this.logger.debug(`Uploaded: ${key}`);
  }

  async download(key: string): Promise<Readable> {
    if (this.client) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      return response.Body as Readable;
    }
    return fs.createReadStream(path.join(this.localDir, key));
  }

  async getSignedUrl(key: string, _expiresInSeconds = 3600): Promise<string | null> {
    if (this.client) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      return getSignedUrl(this.client, command, { expiresIn: _expiresInSeconds });
    }
    return null;
  }

  async delete(key: string): Promise<void> {
    if (this.client) {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });
      await this.client.send(command);
    } else {
      const filePath = path.join(this.localDir, key);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    this.logger.debug(`Deleted: ${key}`);
  }

  getBucket(): string {
    return this.config.bucket;
  }
}
