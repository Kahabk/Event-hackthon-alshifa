export type FormStatus = 'active' | 'inactive';
export type FormFieldType = 'text' | 'email' | 'phone' | 'number' | 'select' | 'radio' | 'checkbox' | 'date' | 'file' | 'textarea';

export interface FormFieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  accept?: string;
}

export interface RegistrationFormField {
  id: string;
  label: string;
  type: FormFieldType;
  placeholder?: string;
  required: boolean;
  options: string[];
  validation: FormFieldValidation;
  order: number;
}

export interface RegistrationForm {
  id: string;
  title: string;
  description: string;
  slug: string;
  status: FormStatus;
  fields: RegistrationFormField[];
  submitButtonText: string;
  successMessage: string;
  redirectUrl: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FormSubmission {
  id: string;
  formId: string;
  formTitle: string;
  submittedData: Record<string, unknown>;
  sourcePage: string;
  sourceSection: string;
  sourceButton: string;
  createdAt?: unknown;
}

export const formsCollection = 'forms';
export const formSubmissionsCollection = 'formSubmissions';

export const createFormField = (order = 1): RegistrationFormField => ({
  id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  label: 'New field',
  type: 'text',
  placeholder: '',
  required: false,
  options: [],
  validation: {},
  order,
});

export const createRegistrationForm = (): RegistrationForm => ({
  id: '',
  title: 'Untitled Form',
  description: '',
  slug: `form-${Date.now().toString(36)}`,
  status: 'inactive',
  fields: [createFormField(1)],
  submitButtonText: 'Submit',
  successMessage: 'Thank you! Your response has been submitted.',
  redirectUrl: '',
});

export const normalizeRegistrationForm = (id: string, data: Partial<RegistrationForm>): RegistrationForm => ({
  ...createRegistrationForm(),
  ...data,
  id,
  status: data.status === 'active' ? 'active' : 'inactive',
  fields: Array.isArray(data.fields)
    ? data.fields.map((field, index) => ({
        ...createFormField(index + 1),
        ...field,
        id: String(field.id || `field-${index + 1}`),
        required: field.required === true,
        options: Array.isArray(field.options) ? field.options.map(String) : [],
        validation: field.validation || {},
        order: Number.isFinite(Number(field.order)) ? Number(field.order) : index + 1,
      })).sort((a, b) => a.order - b.order)
    : [],
});

export const slugifyForm = (value: string) => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);
