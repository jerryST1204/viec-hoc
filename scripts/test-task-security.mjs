import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const emailA = process.env.TEST_USER_A_EMAIL;
const passwordA = process.env.TEST_USER_A_PASSWORD;
const emailB = process.env.TEST_USER_B_EMAIL;
const passwordB = process.env.TEST_USER_B_PASSWORD;
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

const required = {
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey,
  TEST_USER_A_EMAIL: emailA,
  TEST_USER_A_PASSWORD: passwordA,
  TEST_USER_B_EMAIL: emailB,
  TEST_USER_B_PASSWORD: passwordB,
};

const missing = Object.entries(required)
  .filter(([, value]) => !value)
  .map(([name]) => name);

if (missing.length > 0) {
  console.error(`Missing local test environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

assert.notEqual(emailA, emailB, "Test accounts A and B must be different.");

function createUserClient() {
  return createClient(supabaseUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signIn(email, password, label) {
  const client = createUserClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error, `${label} sign-in failed.`);
  assert.ok(data.session, `${label} did not receive an authenticated session.`);
  return { client, user: data.user, token: data.session.access_token };
}

async function apiRequest(token, path, options = {}) {
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body !== undefined) headers.set("Content-Type", "application/json");

  return fetch(new URL(path, baseUrl), {
    ...options,
    headers,
    cache: "no-store",
  });
}

async function expectStatus(response, expected, label) {
  assert.equal(response.status, expected, `${label}: expected HTTP ${expected}, got ${response.status}.`);
}

async function readJson(response) {
  return response.json();
}

const runId = randomUUID();
const taskTitle = `security-test-${runId}`;
const spoofTitle = `security-spoof-test-${runId}`;
let userA;
let userB;
let taskId;
let spoofedTaskId;

try {
  userA = await signIn(emailA, passwordA, "A");
  userB = await signIn(emailB, passwordB, "B");
  assert.notEqual(userA.user.id, userB.user.id, "Test accounts must have different user IDs.");
  console.log("PASS: signed in separate test accounts A and B.");

  const missingTokenResponse = await apiRequest(null, "/api/tasks");
  await expectStatus(missingTokenResponse, 401, "Missing-token GET");

  const invalidTokenResponse = await apiRequest("not-a-valid-token", "/api/tasks");
  await expectStatus(invalidTokenResponse, 401, "Invalid-token GET");
  console.log("PASS: missing and invalid bearer tokens are rejected with 401.");

  const createdResponse = await apiRequest(userA.token, "/api/tasks", {
    method: "POST",
    body: JSON.stringify({ title: taskTitle }),
  });
  await expectStatus(createdResponse, 201, "A creates task");
  const createdBody = await readJson(createdResponse);
  assert.ok(createdBody.data?.id, "Create response did not contain a task ID.");
  taskId = createdBody.data.id;
  assert.equal(createdBody.data.title, taskTitle);
  console.log("PASS: A created a test task through the API.");

  for (const title of ["", "   ", "x".repeat(121)]) {
    const response = await apiRequest(userA.token, "/api/tasks", {
      method: "POST",
      body: JSON.stringify({ title }),
    });
    await expectStatus(response, 400, `Invalid title length ${title.length}`);
  }
  console.log("PASS: empty, whitespace-only, and 121-character titles return 400.");

  const ownPatchResponse = await apiRequest(userA.token, `/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ title: `${taskTitle}-updated` }),
  });
  await expectStatus(ownPatchResponse, 200, "A updates own task");

  const ownToggleResponse = await apiRequest(userA.token, `/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ is_done: true }),
  });
  await expectStatus(ownToggleResponse, 200, "A completes own task");

  const reloadedResponse = await apiRequest(userA.token, "/api/tasks");
  await expectStatus(reloadedResponse, 200, "A reloads tasks");
  const reloadedBody = await readJson(reloadedResponse);
  const reloadedTask = reloadedBody.data.find((task) => task.id === taskId);
  assert.ok(reloadedTask, "A's task was not present after reloading.");
  assert.equal(reloadedTask.title, `${taskTitle}-updated`);
  assert.equal(reloadedTask.is_done, true);
  console.log("PASS: A's create, PATCH, and GET reload preserve API data.");

  const bListResponse = await apiRequest(userB.token, "/api/tasks");
  await expectStatus(bListResponse, 200, "B lists tasks");
  const bListBody = await readJson(bListResponse);
  assert.equal(
    bListBody.data.some((task) => task.id === taskId),
    false,
    "B can see A's task through the API.",
  );

  const bPatchResponse = await apiRequest(userB.token, `/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ title: `${taskTitle}-tampered` }),
  });
  await expectStatus(bPatchResponse, 404, "B patches A's task");

  const bDeleteResponse = await apiRequest(userB.token, `/api/tasks/${taskId}`, {
    method: "DELETE",
  });
  await expectStatus(bDeleteResponse, 404, "B deletes A's task");

  const afterDeniedResponse = await apiRequest(userA.token, "/api/tasks");
  await expectStatus(afterDeniedResponse, 200, "A verifies task remains");
  const afterDeniedBody = await readJson(afterDeniedResponse);
  const unchangedTask = afterDeniedBody.data.find((task) => task.id === taskId);
  assert.ok(unchangedTask, "A's task was deleted by B.");
  assert.equal(unchangedTask.title, `${taskTitle}-updated`);
  assert.equal(unchangedTask.is_done, true);
  console.log("PASS: B cannot list, patch, or delete A's task through the API; A's task is unchanged.");

  const directSelect = await userB.client
    .from("tasks")
    .select("id")
    .eq("id", taskId);
  assert.ifError(directSelect.error, "B's direct RLS SELECT failed.");
  assert.equal(directSelect.data.length, 0, "B can directly SELECT A's task.");

  const directUpdate = await userB.client
    .from("tasks")
    .update({ title: `${taskTitle}-rls-tampered` })
    .eq("id", taskId)
    .select("id");
  assert.ifError(directUpdate.error, "B's direct RLS UPDATE failed unexpectedly.");
  assert.equal(directUpdate.data.length, 0, "B can directly UPDATE A's task.");

  const directDelete = await userB.client
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .select("id");
  assert.ifError(directDelete.error, "B's direct RLS DELETE failed unexpectedly.");
  assert.equal(directDelete.data.length, 0, "B can directly DELETE A's task.");

  const directSpoofInsert = await userB.client
    .from("tasks")
    .insert({ title: spoofTitle, user_id: userA.user.id })
    .select("id")
    .maybeSingle();

  if (directSpoofInsert.data?.id) {
    spoofedTaskId = directSpoofInsert.data.id;
  }
  assert.ok(
    directSpoofInsert.error || !directSpoofInsert.data,
    "B was able to insert a task claiming A as its owner.",
  );
  console.log("PASS: direct user-B RLS requests cannot read, update, or delete A's row or spoof A on insert.");

  const ownDeleteResponse = await apiRequest(userA.token, `/api/tasks/${taskId}`, {
    method: "DELETE",
  });
  await expectStatus(ownDeleteResponse, 200, "A deletes own task");
  const deletedBody = await readJson(ownDeleteResponse);
  assert.equal(deletedBody.data?.id, taskId);

  const afterDeleteResponse = await apiRequest(userA.token, "/api/tasks");
  await expectStatus(afterDeleteResponse, 200, "A reloads after delete");
  const afterDeleteBody = await readJson(afterDeleteResponse);
  assert.equal(
    afterDeleteBody.data.some((task) => task.id === taskId),
    false,
    "A's deleted task is still present.",
  );
  console.log("PASS: A deleted the test task through the API and it remained absent after reload.");
} finally {
  if (userA && taskId) {
    const { error } = await userA.client
      .from("tasks")
      .delete()
      .eq("id", taskId)
      .eq("user_id", userA.user.id);
    if (error) console.error("CLEANUP_ERROR: could not remove the test task.");
  }

  if (userA && (spoofedTaskId || taskId)) {
    const { error } = await userA.client
      .from("tasks")
      .delete()
      .eq("title", spoofTitle)
      .eq("user_id", userA.user.id);
    if (error) console.error("CLEANUP_ERROR: could not remove an owner-spoof probe row.");
  }
}
