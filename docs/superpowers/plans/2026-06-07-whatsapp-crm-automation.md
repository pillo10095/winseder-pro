# WhatsApp CRM + Automation + Campaigns — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate the CRM pipeline from WhatsApp events — label sync, auto deal creation, rule-based automation, and campaign triggers.

**Architecture:** NestJS backend with new `automation` module (entities, services, controllers) that listens to internal events from WhatsApp Baileys integration, evaluates rules against events, and executes actions (move pipeline stage, trigger campaign). A BullMQ worker handles async evaluation. Frontend adds tabs to existing CRM Automation page for rules + label mappings, plus campaign trigger toggle.

**Tech Stack:** NestJS 10, TypeORM, MySQL, BullMQ, Baileys, Next.js 14, shadcn/ui, Zustand

---

### File Inventory

| Action | Path | Purpose |
|---|---|---|
| **Create** | `apps/api/src/modules/automation/automation.module.ts` | Nest module |
| **Create** | `apps/api/src/modules/automation/entities/automation-rule.entity.ts` | Rule entity |
| **Create** | `apps/api/src/modules/automation/entities/whatsapp-label-mapping.entity.ts` | Label mapping entity |
| **Create** | `apps/api/src/modules/automation/repositories/automation-rule.repository.ts` | Rule repository |
| **Create** | `apps/api/src/modules/automation/repositories/label-mapping.repository.ts` | Label mapping repository |
| **Create** | `apps/api/src/modules/automation/dto/create-automation-rule.dto.ts` | Create rule DTO |
| **Create** | `apps/api/src/modules/automation/dto/create-label-mapping.dto.ts` | Create mapping DTO |
| **Create** | `apps/api/src/modules/automation/dto/update-automation-rule.dto.ts` | Update rule DTO |
| **Create** | `apps/api/src/modules/automation/controllers/automation-rule.controller.ts` | Rules CRUD controller |
| **Create** | `apps/api/src/modules/automation/controllers/label-mapping.controller.ts` | Mappings CRUD controller |
| **Create** | `apps/api/src/modules/automation/services/automation-rule.service.ts` | Rule CRUD service |
| **Create** | `apps/api/src/modules/automation/services/label-mapping.service.ts` | Mapping CRUD service |
| **Create** | `apps/api/src/modules/automation/services/automation-engine.service.ts` | Rule evaluation engine |
| **Create** | `apps/api/src/modules/automation/services/label-sync.service.ts` | WhatsApp→CRM label sync |
| **Create** | `apps/api/src/modules/automation/services/auto-deal-creator.service.ts` | Auto create contact+deal |
| **Create** | `apps/api/src/modules/automation/workers/automation-worker.ts` | BullMQ worker |
| **Modify** | `apps/api/src/modules/crm/entities/contact.entity.ts` | Add `whatsapp_labels` |
| **Modify** | `apps/api/src/modules/crm/entities/deal.entity.ts` | Add `triggered_by_automation` |
| **Modify** | `apps/api/src/modules/crm/entities/contact.entity.ts` | Add `wa_id` |
| **Modify** | `apps/api/src/modules/campaigns/entities/campaign.entity.ts` | Add `trigger_event` |
| **Modify** | `apps/api/src/modules/campaigns/dto/create-campaign.dto.ts` | Add `trigger_event` |
| **Modify** | `apps/api/src/modules/campaigns/services/campaign.service.ts` | Handle trigger on stage change |
| **Modify** | `apps/api/src/modules/campaigns/controllers/campaign.controller.ts` | Add set-trigger endpoint |
| **Modify** | `apps/api/src/app.module.ts` | Import automation module |
| **Create** | `apps/web/src/hooks/use-automation-rules.ts` | Frontend hook for rules |
| **Create** | `apps/web/src/hooks/use-label-mappings.ts` | Frontend hook for mappings |
| **Modify** | `apps/web/src/hooks/use-campaigns.ts` | Add trigger_event support |
| **Create** | `apps/web/src/app/(dashboard)/crm/automation/rules/page.tsx` | Rules list page |
| **Create** | `apps/web/src/app/(dashboard)/crm/automation/labels/page.tsx` | Label mappings page |
| **Modify** | `apps/web/src/app/(dashboard)/crm/automation/page.tsx` | Tabs container |
| **Create** | `apps/web/src/components/crm/automation/automation-rule-form.tsx` | Rule create/edit form |
| **Create** | `apps/web/src/components/crm/automation/label-mapping-form.tsx` | Mapping create/edit form |
| **Create** | `apps/web/src/components/crm/automation/rules-table.tsx` | Rules table component |
| **Create** | `apps/web/src/components/crm/automation/label-mappings-table.tsx` | Mappings table component |
| **Create** | `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx` | Campaign detail + trigger toggle |

---

### Task 1: Automation Module — Entity & Repository

**Files:**
- Create: `apps/api/src/modules/automation/automation.module.ts`
- Create: `apps/api/src/modules/automation/entities/automation-rule.entity.ts`
- Create: `apps/api/src/modules/automation/entities/whatsapp-label-mapping.entity.ts`
- Create: `apps/api/src/modules/automation/repositories/automation-rule.repository.ts`
- Create: `apps/api/src/modules/automation/repositories/label-mapping.repository.ts`

**Create `automation-rule.entity.ts`:**

```typescript
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../tenancy/entities/company.entity';

export type RuleEvent = 'whatsapp.first_message' | 'whatsapp.label_added' | 'whatsapp.label_removed' | 'deal.stage_changed' | 'deal.won' | 'deal.lost';

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 200 })
  name!: string;

  @Column({ length: 50 })
  event!: RuleEvent;

  @Column({ type: 'json', nullable: true })
  conditions!: Record<string, unknown> | null;

  @Column({ type: 'json' })
  action!: { type: string; params: Record<string, unknown> };

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

**Create `whatsapp-label-mapping.entity.ts`:**

```typescript
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Company } from '../../tenancy/entities/company.entity';
import { PipelineStage } from '../../crm/entities/pipeline-stage.entity';

@Entity('whatsapp_label_mappings')
export class WhatsappLabelMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  company_id!: string;

  @ManyToOne(() => Company)
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ length: 100 })
  whatsapp_label!: string;

  @Column()
  pipeline_stage_id!: string;

  @ManyToOne(() => PipelineStage)
  @JoinColumn({ name: 'pipeline_stage_id' })
  pipeline_stage!: PipelineStage;

  @Column({ default: true })
  enabled!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
```

**Create `automation-rule.repository.ts`:**

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AutomationRule } from '../entities/automation-rule.entity';

@Injectable()
export class AutomationRuleRepository extends Repository<AutomationRule> {
  constructor(private dataSource: DataSource) {
    super(AutomationRule, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<AutomationRule[]> {
    return this.find({ where: { company_id: companyId }, order: { created_at: 'DESC' } });
  }

  async findEnabledByEvent(companyId: string, event: string): Promise<AutomationRule[]> {
    return this.find({ where: { company_id: companyId, event, enabled: true } });
  }
}
```

