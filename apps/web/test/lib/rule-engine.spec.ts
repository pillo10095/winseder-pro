import { evaluateRules, type AutomationRule } from '@/lib/rule-engine';
import type { PipelineLead } from '@/lib/crm-api';

const baseLead: PipelineLead = {
  id: 'lead-1',
  name: 'Carlos Martínez',
  value: 0,
  probability: 0,
  pipeline_stage_id: '',
  created_at: new Date().toISOString(),
};

function makeRule(overrides: Partial<AutomationRule>): AutomationRule {
  return {
    id: 'rule-1',
    nombre: 'Test Rule',
    activa: true,
    created_at: new Date().toISOString(),
    trigger_tipo: 'etapa',
    ...overrides,
  };
}

describe('evaluateRules', () => {
  describe('etapa trigger', () => {
    it('fires when lead enters the configured stage', () => {
      const rule = makeRule({
        trigger_tipo: 'etapa',
        trigger_etapa: 'calificado',
      });
      const lead = { ...baseLead, etapa: 'calificado' };

      const results = evaluateRules([rule], lead, 'nuevo');
      expect(results).toHaveLength(1);
      expect(results[0].shouldFire).toBe(true);
      expect(results[0].reason).toContain('calificado');
    });

    it('does NOT fire when lead is already in the stage (no transition)', () => {
      const rule = makeRule({
        trigger_tipo: 'etapa',
        trigger_etapa: 'calificado',
      });
      const lead = { ...baseLead, etapa: 'calificado' };

      const results = evaluateRules([rule], lead, 'calificado');
      expect(results[0].shouldFire).toBe(false);
    });

    it('does NOT fire when lead is in a different stage', () => {
      const rule = makeRule({
        trigger_tipo: 'etapa',
        trigger_etapa: 'calificado',
      });
      const lead = { ...baseLead, etapa: 'nuevo' };

      const results = evaluateRules([rule], lead, 'nuevo');
      expect(results[0].shouldFire).toBe(false);
    });

    it('does NOT fire when previousStage is undefined', () => {
      const rule = makeRule({
        trigger_tipo: 'etapa',
        trigger_etapa: 'calificado',
      });
      const lead = { ...baseLead, etapa: 'calificado' };

      const results = evaluateRules([rule], lead, undefined);
      expect(results[0].shouldFire).toBe(false);
    });
  });

  describe('tiempo trigger', () => {
    it('fires when lead exceeds inactivity days', () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const rule = makeRule({
        trigger_tipo: 'tiempo',
        trigger_dias: 7,
      });
      const lead = { ...baseLead, ultima_actividad: oldDate };

      const results = evaluateRules([rule], lead);
      expect(results[0].shouldFire).toBe(true);
    });

    it('does NOT fire when lead is still active', () => {
      const recentDate = new Date().toISOString();
      const rule = makeRule({
        trigger_tipo: 'tiempo',
        trigger_dias: 7,
      });
      const lead = { ...baseLead, ultima_actividad: recentDate };

      const results = evaluateRules([rule], lead);
      expect(results[0].shouldFire).toBe(false);
    });

    it('falls back to fecha_ultimo_contacto then fecha_creacion', () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const rule = makeRule({
        trigger_tipo: 'tiempo',
        trigger_dias: 5,
      });

      // Without ultima_actividad, uses fecha_ultimo_contacto
      const lead = {
        ...baseLead,
        ultima_actividad: undefined as any,
        fecha_ultimo_contacto: oldDate,
      };

      const results = evaluateRules([rule], lead);
      expect(results[0].shouldFire).toBe(true);
    });
  });

  describe('etapa_tiempo trigger', () => {
    it('fires when lead is in stage beyond days limit', () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const rule = makeRule({
        trigger_tipo: 'etapa_tiempo',
        trigger_etapa: 'calificado',
        trigger_dias: 7,
      });
      const lead = {
        ...baseLead,
        etapa: 'calificado',
        fecha_ultimo_contacto: oldDate,
      };

      const results = evaluateRules([rule], lead);
      expect(results[0].shouldFire).toBe(true);
    });

    it('does NOT fire when lead is in a different stage', () => {
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const rule = makeRule({
        trigger_tipo: 'etapa_tiempo',
        trigger_etapa: 'calificado',
        trigger_dias: 7,
      });
      const lead = {
        ...baseLead,
        etapa: 'nuevo',
        fecha_ultimo_contacto: oldDate,
      };

      const results = evaluateRules([rule], lead);
      expect(results[0].shouldFire).toBe(false);
    });
  });

  describe('inactive rules', () => {
    it('skips rules where activa is false', () => {
      const rule = makeRule({
        activa: false,
        trigger_tipo: 'etapa',
        trigger_etapa: 'calificado',
      });
      const lead = { ...baseLead, etapa: 'calificado' };

      const results = evaluateRules([rule], lead, 'nuevo');
      expect(results).toHaveLength(0);
    });

    it('returns one result per active rule', () => {
      const rules = [
        makeRule({
          id: 'r1',
          trigger_tipo: 'tiempo',
          trigger_dias: 100, // won't fire
        }),
        makeRule({
          id: 'r2',
          activa: false,
          trigger_tipo: 'etapa',
          trigger_etapa: 'calificado',
        }),
      ];

      const results = evaluateRules(rules, baseLead, 'nuevo');
      expect(results).toHaveLength(1);
      expect(results[0].rule.id).toBe('r1');
    });
  });
});
