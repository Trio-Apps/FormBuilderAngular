import { FieldDataSource } from '../form-builder/models/form-builder-dto.model';

/**
 * Build context object from FieldDataSource configuration
 * Extracts contextFields from configurationJson and maps them to current form values
 */
export function buildContext(
  dataSource: FieldDataSource | undefined,
  formValues: Record<string, any>
): Record<string, any> | undefined {
  if (!dataSource || !dataSource.requestBodyJson) {
    return undefined;
  }

  try {
    // Parse configurationJson to get contextFields
    const config = JSON.parse(dataSource.requestBodyJson);

    // If contextFields is specified in configuration
    if (config.contextFields && Array.isArray(config.contextFields)) {
      const context: Record<string, any> = {};
      config.contextFields.forEach((fieldCode: string) => {
        if (formValues[fieldCode] !== undefined && formValues[fieldCode] !== null) {
          context[fieldCode] = formValues[fieldCode];
        }
      });
      return Object.keys(context).length > 0 ? context : undefined;
    }

    // If context is directly in the config
    if (config.context && typeof config.context === 'object') {
      const context: Record<string, any> = {};
      Object.keys(config.context).forEach((key: string) => {
        // If value is a field code, get value from formValues
        if (typeof config.context[key] === 'string' && formValues[config.context[key]] !== undefined) {
          context[key] = formValues[config.context[key]];
        } else {
          context[key] = config.context[key];
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
  if (!dataSource || !dataSource.requestBodyJson) {
    return false;
  }

  try {
    const config = JSON.parse(dataSource.requestBodyJson);
    return !!(config.contextFields && Array.isArray(config.contextFields) && config.contextFields.length > 0);
  } catch {
    return false;
  }
}

/**
 * Get context field codes that a DataSource depends on
 */
export function getContextFieldCodes(dataSource: FieldDataSource | undefined): string[] {
  if (!dataSource || !dataSource.requestBodyJson) {
    return [];
  }

  try {
    const config = JSON.parse(dataSource.requestBodyJson);
    if (config.contextFields && Array.isArray(config.contextFields)) {
      return config.contextFields;
    }
    return [];
  } catch {
    return [];
  }
}

