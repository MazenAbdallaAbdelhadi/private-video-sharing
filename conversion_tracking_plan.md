# Campaign System Fix & Extension Plan

## Problem Summary

The current campaign system has three critical failures:
1. **Conversions not tracked** — inbound messages are attributed but conversion/action execution is unreliable and lacks first-reply isolation
2. **Campaign actions don't execute properly** — no mechanism to detect *first reply* vs subsequent messages, causing duplicate or missed executions
3. **Assignment + notification ordering broken** — campaign-driven assignment must happen *before* notifications, but current flow notifies first

---

## 1. Data Model Changes

### 1.1 New Table: `CampaignReplyTracker`

Tracks whether a contact has replied to a specific campaign. This is the **single gate** for first-reply detection — all action execution and REPLY conversions check this table.

```prisma
model CampaignReplyTracker {
  id             String   @id @default(cuid())
  campaignId     String
  contactId      String
  conversationId String
  messageId      String   // The inbound message that triggered first reply
  repliedAt      DateTime @default(now())

  campaign       Campaign @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  @@unique([campaignId, contactId])  // One reply per contact per campaign
  @@index([campaignId])
  @@map("campaign_reply_tracker")
}
```

**Why a separate table instead of a field?**
- A boolean `hasReplied` on CampaignAttribution would couple attribution (which campaign sent this) with reply tracking (did the contact respond). These are separate concerns.
- A dedicated table gives us an audit trail (which message, when) and is trivially queryable for recalculation.
- The `@@unique([campaignId, contactId])` constraint is our **idempotency boundary** — the DB itself prevents double-processing.

### 1.2 Extend `Conversion` Model

Change the unique constraint from `(campaignId, contactId)` to `(campaignId, contactId, conversionType)` to support multiple conversion types per contact per campaign (e.g., a contact can REPLY *and* get a TAG conversion).

```diff
model Conversion {
  id              String         @id @default(cuid())
  campaignId      String
  contactId       String
  conversationId  String?
  conversionType  ConversionType
+ metadata        Json?          // Optional: store trigger details (tagName, newStatus, etc.)
  createdAt       DateTime       @default(now())

  campaign        Campaign       @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  contact         Contact        @relation(fields: [contactId], references: [id], onDelete: Cascade)

- @@unique([campaignId, contactId])
+ @@unique([campaignId, contactId, conversionType])
  @@index([campaignId, createdAt])
  @@map("conversion")
}
```

### 1.3 Extend Campaign `actions` JSON Schema

Currently actions only support `ADD_TAG`. We add `ASSIGN_MEMBER`:

```typescript
// Type definition (not a schema change, just the JSON shape stored in Campaign.actions)
type CampaignAction =
  | { type: "ADD_TAG"; value: string }                               // tag name
  | { type: "ASSIGN_MEMBER"; value: string; mode: "SPECIFIC" }      // memberId
  | { type: "ASSIGN_MEMBER"; value: "AUTO"; mode: "AUTO" };          // auto-assign
```

Update the Zod schema in `campaign-schemas.ts` and `router.ts`:

```typescript
actions: z.array(z.discriminatedUnion("type", [
  z.object({ type: z.literal("ADD_TAG"), value: z.string().min(1) }),
  z.object({
    type: z.literal("ASSIGN_MEMBER"),
    value: z.string().min(1),         // memberId or "AUTO"
    mode: z.enum(["SPECIFIC", "AUTO"]),
  }),
])).optional().nullable(),
```

### 1.4 Add `replyTrackers` Relation to Campaign

```diff
model Campaign {
  // ... existing fields ...
+ replyTrackers  CampaignReplyTracker[]
}
```

### 1.5 Indexing Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| `CampaignReplyTracker` | `@@unique([campaignId, contactId])` | Idempotent first-reply gate |
| `CampaignReplyTracker` | `@@index([campaignId])` | Campaign-level reply queries |
| `Conversion` | `@@unique([campaignId, contactId, conversionType])` | Per-type dedup |
| `CampaignAttribution` | `@@index([contactId, sentAt])` | Already exists — attribution lookup |

---

## 2. Event Flow Design

### 2.1 Master Flow: Inbound Message (Webhook)

