# REST API Plan - Chronos

## 1. Resources

The API is built around the following main resources:

| Resource | Database Table | Description |
|----------|---------------|-------------|
| `tasks` | `tasks` | User's recurring tasks |
| `task-templates` | `task_templates` | Global task templates for onboarding and help |
| `auth` | `auth.users` | User authentication (managed by Supabase Auth) |

---

## 2. Endpoints

### 2.1. Task Endpoints

All task endpoints require authentication via Bearer token.

#### 2.1.1. Create Task

- **HTTP Method:** `POST`
- **URL Path:** `/api/tasks`
- **Description:** Create a new recurring task
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Request Payload:**
```json
{
  "title": "Change water filter",
  "description": "Replace water filter in refrigerator",
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6
}
```

**Field Validations:**
- `title` (required): String, max 256 characters
- `description` (optional): String, max 5000 characters
- `interval_value` (required): Integer, 1-999
- `interval_unit` (required): Enum: "days", "weeks", "months", "years"
- `preferred_day_of_week` (optional): Integer, 0-6 (0=Sunday, 6=Saturday), null=no preference

**Success Response (201 Created):**
```json
{
  "id": "uuid-string",
  "user_id": "uuid-string",
  "title": "Change water filter",
  "description": "Replace water filter in refrigerator",
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6,
  "next_due_date": "2025-04-19",
  "last_action_date": null,
  "last_action_type": null,
  "created_at": "2025-10-15T12:00:00Z",
  "updated_at": "2025-10-15T12:00:00Z"
}
```

**Error Responses:**
- **400 Bad Request:** Validation error (missing required fields, invalid values)
- **401 Unauthorized:** Missing or invalid token
- **422 Unprocessable Entity:** Business logic violation

**Example Validation Errors:**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "title",
      "message": "Title is required and must not exceed 256 characters"
    },
    {
      "field": "description",
      "message": "Description must not exceed 5000 characters"
    },
    {
      "field": "interval_value",
      "message": "Interval value must be between 1 and 999"
    },
    {
      "field": "interval_unit",
      "message": "Interval unit must be one of: days, weeks, months, years"
    },
    {
      "field": "preferred_day_of_week",
      "message": "Preferred day of week must be between 0 and 6 or null"
    }
  ]
}
```

---

#### 2.2.2. Get All Tasks

- **HTTP Method:** `GET`
- **URL Path:** `/api/tasks`
- **Description:** Retrieve all user's tasks with optional sorting
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Query Parameters:**
- `sort` (optional): Sorting field and direction
  - `next_due_date` (default): Sort by next due date (ascending)
  - `-next_due_date`: Sort by next due date (descending)
  - `title`: Sort alphabetically by title (ascending)
  - `-title`: Sort alphabetically by title (descending)
- `limit` (optional): Number of results per page (default: 50, max: 100)
- `offset` (optional): Number of results to skip (default: 0)

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "title": "Change water filter",
      "description": "Replace water filter in refrigerator",
      "interval_value": 6,
      "interval_unit": "months",
      "preferred_day_of_week": 6,
      "next_due_date": "2025-10-20",
      "last_action_date": "2025-04-15",
      "last_action_type": "completed",
      "created_at": "2025-01-15T12:00:00Z",
      "updated_at": "2025-04-15T14:30:00Z"
    },
    {
      "id": "uuid-2",
      "title": "Car inspection",
      "description": null,
      "interval_value": 1,
      "interval_unit": "years",
      "preferred_day_of_week": null,
      "next_due_date": "2025-11-01",
      "last_action_date": null,
      "last_action_type": null,
      "created_at": "2025-10-14T10:00:00Z",
      "updated_at": "2025-10-14T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  }
}
```

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token
- **400 Bad Request:** Invalid query parameters

---

#### 2.2.3. Get Single Task

- **HTTP Method:** `GET`
- **URL Path:** `/api/tasks/{taskId}`
- **Description:** Retrieve a specific task by ID
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**URL Parameters:**
- `taskId` (required): UUID of the task

