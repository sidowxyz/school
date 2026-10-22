export interface AuditLog {
  id: number;
  user: string;
 role: string;
  module: string;
  action: string;
  status: "Success" | "Warning" | "Failed";
  ip: string;
  timestamp: string;

  before: Record<string, string>;
  after: Record<string, string>;
}