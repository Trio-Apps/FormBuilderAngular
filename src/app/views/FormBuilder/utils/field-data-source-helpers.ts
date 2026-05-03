import { FieldDataSource } from '../form-builder/models/form-builder-dto.model';

type ContextBinding = {
  contextFieldCode?: string;
  contextFieldId?: string;
  sourceFieldCode?: string;
  sourceFieldId?: string;
};

export const AUTO_FILL_CONTEXT_VALUE = '__CONTEXT_VALUE__';

function parseDataSourceConfig(dataSource: FieldDataSource | undefined): Record<string, any> | null {
  if (!dataSource) {
    return null;
  }

  const rawConfig = dataSource.configurationJson || dataSource.requestBodyJson;
  if (!rawConfig) {
    return null;
  }

  try {
    return JSON.parse(rawConfig);
  } catch (err) {
    console.error('[FieldDataSourceHelpers] Failed to parse configuration:', err);
    return null;
  }
}

export function isContextValueAutoFill(dataSource: FieldDataSource | undefined): boolean {
  const config = parseDataSourceConfig(dataSource);
  const mode = String(config?.['autoFillMode'] || config?.['mode'] || '').trim().toLowerCase();
  const valuePath = String(dataSource?.valuePath || config?.['valueFieldCode'] || '').trim();

  return mode === 'contextvalue' ||
    mode === 'sameasdependency' ||
    valuePath === AUTO_FILL_CONTEXT_VALUE;
}

export function isLookupTableValueAutoFill(dataSource: FieldDataSource | undefined): boolean {
  if (!dataSource) {
    return false;
  }

  const sourceType = String(dataSource.sourceType || '').trim().replace(/\s+/g, '').toLowerCase();
  if (sourceType !== 'lookuptable') {
    return false;
  }

  const config = parseDataSourceConfig(dataSource);
  const mode = String(config?.['autoFillMode'] || config?.['mode'] || '').trim().toLowerCase();
  const hasContextBindings = getContextBindings(config).length > 0;
  const valuePath = String(dataSource.valuePath || config?.['valueColumn'] || '').trim();
  const textPath = String(dataSource.textPath || config?.['textColumn'] || '').trim();

  return hasContextBindings && (
    mode === 'lookupvalue' ||
    mode === 'tablelookup' ||
    mode === 'autofill' ||
    (!!valuePath && !!textPath && valuePath.toLowerCase() === textPath.toLowerCase())
  );
}

function normalizeBinding(binding: any): ContextBinding | null {
  const contextFieldCode = binding?.contextFieldCode || binding?.dependsOnFieldCode || binding?.fieldCode || '';
  const contextFieldId = binding?.contextFieldId || binding?.dependsOnFieldId || binding?.fieldId || '';
  const sourceFieldCode = binding?.sourceFieldCode || binding?.matchSourceFieldCode || binding?.matchFieldCode || '';
  const sourceFieldId = binding?.sourceFieldId || binding?.matchSourceFieldId || binding?.matchFieldId || '';

  if (!contextFieldCode && !contextFieldId && !sourceFieldCode && !sourceFieldId) {
    return null;
  }

  return {
    contextFieldCode: String(contextFieldCode || '').trim(),
    contextFieldId: String(contextFieldId || '').trim(),
    sourceFieldCode: String(sourceFieldCode || '').trim(),
    sourceFieldId: String(sourceFieldId || '').trim()
  };
}

function getContextBindings(config: Record<string, any> | null): ContextBinding[] {
  if (!config) {
    return [];
  }

  const rawBindings = Array.isArray(config['contextBindings'])
    ? config['contextBindings']
    : Array.isArray(config['dependencies'])
      ? config['dependencies']
      : Array.isArray(config['filters'])
        ? config['filters']
        : [];

  const bindings = rawBindings
    .map(normalizeBinding)
    .filter((binding): binding is ContextBinding => !!binding);

  const topLevelBinding = normalizeBinding(config);
  if (topLevelBinding) {
    bindings.push(topLevelBinding);
  }

  return bindings;
}

