# UI Architecture for Chronos

## 1. UI Structure Overview

Chronos employs a hybrid architecture using Astro 5 as the foundation with React 19 islands for interactive components. The application follows a file-based routing structure where Astro handles page layouts, SEO, and static content, while React manages dynamic user interactions, form handling, and real-time updates.

The architecture prioritizes:
- **Performance**: Static-first with selective hydration
- **Accessibility**: WCAG AA compliance with semantic HTML and proper ARIA labels  
- **Security**: JWT authentication with Supabase and secure form handling
- **Responsiveness**: Mobile-first design using Tailwind CSS breakpoints
- **User Experience**: Clear visual hierarchy, optimistic updates, and contextual feedback

## 2. View List

### 2.1 Dashboard (`/`)

**Main Purpose**: Primary landing page providing immediate task status overview and quick actions

**Key Information**:
- Overdue tasks with days overdue indicator
- Upcoming tasks within 7 days with countdown
- Next future task if no immediate items
- Quick completion/skip actions
- Task completion statistics

**Key Components**:
- `DashboardHeader` with user greeting and current date
- `OverdueTasksSection` with urgency styling and primary actions
- `UpcomingTasksSection` with upcoming task cards
- `NextTaskPreview` for future planning
- `OnboardingSection` for new users (collapsible)
- `TaskCard` components with action buttons

**UX Considerations**:
- Visual hierarchy emphasizing overdue tasks
- 44px minimum touch targets for mobile
- Skeleton loading states for initial render
- Optimistic updates for task actions with rollback capability
- Success animations for completed actions

**Accessibility Considerations**:
- Semantic headings (h1 for page, h2 for sections)
- ARIA labels on action buttons with task context
- Keyboard navigation between task cards
- Screen reader announcements for action results
- High contrast mode compatibility

**Security Considerations**:
- Authentication required for access
- Task actions use secure POST requests
- Server-side validation of all task IDs

### 2.2 Login (`/login`)

**Main Purpose**: User authentication entry point

**Key Information**:
- Email and password input fields
- Authentication status and error messages
- Registration and password recovery links

**Key Components**:
- `LoginForm` with email/password validation
- `AuthError` component for user-friendly error display
- Navigation links to registration and password reset

**UX Considerations**:
- Clean, focused design without distractions
- Clear error messaging without user enumeration
- Remember me functionality
- Auto-focus on first field

**Accessibility Considerations**:
- Proper label associations with form fields
- Error messages linked to relevant inputs via aria-describedby
- Keyboard navigation through form elements
- Password visibility toggle with screen reader support

**Security Considerations**:
- Rate limiting feedback for failed attempts
- Secure credential transmission over HTTPS
- Protection against timing attacks
- Clear session management

### 2.3 Register (`/register`)

**Main Purpose**: New user account creation

**Key Information**:
- Email, password, and password confirmation fields
- Password strength requirements
- Email verification instructions

**Key Components**:
- `RegistrationForm` with real-time validation
- `PasswordStrength` indicator component
- `EmailVerificationNotice` post-submission

**UX Considerations**:
- Real-time password strength feedback
- Clear validation messages
- Progressive disclosure of requirements
- Success state with clear next steps

**Accessibility Considerations**:
- Form field labels and descriptions
- Password requirements announced to screen readers
- Validation feedback immediately available
- Error summary at form level

**Security Considerations**:
- Strong password enforcement
- Email uniqueness validation
- Secure token generation for verification
- Prevention of automated registrations

### 2.4 Email Verification (`/verify-email`)

**Main Purpose**: Confirm email address from registration link

**Key Information**:
- Verification status (success/error/pending)
- Next action guidance
- Resend verification option

**Key Components**:
- `VerificationStatus` component with state handling
- `ResendVerification` button with rate limiting
- `LoginRedirect` button for successful verification

**UX Considerations**:
- Clear status indication with appropriate icons
- Helpful error messages with recovery options
- Automatic redirect to login after success
- Loading states during verification process