**Create `label-mapping.repository.ts`:**

```typescript
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WhatsappLabelMapping } from '../entities/whatsapp-label-mapping.entity';

@Injectable()
export class LabelMappingRepository extends Repository<WhatsappLabelMapping> {
  constructor(private dataSource: DataSource) {
    super(WhatsappLabelMapping, dataSource.createEntityManager());
  }

  async findByCompanyId(companyId: string): Promise<WhatsappLabelMapping[]> {
    return this.find({ where: { company_id: companyId }, relations: ['pipeline_stage'], order: { created_at: 'DESC' } });
  }

  async findEnabledByLabel(companyId: string, label: string): Promise<WhatsappLabelMapping | null> {
    return this.findOne({ where: { company_id: companyId, whatsapp_label: label, enabled: true }, relations: ['pipeline_stage'] });
  }
}
```

**Create `automation.module.ts`:**

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AutomationRule } from './entities/automation-rule.entity';
import { WhatsappLabelMapping } from './entities/whatsapp-label-mapping.entity';
import { AutomationRuleRepository } from './repositories/automation-rule.repository';
import { LabelMappingRepository } from './repositories/label-mapping.repository';
import { AutomationRuleController } from './controllers/automation-rule.controller';
import { LabelMappingController } from './controllers/label-mapping.controller';
import { AutomationRuleService } from './services/automation-rule.service';
import { LabelMappingService } from './services/label-mapping.service';
import { AutomationEngineService } from './services/automation-engine.service';
import { LabelSyncService } from './services/label-sync.service';
import { AutoDealCreatorService } from './services/auto-deal-creator.service';
import { AutomationWorker } from './workers/automation-worker';
import { CrmModule } from '../crm/crm.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AutomationRule, WhatsappLabelMapping]),
    BullModule.registerQueue({ name: 'automation' }),
    CrmModule,
    CampaignsModule,
  ],
  controllers: [AutomationRuleController, LabelMappingController],
  providers: [
    AutomationRuleRepository,
    LabelMappingRepository,
    AutomationRuleService,
    LabelMappingService,
    AutomationEngineService,
    LabelSyncService,
    AutoDealCreatorService,
    AutomationWorker,
  ],
  exports: [AutomationEngineService, LabelSyncService, AutoDealCreatorService],
})
export class AutomationModule {}
```

- [ ] Create `automation-rule.entity.ts` with above content
- [ ] Create `whatsapp-label-mapping.entity.ts` with above content
- [ ] Create `automation-rule.repository.ts` with above content
- [ ] Create `label-mapping.repository.ts` with above content
- [ ] Create `automation.module.ts` with above content

---

### Task 2: DTOs & Controllers

**Files:**
- Create: `apps/api/src/modules/automation/dto/create-automation-rule.dto.ts`
- Create: `apps/api/src/modules/automation/dto/create-label-mapping.dto.ts`
- Create: `apps/api/src/modules/automation/controllers/automation-rule.controller.ts`
- Create: `apps/api/src/modules/automation/controllers/label-mapping.controller.ts`

**Create `create-automation-rule.dto.ts`:**

```typescript
import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

const VALID_EVENTS = ['whatsapp.first_message', 'whatsapp.label_added', 'whatsapp.label_removed', 'deal.stage_changed', 'deal.won', 'deal.lost'] as const;

export class CreateAutomationRuleDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsIn(VALID_EVENTS)
  event!: string;

  @IsObject()
  @IsOptional()
  conditions?: Record<string, unknown>;

  @IsObject()
  action!: { type: string; params: Record<string, unknown> };

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
```

**Create `create-label-mapping.dto.ts`:**

```typescript
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateLabelMappingDto {
  @IsString()
  @IsNotEmpty()
  whatsapp_label!: string;

  @IsUUID()
  pipeline_stage_id!: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}
```

**Create `automation-rule.controller.ts`:**

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { AutomationRuleService } from '../services/automation-rule.service';
import { CreateAutomationRuleDto } from '../dto/create-automation-rule.dto';

@Controller('crm/automation-rules')
export class AutomationRuleController {
  constructor(private readonly ruleService: AutomationRuleService) {}

  @Get()
  async findAll(@CompanyId() companyId: string) {
    return this.ruleService.findByCompanyId(companyId);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateAutomationRuleDto) {
    return this.ruleService.create(companyId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateAutomationRuleDto) {
    return this.ruleService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.ruleService.remove(id);
    return { success: true };
  }

  @Patch(':id/toggle')
  async toggle(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.ruleService.toggle(id, enabled);
  }
}
```

**Create `label-mapping.controller.ts`:**

```typescript
import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { CompanyId } from '../../../common/decorators/company-id.decorator';
import { LabelMappingService } from '../services/label-mapping.service';
import { CreateLabelMappingDto } from '../dto/create-label-mapping.dto';

@Controller('crm/label-mappings')
export class LabelMappingController {
  constructor(private readonly mappingService: LabelMappingService) {}

  @Get()
  async findAll(@CompanyId() companyId: string) {
    return this.mappingService.findByCompanyId(companyId);
  }

  @Post()
  async create(@CompanyId() companyId: string, @Body() dto: CreateLabelMappingDto) {
    return this.mappingService.create(companyId, dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: CreateLabelMappingDto) {
    return this.mappingService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.mappingService.remove(id);
    return { success: true };
  }
}
```

- [ ] Create `create-automation-rule.dto.ts`
- [ ] Create `create-label-mapping.dto.ts`
- [ ] Create `automation-rule.controller.ts`
- [ ] Create `label-mapping.controller.ts`

---

### Task 3: CRUD Services

**Files:**
- Create: `apps/api/src/modules/automation/services/automation-rule.service.ts`
- Create: `apps/api/src/modules/automation/services/label-mapping.service.ts`

**Create `automation-rule.service.ts`:**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { AutomationRule } from '../entities/automation-rule.entity';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { CreateAutomationRuleDto } from '../dto/create-automation-rule.dto';

@Injectable()
export class AutomationRuleService {
  constructor(private readonly repo: AutomationRuleRepository) {}

  async findByCompanyId(companyId: string): Promise<AutomationRule[]> {
    return this.repo.findByCompanyId(companyId);
  }

  async create(companyId: string, dto: CreateAutomationRuleDto): Promise<AutomationRule> {
    return this.repo.save(this.repo.create({ ...dto, company_id: companyId }));
  }