```
Webhook POST → handleInboundWhatsAppWebhook()
  │
  ├─ 1. Resolve ChannelAccount, Contact, ContactChannel
  ├─ 2. Upsert Conversation
  ├─ 3. Save Message (deduplicate by externalId)
  ├─ 4. If NOT echo AND new message:
  │     │
  │     ├─ 4a. Campaign Attribution Pipeline ──────────────────┐
  │     │     │                                                 │
  │     │     ├─ attributeInboundMessage(contactId, convId)     │
  │     │     │   ├─ Check conversation.sourceCampaignId        │
  │     │     │   ├─ OR find recent CampaignAttribution         │
  │     │     │   │   within attributionWindowHours              │
  │     │     │   ├─ Set conversation.sourceCampaignId           │
  │     │     │   └─ Return { campaignId, isFirstReply }        │
  │     │     │                                                 │
  │     │     ├─ IF campaignId found:                           │
  │     │     │   ├─ detectFirstReply(campaignId, contactId)    │
  │     │     │   │   └─ INSERT CampaignReplyTracker (unique)   │
  │     │     │   │       ├─ SUCCESS → isFirstReply = true      │
  │     │     │   │       └─ P2002   → isFirstReply = false     │
  │     │     │   │                                             │
  │     │     │   ├─ IF isFirstReply:                           │
  │     │     │   │   ├─ Execute ASSIGN_MEMBER action (FIRST!)  │
  │     │     │   │   ├─ Execute ADD_TAG actions                │
  │     │     │   │   ├─ Register REPLY conversion              │
  │     │     │   │   └─ Increment campaign.repliedCount        │
  │     │     │   │                                             │
  │     │     │   └─ Return assignment result (if any)          │
  │     │     │                                                 │
  │     ├─ 4b. Notification Dispatch ──────────────────────────┘
  │     │     │
  │     │     ├─ Determine assignedToId:
  │     │     │   ├─ IF campaign assigned → use that memberId
  │     │     │   ├─ ELSE conversation.assignedToId
  │     │     │   └─ ELSE contact.assignedToId
  │     │     │
  │     │     ├─ IF assignedToId exists:
  │     │     │   └─ Notify: assigned member + admins + owner
  │     │     └─ ELSE:
  │     │         └─ Notify: ALL members
  │     │
  │     └─ 4c. Auto-Reply Processing (existing, unchanged)
  │
  └─ Return 200 OK
```

> [!IMPORTANT]
> The key ordering change: **Assignment happens inside the campaign action pipeline (step 4a), BEFORE notification dispatch (step 4b)**. The webhook handler receives the assignment result from the attribution pipeline and uses it to determine notification targets.

### 2.2 First Reply Detection Flow

```typescript
async function detectFirstReply(
  campaignId: string,
  contactId: string,
  conversationId: string,
  messageId: string,
): Promise<boolean> {
  try {
    await prisma.campaignReplyTracker.create({
      data: { campaignId, contactId, conversationId, messageId },
    });
    return true; // This IS the first reply
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return false; // Already replied — idempotent
    }
    throw error;
  }
}
```

### 2.3 Action Execution Flow

Only runs on **first reply** (gated by `detectFirstReply` returning `true`):

```
executeCampaignActions(campaignId, contactId, orgId, conversationId)
  │
  ├─ Load campaign.actions JSON
  ├─ Sort: ASSIGN_MEMBER actions FIRST, then ADD_TAG
  │
  ├─ For each action:
  │   ├─ ASSIGN_MEMBER:
  │   │   ├─ If mode === "SPECIFIC" → assign contact to value (memberId)
  │   │   ├─ If mode === "AUTO" → autoAssign(orgId, contactId)
  │   │   ├─ Update contact.assignedToId
  │   │   ├─ Update conversation.assignedToId
  │   │   └─ Return assignedMemberId (for notification logic)
  │   │
  │   └─ ADD_TAG:
  │       ├─ Find or create Tag by name
  │       ├─ Upsert ContactTag (idempotent)
  │       └─ Trigger checkTagConversion() for TAG conversion
  │
  └─ Return { assignedMemberId: string | null }
```

### 2.4 Conversion Creation Flow

```
registerConversion(campaignId, contactId, conversationId, type, metadata?)
  │
  ├─ Try: prisma.conversion.create({...})
  │   ├─ Success → increment campaign.convertedCount
  │   └─ P2002 (unique violation) → skip silently (idempotent)
  │
  └─ Return boolean (created or not)
```

### 2.5 Status Change Conversion Flow (existing, minor fix)

