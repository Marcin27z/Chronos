# API Endpoint Implementation Plan: Create Task (POST /api/tasks)

## 1. Endpoint Overview

This endpoint creates a new recurring task for an authenticated user. The task system allows users to track recurring activities with configurable intervals (days, weeks, months, years) and optional preferred days of the week. Upon creation, the system automatically calculates the first due date based on the current date, interval settings, and day-of-week preferences.

**Key Responsibilities:**
- Authenticate the user via Bearer token
- Validate input according to business rules
- Calculate the initial `next_due_date` based on interval and preferences
- Store the task in the database
- Return the complete task object with all generated fields

## 2. Request Details

### HTTP Method & URL
- **Method:** `POST`
- **URL:** `/api/tasks`
- **Content-Type:** `application/json`
- **Authentication:** Required (Bearer token)

### Headers
- `Authorization`: Bearer token for user authentication
- `Content-Type`: Must be `application/json`

### Request Parameters

#### Required Fields
1. **title** (string)
   - Max length: 256 characters
   - Cannot be empty or whitespace-only
   - Represents the name of the recurring task

2. **interval_value** (integer)
   - Range: 1-999 (inclusive)
   - Represents the numeric part of the recurrence interval
   - Combined with interval_unit to define how often the task recurs

3. **interval_unit** (enum)
   - Allowed values: `"days"`, `"weeks"`, `"months"`, `"years"`
   - Defines the time unit for the interval
   - Works with interval_value to determine recurrence pattern

#### Optional Fields
1. **description** (string | null)
   - Max length: 5000 characters
   - Can be null, undefined, or empty string
   - Provides additional context about the task

2. **preferred_day_of_week** (integer | null)
   - Range: 0-6 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
   - Null means no day preference
   - Used to adjust calculated due dates to a preferred day of the week
   - Helps users schedule tasks on convenient days (e.g., always on Saturdays)

## 3. Used Types

### Input Type
- **CreateTaskCommand** (from `src/types.ts`)
  - Represents the validated command to create a task
  - Includes only fields that users can specify
  - Excludes auto-generated and system-managed fields

### Output Types
- **TaskDTO** (from `src/types.ts`)
  - Complete task representation returned to client
  - Includes all database fields including auto-generated ones

- **ValidationErrorDTO** (from `src/types.ts`)
  - Structured validation error response
  - Contains array of field-specific error details
  - Used for 400 Bad Request responses

- **ErrorDTO** (from `src/types.ts`)
  - Generic error response structure
  - Used for non-validation errors (401, 500, etc.)

### Internal Types
- **Zod Validation Schema** (`CreateTaskSchema`)
  - Runtime validation schema defined in the API route file
  - Mirrors CreateTaskCommand with validation rules
  - Provides detailed error messages for each field

## 4. Response Details

### Success Response (201 Created)

**Status Code:** `201 Created`

**Response Body Structure:**
- All user-provided fields (title, description, interval_value, interval_unit, preferred_day_of_week)
- Auto-generated fields (id, user_id, created_at, updated_at)
- Calculated field (next_due_date)
- Default null fields (last_action_date, last_action_type)

### Error Responses

#### 400 Bad Request - Validation Error
**Scenario:** Invalid input data
- Missing required fields
- Wrong data types
- Values out of acceptable range
- Invalid enum values

**Response Structure:** ValidationErrorDTO with array of field-specific errors

#### 401 Unauthorized
**Scenario:** Authentication failure
- Missing Authorization header
- Invalid or expired Bearer token
- Malformed authentication credentials

**Response Structure:** ErrorDTO with authentication error message

#### 422 Unprocessable Entity
**Scenario:** Business logic violation
- Date calculation produces invalid result
- Unable to adjust to preferred day of week
- Semantic errors that pass validation but fail business rules

**Response Structure:** ErrorDTO with business logic error details

#### 500 Internal Server Error
**Scenario:** Unexpected server error
- Database connection failure
- Supabase service unavailable
- Unexpected runtime errors