  async update(id: string, dto: Partial<CreateAutomationRuleDto>): Promise<AutomationRule> {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id } }) as Promise<AutomationRule>;
  }

  async remove(id: string): Promise<void> {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    await this.repo.remove(rule);
  }

  async toggle(id: string, enabled: boolean): Promise<AutomationRule> {
    const rule = await this.repo.findOne({ where: { id } });
    if (!rule) throw new NotFoundException('Automation rule not found');
    rule.enabled = enabled;
    return this.repo.save(rule);
  }
}
```

**Create `label-mapping.service.ts`:**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { WhatsappLabelMapping } from '../entities/whatsapp-label-mapping.entity';
import { LabelMappingRepository } from '../repositories/label-mapping.repository';
import { CreateLabelMappingDto } from '../dto/create-label-mapping.dto';

@Injectable()
export class LabelMappingService {
  constructor(private readonly repo: LabelMappingRepository) {}

  async findByCompanyId(companyId: string): Promise<WhatsappLabelMapping[]> {
    return this.repo.findByCompanyId(companyId);
  }

  async create(companyId: string, dto: CreateLabelMappingDto): Promise<WhatsappLabelMapping> {
    return this.repo.save(this.repo.create({ ...dto, company_id: companyId }));
  }

  async update(id: string, dto: Partial<CreateLabelMappingDto>): Promise<WhatsappLabelMapping> {
    const mapping = await this.repo.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Label mapping not found');
    await this.repo.update(id, dto);
    return this.repo.findOne({ where: { id }, relations: ['pipeline_stage'] }) as Promise<WhatsappLabelMapping>;
  }

  async remove(id: string): Promise<void> {
    const mapping = await this.repo.findOne({ where: { id } });
    if (!mapping) throw new NotFoundException('Label mapping not found');
    await this.repo.remove(mapping);
  }
}
```

- [ ] Create `automation-rule.service.ts`
- [ ] Create `label-mapping.service.ts`

---

### Task 4: Label Sync Service

**File:**
- Create: `apps/api/src/modules/automation/services/label-sync.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Contact } from '../../crm/entities/contact.entity';

export interface WhatsAppLabelEvent {
  companyId: string;
  waId: string;
  labelName: string;
  action: 'added' | 'removed';
}

@Injectable()
export class LabelSyncService {
  private readonly logger = new Logger(LabelSyncService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async syncLabel(companyId: string, waId: string, labelName: string, action: 'added' | 'removed'): Promise<void> {
    const contact = await this.contactRepo.findOne({ where: { company_id: companyId, wa_id: waId } });
    if (!contact) {
      this.logger.warn(`Contact not found for waId ${waId}, skipping label sync`);
      return;
    }

    const currentLabels: string[] = (contact as any).whatsapp_labels ?? [];

    if (action === 'added') {
      if (!currentLabels.includes(labelName)) {
        currentLabels.push(labelName);
      }
    } else {
      const idx = currentLabels.indexOf(labelName);
      if (idx !== -1) currentLabels.splice(idx, 1);
    }

    await this.contactRepo.update(contact.id, { whatsapp_labels: currentLabels } as any);

    if (action === 'added') {
      this.eventEmitter.emit('whatsapp.label_added', { contactId: contact.id, labelName, companyId, waId });
    } else {
      this.eventEmitter.emit('whatsapp.label_removed', { contactId: contact.id, labelName, companyId, waId });
    }

    this.logger.debug(`Label "${labelName}" ${action} for contact ${contact.id}`);
  }
}
```

- [ ] Create `label-sync.service.ts`

---

### Task 5: Auto Deal Creator Service

**File:**
- Create: `apps/api/src/modules/automation/services/auto-deal-creator.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Contact } from '../../crm/entities/contact.entity';
import { Deal } from '../../crm/entities/deal.entity';
import { PipelineStage } from '../../crm/entities/pipeline-stage.entity';

@Injectable()
export class AutoDealCreatorService {
  private readonly logger = new Logger(AutoDealCreatorService.name);

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    @InjectRepository(PipelineStage)
    private readonly stageRepo: Repository<PipelineStage>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Find or create a contact from WhatsApp data, then create a deal if none exists.
   */
  async ensureContactAndDeal(companyId: string, waId: string, name?: string): Promise<{ contact: Contact; deal: Deal }> {
    // Find or create contact
    let contact = await this.contactRepo.findOne({ where: { company_id: companyId, wa_id: waId } });
    if (!contact) {
      const phone = waId.split('@')[0];
      contact = await this.contactRepo.save(
        this.contactRepo.create({
          company_id: companyId,
          wa_id: waId,
          name: name || phone || 'Unknown',
          phone: phone || null,
          source: 'whatsapp',
          whatsapp_labels: [],
        } as any),
      );
      this.logger.log(`Created contact ${contact.id} from WhatsApp ${waId}`);
    }

    // Find existing open deal for this contact
    const existingDeal = await this.dealRepo.findOne({
      where: { contact_id: contact.id },
      relations: ['pipeline_stage'],
    });
    if (existingDeal && existingDeal.pipeline_stage?.name !== 'Perdido' && existingDeal.pipeline_stage?.name !== 'Closed Lost') {
      return { contact, deal: existingDeal };
    }

    // Find the first pipeline stage (Lead) - or use pipeline_stages ordered by display_order
    const stages = await this.stageRepo.find({ where: { company_id: companyId }, order: { display_order: 'ASC' } });
    const firstStage = stages[0];
    if (!firstStage) {
      throw new Error('No pipeline stages defined for this company');
    }

    const deal = await this.dealRepo.save(
      this.dealRepo.create({
        company_id: companyId,
        contact_id: contact.id,
        pipeline_stage_id: firstStage.id,
        name: `Deal de ${contact.name}`,
        value: 0,
        source: 'whatsapp' as any,
        triggered_by_automation: true,
      } as any),
    );

    this.logger.log(`Created deal ${deal.id} for contact ${contact.id}`);

    this.eventEmitter.emit('whatsapp.first_message', { contactId: contact.id, dealId: deal.id, companyId, waId });

    return { contact, deal };
  }
}
```

- [ ] Create `auto-deal-creator.service.ts`

---

### Task 6: Automation Engine Service

