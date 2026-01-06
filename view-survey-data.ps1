# View Survey Data Script
# This script helps you view and export collected survey questions

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('summary', 'all', 'by-user', 'stats', 'export', 'history')]
    [string]$Action = 'summary'
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Survey Data Viewer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$API_BASE = "http://localhost:5000/api"

function Get-SurveyStats {
    Write-Host "Fetching survey statistics..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/survey/admin/stats" -Method Get
        Write-Host ""
        Write-Host "Survey Statistics:" -ForegroundColor Green
        Write-Host "  Total Users: $($response.totalUsers)" -ForegroundColor White
        Write-Host "  Total Questions: $($response.totalQuestions)" -ForegroundColor White
        Write-Host "  Average Questions per User: $($response.averageQuestionsPerUser)" -ForegroundColor White
        Write-Host ""
        Write-Host "Top Contributors:" -ForegroundColor Green
        foreach ($user in $response.topContributors) {
            Write-Host "  $($user._id): $($user.count) questions" -ForegroundColor White
        }
    } catch {
        Write-Host "Error fetching statistics: $_" -ForegroundColor Red
    }
}

function Get-AllQuestions {
    Write-Host "Fetching all questions..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/survey/admin/questions" -Method Get
        Write-Host ""
        Write-Host "Total Questions: $($response.totalQuestions)" -ForegroundColor Green
        Write-Host "Total Users: $($response.userCount)" -ForegroundColor Green
        Write-Host ""
        
        foreach ($username in $response.questionsByUser.PSObject.Properties.Name) {
            $userObj = $response.questionsByUser.$username
            $questions = $userObj.questions
            $roles = ""
            if ($userObj.roles) { $roles = $userObj.roles -join ", " }
            
            Write-Host "User: $username" -ForegroundColor Cyan
            if ($roles) { Write-Host "Roles: $roles" -ForegroundColor Gray }
            Write-Host "Count: $($questions.Count) questions" -ForegroundColor Gray
            
            for ($i = 0; $i -lt $questions.Count; $i++) {
                $q = $questions[$i]
                $timestamp = [DateTime]::Parse($q.timestamp).ToString("yyyy-MM-dd HH:mm:ss")
                Write-Host "  $($i+1). [$timestamp] $($q.question)" -ForegroundColor White
            }
            Write-Host ""
        }
    } catch {
        Write-Host "Error fetching questions: $_" -ForegroundColor Red
    }
}

function Get-QuestionsByUser {
    Write-Host "Fetching questions grouped by user..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/survey/admin/questions" -Method Get
        Write-Host ""
        
        foreach ($username in $response.questionsByUser.PSObject.Properties.Name) {
            $userObj = $response.questionsByUser.$username
            $qCount = 0
            if ($userObj.questions) { $qCount = $userObj.questions.Count } elseif ($userObj -is [Array]) { $qCount = $userObj.Count }
            
            Write-Host "$username ($qCount questions)" -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Error fetching questions: $_" -ForegroundColor Red
    }
}

function Export-Questions {
    Write-Host "Exporting questions to JSON file..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/survey/admin/questions" -Method Get
        $filename = "survey-questions-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
        
        # Save raw JSON (now includes roles)
        $response | ConvertTo-Json -Depth 10 | Out-File $filename
        Write-Host "✓ Questions exported to: $filename" -ForegroundColor Green
        
        # Also create a CSV for easy analysis
        $csvFilename = "survey-questions-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').csv"
        $flatQuestions = @()
        foreach ($username in $response.questionsByUser.PSObject.Properties.Name) {
            $userObj = $response.questionsByUser.$username
            $questions = $userObj.questions
            $roles = ""
            if ($userObj.roles) { $roles = $userObj.roles -join "; " }

            foreach ($q in $questions) {
                $flatQuestions += [PSCustomObject]@{
                    Username = $username
                    Roles = $roles
                    Question = $q.question
                    Timestamp = $q.timestamp
                }
            }
        }
        $flatQuestions | Export-Csv -Path $csvFilename -NoTypeInformation
        Write-Host "✓ Questions exported to CSV: $csvFilename" -ForegroundColor Green
    } catch {
        Write-Host "Error exporting questions: $_" -ForegroundColor Red
    }
}

function Export-ChatHistory {
    Write-Host "Exporting chat history to JSON file..." -ForegroundColor Yellow
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/survey/admin/history" -Method Get
        $filename = "chat-history-$(Get-Date -Format 'yyyy-MM-dd-HHmmss').json"
        $response.histories | ConvertTo-Json -Depth 10 | Out-File $filename
        Write-Host "✓ Chat history exported to: $filename" -ForegroundColor Green
        Write-Host "  Total users with history: $($response.count)" -ForegroundColor White
    } catch {
        Write-Host "Error exporting chat history: $_" -ForegroundColor Red
    }
}

# Execute requested action
switch ($Action) {
    'summary' {
        Get-SurveyStats
    }
    'all' {
        Get-AllQuestions
    }
    'by-user' {
        Get-QuestionsByUser
    }
    'stats' {
        Get-SurveyStats
    }
    'export' {
        Export-Questions
    }
    'history' {
        Export-ChatHistory
    }
}

Write-Host ""
Write-Host "Available actions:" -ForegroundColor Yellow
Write-Host "  .\view-survey-data.ps1 -Action summary   # Show statistics" -ForegroundColor Gray
Write-Host "  .\view-survey-data.ps1 -Action all       # Show all questions" -ForegroundColor Gray
Write-Host "  .\view-survey-data.ps1 -Action by-user   # Show users and counts" -ForegroundColor Gray
Write-Host "  .\view-survey-data.ps1 -Action stats     # Show statistics" -ForegroundColor Gray
Write-Host "  .\view-survey-data.ps1 -Action export    # Export to JSON/CSV" -ForegroundColor Gray
Write-Host "  .\view-survey-data.ps1 -Action history   # Export chat history to JSON" -ForegroundColor Gray
Write-Host ""