**Response Structure:** ErrorDTO with generic error message (internal details hidden from client)

## 5. Data Flow

### Step-by-Step Flow

1. **Request Reception**
   - Astro framework receives POST request at `/api/tasks`
   - Middleware automatically injects Supabase client into request context
   - Request enters the POST handler function

2. **Method Validation**
   - Verify HTTP method is POST
   - Astro handles this automatically via export naming convention
   - Return 405 Method Not Allowed if accessed via other methods

3. **Authentication**
   - Extract Authorization header from request
   - Parse Bearer token from header
   - Validate token with Supabase Auth service
   - Extract user_id from validated token
   - Return 401 Unauthorized if authentication fails at any step

4. **Content-Type Validation**
   - Verify Content-Type header is application/json
   - Return 400 Bad Request if invalid
   - Prevents CSRF attacks via simple requests

5. **Request Body Parsing**
   - Parse JSON body from request
   - Handle JSON parsing errors gracefully
   - Return 400 Bad Request if JSON is malformed

6. **Input Validation (Zod)**
   - Validate parsed body against CreateTaskSchema
   - Check all required fields are present
   - Validate data types, ranges, and formats
   - Transform Zod errors into user-friendly ValidationErrorDTO
   - Return 400 with detailed validation errors if invalid

7. **Service Call - Task Creation**
   - Pass validated data to TaskService.createTask
   - Service calculates next_due_date using date calculation algorithm
   - Service constructs complete database insert payload
   - Service executes database insertion via Supabase client
   - Service returns created task entity

8. **Database Interaction**
   - Execute INSERT operation on tasks table
   - Database auto-generates: id (UUID), created_at, updated_at
   - Database applies constraints and validations
   - Use .select().single() to retrieve created row in same query
   - Handle database errors and constraints violations

9. **Response Formation**
   - Transform database result to TaskDTO
   - Serialize to JSON
   - Return 201 Created status with TaskDTO in response body
   - Include Content-Type: application/json header

### Database Tables Involved

**Primary Table:** `tasks`
- **Operation:** INSERT
- **Fields Set:**
  - User-provided: title, description, interval_value, interval_unit, preferred_day_of_week
  - Calculated: next_due_date
  - From context: user_id (from authenticated token)
  - Defaults: last_action_date (null), last_action_type (null)
  - Auto-generated: id, created_at, updated_at

**RLS Policies:** 
- User can only insert tasks with their own user_id
- Policy enforced automatically by using authenticated user's ID from token

### External Services

**Supabase Auth**
- **Purpose:** Token validation and user identification
- **Operation:** Validate Bearer token and return user information
- **Fallback:** Return 401 if validation fails

**Supabase Database**
- **Purpose:** Persistent storage of task data
- **Operation:** Insert new task record and return created entity
- **Fallback:** Return 500 if operation fails

## 6. Security Considerations

### Authentication & Authorization

1. **Token Validation**
   - Every request must include valid Bearer token in Authorization header
   - Token validated against Supabase Auth service
   - Expired or invalid tokens immediately rejected with 401 response
   - No request processing occurs before successful authentication

2. **User Isolation**
   - user_id extracted exclusively from authenticated token
   - user_id never accepted from request body
   - Prevents privilege escalation (users creating tasks for others)
   - Database foreign key constraint enforces referential integrity

3. **Resource Ownership**
   - Newly created tasks automatically owned by authenticated user
   - No mechanism to override user_id from client side
   - Enforced at application and database levels

### Input Validation & Sanitization

1. **Zod Schema Validation**
   - All inputs validated against strict schema before processing
   - Type checking prevents type coercion attacks
   - Data integrity ensured before any database interaction
   - Fail-fast approach: reject invalid data immediately

2. **String Length Limits**
   - Title limited to 256 characters (prevents buffer overflow, DoS)
   - Description limited to 5000 characters
   - Limits enforced at validation layer AND database level (defense in depth)
   - Prevents storage abuse and potential DoS attacks