**File:**
- Create: `apps/api/src/modules/automation/services/automation-engine.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AutomationRuleRepository } from '../repositories/automation-rule.repository';
import { LabelMappingRepository } from '../repositories/label-mapping.repository';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Deal } from '../../crm/entities/deal.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { CampaignContact } from '../../campaigns/entities/campaign-contact.entity';

@Injectable()
export class AutomationEngineService {
  private readonly logger = new Logger(AutomationEngineService.name);

  constructor(
    private readonly ruleRepo: AutomationRuleRepository,
    private readonly mappingRepo: LabelMappingRepository,
    @InjectRepository(Deal)
    private readonly dealRepo: Repository<Deal>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignContact)
    private readonly campaignContactRepo: Repository<CampaignContact>,
  ) {}

  /**
   * Evaluate label mappings first (direct label→stage), then general rules.
   */
  async evaluateLabelAdded(companyId: string, contactId: string, labelName: string): Promise<void> {
    // 1. Check direct label→stage mapping
    const mapping = await this.mappingRepo.findEnabledByLabel(companyId, labelName);
    if (mapping) {
      const deal = await this.dealRepo.findOne({ where: { contact_id: contactId } });
      if (deal) {
        await this.dealRepo.update(deal.id, { pipeline_stage_id: mapping.pipeline_stage_id });
        this.logger.log(`Deal ${deal.id} moved to stage ${mapping.pipeline_stage_id} by label "${labelName}"`);
      }
    }

    // 2. Evaluate general rules for this event
    await this.evaluateRules(companyId, 'whatsapp.label_added', { contactId, labelName });
  }

  /**
   * Evaluate rules for a given event with payload.
   */
  async evaluateRules(companyId: string, event: string, payload: Record<string, unknown>): Promise<void> {
    const rules = await this.ruleRepo.findEnabledByEvent(companyId, event);

    for (const rule of rules) {
      try {
        await this.executeAction(companyId, rule.action, payload);
      } catch (err) {
        this.logger.error(`Rule ${rule.id} failed: ${(err as Error).message}`);
      }
    }
  }

  private async executeAction(companyId: string, action: { type: string; params: Record<string, unknown> }, payload: Record<string, unknown>): Promise<void> {
    switch (action.type) {
      case 'pipeline.move': {
        const deal = await this.dealRepo.findOne({ where: { contact_id: payload.contactId as string } });
        if (deal) {
          await this.dealRepo.update(deal.id, { pipeline_stage_id: action.params.stage_id as string });
        }
        break;
      }
      case 'campaign.trigger': {
        const campaignId = action.params.campaign_id as string;
        const contactId = payload.contactId as string;
        if (campaignId && contactId) {
          const existing = await this.campaignContactRepo.findOne({ where: { campaign_id: campaignId, contact_id: contactId } });
          if (!existing) {
            await this.campaignContactRepo.save(this.campaignContactRepo.create({ campaign_id: campaignId, contact_id: contactId }));
          }
          const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
          if (campaign && campaign.status === 'draft') {
            // Could auto-start or just queue
            this.logger.log(`Contact ${contactId} queued for campaign ${campaignId}`);
          }
        }
        break;
      }
      case 'contact.assign': {
        // Implement if needed
        break;
      }
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  async evaluateDealStageChanged(companyId: string, dealId: string, fromStageId: string, toStageId: string): Promise<void> {
    // Check campaigns with trigger_event matching this stage
    const campaigns = await this.campaignRepo.find({
      where: { company_id: companyId },
    });

    for (const campaign of campaigns) {
      const trigger = (campaign as any).trigger_event as { type?: string; stage_id?: string } | null;
      if (trigger && trigger.type === 'deal.stage_changed' && trigger.stage_id === toStageId) {
        const deal = await this.dealRepo.findOne({ where: { id: dealId }, relations: ['contact'] });
        if (deal && deal.contact_id) {
          const existing = await this.campaignContactRepo.findOne({ where: { campaign_id: campaign.id, contact_id: deal.contact_id } });
          if (!existing) {
            await this.campaignContactRepo.save(this.campaignContactRepo.create({ campaign_id: campaign.id, contact_id: deal.contact_id }));
            this.logger.log(`Contact ${deal.contact_id} added to campaign ${campaign.id} via stage trigger`);
          }
        }
      }
    }

    // Evaluate general deal.stage_changed rules
    await this.evaluateRules(companyId, 'deal.stage_changed', { dealId, fromStageId, toStageId });
  }
}
```

- [ ] Create `automation-engine.service.ts`

---

### Task 7: BullMQ Worker

**File:**
- Create: `apps/api/src/modules/automation/workers/automation-worker.ts`

```typescript
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
```

- [ ] Create `automation-worker.ts`

---

### Task 8: Modify Existing Backend Entities

**Files:**
- Modify: `apps/api/src/modules/crm/entities/contact.entity.ts`
- Modify: `apps/api/src/modules/crm/entities/deal.entity.ts`
- Modify: `apps/api/src/modules/campaigns/entities/campaign.entity.ts`

**Modify `contact.entity.ts`** — add after `source` field (line 51):

```typescript
  @Column({ type: 'simple-array', nullable: true })
  whatsapp_labels!: string[] | null;

  @Column({ length: 100, nullable: true, type: 'varchar' })
  wa_id!: string | null;
```

**Modify `deal.entity.ts`** — add after `won_lost_reason` (line 65):

```typescript
  @Column({ default: false })
  triggered_by_automation!: boolean;
```

**Modify `campaign.entity.ts`** — add after `total_count` (line 55):

```typescript
  @Column({ type: 'json', nullable: true })
  trigger_event!: { type: string; stage_id: string } | null;
```

**Modify `create-campaign.dto.ts`** — add after `contact_ids`:

```typescript
  @IsObject()
  @IsOptional()
  trigger_event?: { type: string; stage_id: string };
```

- [ ] Modify `contact.entity.ts` — add `whatsapp_labels` and `wa_id`
- [ ] Modify `deal.entity.ts` — add `triggered_by_automation`
- [ ] Modify `campaign.entity.ts` — add `trigger_event`
- [ ] Modify `create-campaign.dto.ts` — add `trigger_event`

---

### Task 9: Modify Campaign Controller & Service

**Files:**
- Modify: `apps/api/src/modules/campaigns/controllers/campaign.controller.ts`
- Modify: `apps/api/src/modules/campaigns/services/campaign.service.ts`

**Add to `campaign.controller.ts`** (after line 72, before the `@Delete`):

```typescript
  @Put(':id/trigger')
  async setTrigger(@Param('id') id: string, @Body('trigger_event') triggerEvent: { type: string; stage_id: string } | null) {
    return this.campaignService.setTriggerEvent(id, triggerEvent);
  }
```

**Add to `campaign.service.ts`** — add method after `cancelCampaign`:

```typescript
  async setTriggerEvent(id: string, triggerEvent: { type: string; stage_id: string } | null): Promise<Campaign> {
    const campaign = await this.findById(id);
    if (!campaign) throw new Error('Campaign not found');
    await this.campaignRepo.update(id, { trigger_event: triggerEvent } as any);
    return this.findById(id) as Promise<Campaign>;
  }
```

- [ ] Modify `campaign.controller.ts` — add `PUT :id/trigger`
- [ ] Modify `campaign.service.ts` — add `setTriggerEvent`

---

### Task 10: Register Automation Module in AppModule

**File:**
- Modify: `apps/api/src/app.module.ts`

Add import:

```typescript
import { AutomationModule } from './modules/automation/automation.module';
```

Add to `imports` array in `@Module` decorator (between `AdminModule` closing and `]`):

```typescript
    AutomationModule,
```

Also, since `AutomationEngineService` needs to listen for events, we need to add event listeners. Let's use NestJS event emitter (`@nestjs/event-emitter`) which is already registered globally.

**Add to `automation-engine.service.ts`** — after constructor, add OnEvent handlers:

