import type { Database } from "./client.js";

export interface Operator {
  id: string;
  workspaceId: string;
  email: string;
  passwordHash: string;
  name: string;
  role: "owner" | "agent";
  createdAt: string;
}

export async function createOperator(
  db: Database,
  data: { workspaceId: string; email: string; passwordHash: string; name: string; role: "owner" | "agent" }
): Promise<Operator> {
  const [operator] = await db`
    INSERT INTO operators (workspace_id, email, password_hash, name, role)
    VALUES (${data.workspaceId}, ${data.email}, ${data.passwordHash}, ${data.name}, ${data.role})
    RETURNING *
  `;
  return operator as Operator;
}

export async function findOperatorByEmail(
  db: Database,
  email: string
): Promise<Operator | null> {
  const [operator] = await db`
    SELECT * FROM operators
    WHERE email = ${email}
    LIMIT 1
  `;
  return (operator ?? null) as Operator | null;
}

export async function findOperatorById(
  db: Database,
  id: string
): Promise<Operator | null> {
  const [operator] = await db`
    SELECT * FROM operators WHERE id = ${id} LIMIT 1
  `;
  return (operator ?? null) as Operator | null;
}

export async function workspaceExists(db: Database, workspaceId: string): Promise<boolean> {
  const [row] = await db`SELECT id FROM workspaces WHERE id = ${workspaceId} LIMIT 1`;
  return Boolean(row);
}