3. **Numeric Range Validation**
   - interval_value: 1-999 (prevents negative values, unreasonably large intervals)
   - preferred_day_of_week: 0-6 or null (prevents invalid day numbers)
   - Prevents business logic errors and data corruption

4. **Enum Validation**
   - interval_unit restricted to four predefined values only
   - Prevents injection of arbitrary strings
   - Type-safe at compile-time and runtime

### SQL Injection Prevention

- Supabase client uses parameterized queries internally
- No raw SQL construction anywhere in application code
- All user inputs passed as parameters, never concatenated into queries
- Database driver handles proper escaping automatically

### Rate Limiting Considerations

- Not implemented at endpoint level
- Should be added at infrastructure level (API Gateway, reverse proxy, middleware)
- Recommended limit: 100 requests per minute per authenticated user
- Protects against abuse and DoS attacks

### CORS & Content-Type

- Content-Type validation prevents CSRF via simple requests
- Forces preflight for cross-origin requests
- CORS configuration should be managed in Astro config
- Whitelist only trusted origins in production

## 7. Error Handling

### Error Categories & Handling Strategy

#### 1. HTTP Method Errors (405 Method Not Allowed)
**Trigger:** Request method is not POST

**Handling:**
- Automatically handled by Astro's endpoint routing
- Only POST function exported from route file
- Other methods receive 405 automatically

#### 2. Authentication Errors (401 Unauthorized)

