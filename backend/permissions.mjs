export function isCoach(user) {
  return user?.role === "coach" && user.status !== "disabled";
}

export function isActiveClient(client) {
  return Boolean(client && client.status !== "archived" && !client.archivedAt);
}

export function activeClients(clients = []) {
  return clients.filter(isActiveClient);
}

export function coachCanAccessClient(user, client) {
  return isCoach(user) && Boolean(client);
}

export function clientCanAccessClient(user, client) {
  return user?.role === "client" && isActiveClient(client) && user.clientId === client.id;
}

export function canAccessClient(user, client, action = "read") {
  if (isCoach(user)) {
    if (action === "write") return isActiveClient(client);
    return Boolean(client);
  }
  return action === "read" && clientCanAccessClient(user, client);
}

export function relationshipLinkCandidates(clients = []) {
  return activeClients(clients);
}

export function canAccessRelationship(user, workspace, clients = [], action = "read") {
  if (!workspace || workspace.status === "archived" || workspace.archivedAt) return false;
  const members = workspace.clientIds || [];
  const allMembersActive = members.every((clientId) => isActiveClient(clients.find((client) => client.id === clientId)));
  if (!allMembersActive) return false;
  if (isCoach(user)) return true;
  if (action !== "read") return false;
  return user?.role === "client" && members.includes(user.clientId);
}

export function canAccessResource(user, resource, context = {}) {
  if (!resource || resource.status === "archived") return false;
  if (isCoach(user)) return true;
  if (user?.role !== "client") return false;
  if (resource.status !== "published") return false;

  if (resource.ownerType === "client") {
    return resource.ownerId === user.clientId && resource.visibility === "client_visible";
  }

  if (resource.ownerType === "relationship_workspace") {
    const workspace = (context.relationshipWorkspaces || []).find((item) => item.id === resource.ownerId);
    return (
      resource.visibility === "shared_workspace_visible" &&
      canAccessRelationship(user, workspace, context.clients || [], "read")
    );
  }

  return false;
}

export function evaluatePortalLogin(user, client) {
  if (!user) return { allowed: false, reason: "missing_user" };
  if (isCoach(user)) return { allowed: true, reason: "coach" };
  if (user.role !== "client") return { allowed: false, reason: "unsupported_role" };
  if (!client || user.clientId !== client.id) return { allowed: false, reason: "client_mismatch" };
  if (!isActiveClient(client)) return { allowed: false, reason: "client_archived" };
  return { allowed: true, reason: "client_active" };
}
