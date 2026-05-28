import { Test, type TestingModule } from '@nestjs/testing';

import { AutomationRuleController } from '@/modules/chatbot/controllers/automation-rule.controller';
import { AutomationRuleRepository } from '@/modules/chatbot/repositories/automation-rule.repository';

describe('AutomationRuleController', () => {
  let controller: AutomationRuleController;
  let ruleRepo: AutomationRuleRepository;

  const mockRuleRepo = {
    find: jest.fn(),
    findByIdAndCompany: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const companyId = 'company-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationRuleController],
      providers: [
        { provide: AutomationRuleRepository, useValue: mockRuleRepo },
      ],
    }).compile();

    controller = module.get<AutomationRuleController>(AutomationRuleController);
    ruleRepo = module.get<AutomationRuleRepository>(AutomationRuleRepository);

    jest.clearAllMocks();
  });

  describe('GET /automation-rules', () => {
    it('should return all rules ordered by priority', async () => {
      const rules = [{ id: 'rule-1', name: 'Auto Reply', priority: 0 }];
      mockRuleRepo.find.mockResolvedValue(rules);

      const result = await controller.findAll(companyId);

      expect(ruleRepo.find).toHaveBeenCalledWith({
        where: { company_id: companyId },
        order: { priority: 'ASC' },
      });
      expect(result).toEqual(rules);
    });

    it('should return empty array when no rules', async () => {
      mockRuleRepo.find.mockResolvedValue([]);

      const result = await controller.findAll(companyId);

      expect(result).toEqual([]);
    });
  });

  describe('GET /automation-rules/:id', () => {
    it('should return a rule by id and company', async () => {
      const rule = { id: 'rule-1', name: 'Auto Reply', company_id: companyId };
      mockRuleRepo.findByIdAndCompany.mockResolvedValue(rule);

      const result = await controller.findOne(companyId, 'rule-1');

      expect(ruleRepo.findByIdAndCompany).toHaveBeenCalledWith('rule-1', companyId);
      expect(result).toEqual(rule);
    });

    it('should return null when not found', async () => {
      mockRuleRepo.findByIdAndCompany.mockResolvedValue(null);

      const result = await controller.findOne(companyId, 'non-existent');

      expect(result).toBeNull();
    });
  });

  describe('POST /automation-rules', () => {
    it('should create a rule', async () => {
      const dto = {
        name: 'New Rule',
        conditions: [{ field: 'message.content', operator: 'contains', value: 'hello' }],
        actions: [{ type: 'reply.text', config: { message: 'Hi there!' } }],
      };
      const entity = { ...dto, company_id: companyId };
      const saved = { id: 'rule-2', ...entity };
      mockRuleRepo.create.mockReturnValue(entity);
      mockRuleRepo.save.mockResolvedValue(saved);

      const result = await controller.create(companyId, dto as any);

      expect(ruleRepo.create).toHaveBeenCalledWith({ ...dto, company_id: companyId });
      expect(ruleRepo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(saved);
    });
  });

  describe('PATCH /automation-rules/:id', () => {
    it('should update a rule', async () => {
      const dto = { name: 'Updated Rule' };
      const updated = { id: 'rule-1', name: 'Updated Rule', company_id: companyId };
      mockRuleRepo.update.mockResolvedValue({ affected: 1 } as any);
      mockRuleRepo.findByIdAndCompany.mockResolvedValue(updated);

      const result = await controller.update(companyId, 'rule-1', dto as any);

      expect(ruleRepo.update).toHaveBeenCalledWith({ id: 'rule-1', company_id: companyId }, dto);
      expect(ruleRepo.findByIdAndCompany).toHaveBeenCalledWith('rule-1', companyId);
      expect(result).toEqual(updated);
    });
  });

  describe('PATCH /automation-rules/:id/toggle', () => {
    it('should toggle is_active from true to false', async () => {
      const rule = { id: 'rule-1', name: 'Rule', is_active: true, company_id: companyId };
      const toggled = { ...rule, is_active: false };
      mockRuleRepo.findByIdAndCompany
        .mockResolvedValueOnce(rule)
        .mockResolvedValueOnce(toggled);
      mockRuleRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await controller.toggle(companyId, 'rule-1');

      expect(ruleRepo.update).toHaveBeenCalledWith('rule-1', { is_active: false });
      expect(result).toEqual(toggled);
    });

    it('should toggle is_active from false to true', async () => {
      const rule = { id: 'rule-1', name: 'Rule', is_active: false, company_id: companyId };
      const toggled = { ...rule, is_active: true };
      mockRuleRepo.findByIdAndCompany
        .mockResolvedValueOnce(rule)
        .mockResolvedValueOnce(toggled);

      await controller.toggle(companyId, 'rule-1');

      expect(ruleRepo.update).toHaveBeenCalledWith('rule-1', { is_active: true });
    });

    it('should return failure when rule not found', async () => {
      mockRuleRepo.findByIdAndCompany.mockResolvedValue(null);

      const result = await controller.toggle(companyId, 'non-existent');

      expect(result).toEqual({ success: false, message: 'Rule not found' });
    });
  });

  describe('DELETE /automation-rules/:id', () => {
    it('should remove a rule', async () => {
      mockRuleRepo.delete.mockResolvedValue({ affected: 1 } as any);

      await controller.remove(companyId, 'rule-1');

      expect(ruleRepo.delete).toHaveBeenCalledWith({ id: 'rule-1', company_id: companyId });
    });
  });
});
