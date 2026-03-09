import time
from datetime import datetime, timezone

import pytest
import requests

# FamilyGuard critical backend API regression tests for auth, enrollment, sync, parent dashboard and command queue flows.
BASE_URL = "http://localhost:8002"
PAIRING_CODE = "123456"


@pytest.fixture(scope="module")
def api_session():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def state():
    return {}


def iso_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def test_health_ok(api_session):
    response = api_session.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_parent_register_and_persist(api_session, state):
    email = f"parent_{int(time.time())}@test.com"
    payload = {
        "fullName": "Test Parent",
        "email": email,
        "password": "password123",
    }
    response = api_session.post(f"{BASE_URL}/api/auth/register", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert data["parent"]["email"] == email
    state["email"] = email
    state["password"] = payload["password"]
    state["parent_id"] = data["parent"]["id"]


def test_parent_login_flow(api_session, state):
    response = api_session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": state["email"], "password": state["password"]},
    )
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data["token"], str) and len(data["token"]) > 10
    assert data["parent"]["id"] == state["parent_id"]
    state["parent_token"] = data["token"]


def test_parent_dashboard_base_endpoints(api_session, state):
    headers = {"Authorization": f"Bearer {state['parent_token']}"}

    me_response = api_session.get(f"{BASE_URL}/api/parent/me", headers=headers)
    assert me_response.status_code == 200
    me_data = me_response.json()
    assert me_data["parent"]["id"] == state["parent_id"]

    devices_response = api_session.get(f"{BASE_URL}/api/parent/devices", headers=headers)
    assert devices_response.status_code == 200
    devices_data = devices_response.json()
    assert isinstance(devices_data["devices"], list)


def test_device_enrollment_with_pairing_code(api_session, state):
    payload = {
        "parentId": state["parent_id"],
        "childName": "Kid One",
        "deviceLabel": "Pixel Test Device",
        "platformVersion": "Android 14",
        "transparencyNoticeVersion": "v1.0",
        "consentAcceptedAt": iso_now(),
        "pairingCode": PAIRING_CODE,
    }
    response = api_session.post(f"{BASE_URL}/api/device/enroll", json=payload)
    assert response.status_code == 201

    data = response.json()
    assert isinstance(data["deviceId"], str)
    assert isinstance(data["deviceToken"], str) and len(data["deviceToken"]) > 8

    state["device_id"] = data["deviceId"]
    state["device_token"] = data["deviceToken"]


def test_device_sync_location_and_verify_parent_location_endpoint(api_session, state):
    d_headers = {"x-device-token": state["device_token"]}
    p_headers = {"Authorization": f"Bearer {state['parent_token']}"}

    location_payload = {
        "lat": 37.4219983,
        "lng": -122.084,
        "accuracyMeters": 8,
        "capturedAt": iso_now(),
    }
    post_response = api_session.post(f"{BASE_URL}/api/device/location", json=location_payload, headers=d_headers)
    assert post_response.status_code == 201

    get_response = api_session.get(
        f"{BASE_URL}/api/parent/devices/{state['device_id']}/location",
        headers=p_headers,
    )
    assert get_response.status_code == 200

    logs = get_response.json()["logs"]
    assert len(logs) >= 1
    assert logs[0]["lat"] == location_payload["lat"]
    assert logs[0]["lng"] == location_payload["lng"]


