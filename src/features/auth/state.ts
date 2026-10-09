export type AuthState = {
  error?: string;
  success?: string;
  retryAt?: number;
  fields?: Partial<Record<"name" | "email" | "password", string>>;
};