```
updateConversationStatus(conversationId, newStatus)
  │
  ├─ Update conversation.status
  ├─ Find ALL campaigns attributed to this contact (not just this conversation)
  │   via CampaignAttribution within window
  ├─ For each campaign where conversionType === "STATUS"
  │   AND conversionValue matches newStatus:
  │   └─ registerConversion(campaignId, contactId, convId, "STATUS")
```

### 2.6 Tag Assignment Conversion Flow (existing, minor fix)

```
addTagToContact(contactId, tagName, orgId)
  │
  ├─ Create ContactTag
  ├─ Find ALL campaigns attributed to this contact
  │   where conversionType === "TAG" AND conversionValue === tagName
  ├─ For each matching campaign:
  │   └─ registerConversion(campaignId, contactId, convId, "TAG")
```

---

## 3. Idempotency Strategy

| Operation | Guard | Mechanism |
|-----------|-------|-----------|
| First reply detection | `CampaignReplyTracker.@@unique([campaignId, contactId])` | DB unique constraint, catch P2002 |
| REPLY conversion | `Conversion.@@unique([campaignId, contactId, conversionType])` | DB unique constraint, catch P2002 |
| TAG conversion | Same unique constraint | Same |
| STATUS conversion | Same unique constraint | Same |
| Tag assignment (action) | `ContactTag.@@unique([contactId, tagId])` | Upsert (already implemented) |
| Member assignment (action) | Gated by `detectFirstReply` returning `true` | Only executes once because first-reply is idempotent |
| Campaign attribution | Check `conversation.sourceCampaignId` first | If already set, skip CampaignAttribution lookup |
| Message dedup (webhook) | `Message.@@unique([organizationId, externalId])` | Already implemented via findFirst check |
| repliedCount increment | Gated by first-reply detection | Only increments when `detectFirstReply` returns `true` |

> [!TIP]
> Every idempotency boundary lives at the **database constraint level**, not in application-level flags. This means even if two webhook events for the same message arrive simultaneously and race through the code, only one will succeed at the INSERT — the other gets P2002 and is silently skipped.

---

## 4. Attribution Logic

### Source of Truth

**`CampaignAttribution`** is the primary source. `conversation.sourceCampaignId` is a **cached denormalization** for quick lookups.

### Attribution Rules (in order of precedence)

1. If `conversation.sourceCampaignId` is already set → use it (cached)
2. Find `CampaignAttribution` WHERE `contactId = X` ORDER BY `sentAt DESC` LIMIT 1
3. Load the campaign's `attributionWindowHours`
4. If `NOW - attribution.sentAt < windowHours` → **attribute**
5. Otherwise → no attribution (expired)

### Edge Case: Multiple Campaigns

When a contact receives Campaign A, then Campaign B:
- A new `CampaignAttribution` row exists for each
- The **most recent** one wins (ORDER BY sentAt DESC)
- Campaign A's attribution window may have expired
- If the contact replies during Campaign B's window → Campaign B gets credit
- This is correct "last-touch" attribution

### Edge Case: Late Reply After New Campaign

Contact receives Campaign A (window: 24h), then Campaign B 48h later. Contact replies 2h after Campaign B:
- CampaignAttribution lookup finds Campaign B (most recent, within window)
- Campaign B gets credit ✓
- Campaign A's window expired, so it gets nothing ✓

### Edge Case: Conversation Reuse

If the same conversation is reused across campaigns:
- `conversation.sourceCampaignId` is **overwritten** when a new attribution is detected
- Previous campaign's data is preserved in `Conversion` and `CampaignReplyTracker` tables (they reference campaignId, not conversation)

---

## 5. Assignment Logic

### ASSIGN_MEMBER Action Types

#### Specific Member Assignment
```typescript
if (action.mode === "SPECIFIC") {
  await prisma.$transaction([
    prisma.contact.update({
      where: { id: contactId },
      data: { assignedToId: action.value, assignedAt: new Date() },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedToId: action.value },
    }),
  ]);
}
```

#### Auto-Assignment (Load Balancing)

Strategy: **Least-assigned member** — assign to the member with the fewest active contacts.