**Accessibility Considerations**:
- Status announcements for screen readers
- Clear heading hierarchy
- Focus management after state changes
- Error descriptions with recovery instructions

**Security Considerations**:
- Token validation and expiration handling
- Rate limiting on resend requests
- Secure redirection after verification
- Protection against token enumeration

### 2.5 Password Reset (`/reset-password`)

**Main Purpose**: Allow users to recover forgotten passwords

**Key Information**:
- Email input for reset request
- New password form for reset completion
- Status messages and confirmations

**Key Components**:
- `PasswordResetRequest` for email input
- `PasswordResetForm` for new password setting
- `ResetStatus` for progress indication

**UX Considerations**:
- Clear two-step process indication
- Helpful messaging about reset timeline
- Password strength validation
- Success confirmation with login link

**Accessibility Considerations**:
- Step indicators accessible to screen readers
- Form validation feedback
- Clear instructions at each step
- Focus management between steps

**Security Considerations**:
- Secure token generation and validation
- Time-limited reset links
- Rate limiting on reset requests
- New password strength requirements

### 2.6 Task List (`/tasks`)

**Main Purpose**: Comprehensive view and management of all user tasks

**Key Information**:
- Complete task inventory with titles and due dates
- Sorting and filtering options
- Task action history and status
- Bulk management capabilities

**Key Components**:
- `TaskListHeader` with count and create button
- `TaskSortFilter` component for organization
- `TaskGrid` with responsive layout
- `TaskCard` components with hover actions
- `Pagination` or infinite scroll controls

**UX Considerations**:
- Efficient loading with pagination/virtual scrolling
- Clear sorting indicators
- Hover states for action discovery
- Empty state guidance for task creation
- Quick action accessibility

**Accessibility Considerations**:
- Sortable column headers with ARIA sort states
- Task cards as focus-able list items
- Skip links for large lists
- Screen reader friendly action buttons
- Keyboard shortcuts for common actions

**Security Considerations**:
- User-scoped task queries only
- Action authorization checks
- Secure pagination tokens
- Input sanitization for search/filter

### 2.7 Create Task (`/tasks/new`)

**Main Purpose**: Add new recurring task with complete configuration

**Key Information**:
- Task title and description inputs
- Recurrence interval configuration
- Optional day-of-week preferences
- Next due date preview

**Key Components**:
- `TaskForm` with multi-section layout
- `IntervalPicker` for time period selection
- `DaySelector` with visual week calendar
- `NextDueDatePreview` with live calculation
- `FormActions` with save/cancel options

**UX Considerations**:
- Logical form section progression
- Real-time preview of scheduling results
- Smart defaults for common intervals
- Clear validation feedback
- Unsaved changes protection

**Accessibility Considerations**:
- Fieldset groupings for related inputs
- Required field indicators
- Error messages associated with inputs
- Keyboard navigation through complex selectors
- Screen reader friendly date calculations

**Security Considerations**:
- Server-side validation of all inputs
- CSRF protection on form submission
- Input sanitization and validation
- User authorization for task creation

### 2.8 Edit Task (`/tasks/[id]/edit`)

**Main Purpose**: Modify existing task parameters with impact awareness

**Key Information**:
- Current task configuration pre-filled
- Impact warnings for schedule changes
- Task action history display
- Deletion options

**Key Components**:
- `TaskForm` pre-populated with current values
- `ScheduleImpactNotice` for change consequences
- `TaskHistory` showing previous actions
- `DeleteTaskSection` in danger zone
- `UnsavedChangesDialog` for navigation protection

**UX Considerations**:
- Clear indication of pre-filled vs modified values
- Warning about future occurrence changes
- Confirmation dialogs for destructive actions
- Easy navigation back to task list
- Change preview before saving

**Accessibility Considerations**:
- Form modification announcements
- Clear delete button labeling with task context
- Warning messages properly associated
- Confirmation dialog focus management
- History information accessible to screen readers

**Security Considerations**:
- Task ownership validation
- Secure task ID verification
- Authorization for modifications
- Audit trail for changes

### 2.9 Help (`/help`)

