import type {
  Prisma,
  PrismaClient,
  ReportScheduleFrequency,
  ReportType,
  ReportRunStatus,
} from '@prisma/client';

export class ReportScheduleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  list(organizationId: string) {
    return this.prisma.reportSchedule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  findById(id: string) {
    return this.prisma.reportSchedule.findUnique({ where: { id } });
  }

  create(data: {
    organizationId: string;
    domainId?: string | null;
    reportType: ReportType;
    frequency: ReportScheduleFrequency;
    deliveryEmail?: string | null;
    deliveryWebhook?: string | null;
    nextRunAt?: Date | null;
  }) {
    return this.prisma.reportSchedule.create({ data });
  }

  update(
    id: string,
    data: {
      enabled?: boolean;
      deliveryEmail?: string | null;
      deliveryWebhook?: string | null;
      lastRunAt?: Date | null;
      nextRunAt?: Date | null;
    },
  ) {
    return this.prisma.reportSchedule.update({ where: { id }, data });
  }

  delete(id: string) {
    return this.prisma.reportSchedule.delete({ where: { id } });
  }

  createRun(data: {
    organizationId: string;
    scheduleId?: string | null;
    reportType: ReportType;
    status: ReportRunStatus;
    resultSummary?: Prisma.InputJsonValue;
    deliveredTo?: string | null;
  }) {
    return this.prisma.reportRun.create({
      data: {
        organizationId: data.organizationId,
        scheduleId: data.scheduleId ?? undefined,
        reportType: data.reportType,
        status: data.status,
        resultSummary: data.resultSummary,
        deliveredTo: data.deliveredTo ?? null,
      },
    });
  }

  listRuns(organizationId: string, limit = 20) {
    return this.prisma.reportRun.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findDue(now: Date = new Date()) {
    return this.prisma.reportSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
      orderBy: { nextRunAt: 'asc' },
    });
  }
}