**Triggers:**
- Missing Authorization header
- Malformed Bearer token (doesn't start with "Bearer ")
- Invalid token (not recognized by Supabase)
- Expired token
- Supabase auth service failure

**Handling:**
- Check for Authorization header presence
- Validate header format
- Call Supabase auth.getUser() with token
- Return 401 with generic error message
- Don't leak information about why authentication failed

#### 3. Content-Type Errors (400 Bad Request)
**Trigger:** Content-Type header is not application/json

**Handling:**
- Check Content-Type header before parsing body
- Return 400 with clear message about required Content-Type
- Prevents processing of non-JSON data

#### 4. JSON Parsing Errors (400 Bad Request)
**Trigger:** Request body is not valid JSON

**Handling:**
- Wrap JSON parsing in try-catch block
- Return 400 with message about malformed JSON
- Don't expose parsing error details to client

#### 5. Validation Errors (400 Bad Request)
**Trigger:** Request body fails Zod schema validation

**Handling:**
- Use Zod's safeParse method
- Map Zod errors to ValidationErrorDTO format
- Include field name and user-friendly message for each error
- Return all validation errors at once (not just first error)

#### 6. Business Logic Errors (422 Unprocessable Entity)
**Triggers:**
- Date calculation produces invalid result
- Unable to adjust to preferred day of week
- Other semantic errors

**Handling:**
- Catch specific business logic exceptions
- Return 422 with explanation of business rule violation
- Distinguish from validation errors (which are 400)

#### 7. Database Errors (500 Internal Server Error)
**Triggers:**
- Database connection failure
- Constraint violations (shouldn't happen with proper validation)
- Supabase service unavailable
- Unexpected runtime errors

**Handling:**
- Catch all unexpected errors in final try-catch block
- Log full error details server-side
- Return generic 500 error to client
- Don't expose internal error details
- Consider alerting/monitoring for production

### Error Logging Strategy

1. **Client Errors (4xx):**
   - Log at INFO or WARN level (expected errors)
   - Include: timestamp, user_id, endpoint, error type, validation details
   - Don't expose internal implementation details to client
   - Useful for identifying usability issues

2. **Server Errors (5xx):**
   - Log at ERROR level (unexpected errors)
   - Include: full stack trace, request details, user_id, timestamp
   - Send only generic message to client
   - Alert on-call team for production errors
   - Track error rates and patterns

3. **Security Events:**
   - Log all failed authentication attempts
   - Log validation failures for pattern analysis
   - Monitor for brute force or abuse patterns
   - Consider rate limiting based on failure patterns
   - Include IP address and user agent for security analysis

## 8. Performance Considerations

### Expected Performance Metrics
- **Response Time:** < 200ms at 95th percentile
- **Throughput:** Limited by database capacity, not application logic
- **Database Queries:** Exactly 1 INSERT per successful request
- **Memory Footprint:** Minimal, request processing is stateless

### Optimization Strategies

1. **Single Database Round-Trip**
   - Use Supabase's .insert().select().single() pattern
   - Combines INSERT and SELECT in single database query
   - Avoids separate query to fetch created record
   - Reduces network latency and database load

2. **Efficient Date Calculation**
   - Use native JavaScript Date objects
   - All calculations happen in-memory
   - No external API calls or database queries for date logic
   - Fast execution (< 1ms)

3. **Minimal Validation Overhead**
   - Zod validation is highly optimized
   - Validation time negligible for this schema (~1ms)
   - Fail-fast approach: validate before expensive operations
   - Prevents unnecessary database calls for invalid data

4. **Connection Pooling**
   - Supabase client manages connection pool automatically
   - Reuse single client instance across all requests
   - No overhead from creating new connections per request

### Potential Bottlenecks

1. **Database Write Latency**
   - Primary bottleneck for this endpoint
   - Mitigation: Ensure proper indexing on user_id column
   - Monitor: Track INSERT query performance metrics
   - Consider: Read replicas won't help (this is a write operation)

2. **Authentication Token Validation**
   - Each request validates token with Supabase Auth
   - Mitigation: Supabase handles token caching internally
   - Optimization: JWT tokens can be validated locally without database hit
   - Trade-off: Local validation vs. real-time revocation

3. **JSON Parsing**
   - Potential DoS vector with very large payloads
   - Mitigation: Implement request body size limit (e.g., 10KB max)
   - Current schema: Payloads are small, not a practical concern
   - Consider: Middleware-level size limit for all endpoints

### Scalability Notes

- **Horizontal Scaling:** Endpoint is completely stateless, scales linearly
- **No Session State:** Each request is fully independent
- **Database Bottleneck:** Database is limiting factor, not application code
- **Async Processing:** Current implementation is synchronous; task creation could be async if volume grows
- **Caching:** Not applicable for write operations
- **Load Distribution:** Can run on multiple servers behind load balancer

## 9. Implementation Steps

### Step 1: Create Task Service
**File:** `src/lib/services/task.service.ts`

**Responsibilities:**
- Implement date calculation algorithm
- Handle database interaction for task creation
- Return properly typed task entity
- Throw appropriate errors for error handling layer

**Key Functions to Implement:**
- `createTask()`: Main entry point, orchestrates task creation
- `calculateNextDueDate()`: Date calculation algorithm
- `adjustToPreferredDay()`: Helper for day-of-week adjustment

### Step 2: Implement Date Calculation Logic
**Location:** `src/lib/services/task.service.ts`

**Algorithm Description:**
1. Start with current date as base
2. Add interval based on unit:
   - Days: Direct date addition
   - Weeks: Multiply by 7 and add days
   - Months: Use Date.setMonth() to handle month boundaries
   - Years: Use Date.setFullYear() to handle leap years
3. If preferred_day_of_week specified:
   - Calculate days until next occurrence of preferred day
   - Adjust date forward to that day
   - If already on preferred day, keep current date
4. Format result as ISO date string (YYYY-MM-DD)

**Edge Cases to Handle:**
- Month overflow: Jan 31 + 1 month should become Feb 28/29
- Year boundaries: Dec 31 + any interval crossing year
- Leap years: Feb 29 considerations for yearly intervals
- Preferred day adjustment: Ensure always moves forward, never backward
- Time zone consistency: Use UTC to avoid DST issues

### Step 3: Create Zod Validation Schema
**File:** `src/pages/api/tasks.ts` (inline with route handler)

**Schema Requirements:**
- Mirror CreateTaskCommand structure
- Validate all field types strictly
- Enforce string length limits
- Enforce numeric ranges
- Provide user-friendly error messages
- Handle optional/nullable fields correctly
- Use .trim() for string fields to clean whitespace

**Validation Rules:**
- title: string, required, min 1 char, max 256 chars, trimmed
- description: string, optional, nullable, max 5000 chars
- interval_value: number, integer, min 1, max 999
- interval_unit: enum of exactly 4 allowed values
- preferred_day_of_week: number, integer, min 0, max 6, optional, nullable

### Step 4: Implement API Route Handler
**File:** `src/pages/api/tasks.ts`

**Implementation Checklist:**
- Export POST async function
- Set prerender = false
- Validate Content-Type header
- Extract and validate Authorization header
- Authenticate user with Supabase
- Parse JSON body with error handling
- Validate body with Zod schema
- Call TaskService.createTask()
- Handle all error types appropriately
- Return proper HTTP status codes
- Include Content-Type headers in all responses

**Error Handling Requirements:**
- Wrap JSON parsing in try-catch
- Use Zod's safeParse (not parse)
- Wrap service call in try-catch
- Map errors to appropriate HTTP status codes
- Always return JSON responses
- Log errors appropriately

### Step 5: Create Directory Structure

**Directories to Create:**
- `src/lib/services/` - For service layer classes
- `src/pages/api/` - For API endpoint handlers

**Verification:**
- Ensure directories exist before creating files
- Follow project structure conventions
- Maintain separation of concerns

### Step 6: Add Required Dependencies

**Dependencies to Verify:**
- `zod` - Runtime schema validation
- `@supabase/supabase-js` - Supabase client library

**Actions:**
- Check package.json for presence
- Install if missing
- Verify versions are compatible
- Check for security vulnerabilities

### Step 7: Update Supabase Client Type Export
**File:** `src/db/supabase.client.ts`

**Requirements:**
- Export SupabaseClient type for service layer
- Type should be derived from client instance
- Include Database generic for type safety
- Ensure client is configured with environment variables

**Verification:**
- Type can be imported in service layer
- Type checking works correctly
- Client instance is singleton


### Step 8: Deployment Preparation

**Environment Configuration:**
- Verify SUPABASE_URL is set
- Verify SUPABASE_ANON_KEY is set
- Check environment variable naming consistency
- Verify values are correct for target environment

**Database Preparation:**
- Ensure migration is applied
- Verify RLS policies are enabled
- Test RLS policies with different users
- Verify indexes exist on user_id
- Check database constraints match validation

**Monitoring & Logging:**
- Configure error logging
- Set up error rate monitoring
- Configure alerting for 5xx errors
- Set up performance monitoring
- Track key metrics (response time, error rate)

**Security Hardening:**
- Enable rate limiting if available
- Configure CORS appropriately
- Review RLS policies
- Security scan for vulnerabilities
- Review authentication flow

---

## Summary

This implementation plan provides comprehensive guidance for implementing the POST /api/tasks endpoint. The implementation follows clean architecture principles with clear separation of concerns:

**Architecture Layers:**
1. **API Route Layer** - Handles HTTP protocol concerns (headers, status codes, authentication)
2. **Service Layer** - Implements business logic (date calculations, data transformations)
3. **Type Safety Layer** - Ensures compile-time and runtime type safety (TypeScript + Zod)
4. **Security Layer** - Enforces authentication, authorization, and input validation
5. **Error Handling Layer** - Provides consistent, user-friendly error responses

**Key Design Principles:**
- Fail fast: Validate inputs before expensive operations
- Single Responsibility: Each layer has one clear purpose
- Type Safety: Leverage TypeScript and Zod for maximum safety
- Security First: User isolation, input validation, SQL injection prevention
- Performance: Single database query, efficient algorithms, stateless design
- Observability: Comprehensive error logging and monitoring

**Implementation Priorities:**
1. Security and authentication
2. Input validation and error handling
3. Core business logic (date calculation)
4. Database interaction
5. Testing and documentation
6. Performance optimization

The endpoint is designed to be production-ready with consideration for security, performance, scalability, and maintainability.
