# school-management-backend
Backend API for School Management System built with Node.js, Express, and MongoDB.

## Library Management Backend
This module provides a full library management system with CRUD operations for books, borrowing/return workflows, overdue fine calculation, and searchable inventory.

### API Documentation
Detailed API specifications can be found in **[docs/api.md](file:///d:/school-management-backend/docs/api.md)**.

### Quick Start
```bash
npm install
npm run dev
```
The server will start on `http://localhost:5000` and expose the library routes under `/api/library`.

### Authentication
All library endpoints are protected by the `authenticate` middleware. Include a valid JWT in the `Authorization: Bearer <token>` header.
```
Authorization: Bearer your_jwt_token_here
```

.
