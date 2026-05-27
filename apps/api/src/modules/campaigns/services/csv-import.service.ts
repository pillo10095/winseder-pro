import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as fs from 'node:fs';

import { Contact } from '../../crm/entities/contact.entity';
import { CampaignContact } from '../entities/campaign-contact.entity';
import { CampaignContactRepository } from '../repositories/campaign-contact.repository';

@Injectable()
export class CsvImportService {
  private readonly logger = new Logger(CsvImportService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly campaignContactRepo: CampaignContactRepository,
  ) {}

  async importFromFile(
    companyId: string,
    campaignId: string,
    filePath: string,
  ): Promise<{ imported: number; errors: string[] }> {
    const content = fs.readFileSync(filePath, 'utf-8');
    return this.importFromCsv(companyId, campaignId, content);
  }

  async importFromCsv(
    companyId: string,
    campaignId: string,
    csvContent: string,
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    let records: Record<string, string>[];
    try {
      records = this.parseCsv(csvContent);
    } catch (err) {
      throw new Error(`Error parsing CSV: ${(err as Error).message}`);
    }

    await this.dataSource.transaction(async (manager) => {
      for (const row of records) {
        try {
          const name = row.name?.trim() || row.nombre?.trim() || row.full_name?.trim();
          const phone = row.phone?.trim() || row.telefono?.trim() || row.tel?.trim() || row.mobile?.trim();
          const email = row.email?.trim() || row.correo?.trim() || row['e-mail']?.trim();

          if (!name && !phone) {
            errors.push(`Row missing name and phone: ${JSON.stringify(row)}`);
            continue;
          }

          let contact = await manager.findOne(Contact, {
            where: [
              ...(phone ? [{ company_id: companyId, phone }] : []),
              ...(email ? [{ company_id: companyId, email }] : []),
            ],
          });

          if (!contact) {
            contact = manager.create(Contact, {
              company_id: companyId,
              name: name || phone || 'Unknown',
              phone: phone || null,
              email: email || null,
              company_name: row.company?.trim() || row.empresa?.trim() || null,
              source: 'import',
            });
            contact = await manager.save(Contact, contact);
          }

          const exists = await manager.findOne(CampaignContact, {
            where: { campaign_id: campaignId, contact_id: contact.id },
          });

          if (!exists) {
            await manager.save(CampaignContact, {
              campaign_id: campaignId,
              contact_id: contact.id,
            });
          }

          imported++;
        } catch (err) {
          errors.push(`Error processing row: ${(err as Error).message}`);
        }
      }
    });

    return { imported, errors };
  }

  private parseCsv(content: string): Record<string, string>[] {
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = this.parseCsvLine(lines[0]);
    const records: Record<string, string>[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]);
      if (values.length === 0) continue;

      const record: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j]?.trim() ?? '';
      }
      records.push(record);
    }

    return records;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result.map((v) => v.trim());
  }
}
