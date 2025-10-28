# API Testing Examples: POST /api/tasks

This document contains example requests for testing the Create Task endpoint.

## Prerequisites

1. **Base URL**: `http://localhost:4321` (dev) or your production URL
2. **Authentication**: You need a valid Bearer token from Supabase Auth
3. **Content-Type**: All requests must include `Content-Type: application/json`

## Getting a Bearer Token

```bash
# Login to get a token (example using Supabase CLI or Auth API)
# Replace with your actual authentication method
curl -X POST 'YOUR_SUPABASE_URL/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "your-password"
  }'
```

---

## ✅ Success Scenarios

### Example 1: Simple Daily Task

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Water the plants",
    "description": "Water all indoor plants",
    "interval_value": 2,
    "interval_unit": "days",
    "preferred_day_of_week": null
  }'
```

**Expected Response (201 Created):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "user-uuid-here",
  "title": "Water the plants",
  "description": "Water all indoor plants",
  "interval_value": 2,
  "interval_unit": "days",
  "preferred_day_of_week": null,
  "next_due_date": "2025-10-26",
  "last_action_date": null,
  "last_action_type": null,
  "created_at": "2025-10-24T10:30:00.000Z",
  "updated_at": "2025-10-24T10:30:00.000Z"
}
```

### Example 2: Weekly Task on Specific Day

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Grocery shopping",
    "description": "Buy groceries for the week",
    "interval_value": 1,
    "interval_unit": "weeks",
    "preferred_day_of_week": 6
  }'
```

**Notes:**
- `preferred_day_of_week: 6` = Saturday
- Next due date will be adjusted to the next Saturday after adding 1 week

### Example 3: Monthly Task

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Pay rent",
    "description": "Monthly rent payment",
    "interval_value": 1,
    "interval_unit": "months",
    "preferred_day_of_week": null
  }'
```

### Example 4: Yearly Task

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Annual checkup",
    "description": "Schedule annual health checkup",
    "interval_value": 1,
    "interval_unit": "years",
    "preferred_day_of_week": null
  }'
```

### Example 5: Task Without Description

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Quick reminder",
    "interval_value": 3,
    "interval_unit": "days"
  }'
```

**Notes:**
- `description` is optional and can be omitted
- `preferred_day_of_week` is optional and can be omitted

### Example 6: Bi-weekly Task on Monday

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Team meeting",
    "description": "Bi-weekly team sync",
    "interval_value": 2,
    "interval_unit": "weeks",
    "preferred_day_of_week": 1
  }'
```

**Notes:**
- `preferred_day_of_week: 1` = Monday

---

## ❌ Error Scenarios

### Error 1: Missing Authorization Header (401)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "interval_value": 1,
    "interval_unit": "days"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Authentication required",
  "details": "Authorization header is missing"
}
```

### Error 2: Invalid Bearer Token (401)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer invalid-token-123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "interval_value": 1,
    "interval_unit": "days"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Authentication failed",
  "details": "Invalid or expired token"
}
```

### Error 3: Malformed Authorization Header (401)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: InvalidFormat token123" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "interval_value": 1,
    "interval_unit": "days"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "error": "Invalid authentication",
  "details": "Authorization header must use Bearer token format"
}
```

### Error 4: Missing Content-Type (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "title": "Test task",
    "interval_value": 1,
    "interval_unit": "days"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Invalid Content-Type",
  "details": "Content-Type must be application/json"
}
```

### Error 5: Invalid JSON (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{invalid json here'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Invalid JSON",
  "details": "Request body must be valid JSON"
}
```

### Error 6: Missing Required Fields (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "interval_value",
      "message": "Interval value is required"
    },
    {
      "field": "interval_unit",
      "message": "Interval unit is required"
    }
  ]
}
```

### Error 7: Title Too Long (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "'"$(printf 'A%.0s' {1..300})"'",
    "interval_value": 1,
    "interval_unit": "days"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title must not exceed 256 characters"
    }
  ]
}
```

### Error 8: Empty Title (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "   ",
    "interval_value": 1,
    "interval_unit": "days"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title cannot be empty"
    }
  ]
}
```

### Error 9: Interval Value Out of Range (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "interval_value": 1000,
    "interval_unit": "days"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "interval_value",
      "message": "Interval value must not exceed 999"
    }
  ]
}
```

### Error 10: Invalid Interval Unit (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "interval_value": 1,
    "interval_unit": "hours"
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "interval_unit",
      "message": "Interval unit must be one of: days, weeks, months, years"
    }
  ]
}
```

### Error 11: Invalid Preferred Day (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "interval_value": 1,
    "interval_unit": "days",
    "preferred_day_of_week": 7
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "preferred_day_of_week",
      "message": "Preferred day of week must be between 0 (Sunday) and 6 (Saturday)"
    }
  ]
}
```

### Error 12: Multiple Validation Errors (400)