def test_device_sync_screen_time_and_app_usage_then_verify_daily_report(api_session, state):
    d_headers = {"x-device-token": state["device_token"]}
    p_headers = {"Authorization": f"Bearer {state['parent_token']}"}
    date_key = datetime.now(timezone.utc).date().isoformat()

    screen_payload = {
        "dateKey": date_key,
        "totalMinutes": 125,
        "appForegroundMinutes": 110,
    }
    st_response = api_session.post(f"{BASE_URL}/api/device/screen-time", json=screen_payload, headers=d_headers)
    assert st_response.status_code == 200

    app_usage_payload = {
        "dateKey": date_key,
        "apps": [
            {
                "packageName": "com.youtube.app",
                "appName": "YouTube",
                "usageMinutes": 75,
                "launches": 3,
            },
            {
                "packageName": "com.education.app",
                "appName": "Kids Learn",
                "usageMinutes": 30,
                "launches": 2,
            },
        ],
    }
    usage_response = api_session.post(f"{BASE_URL}/api/device/app-usage", json=app_usage_payload, headers=d_headers)
    assert usage_response.status_code == 200

    report_response = api_session.get(
        f"{BASE_URL}/api/parent/devices/{state['device_id']}/reports/daily?date={date_key}",
        headers=p_headers,
    )
    assert report_response.status_code == 200

    report = report_response.json()["report"]
    assert report["screenTime"]["totalMinutes"] == 125
    assert len(report["topApps"]) >= 1
    assert report["topApps"][0]["appName"] == "YouTube"


def test_device_sync_installed_apps_and_verify_parent_snapshot(api_session, state):
    d_headers = {"x-device-token": state["device_token"]}
    p_headers = {"Authorization": f"Bearer {state['parent_token']}"}

    payload = {
        "capturedAt": iso_now(),
        "apps": [
            {
                "packageName": "com.whatsapp",
                "appName": "WhatsApp",
                "firstInstallTime": 1700000000000,
                "updateTime": 1701000000000,
            }
        ],
    }
    post_response = api_session.post(f"{BASE_URL}/api/device/installed-apps", json=payload, headers=d_headers)
    assert post_response.status_code == 201

    snapshot_response = api_session.get(
        f"{BASE_URL}/api/parent/devices/{state['device_id']}/installed-apps",
        headers=p_headers,
    )
    assert snapshot_response.status_code == 200

    snapshot = snapshot_response.json()["snapshot"]
    assert snapshot["apps"][0]["packageName"] == "com.whatsapp"


def test_device_sync_activity_notifications_and_verify_parent_overview(api_session, state):
    d_headers = {"x-device-token": state["device_token"]}
    p_headers = {"Authorization": f"Bearer {state['parent_token']}"}

    activity_payload = {
        "category": "SCREEN_UNLOCK",
        "message": "Device unlocked",
        "meta": {"source": "manual"},
        "capturedAt": iso_now(),
    }
    act_response = api_session.post(f"{BASE_URL}/api/device/activity", json=activity_payload, headers=d_headers)
    assert act_response.status_code == 201

    notification_payload = {
        "entries": [
            {
                "appName": "WhatsApp",
                "packageName": "com.whatsapp",
                "title": "New message",
                "text": "Hi",
                "capturedAt": iso_now(),
            }
        ]
    }
    notif_response = api_session.post(f"{BASE_URL}/api/device/notifications", json=notification_payload, headers=d_headers)
    assert notif_response.status_code == 201

    overview_response = api_session.get(
        f"{BASE_URL}/api/parent/devices/{state['device_id']}/overview",
        headers=p_headers,
    )
    assert overview_response.status_code == 200

    overview = overview_response.json()["overview"]
    assert len(overview["latestActivities"]) >= 1
    assert len(overview["latestNotifications"]) >= 1


def test_remote_lock_queue_and_device_command_poll(api_session, state):
    p_headers = {"Authorization": f"Bearer {state['parent_token']}"}
    d_headers = {"x-device-token": state["device_token"]}

    lock_response = api_session.post(
        f"{BASE_URL}/api/parent/devices/{state['device_id']}/lock",
        headers=p_headers,
    )
    assert lock_response.status_code == 201

    command_id = lock_response.json()["command"]["id"]

    poll_response = api_session.get(f"{BASE_URL}/api/device/commands", headers=d_headers)
    assert poll_response.status_code == 200

    commands = poll_response.json()["commands"]
    assert any(item["id"] == command_id and item["commandType"] == "LOCK_DEVICE" for item in commands)

    ack_response = api_session.post(
        f"{BASE_URL}/api/device/commands/{command_id}/ack",
        headers=d_headers,
        json={"status": "EXECUTED"},
    )
    assert ack_response.status_code == 200
    assert ack_response.json()["message"] == "Command status updated"
