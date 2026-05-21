export interface OpenApiSchema {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  servers?: { url: string; description?: string }[];
  paths: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
}

export interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  parameters?: Parameter[];
}

export interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, ResponseObject>;
  security?: Record<string, string[]>[];
  deprecated?: boolean;
}

export interface Parameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  description?: string;
  required?: boolean;
  schema: SchemaObject;
  example?: unknown;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content: Record<string, MediaType>;
}

export interface ResponseObject {
  description: string;
  content?: Record<string, MediaType>;
}

export interface MediaType {
  schema: SchemaObject;
  example?: unknown;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: string[];
  description?: string;
  example?: unknown;
  $ref?: string;
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  nullable?: boolean;
}

export interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
}

export interface EndpointGroup {
  tag: string;
  endpoints: EndpointInfo[];
}

export interface EndpointInfo {
  method: HttpMethod;
  path: string;
  operation: Operation;
  tag: string;
}

export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export interface ApiResponse {
  status: number;
  body: unknown;
  headers: Record<string, string>;
  duration: number;
}

export interface TryItState {
  parameters: Record<string, string>;
  body: string;
  contentType: string;
}

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  exiting?: boolean;
}
