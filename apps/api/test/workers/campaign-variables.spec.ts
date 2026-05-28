function replaceTemplateVariables(
  templateBody: string,
  variables: Record<string, string>,
): string {
  let result = templateBody;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}

describe('Campaign template variable replacement', () => {
  it('should replace a single variable', () => {
    const result = replaceTemplateVariables('Hola {{nombre}}', { nombre: 'Juan' });
    expect(result).toBe('Hola Juan');
  });

  it('should replace multiple variables', () => {
    const result = replaceTemplateVariables('{{saludo}} {{nombre}}', {
      saludo: 'Hola',
      nombre: 'María',
    });
    expect(result).toBe('Hola María');
  });

  it('should replace repeated occurrences of the same variable', () => {
    const result = replaceTemplateVariables('{{tag}} {{tag}} {{tag}}', { tag: 'x' });
    expect(result).toBe('x x x');
  });

  it('should leave missing variables unchanged', () => {
    const result = replaceTemplateVariables('Hola {{nombre}}', {});
    expect(result).toBe('Hola {{nombre}}');
  });

  it('should handle empty template body', () => {
    const result = replaceTemplateVariables('', { nombre: 'Juan' });
    expect(result).toBe('');
  });

  it('should handle empty variables map', () => {
    const result = replaceTemplateVariables('Hola {{nombre}}', {});
    expect(result).toBe('Hola {{nombre}}');
  });

  it('should not replace partial matches of variable names', () => {
    const result = replaceTemplateVariables('{{name}} and {{name_extra}}', {
      name: 'John',
      name_extra: 'Doe',
    });
    expect(result).toBe('John and Doe');
  });

  it('should replace variable when value contains template-like syntax', () => {
    const result = replaceTemplateVariables('{{name}}', { name: '{{other}}' });
    expect(result).toBe('{{other}}');
  });

  it('should handle variables with numeric keys', () => {
    const result = replaceTemplateVariables('{{0}} items', { '0': '5' });
    expect(result).toBe('5 items');
  });
});
