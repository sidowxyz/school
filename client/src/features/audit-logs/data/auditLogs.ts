import { AuditLog } from "../types";

export const auditLogs: AuditLog[] = [
  {
    id: 1,
    user: "Ahmed Ali",
    role: "System Administrator",
    module: "Teacher Management",
    action: "Updated Teacher Profile",
    status: "Success",
    ip: "192.168.1.12",
    timestamp: "07 Jul 2026 • 10:30 AM",

    before: {
      Phone: "+252611111111",
      Department: "Science",
    },

    after: {
      Phone: "+252619011723",
      Department: "ICT",
    },
  },

  {
    id: 2,
    user: "Fatima Noor",
    role: "Registrar",
    module: "Student Management",
    action: "Added New Student",
    status: "Success",
    ip: "192.168.1.15",
    timestamp: "07 Jul 2026 • 09:10 AM",

    before: {},

    after: {
      Name: "Ahmed Ali",
      Class: "Grade 9",
    },
  },

  {
    id: 3,
    user: "Mohamed Hassan",
    role: "Finance Officer",
    module: "Finance",
    action: "Updated Discount Policy",
    status: "Warning",
    ip: "192.168.1.20",
    timestamp: "06 Jul 2026 • 04:25 PM",

    before: {
      Discount: "20%",
    },

    after: {
      Discount: "30%",
    },
  },

  {
    id: 4,
    user: "Amina Yusuf",
    role: "System Administrator",
    module: "Settings",
    action: "Changed School Logo",
    status: "Success",
    ip: "192.168.1.5",
    timestamp: "06 Jul 2026 • 02:45 PM",

    before: {
      Logo: "logo_old.png",
    },

    after: {
      Logo: "logo_new.png",
    },
  },

  {
    id: 5,
    user: "Abdirahman Omar",
    role: "Academic Officer",
    module: "Attendance",
    action: "Deleted Attendance Record",
    status: "Failed",
    ip: "192.168.1.8",
    timestamp: "05 Jul 2026 • 11:15 AM",

    before: {
      Teacher: "Mohamed Hassan",
      Status: "Present",
    },

    after: {},
  },

  {
    id: 6,
    user: "Hodan Ahmed",
    role: "Librarian",
    module: "Library",
    action: "Issued Book",
    status: "Success",
    ip: "192.168.1.30",
    timestamp: "05 Jul 2026 • 09:50 AM",

    before: {},

    after: {
      Book: "Computer Networks",
      Student: "Fatima Noor",
    },
  },
];