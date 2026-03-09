package com.familyguard.child.collectors;

import android.content.Context;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;

import com.familyguard.child.api.Payloads;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public class DataCollectorManager {
    private final Context context;

    public DataCollectorManager(Context context) {
        this.context = context;
    }

    public Payloads.InstalledAppsRequest collectInstalledApps() {
        PackageManager pm = context.getPackageManager();
        List<PackageInfo> packages = pm.getInstalledPackages(0);

        Payloads.InstalledAppsRequest request = new Payloads.InstalledAppsRequest();
        request.capturedAt = Instant.now().toString();
        request.apps = new ArrayList<>();

        for (PackageInfo pkg : packages) {
            if ((pkg.applicationInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0) continue;
            Payloads.InstalledAppItem item = new Payloads.InstalledAppItem();
            item.packageName = pkg.packageName;
            item.appName = pm.getApplicationLabel(pkg.applicationInfo).toString();
            item.firstInstallTime = pkg.firstInstallTime;
            item.updateTime = pkg.lastUpdateTime;
            request.apps.add(item);
        }
        return request;
    }

    public Payloads.AppUsageRequest collectAppUsage() {
        Payloads.AppUsageRequest request = new Payloads.AppUsageRequest();
        request.dateKey = Instant.now().toString().substring(0, 10);
        request.apps = new ArrayList<>();
        return request;
    }

    public Payloads.ScreenTimeRequest collectScreenTime() {
        Payloads.ScreenTimeRequest request = new Payloads.ScreenTimeRequest();
        request.dateKey = Instant.now().toString().substring(0, 10);
        request.totalMinutes = 0;
        request.appForegroundMinutes = 0;
        return request;
    }

    public Payloads.ContactsRequest collectContacts() {
        Payloads.ContactsRequest request = new Payloads.ContactsRequest();
        request.capturedAt = Instant.now().toString();
        request.contacts = new ArrayList<>();
        return request;
    }

    public Payloads.SmsRequest collectSms() {
        Payloads.SmsRequest request = new Payloads.SmsRequest();
        request.capturedAt = Instant.now().toString();
        request.messages = new ArrayList<>();
        return request;
    }
}
