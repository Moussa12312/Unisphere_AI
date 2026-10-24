import sys
try:
    sys.stdout.reconfigure(encoding='utf-8')
except:
    pass
import urllib.request
import urllib.error
import json

BASE_URL = "http://127.0.0.1:8000/api/v1"
PASSWORD = "unisphere2026"

ROLES_USERS = {
    "student": ("etudiant@unisphere.ai", [
        ("/students/me", "GET"),
        ("/students/me/dashboard", "GET"),
        ("/students/me/card", "GET"),
        ("/students/me/grades", "GET"),
        ("/students/me/schedule", "GET"),
        ("/students/me/payments", "GET"),
    ]),
    "teacher": ("enseignant@unisphere.ai", [
        ("/courses", "GET"),
        ("/attendance/today/stats", "GET"),
        ("/attendance/recent", "GET"),
    ]),
    "secretary": ("secretaire@unisphere.ai", [
        ("/students?limit=10", "GET"),
        ("/certificates/secretary/requests", "GET"),
        ("/rooms", "GET"),
        ("/classes", "GET"),
    ]),
    "censeur": ("censeur@unisphere.ai", [
        ("/attendance/statistics", "GET"),
        ("/classes", "GET"),
        ("/grades/anomalies", "GET"),
    ]),
    "admin": ("admin@unisphere.ai", [
        ("/dashboard/stats", "GET"),
        ("/users?all_roles=true", "GET"),
    ]),
    "guard": ("gardien@unisphere.ai", [
        ("/attendance/today/stats", "GET"),
        ("/attendance/recent", "GET"),
    ]),
    "accountant": ("comptable@unisphere.ai", [
        ("/financials/overview", "GET"),
        ("/payments?limit=10", "GET"),
    ]),
    "alumni": ("alumni@unisphere.ai", [
        ("/alumni/community", "GET"),
        ("/alumni/me/profile", "GET"),
    ]),
}

results = []

def make_req(url, method="GET", headers=None, body=None):
    if headers is None:
        headers = {}
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        try:
            parsed = json.loads(err_body)
        except:
            parsed = err_body
        return e.code, parsed
    except Exception as e:
        return 0, str(e)

for role, (email, endpoints) in ROLES_USERS.items():
    print(f"\n==================== TEST ROLE: {role.upper()} ({email}) ====================")
    status, res = make_req(
        f"{BASE_URL}/auth/login",
        method="POST",
        headers={"Content-Type": "application/json"},
        body={"email": email, "password": PASSWORD, "remember_me": True}
    )
    if status != 200:
        print(f"❌ Login failed for {role}: {status} - {res}")
        results.append((role, "LOGIN", status, False))
        continue

    token = res.get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"✅ Login SUCCESS (Token length: {len(token)})")

    for path, method in endpoints:
        full_url = f"{BASE_URL}{path}"
        code, data = make_req(full_url, method=method, headers=headers)
        is_ok = code in [200, 201]
        results.append((role, path, code, is_ok))
        status_icon = "✅" if is_ok else "❌"
        preview = ""
        if isinstance(data, list):
            preview = f"Array length: {len(data)}"
        elif isinstance(data, dict):
            preview = f"Keys: {list(data.keys())[:5]}"
        else:
            preview = str(data)[:50]
        print(f"  {status_icon} [{code}] {path} -> {preview}")

print("\n\n==================== RESUME DES TESTS ====================")
success_count = sum(1 for r in results if r[3])
total_count = len(results)
print(f"TOTAL: {success_count}/{total_count} requetes avec succes.")
for r in results:
    if not r[3]:
        print(f"❌ ECHEC: {r[0]} on {r[1]} -> Status {r[2]}")

if success_count == total_count:
    print("\n🎉 TOUTES LES ROUTES DES 8 ESPACES SONT PARFAITEMENT CONNECTÉES AU BACKEND ET RÉELLES !")
