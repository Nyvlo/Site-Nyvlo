export interface User {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  type: UserType;
  optOutBroadcast: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type UserType = 'lead' | 'student' | 'alumni';

export interface Session {
  id: string;
  userId: string;
  state: string;
  data: string;
  lastActivity: Date;
  createdAt: Date;
}

export interface Appointment {
  id: string;
  code: string;
  userId: string;
  name: string;
  phone: string;
  scheduledAt: Date;
  purpose: string;
  status: AppointmentStatus;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Enrollment {
  id: string;
  protocol: string;
  userId: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  address: string;
  phone: string;
  email: string;
  courseId: string;
  status: EnrollmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type EnrollmentStatus = 'pending' | 'approved' | 'rejected';

export interface Conversation {
  id: string;
  userId: string;
  direction: 'in' | 'out';
  message: string;
  timestamp: Date;
}

export interface ScheduledNotification {
  id: string;
  message: string;
  audience: string;
  scheduledFor: Date;
  status: NotificationStatus;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
}

export type NotificationStatus = 'pending' | 'sent' | 'failed';

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  filePath: string;
  fileType: string;
  uploadedAt: Date;
}

export interface Admin {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  createdAt: Date;
  lastLogin: Date | null;
}
