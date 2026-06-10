import type { PipelineLead } from '@/lib/crm-api';

export interface AutomationRule {
  id: string;
  nombre: string;
  activa: boolean;
  created_at: string;

  // New component fields
  color?: string;
  prioridad?: 'alta' | 'media' | 'baja';
  descripcion?: string;
  trigger?: { type: string; config?: Record<string, any> };
  action?: { tipo: string; config?: Record<string, any> };
  condiciones?: Array<{
    campo: string;
    operador: string;
    valor: string;
  }>;

  // Legacy fields (original rule engine)
  trigger_tipo?: 'etapa' | 'tiempo' | 'etapa_tiempo';
  trigger_etapa?: string;
  trigger_dias?: number;
  accion_tipo?: string;
  accion_plantilla_id?: string;
  ultima_ejecucion?: string;
}

export interface RuleEvaluation {
  rule: AutomationRule;
  lead: PipelineLead;
  shouldFire: boolean;
  reason: string;
}

function evaluateConditions(
  condiciones: NonNullable<AutomationRule['condiciones']>,
  lead: PipelineLead,
): { passed: boolean; failed: string[] } {
  const failed: string[] = [];

  for (const cond of condiciones) {
    if (cond.campo === 'etiqueta') {
      const contactLabels = (lead as any).contact?.labels ?? [];
      const hasLabel = contactLabels.some((l: any) => l.id === cond.valor);

      if (cond.operador === 'tiene' && !hasLabel) {
        failed.push(`No tiene la etiqueta "${cond.valor}"`);
      } else if (cond.operador === 'no_tiene' && hasLabel) {
        failed.push(`Tiene la etiqueta "${cond.valor}" (no debería)`);
      }
    } else {
      // Generic condition — simple field match
      const fieldValue = (lead as any)[cond.campo];
      const matches = String(fieldValue ?? '') === cond.valor;
      if (cond.operador === 'igual' && !matches) {
        failed.push(`${cond.campo} no es igual a ${cond.valor}`);
      }
    }
  }

  return { passed: failed.length === 0, failed };
}

export function evaluateRules(
  rules: AutomationRule[],
  lead: PipelineLead,
  previousStage?: string
): RuleEvaluation[] {
  return rules.filter(r => r.activa).map(rule => {
    let shouldFire = false;
    let reason = 'No cumple condiciones';
    const currentStage = lead.pipeline_stage_id || lead.pipeline_stage?.id || (lead as any).etapa || '';

    if (rule.trigger_tipo === 'etapa') {
      if (
        rule.trigger_etapa &&
        currentStage === rule.trigger_etapa &&
        previousStage &&
        previousStage !== currentStage
      ) {
        shouldFire = true;
        reason = `Llegó a etapa ${rule.trigger_etapa}`;
      }
    }

    if (rule.trigger_tipo === 'tiempo' && rule.trigger_dias) {
      const lastActivity =
        lead.ultima_actividad ||
        lead.fecha_ultimo_contacto ||
        lead.fecha_creacion;
      if (lastActivity) {
        const daysSince = Math.floor(
          (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince >= rule.trigger_dias) {
          shouldFire = true;
          reason = `${daysSince} días sin actividad (límite: ${rule.trigger_dias})`;
        }
      }
    }

    if (rule.trigger_tipo === 'etapa_tiempo' && rule.trigger_etapa && rule.trigger_dias) {
      if (currentStage === rule.trigger_etapa) {
        const stageReference = lead.fecha_ultimo_contacto || lead.fecha_creacion;
        if (stageReference) {
          const daysInStage = Math.floor(
            (Date.now() - new Date(stageReference).getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysInStage >= rule.trigger_dias) {
            shouldFire = true;
            reason = `En etapa ${rule.trigger_etapa} por ${daysInStage} días`;
          }
        }
      }
    }

    // Evaluate extra conditions (and gate)
    if (shouldFire && rule.condiciones && rule.condiciones.length > 0) {
      const result = evaluateConditions(rule.condiciones, lead);
      if (!result.passed) {
        shouldFire = false;
        reason = `Condiciones: ${result.failed.join('; ')}`;
      }
    }

    return { rule, lead, shouldFire, reason };
  });
}