```typescript
async function autoAssign(organizationId: string): Promise<string> {
  // Get all non-admin/non-owner members
  const members = await prisma.member.findMany({
    where: {
      organizationId,
      role: { not: "owner" },  // Owners typically don't get auto-assigned
    },
    select: {
      id: true,
      _count: { select: { assignedContacts: true } },
    },
    orderBy: { assignedContacts: { _count: "asc" } },
  });

  if (members.length === 0) {
    throw new Error("No members available for auto-assignment");
  }

  // Pick the member with the least assignments
  return members[0].id;
}
```

> [!NOTE]
> The auto-assign uses a simple "least-assigned" heuristic. This is adequate for the MVP. For higher scale, we could add member capacity weights or online/offline status.

---

## 6. Notification Flow

### Current Flow (Broken for Campaign Assignment)

```
1. Save message
2. Determine assignee from conversation/contact
3. Notify based on assignee
4. Run attribution pipeline (which might assign)
// Problem: notification already sent to wrong recipients!
```

### Fixed Flow

```
1. Save message
2. Run attribution pipeline
   → May execute ASSIGN_MEMBER action
   → Returns assignedMemberId (or null)
3. Determine final assignee:
   - campaignAssignedMemberId (from step 2)
   - OR conversation.assignedToId
   - OR contact.assignedToId
4. Notify based on final assignee
```

### Concrete Implementation Change in `webhook-handler.ts`

The key restructuring: **move attribution BEFORE notification dispatch**.

```typescript
// Inside handleInboundWhatsAppWebhook, after saving message:

if (!event.isEcho && !existingMessage) {
  let campaignAssignedMemberId: string | null = null;

  // ── STEP 1: Attribution Pipeline (may assign member) ──
  try {
    const { attributeInboundMessage } = await import("...");
    const result = await attributeInboundMessage(contact.id, conversation.id, messageId);
    if (result) {
      campaignAssignedMemberId = result.assignedMemberId;
      if (result.isFirstReply) {
        await prisma.campaign.update({
          where: { id: result.campaignId },
          data: { repliedCount: { increment: 1 } },
        });
      }
    }
  } catch (error) { /* log */ }

  // ── STEP 2: Notification (AFTER assignment) ──
  try {
    const effectiveAssignee =
      campaignAssignedMemberId ||
      conversation.assignedToId ||
      contact.assignedToId;

    // ... existing notification logic using effectiveAssignee ...
  } catch (error) { /* log */ }

  // ── STEP 3: Auto-Reply (unchanged) ──
  // ...
}
```

---

## 7. Conversion System Improvements

### Keep Current Schema, Extend It

We keep the existing `Conversion` model but make two key changes:
1. **Unique constraint** → `(campaignId, contactId, conversionType)` — allows one conversion per type
2. **Add `metadata` field** — stores trigger context (tag name, status value, etc.)

### Deletion & Recalculation

#### Safe Deletion
```typescript
// Delete all conversions for a campaign (e.g., for recalculation)
await prisma.$transaction([
  prisma.conversion.deleteMany({ where: { campaignId } }),
  prisma.campaign.update({
    where: { id: campaignId },
    data: { convertedCount: 0 },
  }),
]);
```

#### Recalculation
```typescript
async function recalculateConversions(campaignId: string) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { conversionType: true, conversionValue: true },
  });

  // Delete existing conversions
  await prisma.conversion.deleteMany({ where: { campaignId } });

  // Re-scan based on type
  if (campaign.conversionType === "REPLY") {
    // Re-derive from CampaignReplyTracker
    const replies = await prisma.campaignReplyTracker.findMany({
      where: { campaignId },
    });
    for (const reply of replies) {
      await registerConversion(campaignId, reply.contactId, reply.conversationId, "REPLY");
    }
  }
  // Similar for TAG and STATUS...

  // Recount
  const count = await prisma.conversion.count({ where: { campaignId } });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { convertedCount: count },
  });
}
```

### Conversion Source Tracking

The `metadata` JSON field stores context:
```json
// REPLY conversion
{ "messageId": "wamid_xxx", "repliedAt": "2026-04-25T..." }

// TAG conversion  
{ "tagName": "interested", "tagId": "clxxx" }

// STATUS conversion
{ "previousStatus": "OPEN", "newStatus": "CLOSED" }
```

---

## 8. Scalability Considerations

### Current Architecture (MVP-Adequate)

The system processes webhooks synchronously in the API route handler with a non-awaited background promise. This is acceptable for the current scale.

### Webhook Throughput

