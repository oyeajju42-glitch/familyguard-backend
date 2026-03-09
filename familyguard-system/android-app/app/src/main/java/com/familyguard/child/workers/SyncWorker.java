package com.familyguard.child.workers;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.familyguard.child.admin.FamilyDeviceAdminReceiver;
import com.familyguard.child.api.ApiClient;
import com.familyguard.child.api.ApiService;
import com.familyguard.child.api.Payloads;
import com.familyguard.child.collectors.DataCollectorManager;
import com.familyguard.child.storage.LocalStore;

import java.io.IOException;
import java.time.Instant;

import retrofit2.Response;

public class SyncWorker extends Worker {
    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        LocalStore store = new LocalStore(getApplicationContext());
        if (store.getApiBase().isEmpty() || store.getDeviceToken().isEmpty()) {
            return Result.failure();
        }

        ApiService api = ApiClient.create(store.getApiBase());
        DataCollectorManager collectors = new DataCollectorManager(getApplicationContext());

        try {
            api.syncScreenTime(store.getDeviceToken(), collectors.collectScreenTime()).execute();
            api.syncAppUsage(store.getDeviceToken(), collectors.collectAppUsage()).execute();
            api.syncInstalledApps(store.getDeviceToken(), collectors.collectInstalledApps()).execute();
            api.syncContacts(store.getDeviceToken(), collectors.collectContacts()).execute();
            api.syncSms(store.getDeviceToken(), collectors.collectSms()).execute();

            Payloads.ActivityRequest activity = new Payloads.ActivityRequest();
            activity.category = "SYSTEM";
            activity.message = "Periodic sync completed";
            activity.meta = "worker";
            activity.capturedAt = Instant.now().toString();
            api.syncActivity(store.getDeviceToken(), activity).execute();

            pollAndRunCommands(api, store.getDeviceToken());
            return Result.success();
        } catch (IOException ex) {
            return Result.retry();
        }
    }

    private void pollAndRunCommands(ApiService api, String token) throws IOException {
        Response<Payloads.CommandListResponse> commandsResponse = api.fetchCommands(token).execute();
        if (!commandsResponse.isSuccessful() || commandsResponse.body() == null || commandsResponse.body().commands == null) {
            return;
        }

        for (Payloads.CommandEntry command : commandsResponse.body().commands) {
            Payloads.CommandAckRequest ack = new Payloads.CommandAckRequest();
            try {
                if ("LOCK_DEVICE".equals(command.commandType)) {
                    DevicePolicyManager dpm = (DevicePolicyManager) getApplicationContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
                    ComponentName admin = new ComponentName(getApplicationContext(), FamilyDeviceAdminReceiver.class);
                    if (dpm.isAdminActive(admin)) {
                        dpm.lockNow();
                        ack.status = "EXECUTED";
                    } else {
                        ack.status = "FAILED";
                        ack.failureReason = "Device admin permission missing";
                    }
                }
            } catch (Exception ex) {
                ack.status = "FAILED";
                ack.failureReason = ex.getMessage();
            }
            api.ackCommand(token, command.id, ack).execute();
        }
    }
}
