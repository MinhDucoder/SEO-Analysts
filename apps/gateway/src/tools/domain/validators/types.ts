export interface SchemaValidation {
  errors: string[];
  warnings: string[];
}

export type SchemaValidator = (obj: Record<string, any>) => SchemaValidation;
