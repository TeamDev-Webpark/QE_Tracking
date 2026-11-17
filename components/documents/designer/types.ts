export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "checkbox"
  | "radio"
  | "table"
  | "signature"
  | "section"
  | "note";

export type FormFieldWidth = "full" | "half" | "third";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  width?: FormFieldWidth;
  options?: string[]; // for select, radio
  columns?: string[]; // for table
  unit?: string; // for number (e.g. pcs, mm, °C, kg)
  helpText?: string;
  defaultValue?: string;
}

export interface FormTemplate {
  id: string;
  documentId: string;
  documentCode: string;
  title: string;
  description?: string;
  formNumber?: string;
  revision: number;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface FormSubmission {
  id: string;
  templateId: string;
  documentId: string;
  documentCode: string;
  title: string;
  values: Record<string, any>;
  status: "draft" | "submitted" | "approved";
  filledBy: {
    id: string;
    name: string;
    department?: string;
  };
  filledAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}
