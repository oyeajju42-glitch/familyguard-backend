package com.familyguard.child.services;

import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import com.familyguard.child.api.ApiClient;
import com.familyguard.child.api.ApiService;
import com.familyguard.child.api.Payloads;
import com.familyguard.child.storage.LocalStore;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Map;

public class NotificationCaptureService extends NotificationListenerService {
    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        LocalStore store = new LocalStore(this);
        if (store.getDeviceToken().isEmpty() || store.getApiBase().isEmpty()) return;

        Payloads.NotificationEntry entry = new Payloads.NotificationEntry();
        entry.appName = sbn.getPackageName();
        entry.packageName = sbn.getPackageName();
        entry.title = String.valueOf(sbn.getNotification().extras.getCharSequence("android.title", ""));
        entry.text = String.valueOf(sbn.getNotification().extras.getCharSequence("android.text", ""));
        entry.capturedAt = Instant.now().toString();

        Payloads.NotificationsRequest payload = new Payloads.NotificationsRequest();
        payload.entries = new ArrayList<>();
        payload.entries.add(entry);

        ApiService api = ApiClient.create(store.getApiBase());
        api.syncNotifications(store.getDeviceToken(), payload).enqueue(new retrofit2.Callback<Map<String, Object>>() {
            @Override
            public void onResponse(retrofit2.Call<Map<String, Object>> call, retrofit2.Response<Map<String, Object>> response) {}

            @Override
            public void onFailure(retrofit2.Call<Map<String, Object>> call, Throwable t) {}
        });
    }
}
