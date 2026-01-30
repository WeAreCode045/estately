export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  SELECT = 'select',
  CHECKBOX = 'checkbox',
  RADIO = 'radio',
  DATE = 'date',
  EMAIL = 'email',
  PHONE = 'tel',
  SECTION = 'section'
}

export interface SelectOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  helpText?: string;
  options?: SelectOption[]; // For select, radio, checkbox groups
  defaultValue?: string | number | boolean;
  children?: FormField[]; // Only for SECTION type
  isCollapsed?: boolean;  // Only for SECTION type
}

export interface FormSchema {
  title: string;
  description: string;
  fields: FormField[];
  submitButtonText: string;
}

export interface AppState {
  schema: FormSchema;
  selectedFieldId: string | null;
  isPreview: boolean;
}
