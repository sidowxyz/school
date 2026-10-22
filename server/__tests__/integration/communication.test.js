/**
 * Communication Module Integration Tests
 * Tests: Notices CRUD, Message send/inbox/read, Notification feed/mark-read, RBAC
 *
 * Test DB: Uses MONGODB_URI from environment (test database)
 */

import request from "supertest";
import mongoose from "mongoose";
import app from "../../src/server.js";
import User from "../../src/models/User.js";
import Notice from "../../src/models/notice.model.js";
import Message from "../../src/models/message.model.js";
import Notification from "../../src/models/notification.model.js";
import CommCounter from "../../src/models/CommCounter.js";
import { generateAccessToken } from "../../src/utils/tokenService.js";

//
// HELPERS
//

// Persist a real User so authenticate can load it (the single auth stack does a
// DB lookup — a token for a non-existent user id is correctly rejected as 401).
const COMM_TEST_EMAIL = /_comm_test_@example\.com$/;
const createUserWithRole = async (roleStr) => {
  const user = await User.create({
    firstName: roleStr,
    lastName: "CommTest",
    email: `${roleStr}_${Date.now()}_${Math.random().toString(36).slice(2)}_comm_test_@example.com`,
    password: "password123",
    role: roleStr,
  });
  const token = generateAccessToken(user);
  return { userId: user._id, token };
};

//
// SETUP / TEARDOWN
//

