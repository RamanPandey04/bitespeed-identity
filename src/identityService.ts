import { PoolClient } from "pg";
import { pool } from "./db";
import { Contact, IdentifyRequest, IdentifyResponse } from "./types";

async function findMatches(client: PoolClient, email?: string | null, phone?: string | null) {
  const conds: string[] = [];
  const vals: string[] = [];
  let i = 1;

  if (email)  { conds.push(`email = $${i++}`);         vals.push(email); }
  if (phone)  { conds.push(`"phoneNumber" = $${i++}`); vals.push(phone); }
  if (!conds.length) return [];

  const { rows } = await client.query<Contact>(
    `SELECT * FROM "Contact"
     WHERE (${conds.join(" OR ")}) AND "deletedAt" IS NULL
     ORDER BY "createdAt" ASC`,
    vals
  );
  return rows;
}

async function getCluster(client: PoolClient, primaryId: number) {
  const { rows } = await client.query<Contact>(
    `SELECT * FROM "Contact"
     WHERE (id = $1 OR "linkedId" = $1) AND "deletedAt" IS NULL
     ORDER BY "createdAt" ASC`,
    [primaryId]
  );
  return rows;
}

async function createContact(
  client: PoolClient,
  email: string | null | undefined,
  phone: string | null | undefined,
  linkedId: number | null,
  precedence: "primary" | "secondary"
) {
  const { rows } = await client.query<Contact>(
    `INSERT INTO "Contact" (email, "phoneNumber", "linkedId", "linkPrecedence", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *`,
    [email ?? null, phone ?? null, linkedId, precedence]
  );
  return rows[0];
}

async function demote(client: PoolClient, oldPrimaryId: number, newPrimaryId: number) {
  // reassign children first, then demote the old primary itself
  await client.query(
    `UPDATE "Contact" SET "linkedId" = $1, "updatedAt" = NOW()
     WHERE "linkedId" = $2 AND "deletedAt" IS NULL`,
    [newPrimaryId, oldPrimaryId]
  );
  await client.query(
    `UPDATE "Contact"
     SET "linkedId" = $1, "linkPrecedence" = 'secondary', "updatedAt" = NOW()
     WHERE id = $2`,
    [newPrimaryId, oldPrimaryId]
  );
}

function rootId(c: Contact) {
  return c.linkPrecedence === "primary" ? c.id : c.linkedId!;
}

function format(contacts: Contact[]): IdentifyResponse {
  const primary = contacts.find(c => c.linkPrecedence === "primary")!;
  const secondaries = contacts.filter(c => c.linkPrecedence === "secondary");

  const emails = [...new Set(
    [primary.email, ...secondaries.map(c => c.email)].filter(Boolean) as string[]
  )];
  const phones = [...new Set(
    [primary.phoneNumber, ...secondaries.map(c => c.phoneNumber)].filter(Boolean) as string[]
  )];

  return {
    contact: {
      primaryContatctId: primary.id,
      emails,
      phoneNumbers: phones,
      secondaryContactIds: secondaries.map(c => c.id),
    },
  };
}

export async function identifyContact(req: IdentifyRequest): Promise<IdentifyResponse> {
  const { email, phoneNumber: phone } = req;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const matches = await findMatches(client, email, phone);

    if (!matches.length) {
      const contact = await createContact(client, email, phone, null, "primary");
      await client.query("COMMIT");
      return format([contact]);
    }

    const primaryIds = [...new Set(matches.map(rootId))];

    // two separate clusters got connected by this request — merge them
    if (primaryIds.length > 1) {
      const { rows: primaries } = await client.query<Contact>(
        `SELECT * FROM "Contact" WHERE id = ANY($1) AND "deletedAt" IS NULL`,
        [primaryIds]
      );
      primaries.sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));

      const winner = primaries[0];
      for (const loser of primaries.slice(1)) {
        await demote(client, loser.id, winner.id);
      }

      let cluster = await getCluster(client, winner.id);
      const knownEmails = new Set(cluster.map(c => c.email).filter(Boolean));
      const knownPhones = new Set(cluster.map(c => c.phoneNumber).filter(Boolean));

      if ((email && !knownEmails.has(email)) || (phone && !knownPhones.has(phone))) {
        await createContact(client, email, phone, winner.id, "secondary");
        cluster = await getCluster(client, winner.id);
      }

      await client.query("COMMIT");
      return format(cluster);
    }

    // single cluster
    const pid = primaryIds[0];
    let cluster = await getCluster(client, pid);

    const knownEmails = new Set(cluster.map(c => c.email).filter(Boolean));
    const knownPhones = new Set(cluster.map(c => c.phoneNumber).filter(Boolean));

    if ((email && !knownEmails.has(email)) || (phone && !knownPhones.has(phone))) {
      await createContact(client, email, phone, pid, "secondary");
      cluster = await getCluster(client, pid);
    }

    await client.query("COMMIT");
    return format(cluster);

  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}