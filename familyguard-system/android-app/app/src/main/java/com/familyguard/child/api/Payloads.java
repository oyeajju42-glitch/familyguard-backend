package com.familyguard.child.api;

import java.util.List;

public class Payloads {
    public static class EnrollRequest {
        public String parentId;
        public String childName;
        public String deviceLabel;
        public String platformVersion;
        public String transparencyNoticeVersion;
        public String consentAcceptedAt;
        public String pairingCode;
    }

    public static class EnrollResponse {
        public String deviceId;
        public String deviceToken;
        public String message;
    }

    public static class LocationRequest {
        public double lat;
        public double lng;
        public double accuracyMeters;
        public String capturedAt;
    }

    public static class ScreenTimeRequest {
        public String dateKey;
        public int totalMinutes;
        public int appForegroundMinutes;
    }

    public static class AppUsageRequest {
        public String dateKey;
        public List<AppUsageEntry> apps;
    }

    public static class AppUsageEntry {
        public String packageName;
        public String appName;
        public int usageMinutes;
        public int launches;
    }

    public static class InstalledAppsRequest {
        public String capturedAt;
        public List<InstalledAppItem> apps;
    }

    public static class InstalledAppItem {
        public String packageName;
        public String appName;
        public long firstInstallTime;
        public long updateTime;
    }

    public static class ContactsRequest {
        public String capturedAt;
        public List<ContactItem> contacts;
    }

    public static class ContactItem {
        public String displayName;
        public String phoneNumber;
    }

    public static class SmsRequest {
        public String capturedAt;
        public List<SmsItem> messages;
    }

    public static class SmsItem {
        public String address;
        public String body;
        public String type;
        public String timestamp;
    }

    public static class ActivityRequest {
        public String category;
        public String message;
        public Object meta;
        public String capturedAt;
    }

    public static class NotificationsRequest {
        public List<NotificationEntry> entries;
    }

    public static class NotificationEntry {
        public String appName;
        public String packageName;
        public String title;
        public String text;
        public String capturedAt;
    }

    public static class CommandListResponse {
        public List<CommandEntry> commands;
    }

    public static class CommandEntry {
        public String id;
        public String commandType;
    }

    public static class CommandAckRequest {
        public String status;
        public String failureReason;
    }
}
