import { describe, test, expect } from "bun:test";
import { api, authenticatedApi, signUpTestUser, expectStatus, connectWebSocket, connectAuthenticatedWebSocket, waitForMessage } from "./helpers";

describe("API Integration Tests", () => {
  let authToken: string;
  let userId: string;
  let complimentId: string;
  let secondUserToken: string;
  let secondUserId: string;

  // Setup: Sign up first test user
  test("Sign up first test user", async () => {
    const { token, user } = await signUpTestUser();
    authToken = token;
    userId = user.id;
    expect(authToken).toBeDefined();
    expect(userId).toBeDefined();
  });

  // Profile Tests
  test("Setup user profile", async () => {
    const uniqueUsername = `tu${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    const res = await authenticatedApi("/api/profiles/setup", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: uniqueUsername,
        avatar_emoji: "😀",
      }),
    });
    await expectStatus(res, 200, 201);
    const data = await res.json();
    expect(data.id).toBeDefined();
  });

  test("Get current user profile", async () => {
    const res = await authenticatedApi("/api/profiles/me", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(data.username).toBeDefined();
    expect(data.avatar_emoji).toBeDefined();
    expect(typeof data.credits).toBe("number");
    expect(typeof data.streak_days).toBe("number");
    expect(typeof data.is_premium).toBe("boolean");
  });

  test("Update profile with valid data", async () => {
    const updatedUsername = `up${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    const res = await authenticatedApi("/api/profiles/me", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: updatedUsername,
        avatar_emoji: "😎",
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.username).toBe(updatedUsername);
    expect(data.avatar_emoji).toBe("😎");
  });

  test("Update profile - username too short (validation error)", async () => {
    const res = await authenticatedApi("/api/profiles/me", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "ab", // minLength: 3
        avatar_emoji: "😀",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Update profile - username too long (validation error)", async () => {
    const res = await authenticatedApi("/api/profiles/me", authToken, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "a".repeat(21), // maxLength: 20
        avatar_emoji: "😀",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Setup profile - missing username (validation error)", async () => {
    const res = await authenticatedApi("/api/profiles/setup", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        avatar_emoji: "😀",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Setup profile - missing avatar_emoji (validation error)", async () => {
    const res = await authenticatedApi("/api/profiles/setup", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "someuser",
      }),
    });
    await expectStatus(res, 400);
  });

  // Setup: Sign up second test user for compliment tests
  test("Sign up second test user", async () => {
    const { token, user } = await signUpTestUser();
    secondUserToken = token;
    secondUserId = user.id;
    expect(secondUserToken).toBeDefined();
    expect(secondUserId).toBeDefined();
  });

  test("Setup second user profile", async () => {
    const uniqueUsername = `su${Date.now()}${Math.random().toString(36).slice(2, 5)}`;
    const res = await authenticatedApi("/api/profiles/setup", secondUserToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: uniqueUsername,
        avatar_emoji: "🎉",
      }),
    });
    await expectStatus(res, 200, 201);
  });

  // Contact Listing Tests
  test("List all available contacts", async () => {
    const res = await authenticatedApi("/api/contacts/list", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.contacts).toBeDefined();
    expect(Array.isArray(data.contacts)).toBe(true);
  });

  test("List contacts - returns objects with required fields", async () => {
    const res = await authenticatedApi("/api/contacts/list", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    if (data.contacts.length > 0) {
      const contact = data.contacts[0];
      expect(contact.id).toBeDefined();
      expect(contact.username).toBeDefined();
      expect(contact.avatar_emoji).toBeDefined();
    }
  });

  // Compliments Tests
  test("Get compliments received", async () => {
    const res = await authenticatedApi("/api/compliments", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.compliments).toBeDefined();
    expect(Array.isArray(data.compliments)).toBe(true);
    expect(typeof data.total_received).toBe("number");
  });

  test("Send compliment to another user", async () => {
    const res = await authenticatedApi("/api/compliments", secondUserToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: userId,
        text: "You are such an amazing person with great personality!",
        category: "Personnalité",
      }),
    });
    // 201 for success, 402 if insufficient credits
    await expectStatus(res, 201, 402);
    if (res.status === 201) {
      const data = await res.json();
      complimentId = data.id;
      expect(complimentId).toBeDefined();
      expect(data.recipient_id).toBe(userId);
      expect(data.category).toBe("Personnalité");
    }
  });

  test("Send compliment - text too short (validation error)", async () => {
    const res = await authenticatedApi("/api/compliments", secondUserToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: userId,
        text: "Hi!", // minLength: 5
        category: "Humour",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Send compliment - text too long (validation error)", async () => {
    const res = await authenticatedApi("/api/compliments", secondUserToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: userId,
        text: "a".repeat(301), // maxLength: 300
        category: "Look",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Send compliment - invalid category (validation error)", async () => {
    const res = await authenticatedApi("/api/compliments", secondUserToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: userId,
        text: "You have amazing talent!",
        category: "InvalidCategory",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Send compliment - missing required field (validation error)", async () => {
    const res = await authenticatedApi("/api/compliments", secondUserToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: userId,
        // missing text
        category: "Talent",
      }),
    });
    await expectStatus(res, 400);
  });

  // Daily Compliment Count Tests
  test("Get daily compliment send count", async () => {
    const res = await authenticatedApi("/api/compliments/daily-count", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.count).toBe("number");
  });

  // Compliment Detail Tests (only run if complimentId exists)
  test("Get compliment by ID", async () => {
    if (!complimentId) {
      return; // Skip if no compliment was created
    }
    const res = await authenticatedApi(
      `/api/compliments/${complimentId}`,
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.id).toBe(complimentId);
    expect(data.text).toBeDefined();
    expect(data.category).toBeDefined();
    expect(typeof data.is_revealed).toBe("boolean");
  });

  test("Get compliment - compliment not found (404)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/00000000-0000-0000-0000-000000000000",
      authToken
    );
    await expectStatus(res, 404);
  });

  test("Get compliment - invalid UUID format (400)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/invalid-uuid",
      authToken
    );
    await expectStatus(res, 400);
  });

  test("Get guess suggestions for compliment", async () => {
    if (!complimentId) {
      return; // Skip if no compliment was created
    }
    const res = await authenticatedApi(
      `/api/compliments/${complimentId}/guess-suggestions`,
      authToken
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.suggestions).toBeDefined();
    expect(Array.isArray(data.suggestions)).toBe(true);
  });

  test("Get guess suggestions - compliment not found (404)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/00000000-0000-0000-0000-000000000000/guess-suggestions",
      authToken
    );
    await expectStatus(res, 404);
  });

  test("Get guess suggestions - invalid UUID format (400)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/invalid-uuid/guess-suggestions",
      authToken
    );
    await expectStatus(res, 400);
  });

  test("Guess compliment sender", async () => {
    if (!complimentId) {
      return; // Skip if no compliment was created
    }
    const res = await authenticatedApi(
      `/api/compliments/${complimentId}/guess`,
      authToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guessed_user_id: secondUserId,
        }),
      }
    );
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.correct).toBe("boolean");
  });

  test("Guess compliment - compliment not found (404)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/00000000-0000-0000-0000-000000000000/guess",
      authToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guessed_user_id: secondUserId,
        }),
      }
    );
    await expectStatus(res, 404);
  });

  test("Guess compliment - invalid UUID format (400)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/invalid-uuid/guess",
      authToken,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guessed_user_id: secondUserId,
        }),
      }
    );
    await expectStatus(res, 400);
  });

  test("Reveal compliment sender", async () => {
    if (!complimentId) {
      return; // Skip if no compliment was created
    }
    const res = await authenticatedApi(
      `/api/compliments/${complimentId}/reveal`,
      authToken,
      {
        method: "POST",
      }
    );
    // 200 for success, 402 for insufficient credits
    await expectStatus(res, 200, 402);
    if (res.status === 200) {
      const data = await res.json();
      expect(data.sender).toBeDefined();
      if (data.sender) {
        expect(data.sender.id).toBeDefined();
        expect(data.sender.username).toBeDefined();
      }
    }
  });

  test("Reveal compliment - compliment not found (404)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/00000000-0000-0000-0000-000000000000/reveal",
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 404);
  });

  test("Reveal compliment - invalid UUID format (400)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/invalid-uuid/reveal",
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 400);
  });

  test("Share compliment", async () => {
    if (!complimentId) {
      return; // Skip if no compliment was created
    }
    const res = await authenticatedApi(
      `/api/compliments/${complimentId}/share`,
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.invite_id).toBeDefined();
    expect(data.share_url).toBeDefined();
  });

  test("Share compliment - compliment not found (404)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/00000000-0000-0000-0000-000000000000/share",
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 404);
  });

  test("Share compliment - invalid UUID format (400)", async () => {
    const res = await authenticatedApi(
      "/api/compliments/invalid-uuid/share",
      authToken,
      {
        method: "POST",
      }
    );
    await expectStatus(res, 400);
  });

  // Credits Tests
  test("Get credits balance and transaction history", async () => {
    const res = await authenticatedApi("/api/credits", authToken);
    await expectStatus(res, 200);
    const data = await res.json();
    expect(typeof data.balance).toBe("number");
    expect(data.transactions).toBeDefined();
    expect(Array.isArray(data.transactions)).toBe(true);
  });

  test("Purchase credit pack - pack_10", async () => {
    const res = await authenticatedApi("/api/credits/purchase", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: "pack_10",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(typeof data.new_balance).toBe("number");
    expect(typeof data.credits_added).toBe("number");
  });

  test("Purchase credit pack - pack_50", async () => {
    const res = await authenticatedApi("/api/credits/purchase", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: "pack_50",
      }),
    });
    await expectStatus(res, 201);
  });

  test("Purchase credit pack - pack_150", async () => {
    const res = await authenticatedApi("/api/credits/purchase", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: "pack_150",
      }),
    });
    await expectStatus(res, 201);
  });

  test("Purchase credit pack - invalid pack (validation error)", async () => {
    const res = await authenticatedApi("/api/credits/purchase", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: "invalid_pack",
      }),
    });
    await expectStatus(res, 400);
  });

  test("Purchase credit pack - missing pack field (validation error)", async () => {
    const res = await authenticatedApi("/api/credits/purchase", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  // Reports Tests
  test("Report compliment", async () => {
    if (!complimentId) {
      return; // Skip if no compliment was created
    }
    const res = await authenticatedApi("/api/reports", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compliment_id: complimentId,
        reason: "Inappropriate or offensive content",
      }),
    });
    await expectStatus(res, 201);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Report compliment - compliment not found (404)", async () => {
    const res = await authenticatedApi("/api/reports", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compliment_id: "00000000-0000-0000-0000-000000000000",
        reason: "Test reason",
      }),
    });
    await expectStatus(res, 404);
  });

  test("Report compliment - missing required fields (validation error)", async () => {
    const res = await authenticatedApi("/api/reports", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compliment_id: "00000000-0000-0000-0000-000000000000",
        // missing reason
      }),
    });
    await expectStatus(res, 400);
  });

  // Blocks Tests
  test("Block a user", async () => {
    const res = await authenticatedApi("/api/blocks", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocked_id: secondUserId,
      }),
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Block user - missing required field (validation error)", async () => {
    const res = await authenticatedApi("/api/blocks", authToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    await expectStatus(res, 400);
  });

  // Invites Tests
  test("Track invite link click", async () => {
    const res = await api("/api/invite/00000000-0000-0000-0000-000000000000/track", {
      method: "POST",
    });
    await expectStatus(res, 200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test("Track invite link click - invalid UUID format (400)", async () => {
    const res = await api("/api/invite/invalid-uuid/track", {
      method: "POST",
    });
    await expectStatus(res, 400);
  });

  // Suggested Compliments Tests
  test("Get suggested compliments for Personnalité category", async () => {
    const res = await api("/api/suggested-compliments?category=Personnalité");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get suggested compliments for Look category", async () => {
    const res = await api("/api/suggested-compliments?category=Look");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get suggested compliments for Talent category", async () => {
    const res = await api("/api/suggested-compliments?category=Talent");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get suggested compliments for Humour category", async () => {
    const res = await api("/api/suggested-compliments?category=Humour");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get suggested compliments for Autre category", async () => {
    const res = await api("/api/suggested-compliments?category=Autre");
    await expectStatus(res, 200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test("Get suggested compliments - invalid category (validation error)", async () => {
    const res = await api("/api/suggested-compliments?category=InvalidCategory");
    await expectStatus(res, 400);
  });

  test("Get suggested compliments - missing category parameter (validation error)", async () => {
    const res = await api("/api/suggested-compliments");
    await expectStatus(res, 400);
  });

  // Unauthorized Access Tests
  test("Get profile without authentication (401)", async () => {
    const res = await api("/api/profiles/me");
    await expectStatus(res, 401);
  });

  test("Update profile without authentication (401)", async () => {
    const res = await api("/api/profiles/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "hacker",
        avatar_emoji: "😈",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Setup profile without authentication (401)", async () => {
    const res = await api("/api/profiles/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "hacker",
        avatar_emoji: "😈",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Send compliment without authentication (401)", async () => {
    const res = await api("/api/compliments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient_id: userId,
        text: "You are amazing!",
        category: "Humour",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Get compliments without authentication (401)", async () => {
    const res = await api("/api/compliments");
    await expectStatus(res, 401);
  });

  test("Get daily compliment count without authentication (401)", async () => {
    const res = await api("/api/compliments/daily-count");
    await expectStatus(res, 401);
  });

  test("List contacts without authentication (401)", async () => {
    const res = await api("/api/contacts/list");
    await expectStatus(res, 401);
  });

  test("Get credits without authentication (401)", async () => {
    const res = await api("/api/credits");
    await expectStatus(res, 401);
  });

  test("Purchase credits without authentication (401)", async () => {
    const res = await api("/api/credits/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: "pack_10",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Report compliment without authentication (401)", async () => {
    const res = await api("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        compliment_id: "00000000-0000-0000-0000-000000000000",
        reason: "Test",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Block user without authentication (401)", async () => {
    const res = await api("/api/blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blocked_id: "some-user-id",
      }),
    });
    await expectStatus(res, 401);
  });

  test("Guess compliment without authentication (401)", async () => {
    const res = await api(
      "/api/compliments/00000000-0000-0000-0000-000000000000/guess",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guessed_user_id: "some-user-id",
        }),
      }
    );
    await expectStatus(res, 401);
  });

  test("Reveal compliment without authentication (401)", async () => {
    const res = await api(
      "/api/compliments/00000000-0000-0000-0000-000000000000/reveal",
      {
        method: "POST",
      }
    );
    await expectStatus(res, 401);
  });

  test("Get guess suggestions without authentication (401)", async () => {
    const res = await api(
      "/api/compliments/00000000-0000-0000-0000-000000000000/guess-suggestions"
    );
    await expectStatus(res, 401);
  });

  test("Share compliment without authentication (401)", async () => {
    const res = await api(
      "/api/compliments/00000000-0000-0000-0000-000000000000/share",
      {
        method: "POST",
      }
    );
    await expectStatus(res, 401);
  });

  test("Get compliment without authentication (401)", async () => {
    const res = await api(
      "/api/compliments/00000000-0000-0000-0000-000000000000"
    );
    await expectStatus(res, 401);
  });
});
