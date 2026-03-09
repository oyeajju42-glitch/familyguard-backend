package com.familyguard.child.storage;

import android.content.Context;
import android.content.SharedPreferences;

public class LocalStore {
    private static final String PREFS = "family_guard_prefs";
    private final SharedPreferences prefs;

    public LocalStore(Context context) {
        this.prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public void saveApiBase(String value) {
        prefs.edit().putString("api_base", value).apply();
    }

    public String getApiBase() {
        return prefs.getString("api_base", "");
    }

    public void saveDeviceToken(String token) {
        prefs.edit().putString("device_token", token).apply();
    }

    public String getDeviceToken() {
        return prefs.getString("device_token", "");
    }

    public void saveDeviceId(String id) {
        prefs.edit().putString("device_id", id).apply();
    }

    public String getDeviceId() {
        return prefs.getString("device_id", "");
    }
}