**Main Purpose**: Provide task suggestions and answer common questions

**Key Information**:
- Categorized task template library
- Pre-configured interval suggestions
- FAQ sections with searchable content
- Quick-add functionality for templates

**Key Components**:
- `TaskTemplateCategories` with expandable sections
- `TemplateCard` components with add buttons
- `FAQSection` with collapsible questions
- `TemplateSearch` for finding specific suggestions
- `QuickActions` for common help tasks

**UX Considerations**:
- Easy browsing of template categories
- Clear template descriptions with context
- Search functionality within templates
- One-click template adoption
- FAQ organization by user journey stage

**Accessibility Considerations**:
- Expandable sections with proper ARIA states
- Search results announced to screen readers
- Template cards as actionable list items
- FAQ navigation with heading structure
- Clear add button context for each template

**Security Considerations**:
- Public template data with user-specific actions
- Secure template import functionality
- Rate limiting on template additions
- User authorization for task creation from templates

### 2.10 Profile/Settings (`/profile`)

**Main Purpose**: Manage user account and view usage statistics

**Key Information**:
- Account details and verification status
- Task creation and completion statistics
- Account management options
- Data export capabilities (future)

**Key Components**:
- `ProfileInfo` displaying account details
- `TaskStatistics` dashboard with completion metrics
- `AccountSettings` for configuration changes
- `DangerZone` for account deletion

**UX Considerations**:
- Clear statistics visualization
- Secure account deletion process
- Helpful statistics interpretation
- Easy navigation back to main app
- Progressive disclosure of advanced options

**Accessibility Considerations**:
- Statistics presented in accessible formats
- Clear account deletion warnings
- Screen reader friendly data visualizations
- Proper heading hierarchy for sections
- Focus management in danger zone actions

**Security Considerations**:
- Profile data scoped to authenticated user
- Secure account deletion with confirmation
- Password verification for sensitive changes
- Audit logging for account modifications

## 3. User Journey Map

### 3.1 New User Registration & Onboarding

1. **Entry Point**: User arrives at login page or application root
2. **Registration**: `/register` → Form completion → Email verification notice
3. **Email Verification**: `/verify-email` → Click verification link → Account activation
4. **First Login**: `/login` → Credential entry → Redirect to dashboard
5. **Onboarding Discovery**: Dashboard displays onboarding section for new users
6. **Template Selection**: Browse categories → Select relevant templates → One-click import
7. **First Tasks**: Dashboard now shows imported tasks → User can take immediate actions
8. **Task Creation**: Optional custom task creation via `/tasks/new`

### 3.2 Returning User Daily Workflow

1. **Authentication**: `/login` → Credential entry → Dashboard redirect
2. **Status Review**: Dashboard overview of overdue and upcoming tasks
3. **Task Actions**: Complete or skip overdue tasks with immediate feedback
4. **Task Management**: Navigate to `/tasks` for comprehensive task management
5. **Task Updates**: Edit existing tasks via `/tasks/[id]/edit` as needed

### 3.3 Task Management Workflow

1. **Task Creation**: From dashboard or task list → `/tasks/new` → Form completion → Save
2. **Task Editing**: From task list → Select task → `/tasks/[id]/edit` → Modify → Update
3. **Task Deletion**: From edit view → Delete button → Confirmation → Removal
4. **Bulk Management**: From task list → Select multiple → Apply actions (future feature)

### 3.4 Help & Discovery Workflow

1. **Help Access**: From any authenticated page → Help navigation → `/help`
2. **Template Browsing**: Explore categories → Review suggestions → Select templates
3. **Template Import**: Click add button → Pre-fills task creation → Customize if needed

### 3.5 Error Recovery Workflows

1. **Network Errors**: Automatic retry → Manual retry button → Success feedback
2. **Form Validation**: Inline error display → Field correction → Re-validation
3. **Authentication Errors**: Error message → Redirect to login → Resume intended action
4. **Action Failures**: Error toast → Retry option → Alternative action suggestion

## 4. Layout and Navigation Structure

