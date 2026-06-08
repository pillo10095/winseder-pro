# WhatsApp Contacts → CRM Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically create CRM `Contact` records when a WhatsApp session connects, importing the phone's contact list.

**Architecture:** Intercept Baileys' `contacts.upsert` event → filter individual contacts → extract phone from JID → dedup by phone+company → create Contact. Wrapped in a dedicated `ContactSyncService` that is called from `BaileysClientService`.

**Tech Stack:** NestJS, TypeORM, Baileys (@whiskeysockets/baileys), Jest

---

### Task 1: Create ContactSyncService unit test

**Files:**
- Create: `apps/api/test/whatsapp/contact-sync.service.spec.ts`

- [ ] **Step 1: Write the full test file**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ContactSyncService } from '@/modules/whatsapp/services/contact-sync.service';
import { Contact } from '@/modules/crm/entities/contact.entity';
import { Logger } from '@nestjs/common';

describe('ContactSyncService', () => {
  let service: ContactSyncService;
  let contactRepo: jest.Mocked<Repository<Contact>>;

  const mockContact: Contact = {
    id: 'contact-1',
    company_id: 'company-1',
    name: 'Juan Pérez',
    email: null,
    phone: '5511999999999',
    company_name: null,
    source: 'whatsapp',
    role: null,
    notes: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as Contact;

  beforeEach(async () => {
    contactRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockReturnValue(mockContact),
      save: jest.fn().mockResolvedValue(mockContact),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactSyncService,
        { provide: getRepositoryToken(Contact), useValue: contactRepo },
      ],
    }).compile();

    service = module.get<ContactSyncService>(ContactSyncService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('syncContacts', () => {
    it('should create contacts for individual JIDs that do not exist', async () => {
      contactRepo.findOne.mockResolvedValue(null);

      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net', name: 'Juan Pérez' },
        { id: '5511888888888@s.whatsapp.net', name: 'María García' },
      ];

      const result = await service.syncContacts('session-1', 'company-1', baileysContacts);

      expect(result.created).toBe(2);
      expect(result.skipped).toBe(0);
      expect(contactRepo.create).toHaveBeenCalledTimes(2);
      expect(contactRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should skip contacts that already exist by phone + company_id', async () => {
      contactRepo.findOne.mockResolvedValue(mockContact);

      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net', name: 'Juan Pérez' },
      ];

      const result = await service.syncContacts('session-1', 'company-1', baileysContacts);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(contactRepo.create).not.toHaveBeenCalled();
    });

    it('should filter out group JIDs (@g.us)', async () => {
      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net', name: 'Juan' },
        { id: '1234567890@g.us', name: 'Mi Grupo' },
      ];

      const result = await service.syncContacts('session-1', 'company-1', baileysContacts);

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(0);
    });

    it('should use phone as fallback name when contact has no name', async () => {
      contactRepo.findOne.mockResolvedValue(null);

      const baileysContacts = [
        { id: '5511999999999@s.whatsapp.net' },
      ];

      const result = await service.syncContacts('session-1', 'company-1', baileysContacts);

      expect(result.created).toBe(1);
      expect(contactRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: '5511999999999', phone: '5511999999999' }),
      );
    });

    it('should return zeroes for empty input', async () => {
      const result = await service.syncContacts('session-1', 'company-1', []);

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip contacts without an id', async () => {
      const baileysContacts = [
        { id: '' as any, name: 'No ID' },
        { id: '5511999999999@s.whatsapp.net', name: 'Valid' },
      ];

      const result = await service.syncContacts('session-1', 'company-1', baileysContacts);

      expect(result.created).toBe(1);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest test/whatsapp/contact-sync.service.spec.ts --no-coverage 2>&1`
Expected: FAIL — `Cannot find module '@/modules/whatsapp/services/contact-sync.service'`

---

### Task 2: Create ContactSyncService

**Files:**
- Create: `apps/api/src/modules/whatsapp/services/contact-sync.service.ts`

- [ ] **Step 1: Write the service**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Contact } from '../../crm/entities/contact.entity';

export interface SyncResult {
  created: number;
  skipped: number;
}

@Injectable()
export class ContactSyncService {
  private readonly logger = new Logger(ContactSyncService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async syncContacts(
    sessionId: string,
    companyId: string,
    baileysContacts: { id: string; name?: string }[],
  ): Promise<SyncResult> {
    let created = 0;
    let skipped = 0;

    for (const waContact of baileysContacts) {
      if (!waContact.id) continue;

      // Only individual contacts
      if (!waContact.id.endsWith('@s.whatsapp.net')) continue;

      const phone = waContact.id.split('@')[0];
      if (!phone) continue;

      // Check if contact already exists for this company
      const existing = await this.contactRepo.findOne({
        where: { phone, company_id: companyId },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Create new contact
      const name = waContact.name || phone;
      const contact = this.contactRepo.create({
        name,
        phone,
        source: 'whatsapp',
        company_id: companyId,
      });

      await this.contactRepo.save(contact);
      created++;
    }

    this.logger.log(`[${sessionId}] Synced contacts: ${created} created, ${skipped} skipped`);
    return { created, skipped };
  }
}
```

- [ ] **Step 2: Run the test to verify it passes**

Run: `npx jest test/whatsapp/contact-sync.service.spec.ts --no-coverage 2>&1`
Expected: PASS (6 tests)

---

### Task 3: Modify BaileysClientService to handle contacts.upsert

**Files:**
- Modify: `apps/api/src/modules/whatsapp/services/baileys-client.service.ts`

- [ ] **Step 1: Add ContactSyncService import and DI**

Add at the top of the file:

```typescript
import { ContactSyncService } from './contact-sync.service';
```

Add to constructor (after `private readonly qrEvents: QrEventsService`):

```typescript
private readonly contactSyncService: ContactSyncService,
```

- [ ] **Step 2: Add contacts.upsert handler inside registerHandlers()**

Add this block after the `messages.upsert` handler (after line 141, before closing `},`):

```typescript
        // --- Contact list from phone ---
        if (events['contacts.upsert']) {
          const contacts = events['contacts.upsert'];
          const individualContacts = contacts.filter(
            (c) => c.id && c.id.endsWith('@s.whatsapp.net'),
          );
          if (individualContacts.length > 0) {
            await this.contactSyncService.syncContacts(
              sessionId,
              companyId,
              individualContacts,
            );
          }
        }
```

- [ ] **Step 3: Verify the module compiles**

Run: `npx tsc --noEmit -p apps/api/tsconfig.json 2>&1 | head -30`
Expected: No errors

---

### Task 4: Update WhatsAppModule

**Files:**
- Modify: `apps/api/src/modules/whatsapp/whatsapp.module.ts`

- [ ] **Step 1: Import Contact entity and ContactSyncService**

Add at top:

```typescript
import { Contact } from '../crm/entities/contact.entity';
import { ContactSyncService } from './services/contact-sync.service';
```

- [ ] **Step 2: Add Contact to TypeOrm.forFeature**

Change:

```typescript
TypeOrmModule.forFeature([Session, Message, Conversation]),
```

To:

```typescript
TypeOrmModule.forFeature([Session, Message, Conversation, Contact]),
```

- [ ] **Step 3: Add ContactSyncService to providers**

Add `ContactSyncService` to the `providers` array after existing services.

- [ ] **Step 4: Verify the module compiles**

Run: `npx tsc --noEmit -p apps/api/tsconfig.json 2>&1 | head -30`
Expected: No errors

---

### Task 5: Run all WhatsApp tests and verify

- [ ] **Step 1: Run the new contact-sync test**

Run: `npx jest test/whatsapp/contact-sync.service.spec.ts --no-coverage 2>&1`
Expected: PASS (6 tests)

- [ ] **Step 2: Run full WhatsApp test suite**

Run: `npx jest test/whatsapp/ --no-coverage 2>&1`
Expected: All existing tests still pass + new tests pass

- [ ] **Step 3: Commit all changes**

```bash
git add apps/api/src/modules/whatsapp/services/contact-sync.service.ts \
       apps/api/src/modules/whatsapp/services/baileys-client.service.ts \
       apps/api/src/modules/whatsapp/whatsapp.module.ts \
       apps/api/test/whatsapp/contact-sync.service.spec.ts \
       docs/superpowers/specs/2026-05-29-whatsapp-contacts-sync-design.md \
       docs/superpowers/plans/2026-05-29-whatsapp-contacts-sync-plan.md
git commit -m "feat: auto-sync WhatsApp contacts to CRM on session connect"
```
