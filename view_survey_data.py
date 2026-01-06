import argparse
import requests
import json
import csv
import sys
from datetime import datetime

# Configuration
API_BASE = "http://localhost:5000/api"

def print_header():
    print("=" * 40)
    print("Survey Data Viewer (Python)")
    print("=" * 40)
    print("")

def get_survey_stats():
    print("\033[93mFetching survey statistics...\033[0m") # Yellow
    try:
        response = requests.get(f"{API_BASE}/survey/admin/stats")
        response.raise_for_status()
        data = response.json()
        
        print("")
        print("\033[92mSurvey Statistics:\033[0m") # Green
        print(f"  Total Users: {data.get('totalUsers', 0)}")
        print(f"  Total Questions: {data.get('totalQuestions', 0)}")
        print(f"  Average Questions per User: {data.get('averageQuestionsPerUser', 0)}")
        print("")
        print("\033[92mTop Contributors:\033[0m") # Green
        for user in data.get('topContributors', []):
            print(f"  {user.get('_id')}: {user.get('count')} questions")
            
    except Exception as e:
        print(f"\033[91mError fetching statistics: {e}\033[0m") # Red

def get_all_questions():
    print("\033[93mFetching all questions...\033[0m")
    try:
        response = requests.get(f"{API_BASE}/survey/admin/questions")
        response.raise_for_status()
        data = response.json()
        
        print("")
        print(f"\033[92mTotal Questions: {data.get('totalQuestions')}\033[0m")
        print(f"\033[92mTotal Users: {data.get('userCount')}\033[0m")
        print("")
        
        questions_by_user = data.get('questionsByUser', {})
        for username, user_obj in questions_by_user.items():
            questions = user_obj.get('questions', [])
            roles = ", ".join(user_obj.get('roles', []))
            
            print(f"\033[96mUser: {username}\033[0m") # Cyan
            if roles:
                print(f"\033[90mRoles: {roles}\033[0m") # Gray
            print(f"\033[90mCount: {len(questions)} questions\033[0m") # Gray
            
            for i, q in enumerate(questions):
                ts = q.get('timestamp')
                # Try to parse timestamp for cleaner display
                try:
                    dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
                    ts_str = dt.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    ts_str = ts
                
                print(f"  {i+1}. [{ts_str}] {q.get('question')}")
            print("")
            
    except Exception as e:
        print(f"\033[91mError fetching questions: {e}\033[0m")

def get_questions_by_user():
    print("\033[93mFetching questions grouped by user...\033[0m")
    try:
        response = requests.get(f"{API_BASE}/survey/admin/questions")
        response.raise_for_status()
        data = response.json()
        print("")
        
        questions_by_user = data.get('questionsByUser', {})
        for username, user_obj in questions_by_user.items():
            questions = user_obj.get('questions', [])
            count = len(questions) if isinstance(questions, list) else 0
            print(f"\033[96m{username} ({count} questions)\033[0m")
            
    except Exception as e:
        print(f"\033[91mError fetching questions: {e}\033[0m")

def export_questions():
    print("\033[93mExporting questions to JSON file...\033[0m")
    try:
        response = requests.get(f"{API_BASE}/survey/admin/questions")
        response.raise_for_status()
        data = response.json()
        
        timestamp = datetime.now().strftime('%Y-%m-%d-%H%M%S')
        json_filename = f"survey-questions-{timestamp}.json"
        
        with open(json_filename, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        print(f"\033[92m✓ Questions exported to: {json_filename}\033[0m")
        
        # Export CSV
        csv_filename = f"survey-questions-{timestamp}.csv"
        flat_questions = []
        
        questions_by_user = data.get('questionsByUser', {})
        for username, user_obj in questions_by_user.items():
            questions = user_obj.get('questions', [])
            roles = "; ".join(user_obj.get('roles', []))
            
            for q in questions:
                flat_questions.append({
                    "Username": username,
                    "Roles": roles,
                    "Question": q.get('question'),
                    "Timestamp": q.get('timestamp')
                })
        
        if flat_questions:
            keys = flat_questions[0].keys()
            with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
                dict_writer = csv.DictWriter(f, fieldnames=keys)
                dict_writer.writeheader()
                dict_writer.writerows(flat_questions)
            print(f"\033[92m✓ Questions exported to CSV: {csv_filename}\033[0m")
        else:
            print("No questions found to export to CSV.")
            
    except Exception as e:
        print(f"\033[91mError exporting questions: {e}\033[0m")

def export_chat_history():
    print("\033[93mExporting chat history to JSON file...\033[0m")
    try:
        response = requests.get(f"{API_BASE}/survey/admin/history")
        response.raise_for_status()
        data = response.json()
        
        timestamp = datetime.now().strftime('%Y-%m-%d-%H%M%S')
        filename = f"chat-history-{timestamp}.json"
        
        histories = data.get('histories', [])
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(histories, f, indent=2)
        
        print(f"\033[92m✓ Chat history exported to: {filename}\033[0m")
        print(f"  Total users with history: {data.get('count', 0)}")
        
    except Exception as e:
        print(f"\033[91mError exporting chat history: {e}\033[0m")

def main():
    parser = argparse.ArgumentParser(description="View and Export Survey Data")
    parser.add_argument('action', nargs='?', default='summary', 
                        choices=['summary', 'all', 'by-user', 'stats', 'export', 'history'],
                        help="Action to perform (default: summary)")
    
    # Detect if running in a Jupyter notebook/IPython to prevent argparse from reading kernel flags
    if 'ipykernel' in sys.modules:
        args = parser.parse_args([])
    else:
        args = parser.parse_args()
    
    print_header()
    
    if args.action == 'summary' or args.action == 'stats':
        get_survey_stats()
    elif args.action == 'all':
        get_all_questions()
    elif args.action == 'by-user':
        get_questions_by_user()
    elif args.action == 'export':
        export_questions()
    elif args.action == 'history':
        export_chat_history()
        
    print("")
    print("\033[93mAvailable actions:\033[0m")
    print("  python view_survey_data.py summary   # Show statistics")
    print("  python view_survey_data.py all       # Show all questions")
    print("  python view_survey_data.py by-user   # Show users and counts")
    print("  python view_survey_data.py stats     # Show statistics")
    print("  python view_survey_data.py export    # Export to JSON/CSV")
    print("  python view_survey_data.py history   # Export chat history to JSON")

if __name__ == "__main__":
    main()