### 4.1 Top Navigation

**Desktop Layout**:
- Left side: Logo (always links to Dashboard)
- Center: Primary navigation items (Dashboard, Tasks, Help)
- Right side: User menu dropdown (Profile, Settings, Logout)

**Mobile Layout**:
- Hamburger menu icon revealing collapsible navigation
- Logo remains visible as home link
- User avatar/menu accessible from top bar
- Navigation items stack vertically in mobile menu

### 4.2 Navigation Hierarchy

**Primary Navigation**:
- **Dashboard** (`/`) - Central hub for task status and actions
- **Tasks** (`/tasks`) - Complete task management interface  
- **Help** (`/help`) - Task suggestions and support resources

**Secondary Navigation**:
- User Profile (`/profile`) - Account management and statistics
- Task Creation (`/tasks/new`) - Accessible from dashboard and task list
- Task Editing (`/tasks/[id]/edit`) - Contextual access from task displays

**Utility Navigation**:
- Logout functionality in user menu
- Back buttons on form pages with unsaved changes protection
- Breadcrumb navigation for deep pages

### 4.3 URL Structure and Deep Linking

- **Root Level**: `/` (Dashboard), `/tasks` (Task List), `/help` (Help)
- **Task Management**: `/tasks/new` (Create), `/tasks/[id]/edit` (Edit)  
- **Authentication**: `/login`, `/register`, `/reset-password`, `/verify-email`
- **User Management**: `/profile`, `/settings` (future)
- **Query Parameters**: Sorting and pagination on task list (`?sort=due_date&page=2`)

### 4.4 Navigation States

**Active State Indicators**:
- Current page highlighted in navigation
- Breadcrumb trails for sub-pages
- Visual distinction for active navigation items

**Navigation Behavior**:
- Smooth transitions between pages
- Loading states during navigation
- Back button handling with form protection
- Deep linking preservation for bookmarking

## 5. Key Components

### 5.1 TaskCard

**Purpose**: Flexible task display component used across multiple views
**Variants**: Dashboard cards (with actions), List view cards, Preview cards
**Props**: Task data, available actions, display context, loading states
**Behavior**: Responsive layout, hover states, action button visibility, accessibility focus management

### 5.2 TaskForm

**Purpose**: Reusable form component for task creation and editing
**Features**: Multi-section layout, real-time validation, preview functionality, interval picker integration
**Validation**: Client-side with react-hook-form, server-side confirmation, inline error display
**Accessibility**: Proper fieldset groupings, error associations, keyboard navigation

### 5.3 Navigation

**Purpose**: Consistent navigation experience across all views
**Components**: TopNavigation, MobileMenu, UserMenu, Breadcrumbs
**Behavior**: Responsive collapse, active state management, dropdown interactions
**Accessibility**: Keyboard navigation, screen reader support, focus management

### 5.4 LoadingStates

**Purpose**: Consistent loading feedback across the application
**Variants**: Skeleton screens for content, spinner buttons for actions, progress indicators for multi-step processes
**Implementation**: React Suspense integration, loading state management, error boundary integration

### 5.5 ErrorHandling

**Purpose**: Unified error display and recovery mechanisms
**Components**: ErrorBoundary, ToastNotifications, InlineErrors, RetryButtons
**Behavior**: Contextual error messages, recovery action suggestions, automatic retry for network issues

### 5.6 FormElements

**Purpose**: Consistent form inputs with validation support
**Components**: TextInput, NumberInput, Dropdown, DayPicker, IntervalPicker
**Features**: Built-in validation, accessibility compliance, responsive design, error state management

### 5.7 EmptyStates

**Purpose**: Helpful guidance when content is unavailable
**Variants**: No tasks created, no overdue tasks, no search results, first-time user states
**Content**: Contextual illustrations, explanatory text

### 5.8 ConfirmationDialogs

**Purpose**: User confirmation for destructive or significant actions
**Uses**: Task deletion, account deletion, unsaved changes, bulk actions
**Features**: Clear action description, cancel/confirm options, keyboard handling, focus management