- Meta sends webhooks at ~80 messages/second per WABA
- Current handler completes in ~50-200ms per event
- The `setTimeout(() => {...}, 0)` pattern in the route handles immediate return to Meta

### Recommendations for Growth

| Scale | Approach |
|-------|----------|
| **Current (MVP)** | Keep non-awaited promise, sequential processing |
| **100+ campaigns/day** | Add `Promise.allSettled` for independent operations (attribution, notification, auto-reply can run in parallel) |
| **1000+ messages/min** | Introduce a lightweight queue (Inngest, BullMQ) to decouple webhook receipt from processing |

### Race Condition Handling

All critical paths are protected at the database level:
- `CampaignReplyTracker.@@unique` prevents double first-reply
- `Conversion.@@unique` prevents double conversion
- `ContactTag.@@unique` prevents double tag assignment
- Prisma transactions wrap multi-step operations

No application-level locks or semaphores are needed.

---

## 9. Suggested Architecture

### Service/Module Separation

```
src/features/campaigns/server/
├── router.ts                      # tRPC endpoints (existing)
├── attribution-engine.ts          # MODIFY: Single entry point for inbound attribution
├── first-reply-detector.ts        # NEW: CampaignReplyTracker insert + idempotency
├── campaign-actions-engine.ts     # MODIFY: Add ASSIGN_MEMBER, gate behind first-reply
├── conversion-engine.ts           # MODIFY: Per-type uniqueness, metadata support
├── auto-assign.ts                 # NEW: Least-assigned member selection
└── recalculation.ts               # NEW: Conversion recalculation utility
```

### Modified Files Summary

| File | Change |
|------|--------|
| [schema.prisma](file:///d:/2026/wa-client/prisma/schema.prisma) | Add `CampaignReplyTracker`, modify `Conversion` unique, add `metadata`, add relation |
| [attribution-engine.ts](file:///d:/2026/wa-client/src/features/campaigns/server/attribution-engine.ts) | Integrate first-reply detection, return assignment result |
| [campaign-actions-engine.ts](file:///d:/2026/wa-client/src/features/campaigns/server/campaign-actions-engine.ts) | Add `ASSIGN_MEMBER` handler, sort actions (assign first), gate behind first-reply |
| [conversion-engine.ts](file:///d:/2026/wa-client/src/features/campaigns/server/conversion-engine.ts) | Update unique constraint handling, add metadata param |
| [webhook-handler.ts](file:///d:/2026/wa-client/src/features/inbox/server/webhook-handler.ts) | **Reorder**: attribution BEFORE notifications, pass assignment result to notification logic |
| [campaign-schemas.ts](file:///d:/2026/wa-client/src/features/campaigns/schemas/campaign-schemas.ts) | Add `ASSIGN_MEMBER` to action schema |
| [router.ts (campaigns)](file:///d:/2026/wa-client/src/features/campaigns/server/router.ts) | Update action schema in create/update mutations |

### New Files

| File | Purpose |
|------|---------|
| `first-reply-detector.ts` | `detectFirstReply()` — single-responsibility insert into CampaignReplyTracker |
| `auto-assign.ts` | `autoAssignMember()` — least-assigned member selection |
| `recalculation.ts` | `recalculateConversions()` — safe delete + re-derive utility |

---

## Verification Plan

### Automated Tests

1. **Unit test `detectFirstReply`**: Call twice with same (campaignId, contactId) — first returns `true`, second returns `false`
2. **Unit test `registerConversion`**: Verify per-type uniqueness — same contact can have REPLY + TAG conversions for same campaign, but not two REPLY conversions
3. **Integration test webhook flow**: Send simulated inbound message for a campaign recipient → verify CampaignReplyTracker created, actions executed, conversion registered, repliedCount incremented
4. **Integration test assignment ordering**: Campaign with ASSIGN_MEMBER action → verify contact assigned BEFORE notification dispatch
5. **Run `npx prisma migrate dev`** to validate schema changes

### Manual Verification

1. Create a campaign with ADD_TAG + ASSIGN_MEMBER actions
2. Send campaign to test contact
3. Reply from test contact's WhatsApp
4. Verify in Prisma Studio:
   - `CampaignReplyTracker` has one row
   - `Conversion` has REPLY row
   - Contact is assigned to correct member
   - Tag is attached to contact
5. Send another message from same contact → verify no duplicate actions/conversions
6. Create a second campaign to same contact → verify first-reply tracking is independent per campaign