**Success Response (200 OK):**
```json
{
  "id": "uuid-1",
  "user_id": "uuid-string",
  "title": "Change water filter",
  "description": "Replace water filter in refrigerator",
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6,
  "next_due_date": "2025-10-20",
  "last_action_date": "2025-04-15",
  "last_action_type": "completed",
  "created_at": "2025-01-15T12:00:00Z",
  "updated_at": "2025-04-15T14:30:00Z"
}
```

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token
- **404 Not Found:** Task not found or doesn't belong to user

---

#### 2.2.4. Update Task

- **HTTP Method:** `PUT`
- **URL Path:** `/api/tasks/{taskId}`
- **Description:** Update an existing task (all fields are optional but at least one must be provided)
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**URL Parameters:**
- `taskId` (required): UUID of the task

**Request Payload:**
```json
{
  "title": "Change water filter - updated",
  "description": "Replace water filter in refrigerator and clean",
  "interval_value": 3,
  "interval_unit": "months",
  "preferred_day_of_week": null
}
```

**Note:** Changing interval settings will recalculate `next_due_date` based on the new interval from the current date.

**Success Response (200 OK):**
```json
{
  "id": "uuid-1",
  "user_id": "uuid-string",
  "title": "Change water filter - updated",
  "description": "Replace water filter in refrigerator and clean",
  "interval_value": 3,
  "interval_unit": "months",
  "preferred_day_of_week": null,
  "next_due_date": "2026-01-15",
  "last_action_date": "2025-04-15",
  "last_action_type": "completed",
  "created_at": "2025-01-15T12:00:00Z",
  "updated_at": "2025-10-15T16:45:00Z"
}
```

**Error Responses:**
- **400 Bad Request:** Validation error
- **401 Unauthorized:** Missing or invalid token
- **404 Not Found:** Task not found or doesn't belong to user

---

#### 2.2.5. Delete Task

- **HTTP Method:** `DELETE`
- **URL Path:** `/api/tasks/{taskId}`
- **Description:** Permanently delete a task
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**URL Parameters:**
- `taskId` (required): UUID of the task

**Success Response (204 No Content):**
No response body

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token
- **404 Not Found:** Task not found or doesn't belong to user

---

#### 2.2.6. Get Dashboard Data