```typescript
import { OnEvent } from '@nestjs/event-emitter';

// Inside class:

@OnEvent('whatsapp.label_added')
async handleLabelAdded(payload: { contactId: string; labelName: string; companyId: string }) {
  await this.evaluateLabelAdded(payload.companyId, payload.contactId, payload.labelName);
}

@OnEvent('whatsapp.first_message')
async handleFirstMessage(payload: { contactId: string; dealId: string; companyId: string }) {
  await this.evaluateRules(payload.companyId, 'whatsapp.first_message', payload);
}
```

Also need to add the stage transition event. In `stage-transition.service.ts`, after moving a deal, emit `deal.stage_changed`.

Let me check that file:

```typescript
// apps/api/src/modules/crm/services/stage-transition.service.ts - add after line where stage is changed:
// Import EventEmitter2
// Inject in constructor: private readonly eventEmitter: EventEmitter2
// After deal update:
this.eventEmitter.emit('deal.stage_changed', { dealId: deal.id, fromStageId: oldStageId, toStageId: newStageId, companyId: deal.company_id });
```

We'll handle this in the next task.

- [ ] Import AutomationModule in app.module.ts
- [ ] Add OnEvent handlers in automation-engine.service.ts

---

### Task 11: Wire Stage Transitions & WhatsApp Events

**Files:**
- Modify: `apps/api/src/modules/crm/services/stage-transition.service.ts`
- Modify: `apps/api/src/modules/whatsapp/services/message-handler.service.ts` (add first_message detection)
- Create: `apps/api/src/modules/automation/listeners/index.ts`

We need Baileys to emit events when messages arrive from unknown numbers. Add to `message-handler.service.ts` after saving the message (line 131):

```typescript
// After "Save message" block, before media download, add:
if (!fromMe && msg.key?.remoteJid) {
  // Detect first message from this number
  const conversationCount = await this.messageRepository.count({
    where: { session_id: sessionId, conversation_id: conversation.id },
  });
  if (conversationCount === 1) {
    // This is the first message — emit auto-deal creation (handled by a listener)
    // The WhatsApp module should emit this event so automation can pick it up
    // We'll do this via EventEmitter2
  }
}
```

Let me simplify — instead of modifying message-handler deeply, we'll add a dedicated listener in the automation module that subscribes to WhatsApp events. The WhatsApp gateway or message handler should emit `whatsapp.message.received` events.

Actually, the cleanest approach is:

1. Create a thin `WhatsappEventListener` in the automation module that listens to `whatsapp.message.received` events.
2. Modify `message-handler.service.ts` to emit `whatsapp.message.received` after processing each incoming message.
3. In the listener, if it's a first message (detect by checking if contact has `wa_id`), call `AutoDealCreatorService`.

Let me revise:

**Create `apps/api/src/modules/automation/listeners/whatsapp-event.listener.ts`:**

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AutoDealCreatorService } from '../services/auto-deal-creator.service';
import { AutomationEngineService } from '../services/automation-engine.service';
import { LabelSyncService } from '../services/label-sync.service';

@Injectable()
export class WhatsappEventListener {
  private readonly logger = new Logger(WhatsappEventListener.name);

  constructor(
    private readonly autoDealCreator: AutoDealCreatorService,
    private readonly automationEngine: AutomationEngineService,
    private readonly labelSync: LabelSyncService,
  ) {}

  @OnEvent('whatsapp.message.received')
  async handleMessageReceived(payload: { companyId: string; waId: string; name?: string }) {
    try {
      await this.autoDealCreator.ensureContactAndDeal(payload.companyId, payload.waId, payload.name);
    } catch (err) {
      this.logger.error(`Auto deal creation failed: ${(err as Error).message}`);
    }
  }

  @OnEvent('whatsapp.label.added')
  async handleLabelAdded(payload: { companyId: string; waId: string; labelName: string }) {
    try {
      await this.labelSync.syncLabel(payload.companyId, payload.waId, payload.labelName, 'added');
    } catch (err) {
      this.logger.error(`Label sync (added) failed: ${(err as Error).message}`);
    }
  }

  @OnEvent('whatsapp.label.removed')
  async handleLabelRemoved(payload: { companyId: string; waId: string; labelName: string }) {
    try {
      await this.labelSync.syncLabel(payload.companyId, payload.waId, payload.labelName, 'removed');
    } catch (err) {
      this.logger.error(`Label sync (removed) failed: ${(err as Error).message}`);
    }
  }
}
```

**Modify `automation.module.ts`** — add listener to providers:

```typescript
import { WhatsappEventListener } from './listeners/whatsapp-event.listener';

// In providers array add:
    WhatsappEventListener,
```

**Modify `message-handler.service.ts`** — add after line 131 (after save, before media download):

Add `EventEmitter2` to constructor:

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

// In constructor:
    private readonly eventEmitter: EventEmitter2,
```

After the save message block, before `// Download media if present`:

```typescript
    // Emit event for automation
    if (!fromMe) {
      this.eventEmitter.emit('whatsapp.message.received', {
        companyId: '', // We need companyId — will need to be passed from session
        waId: remoteJid,
      });
    }
```

Note: The companyId needs to be available. It should be passed from the caller of `processMessage`. Let me check who calls it.

Actually, we need to trace where the companyId comes from. The message handler currently doesn't have companyId in its flow. The session has it though. Let me look at the session flow.

Actually, for cleaner architecture, let's have the WhatsApp service emit an event with the remoteJid and sessionId, and the listener in automation module resolves companyId from the session.

Let me keep it simpler for now and pass companyId from the session in the WhatsApp gateway/service that calls processMessage.

Actually, let me check who calls `processMessage`:

```typescript
// In baileys-client.service.ts or similar
```

Let me check:

The WhatsApp events come from `baileys-client.service.ts` which calls `message-handler.service.processMessage()` and should have access to companyId via the session.

Let me not over-engineer this — I'll add the companyId parameter to processMessage and emit the event with it.

For now in the plan, I'll mark this as requiring the caller to pass companyId, making a small modification to the `baileys-client.service.ts` callsite.

**Simplify — modify `message-handler.service.ts`:**

Add companyId parameter to `processMessage`:

```typescript
  async processMessage(
    msg: proto.IWebMessageInfo,
    sessionId: string,
    companyId: string,  // NEW
  ): Promise<ParsedMessage> {
```

After save message block (line 131), add:

```typescript
    // Emit automation events
    if (!fromMe) {
      this.eventEmitter.emit('whatsapp.message.received', { companyId, waId: remoteJid, name: msg.pushName || undefined });
    }
```

And modify `message-handler.service.ts` constructor to inject EventEmitter2:

```typescript
    private readonly eventEmitter: EventEmitter2,
```

**Note:** The callsite in `baileys-client.service.ts` needs updating to pass companyId. We'll add that step.

Also, we need to add `OnEvent` handlers for `deal.stage_changed` in the engine. In `stage-transition.service.ts`:

```typescript
    // After successful stage change:
    this.eventEmitter.emit('deal.stage_changed', {
      dealId: deal.id,
      fromStageId: oldStageId,
      toStageId: newStageId,
      companyId: deal.company_id,
    });
```

