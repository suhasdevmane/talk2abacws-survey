import requests
import json
import sys
import time

API_BASE = "http://localhost:5000/api"
SESSION = requests.Session()

def print_step(msg):
    print(f"\n[STEP] {msg}")

def print_result(success, msg):
    color = "\033[92m" if success else "\033[91m"
    status = "SUCCESS" if success else "FAILED"
    print(f"{color}[{status}] {msg}\033[0m")
    if not success:
        sys.exit(1)

def main():
    test_user = f"testuser_{int(time.time())}"
    test_roles = ["Occupants/Tenants/Employees", "IT/Data Scientists"]
    test_question = f"What is the temperature in Room 101? (Test ID: {test_user})"
    
    # 1. Register User
    print_step(f"Registering user '{test_user}' with roles: {test_roles}")
    res = SESSION.post(f"{API_BASE}/survey/register", json={
        "username": test_user,
        "roles": test_roles,
        "consentAccepted": True,
        "consentDate": "2025-01-01T12:00:00Z"
    })
    
    if res.status_code == 201:
        print_result(True, "User registered.")
    else:
        print_result(False, f"Registration failed: {res.text}")

    # 2. Login (to verify roles update and auth token)
    print_step("Logging in (simulating re-login to check roles persistence)")
    res = SESSION.post(f"{API_BASE}/survey/login", json={
        "username": test_user,
        "roles": test_roles # Frontend sends roles on login too
    })
    
    if res.status_code == 200:
        print_result(True, "Login successful.")
        cookies = SESSION.cookies.get_dict()
        if 'authToken' in cookies:
            print(f"   Token Cookie found: {cookies['authToken'][:10]}...")
        else:
            print("   WARNING: No authToken cookie found in session.")
    else:
        print_result(False, f"Login failed: {res.text}")

    # 3. Submit Question
    print_step("Submitting a question")
    res = SESSION.post(f"{API_BASE}/survey/question", json={
        "question": test_question,
        "username": test_user # Provided as fallback, although cookie should work
    })
    
    if res.status_code == 200:
        data = res.json()
        print_result(True, f"Question submitted. Count: {data.get('questionCount')}")
    else:
        print_result(False, f"Question submission failed: {res.text}")

    # 4. Save Chat History
    print_step("Saving chat history")
    test_history = [
        {"sender": "user", "text": "Hello", "timestamp": "10:00:00"},
        {"sender": "bot", "text": "Hi there!", "timestamp": "10:00:01"},
        {"sender": "user", "text": test_question, "timestamp": "10:00:05"}
    ]
    
    res = SESSION.post(f"{API_BASE}/survey/history", json={
        "username": test_user,
        "messages": test_history
    })
    
    if res.status_code == 200:
        print_result(True, "Chat history saved.")
    else:
        print_result(False, f"History save failed: {res.text}")

    # 5. Verify Data via Admin Endpoints
    print_step("Verifying data via Admin endpoints")
    
    # 5a. Check Questions
    print("   Fetching ./survey/admin/questions...")
    res = SESSION.get(f"{API_BASE}/survey/admin/questions")
    if res.status_code != 200:
        print_result(False, "Failed to fetch admin questions.")
    
    data = res.json()
    questions_map = data.get('questionsByUser', {})
    user_entry = questions_map.get(test_user) # Case sentitive? backend lowercases.
    
    # Try lowercase if not found
    if not user_entry:
        user_entry = questions_map.get(test_user.lower())

    if user_entry:
        # Verify Roles
        saved_roles = user_entry.get('roles', [])
        print(f"   Saved Roles: {saved_roles}")
        if set(saved_roles) == set(test_roles):
             print_result(True, "Roles match.")
        else:
             print_result(False, f"Roles mismatch! Expected {test_roles}, got {saved_roles}")
        
        # Verify Question
        questions = user_entry.get('questions', [])
        found_q = any(q['question'] == test_question for q in questions)
        if found_q:
            print_result(True, "Question found in admin list.")
        else:
            print_result(False, "Test question NOT found in admin list.")
    else:
        print_result(False, f"User {test_user} not found in questions list.")

    # 5b. Check History
    print("   Fetching ./survey/admin/history...")
    res = SESSION.get(f"{API_BASE}/survey/admin/history")
    if res.status_code != 200:
        print_result(False, "Failed to fetch admin history.")
    
    data = res.json()
    histories = data.get('histories', [])
    user_history = next((h for h in histories if h.get('username') == test_user.lower()), None)
    
    if user_history:
        msgs = user_history.get('messages', [])
        print(f"   Saved Message Count: {len(msgs)}")
        if len(msgs) == 3:
            print_result(True, "History message count matches.")
        else:
            print_result(False, f"History count mismatch. Expected 3, got {len(msgs)}")
    else:
        print_result(False, f"User history not found for {test_user}")

if __name__ == "__main__":
    main()