- **HTTP Method:** `GET`
- **URL Path:** `/api/tasks/dashboard`
- **Description:** Retrieve tasks for dashboard view (overdue and upcoming in 7 days)
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "overdue": [
    {
      "id": "uuid-1",
      "title": "Change water filter",
      "description": "Replace water filter in refrigerator",
      "interval_value": 6,
      "interval_unit": "months",
      "preferred_day_of_week": 6,
      "next_due_date": "2025-10-10",
      "last_action_date": "2025-04-10",
      "last_action_type": "completed",
      "days_overdue": 5
    }
  ],
  "upcoming": [
    {
      "id": "uuid-2",
      "title": "Car inspection",
      "description": null,
      "interval_value": 1,
      "interval_unit": "years",
      "preferred_day_of_week": null,
      "next_due_date": "2025-10-20",
      "last_action_date": null,
      "last_action_type": null,
      "days_until_due": 5
    }
  ],
  "next_task": {
    "id": "uuid-3",
    "title": "Replace smoke detector batteries",
    "next_due_date": "2025-11-15",
    "days_until_due": 31
  },
  "summary": {
    "total_overdue": 1,
    "total_upcoming": 1,
    "total_tasks": 25
  }
}
```

**Notes:**
- `overdue`: Tasks where `next_due_date < CURRENT_DATE`
- `upcoming`: Tasks where `next_due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7`
- `next_task`: Nearest task in the future (if no overdue or upcoming tasks exist)
- `days_overdue`: Calculated as `CURRENT_DATE - next_due_date`
- `days_until_due`: Calculated as `next_due_date - CURRENT_DATE`

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token

---

#### 2.2.7. Complete Task

- **HTTP Method:** `POST`
- **URL Path:** `/api/tasks/{taskId}/complete`
- **Description:** Mark task as completed and calculate next due date
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**URL Parameters:**
- `taskId` (required): UUID of the task

**Notes:**
- Task's `last_action_date` is set to current date
- Task's `last_action_type` is set to `completed`
- Task's `next_due_date` is calculated based on current date + interval, adjusted for `preferred_day_of_week` if set

**Success Response (200 OK):**
```json
{
  "id": "uuid-1",
  "user_id": "uuid-string",
  "title": "Change water filter",
  "description": "Replace water filter in refrigerator",
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6,
  "next_due_date": "2026-04-18",
  "last_action_date": "2025-10-15",
  "last_action_type": "completed",
  "created_at": "2025-01-15T12:00:00Z",
  "updated_at": "2025-10-15T16:45:00Z"
}
```

**Error Responses:**
- **400 Bad Request:** Invalid completion date format
- **401 Unauthorized:** Missing or invalid token
- **404 Not Found:** Task not found or doesn't belong to user

---

#### 2.2.8. Skip Task

- **HTTP Method:** `POST`
- **URL Path:** `/api/tasks/{taskId}/skip`
- **Description:** Skip task occurrence and calculate next due date
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**URL Parameters:**
- `taskId` (required): UUID of the task

**Notes:**
- Task's `last_action_date` is set to current date
- Task's `last_action_type` is set to `skipped`
- Task's `next_due_date` is calculated based on current date + interval, adjusted for `preferred_day_of_week` if set

**Success Response (200 OK):**
```json
{
  "id": "uuid-1",
  "user_id": "uuid-string",
  "title": "Change water filter",
  "description": "Replace water filter in refrigerator",
  "interval_value": 6,
  "interval_unit": "months",
  "preferred_day_of_week": 6,
  "next_due_date": "2026-04-18",
  "last_action_date": "2025-10-15",
  "last_action_type": "skipped",
  "created_at": "2025-01-15T12:00:00Z",
  "updated_at": "2025-10-15T16:45:00Z"
}
```

**Error Responses:**
- **400 Bad Request:** Invalid skip date format
- **401 Unauthorized:** Missing or invalid token
- **404 Not Found:** Task not found or doesn't belong to user

---

### 2.3. Task Template Endpoints

#### 2.3.1. Get All Task Templates

- **HTTP Method:** `GET`
- **URL Path:** `/api/task-templates`
- **Description:** Retrieve all active task templates for onboarding and help page
- **Authentication:** Bearer token required (user must be logged in)

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Notes:**
- Only active templates are returned (`is_active = true`)
- Templates are used to pre-fill form fields in the UI
- Tasks are created using the standard `POST /api/tasks` endpoint with template values

**Success Response (200 OK):**
```json
{
  "data": [
    {
      "id": "uuid-1",
      "title": "Wymiana filtra wody",
      "description": "Regularnie wymieniaj filtr wody w lodówce",
      "interval_value": 6,
      "interval_unit": "months",
      "preferred_day_of_week": null,
      "category": "Dom i ogród",
      "display_order": 1,
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "uuid-2",
      "title": "Przegląd samochodu",
      "description": "Obowiązkowy przegląd techniczny pojazdu",
      "interval_value": 1,
      "interval_unit": "years",
      "preferred_day_of_week": null,
      "category": "Auto i transport",
      "display_order": 2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token

---

### 2.4. User Profile Endpoints

#### 2.4.1. Get User Profile

- **HTTP Method:** `GET`
- **URL Path:** `/api/user/profile`
- **Description:** Get current user's profile information
- **Authentication:** Bearer token required

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Success Response (200 OK):**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "email_confirmed_at": "2025-10-15T12:05:00Z",
  "created_at": "2025-10-15T12:00:00Z",
  "task_statistics": {
    "total_tasks": 25,
    "completed_count": 120,
    "skipped_count": 5,
    "is_onboarding_complete": true
  }
}
```

**Notes:**
- `is_onboarding_complete`: true if user has at least 1 task, false otherwise

**Error Responses:**
- **401 Unauthorized:** Missing or invalid token

---

## 3. Authentication and Authorization

Authentication is handled by **Supabase Auth** using JWT tokens sent in the `Authorization: Bearer {token}` header. All protected endpoints require a valid access token.

Authorization is enforced through PostgreSQL **Row Level Security (RLS)** policies that ensure users can only access their own tasks. The `task_templates` table is publicly readable for all authenticated users.

---

## 4. Security

All API communication must use **HTTPS** in production environments. **Rate limiting** is implemented to prevent abuse, with different limits for authentication and API endpoints. **CORS** is configured to allow requests only from approved frontend origins (production, staging, and local development).

---

## 5. Validation and Business Logic

### 5.1. Task Validation Rules

All validation rules are derived from the database schema constraints:

#### Field: `title`
- **Type:** String (VARCHAR 256)
- **Required:** Yes
- **Constraints:**
  - Must not be empty
  - Maximum 256 characters
- **Error message:** "Title is required and must not exceed 256 characters"

#### Field: `description`
- **Type:** String (TEXT)
- **Required:** No
- **Constraints:** Maximum 5000 characters
- **Error message:** "Description must not exceed 5000 characters"

#### Field: `interval_value`
- **Type:** Integer
- **Required:** Yes
- **Constraints:**
  - Must be greater than 0
  - Must be less than 1000
  - CHECK: `interval_value > 0 AND interval_value < 1000`
- **Error message:** "Interval value must be between 1 and 999"

#### Field: `interval_unit`
- **Type:** ENUM (interval_unit_type)
- **Required:** Yes
- **Allowed values:** `days`, `weeks`, `months`, `years`
- **Error message:** "Interval unit must be one of: days, weeks, months, years"

#### Field: `preferred_day_of_week`
- **Type:** Integer (SMALLINT)
- **Required:** No
- **Constraints:**
  - NULL (no preference) OR
  - Integer between 0 and 6 (inclusive)
  - 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  - CHECK: `preferred_day_of_week IS NULL OR (preferred_day_of_week >= 0 AND preferred_day_of_week <= 6)`
- **Error message:** "Preferred day of week must be between 0 (Sunday) and 6 (Saturday), or null for no preference"

---

### 5.2. Business Logic

#### 5.2.1. Next Due Date Calculation

The `next_due_date` is automatically calculated by the application when:

- **Creating a task:** Based on current date + interval
- **Completing a task:** Based on current date + interval
- **Skipping a task:** Based on current date + interval
- **Updating task interval:** Based on `last_action_date` + new interval (or current date if never actioned)

**Calculation rules:**

1. Add the specified interval to the base date
2. If `preferred_day_of_week` is set, adjust the date forward to the nearest occurrence of that day
3. The result is stored as `next_due_date`

---

#### 5.2.2. Dashboard Data

The dashboard endpoint returns three categories of tasks:

- **Overdue:** Tasks where `next_due_date` is before current date, sorted by due date (oldest first)
- **Upcoming:** Tasks where `next_due_date` is within the next 7 days, sorted by due date
- **Next task:** If no overdue or upcoming tasks exist, returns the single nearest future task

Additional calculated fields are included:
- `days_overdue`: Number of days past the due date
- `days_until_due`: Number of days until the due date

---

#### 5.2.3. Onboarding Status

Onboarding is considered complete when a user has created at least one task. The user profile endpoint includes an `is_onboarding_complete` flag based on this criterion.

---

#### 5.2.4. Task Actions

**Complete Task:**
- Sets `last_action_date` to current date
- Sets `last_action_type` to `completed`
- Recalculates `next_due_date` based on current date + interval
- Updates `updated_at` timestamp

**Skip Task:**
- Sets `last_action_date` to current date (or provided `skip_date`)
- Sets `last_action_type` to `skipped`
- Recalculates `next_due_date` based on current date + interval
- Updates `updated_at` timestamp

---
