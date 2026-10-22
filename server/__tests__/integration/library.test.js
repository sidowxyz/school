import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { jest, describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from '@jest/globals';
import app from '../../src/server.js';
import Book from '../../src/models/Book.js';
import Author from '../../src/models/Author.js';
import BookCategory from '../../src/models/BookCategory.js';
import Shelf from '../../src/models/Shelf.js';
import BookIssue from '../../src/models/BookIssue.js';
import BookReturn from '../../src/models/BookReturn.js';
import LibraryFine from '../../src/models/LibraryFine.js';
import Student from '../../src/models/Student.js';
import User from '../../src/models/User.js';


// Auth Helper

let authToken;
let testUser;

const getAuthToken = async () => {
  if (authToken) return authToken;

  testUser = await User.create({
    firstName: 'Library',
    lastName: 'Tester',
    email: `library.tester.${Date.now()}@test.com`,
    password: 'Password123!',
    role: 'admin'
  });

  const secret = process.env.JWT_ACCESS_SECRET || 'school_management_jwt_secret_2024';
  authToken = jwt.sign({ id: testUser._id }, secret, { expiresIn: '1d' });
  return authToken;
};

// Data Helpers

const cleanAll = async () => {
  await Promise.all([
    Book.deleteMany({}),
    Author.deleteMany({}),
    BookCategory.deleteMany({}),
    Shelf.deleteMany({}),
    BookIssue.deleteMany({}),
    BookReturn.deleteMany({}),
    LibraryFine.deleteMany({}),
    Student.deleteMany({ admissionNumber: /^TEST-/ })
  ]);
};

const createTestBook = async (overrides = {}) => {
  const author = await Author.create({ author_name: `Author-${Date.now()}` });
  const category = await BookCategory.create({ cat_name: `Cat-${Date.now()}` });

  return Book.create({
    book_name: 'Test Book',
    author_id: author._id,
    cat_id: category._id,
    qty: 3,
    available_qty: 3,
    isbn: `ISBN-${Date.now()}`,
    ...overrides
  });
};

// Lightweight student using new Student model required fields
const createTestStudent = async () => {
  const dummyId = new mongoose.Types.ObjectId();
  return Student.create({
    firstName: 'Test',
    lastName: 'Borrower',
    admissionNumber: `TEST-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    gender: 'Male',
    birthDate: new Date('2000-01-01'),
    classId: dummyId,
    sectionId: dummyId,
    phoneNumber: '0610000099',
    address: 'Mogadishu, Somalia',
    parentName: 'Test Parent',
    parentPhoneNumber: '0610000088'
  });
};

// Test Suite

jest.setTimeout(30000); // 30s per test — Atlas needs time

describe('Library Management Integration Tests', () => {
  beforeAll(async () => {
    // Connection is established once, safely, by jest.setup.js's global
    // beforeAll (rewritten to the isolated SMS_Test database) — this file
    // must never connect on its own, since connectDB() re-reads .env and
    // (prior to that being fixed) could point straight at production.
    await User.deleteMany({ email: /library\.tester/ });
    await getAuthToken();
  }, 120000);

  beforeEach(cleanAll, 30000);
  afterEach(cleanAll, 30000);

  afterAll(async () => {
    if (testUser) await User.findByIdAndDelete(testUser._id);
    // Do not close the shared connection — it's reused across every test
    // file in this run (see beforeAll above).
  }, 30000);

  // AUTHOR CRUD

  describe('Author CRUD', () => {
    it('should create an author', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/library/authors')
        .set('Authorization', `Bearer ${token}`)
        .send({ author_name: 'Ahmed Hassan', description: 'Somali author' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.author_name).toBe('Ahmed Hassan');
    });

    it('should get all authors', async () => {
      const token = await getAuthToken();
      await Author.create({ author_name: 'Author One' });
      await Author.create({ author_name: 'Author Two' });

      const res = await request(app)
        .get('/api/library/authors')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.authors.length).toBeGreaterThanOrEqual(2);
    });

    it('should update an author', async () => {
      const token = await getAuthToken();
      const author = await Author.create({ author_name: 'Old Name' });
      const res = await request(app)
        .put(`/api/library/authors/${author._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ author_name: 'New Name' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.author_name).toBe('New Name');
    });

    it('should delete an author', async () => {
      const token = await getAuthToken();
      const author = await Author.create({ author_name: 'To Delete' });
      const res = await request(app)
        .delete(`/api/library/authors/${author._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
    });
  });

  // CATEGORY & SHELF

  describe('Category CRUD', () => {
    it('should create a category', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/library/categories')
        .set('Authorization', `Bearer ${token}`)
        .send({ cat_name: `Science Fiction ${Date.now()}` });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.cat_name).toMatch(/Science Fiction/);
    });
  });

  describe('Shelf CRUD', () => {
    it('should create a shelf', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/library/shelves')
        .set('Authorization', `Bearer ${token}`)
        .send({ sh_name: `Shelf A1-${Date.now()}` });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.sh_name).toMatch(/Shelf A1/);
    });
  });

  // BOOK CRUD

  describe('Book CRUD', () => {
    it('should create a book and set available_qty equal to qty', async () => {
      const token = await getAuthToken();
      const author = await Author.create({ author_name: 'Author X' });
      const category = await BookCategory.create({ cat_name: `SciF-${Date.now()}` });

      const res = await request(app)
        .post('/api/library/books')
        .set('Authorization', `Bearer ${token}`)
        .send({
          book_name: 'Galactic Journey',
          author_id: author._id.toString(),
          cat_id: category._id.toString(),
          qty: 5,
          isbn: `ISBN-${Date.now()}`
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.available_qty).toBe(5);
    });

    it('should get all books', async () => {
      const token = await getAuthToken();
      await createTestBook({ book_name: 'Book Alpha' });
      await createTestBook({ book_name: 'Book Beta' });

      const res = await request(app)
        .get('/api/library/books')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.books.length).toBeGreaterThanOrEqual(2);
    });

    it('should get a single book by ID and increment view_count', async () => {
      const token = await getAuthToken();
      const book = await createTestBook({ book_name: 'View Test Book' });

      const res = await request(app)
        .get(`/api/library/books/${book._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.book_name).toBe('View Test Book');

      const updated = await Book.findById(book._id);
      expect(updated.view_count).toBe(1);
    });

    it('should search books by author ObjectId', async () => {
      const token = await getAuthToken();
      const book = await createTestBook({ book_name: 'Author Filter Test' });

      const res = await request(app)
        .get(`/api/library/books?author=${book.author_id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.books.length).toBeGreaterThanOrEqual(1);
    });

    it('should update a book', async () => {
      const token = await getAuthToken();
      const book = await createTestBook();
      const res = await request(app)
        .put(`/api/library/books/${book._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ book_name: 'Updated Title', version: '2nd Edition' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.book_name).toBe('Updated Title');
    });

    it('should soft-delete a book', async () => {
      const token = await getAuthToken();
      const book = await createTestBook();
      const res = await request(app)
        .delete(`/api/library/books/${book._id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(200);

      const deleted = await Book.findById(book._id);
      expect(deleted.isDeleted).toBe(true);
    });

    it('should return 404 for a non-existent book', async () => {
      const token = await getAuthToken();
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/library/books/${fakeId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });

    it('should reject creation with missing required fields', async () => {
      const token = await getAuthToken();
      const res = await request(app)
        .post('/api/library/books')
        .set('Authorization', `Bearer ${token}`)
        .send({ book_name: 'Incomplete Book' }); // Missing author_id, cat_id, qty

      expect(res.statusCode).toBe(400);
    });
  });

  // ISSUE WORKFLOW

  describe('Book Issue Workflow', () => {
    it('should issue a book to a student and decrement available_qty', async () => {
      const token = await getAuthToken();
      const book = await createTestBook({ qty: 2, available_qty: 2 });
      const student = await createTestStudent();

      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/library/issues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          book_id: book._id.toString(),
          student_id: student._id.toString(),
          expected_return_date: futureDate
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.status).toBe('issued');

      const updatedBook = await Book.findById(book._id);
      expect(updatedBook.available_qty).toBe(1);
    });

    it('should reject issuing when no copies are available', async () => {
      const token = await getAuthToken();
      const book = await createTestBook({ qty: 1, available_qty: 0 });
      const student = await createTestStudent();

      const res = await request(app)
        .post('/api/library/issues')
        .set('Authorization', `Bearer ${token}`)
        .send({
          book_id: book._id.toString(),
          student_id: student._id.toString()
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/no copies available/i);
    });

    it('should reject issuing when neither student_id nor staff_id is provided', async () => {
      const token = await getAuthToken();
      const book = await createTestBook();

      const res = await request(app)
        .post('/api/library/issues')
        .set('Authorization', `Bearer ${token}`)
        .send({ book_id: book._id.toString() });

      expect(res.statusCode).toBe(400);
    });
  });

  // RETURN WORKFLOW

  describe('Book Return Workflow', () => {
    it('should return a book on time — no fine created', async () => {
      const token = await getAuthToken();
      const book = await createTestBook({ qty: 1, available_qty: 0 });
      const student = await createTestStudent();

      const futureDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

      const issue = await BookIssue.create({
        book_id: book._id,
        student_id: student._id,
        issue_date: new Date(),
        expected_return_date: futureDate,
        status: 'issued'
      });

      const res = await request(app)
        .post('/api/library/returns')
        .set('Authorization', `Bearer ${token}`)
        .send({
          issue_id: issue._id.toString(),
          return_date: new Date().toISOString()
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.lateDays).toBe(0);
      expect(res.body.data.fineAmount).toBe(0);

      const fineCount = await LibraryFine.countDocuments({ issue_id: issue._id });
      expect(fineCount).toBe(0);

      const updatedBook = await Book.findById(book._id);
      expect(updatedBook.available_qty).toBe(1);
    });

    it('should calculate overdue fine when book is returned late', async () => {
      const token = await getAuthToken();
      const book = await createTestBook({ qty: 1, available_qty: 0 });
      const student = await createTestStudent();

      // expected_return_date was 5 days ago
      const pastDueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

      const issue = await BookIssue.create({
        book_id: book._id,
        student_id: student._id,
        issue_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        expected_return_date: pastDueDate,
        status: 'issued'
      });

      const res = await request(app)
        .post('/api/library/returns')
        .set('Authorization', `Bearer ${token}`)
        .send({
          issue_id: issue._id.toString(),
          return_date: new Date().toISOString()
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.lateDays).toBeGreaterThanOrEqual(5);
      expect(res.body.data.fineAmount).toBeGreaterThan(0);

      const fines = await LibraryFine.find({ issue_id: issue._id });
      expect(fines.length).toBe(1);
      expect(fines[0].status).toBe('unpaid');
    });

    it('should reject a double return', async () => {
      const token = await getAuthToken();
      const book = await createTestBook({ qty: 1, available_qty: 0 });
      const student = await createTestStudent();

      const issue = await BookIssue.create({
        book_id: book._id,
        student_id: student._id,
        issue_date: new Date(),
        expected_return_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'returned'
      });

      const res = await request(app)
        .post('/api/library/returns')
        .set('Authorization', `Bearer ${token}`)
        .send({ issue_id: issue._id.toString() });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already been returned/i);
    });
  });

  // BORROWING HISTORY

  describe('Borrowing History', () => {
    it('should return student borrowing history', async () => {
      const token = await getAuthToken();
      const book = await createTestBook();
      const student = await createTestStudent();

      await BookIssue.create({
        book_id: book._id,
        student_id: student._id,
        issue_date: new Date(),
        expected_return_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'issued'
      });

      const res = await request(app)
        .get(`/api/library/history/student/${student._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.history.length).toBe(1);
      expect(res.body.data.pagination.total).toBe(1);
    });

    it('should filter history by status', async () => {
      const token = await getAuthToken();
      const book = await createTestBook();
      const student = await createTestStudent();

      await BookIssue.create({
        book_id: book._id,
        student_id: student._id,
        issue_date: new Date(),
        expected_return_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'returned'
      });

      const resIssued = await request(app)
        .get(`/api/library/history/student/${student._id}?status=issued`)
        .set('Authorization', `Bearer ${token}`);
      expect(resIssued.statusCode).toBe(200);
      expect(resIssued.body.data.pagination.total).toBe(0);

      const resReturned = await request(app)
        .get(`/api/library/history/student/${student._id}?status=returned`)
        .set('Authorization', `Bearer ${token}`);
      expect(resReturned.statusCode).toBe(200);
      expect(resReturned.body.data.pagination.total).toBe(1);
    });
  });

  // FINES

  describe('Overdue Fines', () => {
    it('should retrieve student fines with total unpaid amount', async () => {
      const token = await getAuthToken();
      const book = await createTestBook();
      const student = await createTestStudent();

      const issue = await BookIssue.create({
        book_id: book._id,
        student_id: student._id,
        issue_date: new Date(),
        expected_return_date: new Date(),
        status: 'returned'
      });

      await LibraryFine.create({
        student_id: student._id,
        issue_id: issue._id,
        amount: 2.5,
        reason: 'Overdue by 5 days',
        status: 'unpaid'
      });

      const res = await request(app)
        .get(`/api/library/fines/student/${student._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.fines.length).toBe(1);
      expect(res.body.data.totalUnpaidAmount).toBe(2.5);
    });

    it('should update fine status to paid', async () => {
      const token = await getAuthToken();
      const book = await createTestBook();
      const student = await createTestStudent();

      const issue = await BookIssue.create({
        book_id: book._id,
        student_id: student._id,
        issue_date: new Date(),
        expected_return_date: new Date(),
        status: 'returned'
      });

      const fine = await LibraryFine.create({
        student_id: student._id,
        issue_id: issue._id,
        amount: 1.5,
        status: 'unpaid'
      });

      const res = await request(app)
        .put(`/api/library/fines/${fine._id}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'paid' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.status).toBe('paid');
    });
  });
});
