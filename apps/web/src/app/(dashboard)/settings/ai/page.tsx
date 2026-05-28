'use client';

import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAiAgent } from '@/src/hooks/use-ai-agent';

export default function AiSettingsPage() {
  const { agent, loading, fetchAgent, updateAgent } = useAiAgent();

  const [isActive, setIsActive] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [model, setModel] = useState('gpt-4o-mini');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(500);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchAgent();
  }, [fetchAgent]);

  useEffect(() => {
    if (agent) {
      setIsActive(agent.is_active);
      setProvider(agent.provider);
      setModel(agent.model);
      setApiKey(agent.api_key ?? '');
      setBaseUrl(agent.base_url ?? '');
      setSystemPrompt(agent.system_prompt ?? '');
      setTemperature(agent.temperature);
      setMaxTokens(agent.max_tokens);
    }
  }, [agent]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      await updateAgent({
        is_active: isActive,
        provider,
        model,
        api_key: apiKey || undefined,
        base_url: baseUrl || undefined,
        system_prompt: systemPrompt || undefined,
        temperature,
        max_tokens: maxTokens,
      });
      setSaved(true);
    } catch {
      // error handled by hook
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Agente de IA
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configurá el agente inteligente que analiza conversaciones y sugiere respuestas.
        </p>
      </div>

      <Separator />

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Enable / Disable */}
        <Card>
          <CardHeader>
            <CardTitle>Estado</CardTitle>
            <CardDescription>
              Activá el agente para empezar a clasificar mensajes y generar sugerencias.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                checked={isActive}
                onCheckedChange={setIsActive}
                id="ai-active"
              />
              <Label htmlFor="ai-active">
                {isActive ? 'Agente activo' : 'Agente desactivado'}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Provider */}
        <Card>
          <CardHeader>
            <CardTitle>Proveedor</CardTitle>
            <CardDescription>
              Configuración del modelo de lenguaje.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="provider">Proveedor</Label>
                <Input
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="openai"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="model">Modelo</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="gpt-4o-mini"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
              />
              <p className="text-xs text-muted-foreground">
                Se almacena cifrada en la base de datos.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="base-url">Base URL (opcional)</Label>
              <Input
                id="base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.deepseek.com"
              />
              <p className="text-xs text-muted-foreground">
                Dejá vacío para usar OpenAI. Para DeepSeek usá https://api.deepseek.com
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones del agente</CardTitle>
            <CardDescription>
              System prompt que define el comportamiento del agente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="system-prompt">System Prompt</Label>
              <Textarea
                id="system-prompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Sos un asistente de atención al cliente..."
                rows={5}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="temperature">
                  Temperatura: {temperature}
                </Label>
                <Input
                  id="temperature"
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="max-tokens">Máx. tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  min={100}
                  max={4096}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={saving || loading}>
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </Button>
          {saved && (
            <span className="text-sm text-green-600">
              Configuración guardada correctamente.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
