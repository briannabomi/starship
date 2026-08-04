import assert from "node:assert/strict";
import {
  activeClients,
  canAccessClient,
  canAccessRelationship,
  canAccessResource,
  evaluatePortalLogin,
  relationshipLinkCandidates,
} from "../backend/permissions.mjs";

const coach = { id: "user-coach", role: "coach" };
const clientAUser = { id: "user-client-a", role: "client", clientId: "client-a" };
const clientBUser = { id: "user-client-b", role: "client", clientId: "client-b" };
const archivedClientUser = { id: "user-client-c", role: "client", clientId: "client-c" };

const clients = [
  { id: "client-a", status: "active" },
  { id: "client-b", status: "active" },
  { id: "client-c", status: "archived", archivedAt: "2026-08-04T00:00:00Z" },
];

const relationship = {
  id: "workspace-ab",
  status: "active",
  clientIds: ["client-a", "client-b"],
};

assert.deepEqual(activeClients(clients).map((client) => client.id), ["client-a", "client-b"]);
assert.deepEqual(relationshipLinkCandidates(clients).map((client) => client.id), ["client-a", "client-b"]);

assert.equal(canAccessClient(coach, clients[0], "read"), true);
assert.equal(canAccessClient(coach, clients[2], "read"), true, "coach can read archived history");
assert.equal(canAccessClient(coach, clients[2], "write"), false, "coach cannot write active workflows for archived clients");
assert.equal(canAccessClient(clientAUser, clients[0], "read"), true);
assert.equal(canAccessClient(clientAUser, clients[1], "read"), false);
assert.equal(canAccessClient(archivedClientUser, clients[2], "read"), false);

assert.deepEqual(evaluatePortalLogin(clientAUser, clients[0]), { allowed: true, reason: "client_active" });
assert.deepEqual(evaluatePortalLogin(archivedClientUser, clients[2]), { allowed: false, reason: "client_archived" });

assert.equal(canAccessRelationship(coach, relationship, clients, "read"), true);
assert.equal(canAccessRelationship(clientAUser, relationship, clients, "read"), true);
assert.equal(canAccessRelationship(clientBUser, relationship, clients, "read"), true);
assert.equal(canAccessRelationship(archivedClientUser, relationship, clients, "read"), false);

assert.equal(
  canAccessResource(clientAUser, {
    ownerType: "client",
    ownerId: "client-a",
    status: "published",
    visibility: "client_visible",
  }),
  true,
);

assert.equal(
  canAccessResource(clientAUser, {
    ownerType: "client",
    ownerId: "client-a",
    status: "needs_review",
    visibility: "client_visible",
  }),
  false,
  "clients cannot see unpublished resources",
);

assert.equal(
  canAccessResource(clientAUser, {
    ownerType: "relationship_workspace",
    ownerId: "workspace-ab",
    status: "published",
    visibility: "shared_workspace_visible",
  }, { clients, relationshipWorkspaces: [relationship] }),
  true,
);

assert.equal(
  canAccessResource(clientAUser, {
    ownerType: "relationship_workspace",
    ownerId: "workspace-ab",
    status: "published",
    visibility: "coach_only",
  }, { clients, relationshipWorkspaces: [relationship] }),
  false,
);

console.log("backend permission tests passed");
