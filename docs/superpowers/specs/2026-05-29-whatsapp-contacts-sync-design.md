# WhatsApp Contacts → CRM Sync

**Date:** 2026-05-29
**Status:** Approved

## Problem

When a WhatsApp session connects to wisender-pro, the phone's contact list is available via Baileys' `contacts.upsert` event. However, those contacts are NOT reflected in the CRM `contacts` table. Users cannot see or manage their WhatsApp contacts from the CRM Contacts section.

## Goal

Automatically create CRM `Contact` records for every individual WhatsApp contact (non-group) whenever a session connects, so users can see and manage all their WhatsApp contacts in the CRM.

## Non-Goals

- Do NOT create contacts for groups (`@g.us` JIDs) or broadcast lists
- Do NOT modify the frontend or add new API endpoints
- Do NOT create new database tables or migrations
- Do NOT modify the Contact entity schema

## Solution

### Architecture

```
Baileys events['contacts.upsert']
        │
        ▼
BaileysClientService (modified)
  - Adds handler for contacts.upsert
  - Filters out group JIDs (@g.us)
  - Delegates to ContactSyncService
        │
        ▼
ContactSyncService (NEW)
  - Receives: sessionId, companyId, contacts[]
  - For each contact:
    1. Extract phone from JID (strip @s.whatsapp.net)
    2. Check if Contact exists by phone + company_id
    3. If NOT exists → create Contact(name, phone, source='whatsapp')
    4. If exists → skip
  - Logs summary: N created, M skipped
```

### Files

| File | Action | Description |
|------|--------|-------------|
| `src/modules/whatsapp/services/contact-sync.service.ts` | **CREATE** | Core logic: sync Baileys contacts to CRM Contact entity |
| `src/modules/whatsapp/services/baileys-client.service.ts` | **MODIFY** | Add `contacts.upsert` handler in `registerHandlers()` |
| `src/modules/whatsapp/whatsapp.module.ts` | **MODIFY** | Import Contact entity, register ContactSyncService |

### ContactSyncService (new)

```typescript
@Injectable()
class ContactSyncService {
  constructor(
    private contactRepo: ContactRepository,
    @InjectRepository(Contact) private contactRepo: Repository<Contact>,
    private sessionRepo: SessionRepository,
  ) {}

  async syncContacts(sessionId: string, companyId: string, baileysContacts: { id: string; name?: string }[]): Promise<SyncResult>
}
```

**Key behavior:**
- Filters: only JIDs ending with `@s.whatsapp.net` or `@broadcast` — but we skip non-individual
- Phone extraction: `jid.split('@')[0]` → this gives the phone number
- Dedup: `WHERE phone = :phone AND company_id = :companyId` — if exists, skip
- Creation: `{ name: contact.name || phone, phone, source: 'whatsapp', company_id: companyId }`
- Logging: `logger.log` with created/skipped counts

### BaileysClientService changes

In `registerHandlers()`, add after the `messages.upsert` block:

```typescript
if (events['contacts.upsert']) {
  const contacts = events['contacts.upsert'];
  const individual = contacts.filter(c => c.id.endsWith('@s.whatsapp.net'));
  if (individual.length > 0) {
    await this.contactSyncService.syncContacts(sessionId, companyId, individual);
  }
}
```

**Dependency:** Inject `ContactSyncService` into `BaileysClientService`.

### WhatsAppModule changes

```typescript
imports: [
  TypeOrmModule.forFeature([Session, Message, Conversation, Contact]),
  // ...
],
providers: [
  // ... existing
  ContactSyncService,
],
```

## Edge Cases

| Case | Handling |
|------|----------|
| Contact has no name | Use phone number as fallback name |
| Contact JID is a group | Filtered out (`@g.us`) |
| Contact already exists in CRM | Skipped (dedup by phone + company_id) |
| Session disconnects mid-sync | Next reconnect triggers fresh sync |
| Baileys sends contacts before session fully connected | Handler only processes after `connection === 'open'` |
| Contact has no `id` | Skipped (invalid entry) |

## Verification

1. Start a new WhatsApp session via QR scan
2. Check logs for "Synced N contacts from WhatsApp" message
3. Query `SELECT * FROM contacts WHERE source = 'whatsapp'` — should show imported contacts
4. Sync an existing contact again — log should show it was skipped
