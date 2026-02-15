import { prisma } from "@hostiq/db";
import { on, EVENT_TYPES } from "./event-bus";
import type { DomainEvent } from "@hostiq/shared";
import { ESCALATION } from "@hostiq/shared";

// ============================================
// Event Handlers
// Register all automation handlers here.
// Each handler processes a specific event type.
// ============================================

export function registerEventHandlers(): void {
  console.log("[Events] Registering event handlers...");

  // --- New message: check for escalation keywords ---
  on(EVENT_TYPES.MESSAGE_RECEIVED, async (event: DomainEvent) => {
    const payload = event.payload as {
      message_id?: string;
      content?: string;
      thread_id?: string;
      sender_type?: string;
    };

    if (payload.sender_type !== "GUEST") return;

    const content = (payload.content || "").toLowerCase();
    const matchedKeywords = ESCALATION.KEYWORDS.filter((kw) =>
      content.includes(kw)
    );

    if (matchedKeywords.length > 0 && payload.thread_id) {
      console.log(
        `[Handler:Message] Escalation keywords detected: ${matchedKeywords.join(", ")}`
      );

      // Create escalation
      const thread = await prisma.messageThread.findUnique({
        where: { id: payload.thread_id },
        include: { property: true },
      });

      if (thread) {
        await prisma.escalation.create({
          data: {
            propertyId: thread.propertyId,
            reservationId: thread.reservationId,
            threadId: thread.id,
            type: "keyword_escalation",
            severity: matchedKeywords.some((kw) =>
              ["emergency", "police"].includes(kw)
            )
              ? "CRITICAL"
              : "HIGH",
            summary: `Guest message contains escalation keywords: ${matchedKeywords.join(", ")}`,
            suggestedAction: `Review guest message and respond promptly. Keywords: ${matchedKeywords.join(", ")}`,
            slaDeadline: new Date(
              Date.now() + ESCALATION.DEFAULT_SLA_HOURS * 60 * 60 * 1000
            ),
          },
        });

        // TODO: Send SMS/email notification to owner
      }
    }
  });

  // --- New reservation: create cleaning task ---
  on(EVENT_TYPES.RESERVATION_CREATED, async (event: DomainEvent) => {
    const payload = event.payload as {
      reservation_id?: string;
      property_id?: string;
      check_out?: string;
    };

    if (!payload.reservation_id || !payload.property_id || !payload.check_out)
      return;

    // Check if cleaning task already exists
    const existing = await prisma.cleaningTask.findUnique({
      where: { reservationId: payload.reservation_id },
    });
    if (existing) return;

    // Get cleaner assignment for this property
    const assignment = await prisma.cleanerAssignment.findUnique({
      where: { propertyId: payload.property_id },
    });

    await prisma.cleaningTask.create({
      data: {
        propertyId: payload.property_id,
        reservationId: payload.reservation_id,
        cleanerId: assignment?.primaryCleanerId,
        backupCleanerId: assignment?.backupCleanerId,
        scheduledDate: new Date(payload.check_out),
        timeWindow: "11:00-15:00",
        status: "PENDING",
      },
    });

    console.log(
      `[Handler:Reservation] Created cleaning task for reservation ${payload.reservation_id}`
    );
  });

  // --- HostBuddy action item: route by category ---
  on(EVENT_TYPES.HOSTBUDDY_ACTION_ITEM, async (event: DomainEvent) => {
    const payload = event.payload as {
      issue_id?: string;
      category?: string;
      severity?: string;
      property_id?: string;
    };

    if (!payload.issue_id) return;

    // Auto-escalate critical issues
    if (payload.severity === "critical") {
      await prisma.escalation.create({
        data: {
          propertyId: payload.property_id || null,
          type: "hostbuddy_critical",
          severity: "CRITICAL",
          summary: `Critical guest issue reported: ${payload.category}`,
          suggestedAction: "Review and respond immediately",
          slaDeadline: new Date(Date.now() + 60 * 60 * 1000), // 1 hour SLA
        },
      });

      console.log(
        `[Handler:HostBuddy] Critical issue escalated: ${payload.category}`
      );

      // TODO: Send immediate SMS/email to owner
    }

    // Track recurring issues
    if (payload.property_id && payload.category) {
      const recentCount = await prisma.guestIssue.count({
        where: {
          propertyId: payload.property_id,
          category: payload.category,
          createdAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
      });

      if (recentCount >= 3) {
        await prisma.recurringIssue.upsert({
          where: {
            id: `${payload.property_id}-${payload.category}`,
          },
          update: {
            occurrenceCount: recentCount,
          },
          create: {
            id: `${payload.property_id}-${payload.category}`,
            propertyId: payload.property_id,
            issuePattern: payload.category,
            occurrenceCount: recentCount,
            suggestedFix: `This property has had ${recentCount} "${payload.category}" issues in 90 days. Investigate root cause.`,
          },
        });
      }
    }
  });

  // --- Cleaning not acknowledged: escalate ---
  on(EVENT_TYPES.CLEANING_NOT_ACKNOWLEDGED, async (event: DomainEvent) => {
    const payload = event.payload as {
      task_id?: string;
      property_id?: string;
      cleaner_name?: string;
    };

    if (!payload.task_id) return;

    // Update task status
    await prisma.cleaningTask.update({
      where: { id: payload.task_id },
      data: { status: "ESCALATED" },
    });

    // Create escalation
    await prisma.escalation.create({
      data: {
        propertyId: payload.property_id || null,
        type: "cleaning_no_ack",
        severity: "HIGH",
        summary: `Cleaner ${payload.cleaner_name || "unknown"} has not acknowledged cleaning task`,
        suggestedAction: "Contact backup cleaner or assign alternative",
        slaDeadline: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      },
    });

    console.log(
      `[Handler:Cleaning] Escalated unacknowledged cleaning task ${payload.task_id}`
    );

    // TODO: Try backup cleaner, send SMS alerts
  });

  // --- Review received: check sentiment ---
  on(EVENT_TYPES.REVIEW_RECEIVED, async (event: DomainEvent) => {
    const payload = event.payload as {
      rating?: number;
      text?: string;
      property_id?: string;
      reservation_id?: string;
    };

    if (payload.rating && payload.rating <= 3) {
      console.log(
        `[Handler:Review] Low rating (${payload.rating}) detected, creating escalation`
      );

      await prisma.escalation.create({
        data: {
          propertyId: payload.property_id || null,
          reservationId: payload.reservation_id || null,
          type: "low_review",
          severity: payload.rating <= 2 ? "CRITICAL" : "HIGH",
          summary: `Guest left a ${payload.rating}-star review`,
          suggestedAction:
            "Review the feedback and consider a response. Check for recurring issues.",
        },
      });
    }
  });

  console.log("[Events] Event handlers registered.");
}