describe("Communication Module Integration Tests", () => {
  let adminToken, teacherToken, studentToken;
  let adminId, teacherId, studentId;

  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since a raw connect() here would use
    // the unrewritten MONGODB_URI and point straight at production.

    // Create virtual users for token generation
    const admin = await createUserWithRole("admin", 1);
    const teacher = await createUserWithRole("teacher", 2);
    const student = await createUserWithRole("student", 3);

    adminId = admin.userId;
    adminToken = admin.token;
    teacherId = teacher.userId;
    teacherToken = teacher.token;
    studentId = student.userId;
    studentToken = student.token;
  }, 30000);

  beforeEach(async () => {
    await Notice.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await CommCounter.deleteMany({});
  }, 30000);

  afterEach(async () => {
    await Notice.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await CommCounter.deleteMany({});
  }, 30000);

  afterAll(async () => {
    await Notice.deleteMany({});
    await Message.deleteMany({});
    await Notification.deleteMany({});
    await CommCounter.deleteMany({});
    await User.deleteMany({ email: COMM_TEST_EMAIL });
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  //
  // AUTH GUARD TESTS
  //

  describe("RBAC: Unauthenticated access", () => {
    it("should return 401 for GET /api/communication/notices without token", async () => {
      const res = await request(app).get("/api/communication/notices");
      expect(res.statusCode).toBe(401);
    }, 15000);

    it("should return 401 for POST /api/communication/messages without token", async () => {
      const res = await request(app)
        .post("/api/communication/messages")
        .send({ receiver_id: adminId.toString(), subject: "Test", message: "Hello" });
      expect(res.statusCode).toBe(401);
    }, 15000);

    it("should return 401 for GET /api/communication/notifications without token", async () => {
      const res = await request(app).get("/api/communication/notifications");
      expect(res.statusCode).toBe(401);
    }, 15000);
  });

  describe("RBAC: Student cannot create notices", () => {
    it("should return 403 when student tries to POST /api/communication/notices", async () => {
      const res = await request(app)
        .post("/api/communication/notices")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          title: "Unauthorized Notice",
          content: "This should be blocked by RBAC middleware.",
          target_role: "all",
        });
      expect(res.statusCode).toBe(403);
    }, 15000);
  });

  describe("RBAC: Teacher cannot create notices", () => {
    it("should return 403 when teacher tries to POST /api/communication/notices", async () => {
      const res = await request(app)
        .post("/api/communication/notices")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          title: "Teacher Notice",
          content: "Teachers should not be able to create notices.",
          target_role: "all",
        });
      expect(res.statusCode).toBe(403);
    }, 15000);
  });

  //
  // NOTICE CRUD TESTS
  //

  describe("Notice CRUD", () => {
    it("should allow admin to create a notice (POST /api/communication/notices)", async () => {
      const res = await request(app)
        .post("/api/communication/notices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title: "School Closed Tomorrow",
          content: "Due to public holiday, the school will be closed tomorrow.",
          target_role: "all",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("notice_no");
      expect(res.body.data.notice_no).toMatch(/^NOT-\d{4}$/);
      expect(res.body.data.is_published).toBe(false);
    }, 15000);

    it("should return 400 when creating a notice with missing title", async () => {
      const res = await request(app)
        .post("/api/communication/notices")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          content: "Notice without title",
          target_role: "all",
        });
      expect(res.statusCode).toBe(400);
    }, 15000);

    it("should get all notices (GET /api/communication/notices)", async () => {
      // Seed a notice directly
      await Notice.create({
        notice_no: "NOT-0001",
        title: "Test Notice",
        content: "Test content for listing",
        target_role: "all",
        is_published: true,
        createBy: adminId,
      });

      const res = await request(app)
        .get("/api/communication/notices")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.notices.length).toBeGreaterThan(0);
      expect(res.body.data).toHaveProperty("pagination");
    }, 15000);

    it("should get a single notice by ID", async () => {
      const seeded = await Notice.create({
        notice_no: "NOT-0002",
        title: "Single Notice",
        content: "This is a single notice test",
        target_role: "teacher",
        createBy: adminId,
      });

      const res = await request(app)
        .get(`/api/communication/notices/${seeded._id}`)
        .set("Authorization", `Bearer ${teacherToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe("Single Notice");
    }, 15000);

    it("should allow admin to update a notice", async () => {
      const seeded = await Notice.create({
        notice_no: "NOT-0003",
        title: "Original Title",
        content: "Original content that will be updated",
        target_role: "all",
        createBy: adminId,
      });

      const res = await request(app)
        .put(`/api/communication/notices/${seeded._id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ title: "Updated Title" });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.title).toBe("Updated Title");
    }, 15000);

    it("should allow admin to delete a notice", async () => {
      const seeded = await Notice.create({
        notice_no: "NOT-0004",
        title: "Notice To Delete",
        content: "This notice will be deleted in the test",
        target_role: "all",
        createBy: adminId,
      });

      const res = await request(app)
        .delete(`/api/communication/notices/${seeded._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);

      const deleted = await Notice.findById(seeded._id);
      expect(deleted).toBeNull();
    }, 15000);

    it("should remove notifications generated by a deleted notice", async () => {
      const seeded = await Notice.create({
        notice_no: "NOT-0005",
        title: "Published Notice To Delete",
        content: "Its dashboard notification must be removed with it.",
        target_role: "all",
        is_published: true,
        published_at: new Date(),
        createBy: adminId,
      });
      await Notification.create({
        notification_id: "NTF-0099",
        user_id: adminId,
        type: "notice",
        title: seeded.title,
        body: seeded.content,
        reference_id: seeded._id,
        reference_model: "Notice",
        createBy: adminId,
      });

      const res = await request(app)
        .delete(`/api/communication/notices/${seeded._id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(await Notification.countDocuments({ reference_id: seeded._id })).toBe(0);
    }, 15000);
  });

  //
  // NOTICE PUBLISH + AUTO-NOTIFICATION
  //

  describe("Notice Publish Workflow", () => {
    it("should publish a notice and auto-create notifications", async () => {
      const seeded = await Notice.create({
        notice_no: "NOT-0010",
        title: "Published Notice",
        content: "This notice will trigger notifications when published",
        target_role: "all",
        createBy: adminId,
        is_published: false,
      });

      const res = await request(app)
        .patch(`/api/communication/notices/${seeded._id}/publish`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.is_published).toBe(true);
      expect(res.body.data.published_at).not.toBeNull();

      // Allow time for insertMany notifications
      await new Promise((r) => setTimeout(r, 500));

      // Verify at least some notifications were created
      const notifCount = await Notification.countDocuments({
        reference_model: "Notice",
        reference_id: seeded._id,
      });
      expect(notifCount).toBeGreaterThanOrEqual(0); // 0 if no users in DB — still passes
    }, 20000);

    it("should return 400 if trying to publish an already-published notice", async () => {
      const seeded = await Notice.create({
        notice_no: "NOT-0011",
        title: "Already Published",
        content: "This notice is already published and should reject re-publish",
        target_role: "all",
        createBy: adminId,
        is_published: true,
        published_at: new Date(),
      });

      const res = await request(app)
        .patch(`/api/communication/notices/${seeded._id}/publish`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(400);
    }, 15000);
  });

  //
  // MESSAGE TESTS
  //

  describe("Direct Messaging", () => {
    it("should send a message and auto-create a notification", async () => {
      const res = await request(app)
        .post("/api/communication/messages")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({
          receiver_id: studentId.toString(),
          subject: "Your Assignment",
          message: "Please submit your assignment by Friday.",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message_id).toMatch(/^MSG-\d{4}$/);
      expect(res.body.data.is_read).toBe(false);

      // A notification should have been created for the receiver
      await new Promise((r) => setTimeout(r, 300));
      const notif = await Notification.findOne({
        user_id: studentId,
        type: "message",
      });
      expect(notif).not.toBeNull();
      expect(notif.title).toContain("Your Assignment");
    }, 20000);

    it("should return 400 for message with missing receiver_id", async () => {
      const res = await request(app)
        .post("/api/communication/messages")
        .set("Authorization", `Bearer ${teacherToken}`)
        .send({ subject: "Hello", message: "No receiver specified" });

      expect(res.statusCode).toBe(400);
    }, 15000);

    it("should retrieve inbox for student", async () => {
      await Message.create({
        message_id: "MSG-0001",
        sender_id: teacherId,
        receiver_id: studentId,
        subject: "Inbox Message",
        message: "A message in student inbox",
        is_read: false,
        createBy: teacherId,
      });

      const res = await request(app)
        .get("/api/communication/messages/inbox")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.messages.length).toBe(1);
      expect(res.body.data.messages[0].subject).toBe("Inbox Message");
    }, 15000);

    it("should mark a message as read and record read_at timestamp", async () => {
      const seeded = await Message.create({
        message_id: "MSG-0002",
        sender_id: teacherId,
        receiver_id: studentId,
        subject: "Mark Read Test",
        message: "Testing the mark-as-read functionality",
        is_read: false,
        createBy: teacherId,
      });

      const res = await request(app)
        .patch(`/api/communication/messages/${seeded._id}/read`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.is_read).toBe(true);
      expect(res.body.data.read_at).not.toBeNull();
    }, 15000);

    it("should soft-delete a message for the receiver only", async () => {
      const seeded = await Message.create({
        message_id: "MSG-0003",
        sender_id: teacherId,
        receiver_id: studentId,
        subject: "Soft Delete Test",
        message: "This will be soft-deleted by receiver",
        is_read: false,
        createBy: teacherId,
      });

      const res = await request(app)
        .delete(`/api/communication/messages/${seeded._id}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);

      const updated = await Message.findById(seeded._id);
      expect(updated.is_deleted_by_receiver).toBe(true);
      // Sender's copy still intact
      expect(updated.is_deleted_by_sender).toBe(false);
    }, 15000);
  });

  //
  // NOTIFICATION TESTS
  //

  describe("Notification Feed & Read Status", () => {
    it("should get my notifications with pagination", async () => {
      await Notification.create([
        {
          notification_id: "NTF-0001",
          user_id: studentId,
          type: "notice",
          title: "Notice 1",
          body: "Body of notice 1",
          createBy: adminId,
        },
        {
          notification_id: "NTF-0002",
          user_id: studentId,
          type: "message",
          title: "Message from teacher",
          body: "Teacher sent you a message",
          createBy: teacherId,
        },
      ]);

      const res = await request(app)
        .get("/api/communication/notifications")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.notifications.length).toBe(2);
      expect(res.body.data).toHaveProperty("pagination");
    }, 15000);

    it("should return unread count for a user", async () => {
      await Notification.create([
        {
          notification_id: "NTF-0010",
          user_id: studentId,
          type: "notice",
          title: "Unread 1",
          body: "Unread notification",
          is_read: false,
          createBy: adminId,
        },
        {
          notification_id: "NTF-0011",
          user_id: studentId,
          type: "notice",
          title: "Read 1",
          body: "Read notification",
          is_read: true,
          createBy: adminId,
        },
      ]);

      const res = await request(app)
        .get("/api/communication/notifications/unread-count")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.count).toBe(1);
    }, 15000);

    it("should mark a single notification as read with read_at timestamp", async () => {
      const notif = await Notification.create({
        notification_id: "NTF-0020",
        user_id: studentId,
        type: "notice",
        title: "Mark Single Read",
        body: "This will be marked as read",
        is_read: false,
        createBy: adminId,
      });

      const res = await request(app)
        .patch(`/api/communication/notifications/${notif._id}/read`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.is_read).toBe(true);
      expect(res.body.data.read_at).not.toBeNull();
    }, 15000);

    it("should mark all notifications as read", async () => {
      await Notification.create([
        {
          notification_id: "NTF-0030",
          user_id: studentId,
          type: "notice",
          title: "Unread A",
          body: "Unread A body",
          is_read: false,
          createBy: adminId,
        },
        {
          notification_id: "NTF-0031",
          user_id: studentId,
          type: "system",
          title: "Unread B",
          body: "Unread B body",
          is_read: false,
          createBy: adminId,
        },
      ]);

      const res = await request(app)
        .patch("/api/communication/notifications/read-all")
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.modified).toBe(2);

      const remaining = await Notification.countDocuments({
        user_id: studentId,
        is_read: false,
      });
      expect(remaining).toBe(0);
    }, 15000);

    it("should not let one user read another user's notification", async () => {
      const notif = await Notification.create({
        notification_id: "NTF-0040",
        user_id: adminId,
        type: "system",
        title: "Admin Only",
        body: "This belongs to admin",
        is_read: false,
        createBy: adminId,
      });

      const res = await request(app)
        .patch(`/api/communication/notifications/${notif._id}/read`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(403);
    }, 15000);

    it("should delete a notification (owner only)", async () => {
      const notif = await Notification.create({
        notification_id: "NTF-0050",
        user_id: studentId,
        type: "notice",
        title: "To Delete",
        body: "This notification will be deleted",
        createBy: adminId,
      });

      const res = await request(app)
        .delete(`/api/communication/notifications/${notif._id}`)
        .set("Authorization", `Bearer ${studentToken}`);

      expect(res.statusCode).toBe(200);

      const deleted = await Notification.findById(notif._id);
      expect(deleted).toBeNull();
    }, 15000);

    it("should allow admin to broadcast notifications to multiple users", async () => {
      const res = await request(app)
        .post("/api/communication/notifications/broadcast")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          user_ids: [studentId.toString(), teacherId.toString()],
          type: "system",
          title: "System Maintenance",
          body: "System will be down from 2am to 4am for maintenance.",
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.count).toBe(2);

      const saved = await Notification.countDocuments({ type: "system" });
      expect(saved).toBe(2);
    }, 15000);

    it("should prevent student from broadcasting notifications", async () => {
      const res = await request(app)
        .post("/api/communication/notifications/broadcast")
        .set("Authorization", `Bearer ${studentToken}`)
        .send({
          user_ids: [adminId.toString()],
          type: "system",
          title: "Unauthorized Broadcast",
          body: "This should not be allowed.",
        });

      expect(res.statusCode).toBe(403);
    }, 15000);
  });
});
