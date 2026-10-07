export type AuthState = {
  error?: string;
  success?: string;
  fields?: Partial<Record<"name" | "email" | "password", string>>;
};
