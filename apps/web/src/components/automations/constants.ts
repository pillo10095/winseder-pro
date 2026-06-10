import type { Action, Condition } from "@/src/hooks/use-automations";

export type { Condition, Action };

export const FIELD_OPTIONS = [
  { value: "message.content", label: "Contenido del mensaje" },
  { value: "message.sender_jid", label: "Remitente" },
  { value: "message.type", label: "Tipo de mensaje" },
] as const;

export const OPERATOR_OPTIONS = [
  { value: "contains", label: "contiene" },
  { value: "equals", label: "es igual a" },
  { value: "starts_with", label: "empieza con" },
  { value: "regex", label: "coincide con (regex)" },
] as const;

export const ACTION_TYPE_OPTIONS = [
  { value: "reply.text", label: "Responder con texto" },
  { value: "reply.image", label: "Responder con imagen" },
  { value: "webhook", label: "Disparar webhook" },
  { value: "ai_hook", label: "Enviar a IA externa" },
  { value: "ai_reply", label: "Responder con IA" },
  { value: "ai_classify", label: "Clasificar intención (IA)" },
  { value: "ai_hot_lead", label: "Detectar lead caliente (IA)" },
] as const;

export function emptyCondition(): Condition {
  return { field: "message.content", operator: "contains", value: "" };
}

export function emptyAction(): Action {
  return { type: "reply.text" as Action["type"], config: { text: "" } };
}

export function actionConfigFields(action: Action): {
  key: string;
  label: string;
  placeholder: string;
}[] {
  switch (action.type) {
    case "reply.text":
      return [
        {
          key: "text",
          label: "Texto de respuesta",
          placeholder: "Hola, gracias por tu mensaje...",
        },
      ];
    case "reply.image":
      return [
        {
          key: "url",
          label: "URL de la imagen",
          placeholder: "https://ejemplo.com/imagen.jpg",
        },
        {
          key: "caption",
          label: "Pie de foto (opcional)",
          placeholder: "Opcional",
        },
      ];
    case "webhook":
      return [
        {
          key: "url",
          label: "URL del webhook",
          placeholder: "https://ejemplo.com/webhook",
        },
      ];
    case "ai_hook":
      return [
        {
          key: "endpoint",
          label: "Endpoint IA",
          placeholder: "https://ejemplo.com/ai-webhook",
        },
      ];
    case "ai_reply":
      return [
        {
          key: "system_prompt",
          label: "Prompt del agente (opcional)",
          placeholder: "Respondé de forma amable...",
        },
      ];
    case "ai_classify":
      return [];
    case "ai_hot_lead":
      return [];
    default:
      return [];
  }
}