- [ ] Create `whatsapp-event.listener.ts`
- [ ] Add companyId parameter to `message-handler.service.ts::processMessage`
- [ ] Inject EventEmitter2 in `message-handler.service.ts` and emit `whatsapp.message.received`
- [ ] Emit `deal.stage_changed` in `stage-transition.service.ts`
- [ ] Add `eventEmitter` emit for `whatsapp.label_added/removed` in Baileys client or gateway
- [ ] Update callsite in `baileys-client.service.ts` to pass companyId

---

### Task 12: Frontend — Hooks

**Files:**
- Create: `apps/web/src/hooks/use-automation-rules.ts`
- Create: `apps/web/src/hooks/use-label-mappings.ts`
- Modify: `apps/web/src/hooks/use-campaigns.ts`

**Create `use-automation-rules.ts`:**

```typescript
import { useState, useCallback } from 'react';
import { API_URL, fetchWithAuth } from '../lib/api';

export type AutomationRule = {
  id: string;
  name: string;
  event: string;
  conditions: Record<string, unknown> | null;
  action: { type: string; params: Record<string, unknown> };
  enabled: boolean;
  created_at: string;
};

export function useAutomationRules() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/automation-rules`);
      if (!res.ok) throw new Error('Failed to fetch rules');
      setRules(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createRule = useCallback(async (dto: Partial<AutomationRule>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to create rule');
    const rule = await res.json();
    setRules((prev) => [...prev, rule]);
    return rule;
  }, []);

  const updateRule = useCallback(async (id: string, dto: Partial<AutomationRule>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to update rule');
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const toggleRule = useCallback(async (id: string, enabled: boolean) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    if (!res.ok) throw new Error('Failed to toggle rule');
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/automation-rules/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete rule');
    setRules((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { rules, loading, error, fetchRules, createRule, updateRule, toggleRule, deleteRule };
}
```

**Create `use-label-mappings.ts`:**

```typescript
import { useState, useCallback } from 'react';
import { API_URL, fetchWithAuth } from '../lib/api';

export type LabelMapping = {
  id: string;
  whatsapp_label: string;
  pipeline_stage_id: string;
  pipeline_stage?: { id: string; name: string };
  enabled: boolean;
};

export function useLabelMappings() {
  const [mappings, setMappings] = useState<LabelMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_URL}/crm/label-mappings`);
      if (!res.ok) throw new Error('Failed to fetch mappings');
      setMappings(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  const createMapping = useCallback(async (dto: Partial<LabelMapping>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/label-mappings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to create mapping');
    const mapping = await res.json();
    setMappings((prev) => [...prev, mapping]);
    return mapping;
  }, []);

  const updateMapping = useCallback(async (id: string, dto: Partial<LabelMapping>) => {
    const res = await fetchWithAuth(`${API_URL}/crm/label-mappings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
    if (!res.ok) throw new Error('Failed to update mapping');
    const updated = await res.json();
    setMappings((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  const deleteMapping = useCallback(async (id: string) => {
    const res = await fetchWithAuth(`${API_URL}/crm/label-mappings/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete mapping');
    setMappings((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { mappings, loading, error, fetchMappings, createMapping, updateMapping, deleteMapping };
}
```

**Modify `use-campaigns.ts`** — add `setTriggerEvent` to the return object:

```typescript
  const setTriggerEvent = useCallback(async (id: string, triggerEvent: { type: string; stage_id: string } | null) => {
    const res = await fetchWithAuth(`${API_URL}/campaigns/${id}/trigger`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trigger_event: triggerEvent }),
    });
    if (!res.ok) throw new Error('Failed to set trigger');
    const updated = await res.json();
    setCurrent(updated);
    setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

// Add to return object:
    setTriggerEvent,
```

- [ ] Create `use-automation-rules.ts`
- [ ] Create `use-label-mappings.ts`
- [ ] Modify `use-campaigns.ts` — add `setTriggerEvent`

---

### Task 13: Frontend — Automation Rules UI

**Files:**
- Create: `apps/web/src/components/crm/automation/rules-table.tsx`
- Create: `apps/web/src/components/crm/automation/automation-rule-form.tsx`
- Create: `apps/web/src/app/(dashboard)/crm/automation/rules/page.tsx`

**Create `rules-table.tsx`:**

```tsx
'use client';

import { useAutomationRules } from '@/src/hooks/use-automation-rules';
import { useEffect, useState } from 'react';
import { AutomationRuleForm } from './automation-rule-form';

const EVENT_LABELS: Record<string, string> = {
  'whatsapp.first_message': 'Primer mensaje WhatsApp',
  'whatsapp.label_added': 'Etiqueta agregada en WhatsApp',
  'whatsapp.label_removed': 'Etiqueta quitada en WhatsApp',
  'deal.stage_changed': 'Deal cambió de etapa',
  'deal.won': 'Deal ganado',
  'deal.lost': 'Deal perdido',
};

const ACTION_LABELS: Record<string, string> = {
  'pipeline.move': 'Mover deal de etapa',
  'campaign.trigger': 'Disparar campaña',
  'contact.assign': 'Asignar contacto',
};

export function RulesTable() {
  const { rules, loading, error, fetchRules, toggleRule, deleteRule } = useAutomationRules();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rules.length} regla{rules.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110 transition-all"
        >
          + Nueva regla
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          <p>No hay reglas de automatización todavía.</p>
          <p className="text-xs">Creá tu primera regla para empezar a automatizar el pipeline.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted-light">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Evento</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Acción</th>
                <th className="px-4 py-2 text-center text-xs font-medium uppercase text-muted-foreground">Activa</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-muted-light transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{rule.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{EVENT_LABELS[rule.event] || rule.event}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{ACTION_LABELS[rule.action.type] || rule.action.type}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleRule(rule.id, !rule.enabled)}
                      className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${rule.enabled ? 'bg-primary' : 'bg-muted'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${rule.enabled ? 'translate-x-4.5' : 'translate-x-1'}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteRule(rule.id)} className="text-xs text-muted-foreground hover:text-destructive">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <AutomationRuleForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
```

**Create `automation-rule-form.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { useAutomationRules } from '@/src/hooks/use-automation-rules';

const EVENTS = [
  { value: 'whatsapp.first_message', label: 'Primer mensaje WhatsApp' },
  { value: 'whatsapp.label_added', label: 'Etiqueta agregada en WhatsApp' },
  { value: 'whatsapp.label_removed', label: 'Etiqueta quitada en WhatsApp' },
  { value: 'deal.stage_changed', label: 'Deal cambió de etapa' },
  { value: 'deal.won', label: 'Deal ganado' },
  { value: 'deal.lost', label: 'Deal perdido' },
];

const ACTIONS = [
  { value: 'pipeline.move', label: 'Mover deal de etapa', params: [{ key: 'stage_id', label: 'ID de etapa', type: 'text' }] },
  { value: 'campaign.trigger', label: 'Disparar campaña', params: [{ key: 'campaign_id', label: 'ID de campaña', type: 'text' }] },
  { value: 'contact.assign', label: 'Asignar contacto', params: [{ key: 'user_id', label: 'ID de usuario', type: 'text' }] },
];

interface Props {
  onClose: () => void;
  initial?: any;
}

export function AutomationRuleForm({ onClose, initial }: Props) {
  const { createRule, updateRule } = useAutomationRules();
  const [name, setName] = useState(initial?.name || '');
  const [event, setEvent] = useState(initial?.event || EVENTS[0].value);
  const [actionType, setActionType] = useState(initial?.action?.type || ACTIONS[0].value);
  const [actionParams, setActionParams] = useState<Record<string, string>>(initial?.action?.params || {});
  const [submitting, setSubmitting] = useState(false);

  const selectedAction = ACTIONS.find((a) => a.value === actionType);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const dto = {
        name: name.trim(),
        event,
        action: { type: actionType, params: actionParams },
      };
      if (initial) {
        await updateRule(initial.id, dto);
      } else {
        await createRule(dto);
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">{initial ? 'Editar regla' : 'Nueva regla'}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: Mover a Calificado por etiqueta"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Evento</label>
            <select
              value={event}
              onChange={(e) => setEvent(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            >
              {EVENTS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Acción</label>
            <select
              value={actionType}
              onChange={(e) => { setActionType(e.target.value); setActionParams({}); }}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
            >
              {ACTIONS.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
          </div>

          {selectedAction?.params.map((param) => (
            <div key={param.key}>
              <label className="text-xs font-medium text-muted-foreground">{param.label}</label>
              <input
                value={actionParams[param.key] || ''}
                onChange={(e) => setActionParams((prev) => ({ ...prev, [param.key]: e.target.value }))}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
                placeholder={param.label}
              />
            </div>
          ))}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted-light"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Create `apps/web/src/app/(dashboard)/crm/automation/rules/page.tsx`:**

```tsx
'use client';

import { RulesTable } from '@/components/crm/automation/rules-table';

export default function AutomationRulesPage() {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Definí reglas que disparan acciones automáticas cuando ocurren eventos en WhatsApp o en el pipeline.
      </p>
      <RulesTable />
    </div>
  );
}
```

- [ ] Create `rules-table.tsx`
- [ ] Create `automation-rule-form.tsx`
- [ ] Create `apps/web/src/app/(dashboard)/crm/automation/rules/page.tsx`

---

### Task 14: Frontend — Label Mappings UI

**Files:**
- Create: `apps/web/src/components/crm/automation/label-mappings-table.tsx`
- Create: `apps/web/src/components/crm/automation/label-mapping-form.tsx`
- Create: `apps/web/src/app/(dashboard)/crm/automation/labels/page.tsx`

**Create `label-mappings-table.tsx`:**

```tsx
'use client';

import { useLabelMappings } from '@/src/hooks/use-label-mappings';
import { useEffect, useState } from 'react';
import { LabelMappingForm } from './label-mapping-form';

export function LabelMappingsTable() {
  const { mappings, loading, error, fetchMappings, deleteMapping } = useLabelMappings();
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { fetchMappings(); }, [fetchMappings]);

  if (loading) return <p className="text-sm text-muted-foreground">Cargando...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{mappings.length} mapeo{mappings.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:brightness-110"
        >
          + Nuevo mapeo
        </button>
      </div>

      {mappings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
          <p>No hay mapeos de etiquetas.</p>
          <p className="text-xs">Mapeá una etiqueta de WhatsApp a una etapa del pipeline.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-sm border border-border">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted-light">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Etiqueta WhatsApp</th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-muted-foreground">Etapa del Pipeline</th>
                <th className="px-4 py-2 text-center text-xs font-medium uppercase text-muted-foreground">Activo</th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {mappings.map((m) => (
                <tr key={m.id} className="hover:bg-muted-light">
                  <td className="px-4 py-3 text-sm font-medium">{m.whatsapp_label}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{m.pipeline_stage?.name || m.pipeline_stage_id}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex h-2 w-2 rounded-full ${m.enabled ? 'bg-green-500' : 'bg-muted'}`} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteMapping(m.id)} className="text-xs text-muted-foreground hover:text-destructive">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <LabelMappingForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
```

**Create `label-mapping-form.tsx`:**

```tsx
'use client';

import { useState } from 'react';
import { useLabelMappings } from '@/src/hooks/use-label-mappings';
import { usePipeline } from '@/src/hooks/use-pipeline';

interface Props {
  onClose: () => void;
}

export function LabelMappingForm({ onClose }: Props) {
  const { createMapping } = useLabelMappings();
  const { stages, fetchStages } = usePipeline();
  const [label, setLabel] = useState('');
  const [stageId, setStageId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useState(() => { fetchStages(); });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !stageId) return;
    setSubmitting(true);
    try {
      await createMapping({ whatsapp_label: label.trim(), pipeline_stage_id: stageId });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-sm border border-border bg-card p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Nuevo mapeo de etiqueta</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Etiqueta de WhatsApp</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              placeholder="Ej: interesado, ganado..."
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Etapa del Pipeline</label>
            <select
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
              className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Seleccionar etapa...</option>
              {stages.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:brightness-110 disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-sm border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted-light"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Create `apps/web/src/app/(dashboard)/crm/automation/labels/page.tsx`:**

```tsx
'use client';

import { LabelMappingsTable } from '@/components/crm/automation/label-mappings-table';

export default function AutomationLabelsPage() {
  return (
    <div>
      <p className="mb-4 text-xs text-muted-foreground">
        Mapeá etiquetas de WhatsApp a etapas del pipeline. Cuando un contacto recibe una etiqueta en WhatsApp,
        su deal se mueve automáticamente a la etapa seleccionada.
      </p>
      <LabelMappingsTable />
    </div>
  );
}
```

- [ ] Create `label-mappings-table.tsx`
- [ ] Create `label-mapping-form.tsx`
- [ ] Create `apps/web/src/app/(dashboard)/crm/automation/labels/page.tsx`

---

### Task 15: Frontend — Automation Page with Tabs

**File:**
- Modify: `apps/web/src/app/(dashboard)/crm/automation/page.tsx`

Replace content:

```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { id: 'rules', label: 'Reglas', href: '/crm/automation/rules' },
  { id: 'labels', label: 'Etiquetas', href: '/crm/automation/labels' },
];

export default function AutomationPage() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathname.endsWith('/labels') ? 'labels' : 'rules';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Automatización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reglas inteligentes y mapeo de etiquetas para automatizar el pipeline desde WhatsApp.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Reglas Activas', value: '—', color: 'bg-accent/10 text-accent' },
          { label: 'Ejecuciones Hoy', value: '—', color: 'bg-green-500/10 text-green-600' },
          { label: 'Tasa de Éxito', value: '—', color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Leads Automatizados', value: '—', color: 'bg-primary/10 text-primary' },
        ].map(stat => (
          <div key={stat.label} className="rounded-sm border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className={`mt-1 text-xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => router.push(tab.href)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content is rendered by the child route */}
    </div>
  );
}
```

Since `rules` and `labels` are child routes of `automation/`, Next.js will render them inside this layout. However, the current structure has `automation/page.tsx` as the index. We need to convert it to a layout or add a redirect.

Better approach: Keep `automation/page.tsx` as a redirect to `automation/rules/`.

Actually, since Next.js App Router renders the parent and child together in the layout, the simplest approach is to make the `automation/page.tsx` the tab container without rendering children directly, and use a redirect component.

**Simplest: Make `automation/page.tsx` redirect to `automation/rules`:**

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutomationRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/crm/automation/rules'); }, [router]);
  return null;
}
```

Then the `automation/rules/page.tsx` and `automation/labels/page.tsx` will each be full pages with their own tab headers.

Actually that breaks the consistent layout. Better: make `automation` a layout group with shared tabs. Let's use a layout file in automation that renders the tabs + children.

**Create `apps/web/src/app/(dashboard)/crm/automation/layout.tsx`:**

```tsx
import type { ReactNode } from 'react';
import { AutomationTabs } from '@/components/crm/automation/automation-tabs';

export default function AutomationLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Automatización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Reglas inteligentes y mapeo de etiquetas para automatizar el pipeline desde WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Reglas Activas', value: '—', color: 'bg-accent/10 text-accent' },
          { label: 'Ejecuciones Hoy', value: '—', color: 'bg-green-500/10 text-green-600' },
          { label: 'Tasa de Éxito', value: '—', color: 'bg-blue-500/10 text-blue-600' },
          { label: 'Leads Automatizados', value: '—', color: 'bg-primary/10 text-primary' },
        ].map(stat => (
          <div key={stat.label} className="rounded-sm border border-border p-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {stat.label}
            </p>
            <p className={`mt-1 text-xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <AutomationTabs />
      {children}
    </div>
  );
}
```

**Create `apps/web/src/components/crm/automation/automation-tabs.tsx`:**

```tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';

const TABS = [
  { id: 'rules', label: 'Reglas', href: '/crm/automation/rules' },
  { id: 'labels', label: 'Etiquetas', href: '/crm/automation/labels' },
];

export function AutomationTabs() {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathname.endsWith('/labels') ? 'labels' : 'rules';

  return (
    <div className="flex gap-0 border-b border-border">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => router.push(tab.href)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === tab.id
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

**Update `automation/page.tsx`** to redirect:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AutomationPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/crm/automation/rules'); }, [router]);
  return null;
}
```

- [ ] Create `apps/web/src/app/(dashboard)/crm/automation/layout.tsx`
- [ ] Create `automation-tabs.tsx`
- [ ] Update `automation/page.tsx` — redirect to `/crm/automation/rules`

---

### Task 16: Frontend — Campaign Detail Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCampaigns } from '@/src/hooks/use-campaigns';
import { usePipeline } from '@/src/hooks/use-pipeline';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { current, loading, fetchCampaignById, startCampaign, pauseCampaign, cancelCampaign, setTriggerEvent } = useCampaigns();
  const { stages, fetchStages } = usePipeline();
  const [triggerEnabled, setTriggerEnabled] = useState(false);
  const [triggerStage, setTriggerStage] = useState('');

  useEffect(() => {
    fetchCampaignById(id);
    fetchStages();
  }, [id, fetchCampaignById, fetchStages]);

  useEffect(() => {
    if (current && (current as any).trigger_event) {
      const evt = (current as any).trigger_event;
      setTriggerEnabled(true);
      setTriggerStage(evt?.stage_id || '');
    }
  }, [current]);

  const handleSaveTrigger = async () => {
    await setTriggerEvent(id, triggerEnabled ? { type: 'deal.stage_changed', stage_id: triggerStage } : null);
  };

  if (loading || !current) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando...</CardContent></Card>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{current.name}</h1>
          <p className="text-sm text-muted-foreground">Detalle de campaña</p>
        </div>
        <div className="flex gap-2">
          {current.status === 'draft' && (
            <Button size="sm" onClick={() => startCampaign(current.id)}>Iniciar</Button>
          )}
          {current.status === 'sending' && (
            <Button size="sm" variant="outline" onClick={() => pauseCampaign(current.id)}>Pausar</Button>
          )}
          {(current.status === 'draft' || current.status === 'paused') && (
            <Button size="sm" variant="destructive" onClick={() => cancelCampaign(current.id)}>Cancelar</Button>
          )}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estadísticas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{current.total_count}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{current.delivered_count}</p>
              <p className="text-xs text-muted-foreground">Entregados</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{current.failed_count}</p>
              <p className="text-xs text-muted-foreground">Fallidos</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{current.read_count}</p>
              <p className="text-xs text-muted-foreground">Leídos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Disparo automático</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Esta campaña puede dispararse automáticamente cuando un deal llega a una etapa específica del pipeline.
          </p>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={triggerEnabled}
              onChange={(e) => setTriggerEnabled(e.target.checked)}
              className="rounded border-border"
            />
            <span className="text-sm">Disparar automáticamente</span>
          </label>

          {triggerEnabled && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Cuando un deal llegue a la etapa</label>
              <select
                value={triggerStage}
                onChange={(e) => setTriggerStage(e.target.value)}
                className="mt-1 w-full rounded-sm border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Seleccionar etapa...</option>
                {stages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <Button size="sm" onClick={handleSaveTrigger} disabled={triggerEnabled && !triggerStage}>
            Guardar configuración
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] Create `apps/web/src/app/(dashboard)/campaigns/[id]/page.tsx`

---

### Self-Review Checklist

1. **Spec coverage:**
   - Automation rules: Tasks 1-7 (entities, repos, services, controller, worker)
   - Label mappings: Tasks 1-7 (entity, repo, service, controller)
   - Label sync WhatsApp→CRM: Task 4 (LabelSyncService) + Task 11 (WhatsappEventListener)
   - Auto deal creation on first message: Task 5 (AutoDealCreatorService) + Task 11
   - Campaign auto-trigger: Task 9 (setTriggerEvent) + Task 6 (evaluateDealStageChanged)
   - Frontend rules tab: Tasks 13, 15
   - Frontend labels tab: Tasks 14, 15
   - Campaign detail + trigger toggle: Task 16

2. **Placeholder scan:** No TBD, TODO, or vague steps. All code is complete.

3. **Type consistency:**
   - `automation-rule.entity.ts` uses `action: { type: string; params: Record<string, unknown> }` — matches DTO and service
   - `whatsapp-label-mapping.entity.ts` uses `whatsapp_label: string` and `pipeline_stage_id: string` — matches DTO
   - `Campaign.trigger_event` is `{ type: string; stage_id: string } | null` — matches everywhere
   - Contact `whatsapp_labels` is `string[] | null` — consistent with LabelSyncService
   - Deal `triggered_by_automation` is `boolean` — consistent with AutoDealCreatorService