function readFormValue(formValues: Record<string, any>, code?: string, id?: string): any {
  const keys = [
    code,
    id,
    id ? `field_${id}` : '',
    code ? code.toUpperCase() : '',
    code ? code.toLowerCase() : ''
  ].filter((key): key is string => !!key && key.trim().length > 0);

  for (const key of keys) {
    const value = formValues[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
}

/**
 * Build context object from FieldDataSource configuration
 * Extracts contextFields from configurationJson and maps them to current form values
 */
export function buildContext(
  dataSource: FieldDataSource | undefined,
  formValues: Record<string, any>
): Record<string, any> | undefined {
  if (!dataSource) {
    return undefined;
  }

  try {
    const config = parseDataSourceConfig(dataSource);

    const contextBindings = getContextBindings(config);
    if (contextBindings.length > 0) {
      const context: Record<string, any> = {};
      contextBindings.forEach((binding: ContextBinding) => {
        const fieldValue = readFormValue(formValues, binding.contextFieldCode, binding.contextFieldId);
        if (fieldValue === undefined) {
          return;
        }

        if (binding.sourceFieldCode) {
          context[binding.sourceFieldCode] = fieldValue;
        }

        if (binding.sourceFieldId) {
          context[binding.sourceFieldId] = fieldValue;
        }
      });

      return Object.keys(context).length > 0 ? context : undefined;
    }

    // If contextFields is specified in configuration
    if (config?.['contextFields'] && Array.isArray(config['contextFields'])) {
      const context: Record<string, any> = {};
      config['contextFields'].forEach((fieldCode: string) => {
        if (formValues[fieldCode] !== undefined && formValues[fieldCode] !== null) {
          context[fieldCode] = formValues[fieldCode];
        }
      });
      return Object.keys(context).length > 0 ? context : undefined;
    }

    // If context is directly in the config
    if (config?.['context'] && typeof config['context'] === 'object') {
      const context: Record<string, any> = {};
      Object.keys(config['context']).forEach((key: string) => {
        // If value is a field code, get value from formValues
        if (typeof config['context'][key] === 'string' && formValues[config['context'][key]] !== undefined) {
          context[key] = formValues[config['context'][key]];
        } else {
          context[key] = config['context'][key];
        }
      });
      return Object.keys(context).length > 0 ? context : undefined;
    }

    return undefined;
  } catch (err) {
    console.error('[FieldDataSourceHelpers] Failed to parse configuration:', err);
    return undefined;
  }
}

/**
 * Check if a field's DataSource requires context
 */
export function requiresContext(dataSource: FieldDataSource | undefined): boolean {
  if (!dataSource) {
    return false;
  }

  try {
    const config = parseDataSourceConfig(dataSource);
    const contextBindings = getContextBindings(config);
    return !!(
      contextBindings.length > 0 ||
      (config?.['contextFields'] && Array.isArray(config['contextFields']) && config['contextFields'].length > 0)
    );
  } catch {
    return false;
  }
}

/**
 * Get context field codes that a DataSource depends on
 */
export function getContextFieldCodes(dataSource: FieldDataSource | undefined): string[] {
  if (!dataSource) {
    return [];
  }

  try {
    const config = parseDataSourceConfig(dataSource);
    const contextBindings = getContextBindings(config);
    if (contextBindings.length > 0) {
      return contextBindings
        .flatMap(binding => [binding.contextFieldCode, binding.contextFieldId])
        .filter((fieldCode: any): fieldCode is string => typeof fieldCode === 'string' && fieldCode.trim().length > 0);
    }

    if (config?.['contextFields'] && Array.isArray(config['contextFields'])) {
      return config['contextFields'];
    }
    return [];
  } catch {
    return [];
  }
}

