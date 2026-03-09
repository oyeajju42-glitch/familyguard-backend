package com.familyguard.child;

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;

import com.familyguard.child.api.ApiClient;
import com.familyguard.child.api.ApiService;
import com.familyguard.child.api.Payloads;
import com.familyguard.child.services.MonitoringService;
import com.familyguard.child.storage.LocalStore;

import java.time.Instant;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class MainActivity extends AppCompatActivity {
    private TextView statusText;
    private EditText apiBaseInput;
    private EditText parentIdInput;
    private EditText pairingCodeInput;
    private LocalStore store;

    private final ActivityResultLauncher<String[]> permissionLauncher = registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(),
            result -> Toast.makeText(this, "Permissions updated", Toast.LENGTH_SHORT).show()
    );

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        store = new LocalStore(this);
        statusText = findViewById(R.id.statusText);
        apiBaseInput = findViewById(R.id.apiBaseInput);
        parentIdInput = findViewById(R.id.parentIdInput);
        pairingCodeInput = findViewById(R.id.pairingCodeInput);
        Button enrollButton = findViewById(R.id.enrollButton);
        Button startButton = findViewById(R.id.startButton);

        apiBaseInput.setText(store.getApiBase());

        enrollButton.setOnClickListener(v -> showConsentAndEnroll());
        startButton.setOnClickListener(v -> startMonitoring());
    }

    private void showConsentAndEnroll() {
        new AlertDialog.Builder(this)
                .setTitle("Consent confirmation")
                .setMessage("I confirm that the child/device owner has been informed and consented to monitoring features.")
                .setPositiveButton("I confirm", (dialog, which) -> enrollDevice())
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void enrollDevice() {
        String apiBase = apiBaseInput.getText().toString().trim();
        String parentId = parentIdInput.getText().toString().trim();
        String pairingCode = pairingCodeInput.getText().toString().trim();

        if (apiBase.isEmpty() || parentId.isEmpty() || pairingCode.isEmpty()) {
            statusText.setText("Status: fill all fields");
            return;
        }

        store.saveApiBase(apiBase);
        ApiService apiService = ApiClient.create(apiBase);

        Payloads.EnrollRequest payload = new Payloads.EnrollRequest();
        payload.parentId = parentId;
        payload.childName = Build.MODEL;
        payload.deviceLabel = Build.MANUFACTURER + " " + Build.MODEL;
        payload.platformVersion = String.valueOf(Build.VERSION.SDK_INT);
        payload.transparencyNoticeVersion = "v1.0";
        payload.consentAcceptedAt = Instant.now().toString();
        payload.pairingCode = pairingCode;

        apiService.enroll(payload).enqueue(new Callback<Payloads.EnrollResponse>() {
            @Override
            public void onResponse(Call<Payloads.EnrollResponse> call, Response<Payloads.EnrollResponse> response) {
                if (response.isSuccessful() && response.body() != null) {
                    store.saveDeviceId(response.body().deviceId);
                    store.saveDeviceToken(response.body().deviceToken);
                    statusText.setText("Status: enrolled successfully");
                    requestRequiredPermissions();
                    return;
                }
                statusText.setText("Status: enroll failed");
            }

            @Override
            public void onFailure(Call<Payloads.EnrollResponse> call, Throwable t) {
                statusText.setText("Status: enroll error " + t.getMessage());
            }
        });
    }

    private void requestRequiredPermissions() {
        permissionLauncher.launch(new String[]{
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.READ_CONTACTS,
                Manifest.permission.READ_SMS,
                Manifest.permission.READ_CALL_LOG,
                Manifest.permission.POST_NOTIFICATIONS
        });

        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Grant overlay/admin permissions for remote lock support", Toast.LENGTH_LONG).show();
        }
    }

    private void startMonitoring() {
        if (store.getDeviceToken().isEmpty()) {
            statusText.setText("Status: enroll first");
            return;
        }

        Intent serviceIntent = new Intent(this, MonitoringService.class);
        ContextCompat.startForegroundService(this, serviceIntent);
        statusText.setText("Status: monitoring active");
    }
}
