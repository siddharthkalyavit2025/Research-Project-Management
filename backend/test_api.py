import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    print("=== STARTING BACKEND INTEGRATION & CRUD TESTS ===")
    
    # 1. Health check
    print("\n[1] Testing /api/health...")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health_data = res.json()
    print(f" -> OK: {health_data['database']}, Oracle version: {health_data['version']}")

    # 2. Unauthorized access check
    print("\n[2] Testing protected endpoint without token...")
    res = client.get("/api/dashboard")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    print(" -> OK: Correctly rejected with 401 Unauthorized")

    # 3. Login as Admin
    print("\n[3] Testing /api/auth/login (Admin)...")
    login_payload = {"email": "admin@research.org", "password": "Admin@123"}
    res = client.post("/api/auth/login", json=login_payload)
    assert res.status_code == 200, f"Admin login failed: {res.text}"
    login_data = res.json()
    admin_token = login_data["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f" -> OK: Logged in as {login_data['user']['full_name']} ({login_data['user']['role']})")

    # 4. Check Current User (/api/auth/me)
    print("\n[4] Testing /api/auth/me...")
    res = client.get("/api/auth/me", headers=admin_headers)
    assert res.status_code == 200, f"/auth/me failed: {res.text}"
    print(f" -> OK: Authenticated as {res.json()['email']}")

    # 5. Dashboard Data
    print("\n[5] Testing /api/dashboard...")
    res = client.get("/api/dashboard", headers=admin_headers)
    assert res.status_code == 200, f"Dashboard failed: {res.text}"
    db_data = res.json()
    counts = db_data["counts"]
    print(f" -> OK: Labs={counts['total_labs']}, Projects={counts['total_projects']}, Funding=${counts['total_funding_amount']:,.2f}")

    # 6. Labs CRUD
    print("\n[6] Testing Laboratories CRUD...")
    # List labs
    res = client.get("/api/labs", headers=admin_headers)
    assert res.status_code == 200
    labs_list = res.json()
    print(f" -> Found {len(labs_list)} labs in Oracle DB")
    
    # Create a test lab
    test_lab = {
        "lab_code": 199,
        "lab_name": "Automation Test Lab",
        "discipline": "Robotics",
        "allocated_budget": 1500000.0,
        "lab_location": "Building Z, Room 404",
        "lab_status": "Active"
    }
    res = client.post("/api/labs", json=test_lab, headers=admin_headers)
    assert res.status_code == 201, f"Failed to create lab: {res.text}"
    print(f" -> Successfully created lab code 199")

    # Read lab detail
    res = client.get("/api/labs/199", headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["lab_name"] == "Automation Test Lab"

    # Update lab
    res = client.put("/api/labs/199", json={"allocated_budget": 1800000.0}, headers=admin_headers)
    assert res.status_code == 200
    assert res.json()["allocated_budget"] == 1800000.0
    print(" -> Successfully updated lab budget to 1,800,000")

    # Delete test lab
    res = client.delete("/api/labs/199", headers=admin_headers)
    assert res.status_code == 200
    print(" -> Successfully deleted test lab 199")

    # 7. Projects
    print("\n[7] Testing /api/projects...")
    res = client.get("/api/projects", headers=admin_headers)
    assert res.status_code == 200
    projects = res.json()
    print(f" -> Found {len(projects)} projects")
    res = client.get(f"/api/projects/{projects[0]['project_id']}", headers=admin_headers)
    assert res.status_code == 200
    print(f" -> Project details fetched for '{res.json()['project_name']}'")

    # 8. Researchers
    print("\n[8] Testing /api/researchers...")
    res = client.get("/api/researchers", headers=admin_headers)
    assert res.status_code == 200
    researchers = res.json()
    print(f" -> Found {len(researchers)} researchers")

    # 9. Teams
    print("\n[9] Testing /api/teams...")
    res = client.get("/api/teams", headers=admin_headers)
    assert res.status_code == 200
    teams = res.json()
    print(f" -> Found {len(teams)} research teams")

    # 10. Funding & Grants
    print("\n[10] Testing /api/funding and /api/grants...")
    res = client.get("/api/funding", headers=admin_headers)
    assert res.status_code == 200
    print(f" -> Found {len(res.json())} funding sources")
    res = client.get("/api/grants", headers=admin_headers)
    assert res.status_code == 200
    print(f" -> Found {len(res.json())} grants")

    # 11. Equipment
    print("\n[11] Testing /api/equipment...")
    res = client.get("/api/equipment", headers=admin_headers)
    assert res.status_code == 200
    print(f" -> Found {len(res.json())} equipment items")

    # 12. Milestones
    print("\n[12] Testing /api/milestones...")
    res = client.get("/api/milestones", headers=admin_headers)
    assert res.status_code == 200
    print(f" -> Found {len(res.json())} project milestones")

    # 13. Users (Admin only)
    print("\n[13] Testing /api/users...")
    res = client.get("/api/users", headers=admin_headers)
    assert res.status_code == 200
    print(f" -> Found {len(res.json())} registered application users")

    # 14. RBAC Check (Login as Researcher and attempt Admin action)
    print("\n[14] Testing RBAC: Researcher attempting restricted action...")
    res = client.post("/api/auth/login", json={"email": "aarav@research.org", "password": "Researcher@123"})
    assert res.status_code == 200
    researcher_token = res.json()["access_token"]
    res_headers = {"Authorization": f"Bearer {researcher_token}"}
    
    # Researcher attempting to list users -> Must return 403 Forbidden
    res = client.get("/api/users", headers=res_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}"
    print(" -> OK: Forbidden 403 correctly enforced for Researcher on User Admin endpoint!")

    print("\n=======================================================")
    print("ALL TESTS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
