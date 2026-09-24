import { PrismaClient, ActorType, Prisma } from '@prisma/client';

export interface AuditEventParams {
  taskId?: string | null;
  actorType: ActorType;
  actorId: string;
  event: string;
  metadata?: Record<string, any>;
}

/**
 * Log an immutable audit event to PostgreSQL.
 * Supports both standalone PrismaClient and Prisma TransactionClient.
 */
export async function logAuditEvent(
  client: Prisma.TransactionClient | PrismaClient,
  params: AuditEventParams
) {
  return client.roverAuditLog.create({
    data: {
      taskId: params.taskId ?? null,
      actorType: params.actorType,
      actorId: params.actorId,
      event: params.event,
      metadata: params.metadata ?? Prisma.JsonNull
    }
  });
}

/**
 * Fetch chronological audit history for a task.
 */
export async function getTaskAuditTrail(prisma: PrismaClient, taskId: string) {
  return prisma.roverAuditLog.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' }
  });
}
