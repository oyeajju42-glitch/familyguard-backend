package com.familyguard.child.api;

import java.util.Map;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.GET;
import retrofit2.http.Header;
import retrofit2.http.POST;
import retrofit2.http.Path;

public interface ApiService {
    @POST("api/device/enroll")
    Call<Payloads.EnrollResponse> enroll(@Body Payloads.EnrollRequest body);

    @POST("api/device/location")
    Call<Map<String, Object>> syncLocation(@Header("x-device-token") String token, @Body Payloads.LocationRequest body);

    @POST("api/device/screen-time")
    Call<Map<String, Object>> syncScreenTime(@Header("x-device-token") String token, @Body Payloads.ScreenTimeRequest body);

    @POST("api/device/app-usage")
    Call<Map<String, Object>> syncAppUsage(@Header("x-device-token") String token, @Body Payloads.AppUsageRequest body);

    @POST("api/device/installed-apps")
    Call<Map<String, Object>> syncInstalledApps(@Header("x-device-token") String token, @Body Payloads.InstalledAppsRequest body);

    @POST("api/device/contacts")
    Call<Map<String, Object>> syncContacts(@Header("x-device-token") String token, @Body Payloads.ContactsRequest body);

    @POST("api/device/sms")
    Call<Map<String, Object>> syncSms(@Header("x-device-token") String token, @Body Payloads.SmsRequest body);

    @POST("api/device/activity")
    Call<Map<String, Object>> syncActivity(@Header("x-device-token") String token, @Body Payloads.ActivityRequest body);

    @POST("api/device/notifications")
    Call<Map<String, Object>> syncNotifications(@Header("x-device-token") String token, @Body Payloads.NotificationsRequest body);

    @GET("api/device/commands")
    Call<Payloads.CommandListResponse> fetchCommands(@Header("x-device-token") String token);

    @POST("api/device/commands/{commandId}/ack")
    Call<Map<String, Object>> ackCommand(
            @Header("x-device-token") String token,
            @Path("commandId") String commandId,
            @Body Payloads.CommandAckRequest body
    );
}
