// src/types/profile.types.ts

import { Timestamps } from './utils.types';

export interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  coverImageUrl?: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  timestamps: Timestamps;
}

export interface PrivateProfile {
  uid: string;
  email: string;
  phone?: string;
  preferences: UserPreferences;
  notifications: NotificationPreferences;
  timestamps: Timestamps;
}

export interface UserPreferences {
  language: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  commentNotifications: boolean;
  mentionNotifications: boolean;
  followerNotifications: boolean;
}

export interface ProfileFormData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  location?: string;
  website?: string;
  username?: string;
}
