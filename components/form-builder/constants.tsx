import React from 'react';
import { 
  Type, 
  AlignLeft, 
  Hash, 
  ChevronDown, 
  CheckSquare, 
  CircleDot, 
  Calendar, 
  Mail, 
  Phone,
  Layout
} from 'lucide-react';
import { FieldType } from './types';

export const FIELD_ICONS: Record<FieldType, React.ReactNode> = {
  [FieldType.TEXT]: <Type className="w-4 h-4" />,
  [FieldType.TEXTAREA]: <AlignLeft className="w-4 h-4" />,
  [FieldType.NUMBER]: <Hash className="w-4 h-4" />,
  [FieldType.SELECT]: <ChevronDown className="w-4 h-4" />,
  [FieldType.CHECKBOX]: <CheckSquare className="w-4 h-4" />,
  [FieldType.RADIO]: <CircleDot className="w-4 h-4" />,
  [FieldType.DATE]: <Calendar className="w-4 h-4" />,
  [FieldType.EMAIL]: <Mail className="w-4 h-4" />,
  [FieldType.PHONE]: <Phone className="w-4 h-4" />,
  [FieldType.SECTION]: <Layout className="w-4 h-4" />
};

export const INITIAL_SCHEMA = {
  title: "New Custom Form",
  description: "Configure your form by adding fields from the left sidebar.",
  fields: [],
  submitButtonText: "Submit Request"
};
