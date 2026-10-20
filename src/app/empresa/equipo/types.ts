export interface TeamMember {
  user_id: string;
  full_name: string;
  email: string;
  company_role: "owner" | "admin" | "member";
  department: string | null;
  daily_limit: number | null;
  member_status: "active" | "paused";
  activated: boolean;
  today: number;
  extra_today: number;
  remaining: number | null;
  created_at: string;
}

export const ROLE_NAME = { owner: "Administrador principal", admin: "Administrador", member: "Usuario" } as const;