```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "",
    "interval_value": 0,
    "interval_unit": "hours",
    "preferred_day_of_week": 10
  }'
```

**Expected Response (400 Bad Request):**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title cannot be empty"
    },
    {
      "field": "interval_value",
      "message": "Interval value must be at least 1"
    },
    {
      "field": "interval_unit",
      "message": "Interval unit must be one of: days, weeks, months, years"
    },
    {
      "field": "preferred_day_of_week",
      "message": "Preferred day of week must be between 0 (Sunday) and 6 (Saturday)"
    }
  ]
}
```

---

## 🧪 Edge Cases to Test

### Edge Case 1: Month Overflow
Create a task on Jan 31 with 1-month interval:
```bash
# This should correctly handle Feb 28/29 (depending on leap year)
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Monthly report",
    "interval_value": 1,
    "interval_unit": "months"
  }'
```

### Edge Case 2: Leap Year
Create a yearly task on Feb 29 (if today is leap year):
```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Leap year task",
    "interval_value": 4,
    "interval_unit": "years"
  }'
```

### Edge Case 3: Year Boundary
Create a task that crosses year boundary:
```bash
# If today is Dec 30, next_due_date should be in next year
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New year task",
    "interval_value": 7,
    "interval_unit": "days"
  }'
```

### Edge Case 4: Already on Preferred Day
Create a task on Saturday with preferred_day_of_week = 6 (Saturday):
```bash
# If today is Saturday, next_due_date should still be adjusted forward
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Saturday task",
    "interval_value": 1,
    "interval_unit": "weeks",
    "preferred_day_of_week": 6
  }'
```

### Edge Case 5: Maximum Interval Value
```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Long interval task",
    "interval_value": 999,
    "interval_unit": "days"
  }'
```

### Edge Case 6: Empty String Description (converted to null)
```bash
curl -X POST http://localhost:4321/api/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Task with empty description",
    "description": "",
    "interval_value": 1,
    "interval_unit": "days"
  }'
```

---

## 🔧 Testing with JavaScript/TypeScript

### Axios Example

```typescript
import axios from 'axios';

const createTask = async (token: string) => {
  try {
    const response = await axios.post(
      'http://localhost:4321/api/tasks',
      {
        title: 'Water the plants',
        description: 'Water all indoor plants',
        interval_value: 2,
        interval_unit: 'days',
        preferred_day_of_week: null
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Task created:', response.data);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error:', error.response?.data);
    }
    throw error;
  }
};
```

### Fetch Example

```typescript
const createTask = async (token: string) => {
  try {
    const response = await fetch('http://localhost:4321/api/tasks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Water the plants',
        description: 'Water all indoor plants',
        interval_value: 2,
        interval_unit: 'days',
        preferred_day_of_week: null
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('Error:', data);
      throw new Error(data.error);
    }
    
    console.log('Task created:', data);
    return data;
  } catch (error) {
    console.error('Failed to create task:', error);
    throw error;
  }
};
```

---

## 📊 Response Status Codes Summary

| Status Code | Scenario | Response Type |
|-------------|----------|---------------|
| 201 | Task created successfully | TaskDTO |
| 400 | Invalid Content-Type | ErrorDTO |
| 400 | Malformed JSON | ErrorDTO |
| 400 | Validation failed | ValidationErrorDTO |
| 401 | Missing Authorization header | ErrorDTO |
| 401 | Invalid Bearer token format | ErrorDTO |
| 401 | Invalid or expired token | ErrorDTO |
| 500 | Database error or unexpected failure | ErrorDTO |

---

## 🎯 Testing Checklist

- [ ] Success: Create task with all fields
- [ ] Success: Create task with minimal fields (no description, no preferred_day)
- [ ] Success: Create task with each interval_unit (days, weeks, months, years)
- [ ] Success: Create task with preferred_day_of_week (0-6)
- [ ] Error: Missing Authorization header
- [ ] Error: Invalid Bearer token
- [ ] Error: Missing Content-Type
- [ ] Error: Invalid JSON
- [ ] Error: Missing required fields
- [ ] Error: Empty title
- [ ] Error: Title too long (>256 chars)
- [ ] Error: Description too long (>5000 chars)
- [ ] Error: interval_value out of range (<1 or >999)
- [ ] Error: Invalid interval_unit
- [ ] Error: Invalid preferred_day_of_week (<0 or >6)
- [ ] Edge Case: Month overflow (Jan 31 + 1 month)
- [ ] Edge Case: Year boundary crossing
- [ ] Edge Case: Leap year handling
- [ ] Edge Case: Already on preferred day
- [ ] Edge Case: Maximum interval_value (999)
- [ ] Verify: next_due_date is correctly calculated
- [ ] Verify: Timestamps (created_at, updated_at) are set
- [ ] Verify: UUID is generated for id
- [ ] Verify: user_id matches authenticated user

