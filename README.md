# Chronos - Cykliczne Zadania

A minimalist web application (MVP) designed to help users manage rarely recurring tasks and obligations. The main goal of the product is to solve the specific problem of forgetting about activities that need to be performed at long, irregular intervals (e.g., every few months or once a year).

## Project Description

Chronos focuses on simplicity, clarity, and handling one key task: reliable reminders for recurring obligations. It's a tool designed for individual users to manage mainly household and personal tasks.

The application addresses the problem where users have difficulty remembering tasks that are not part of their daily routine. Standard tools like calendars or to-do applications often don't work well in this context, as calendars can be cluttered with meetings, causing household task notifications to get lost in the information overload.

## Tech Stack

### Frontend
- **[Astro 5](https://astro.build/)** - Fast, efficient pages and applications with minimal JavaScript
- **[React 19](https://react.dev/)** - Interactive components where needed
- **[TypeScript 5](https://www.typescriptlang.org/)** - Static typing and better IDE support
- **[Tailwind 4](https://tailwindcss.com/)** - Utility-first CSS framework for styling
- **[Shadcn/ui](https://ui.shadcn.com/)** - Accessible React component library

### Backend
- **[Supabase](https://supabase.com/)** - Complete backend solution providing:
  - PostgreSQL database
  - Multi-language SDK as Backend-as-a-Service
  - Built-in user authentication
  - Open source solution with self-hosting options

### AI Integration
- **[Openrouter.ai](https://openrouter.ai/)** - Access to various AI models (OpenAI, Anthropic, Google, etc.)
  - Cost-effective solution with API key financial limits
  - Wide range of models for optimal efficiency

### CI/CD & Hosting
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD pipeline creation
- **[Cloudflare Pages](https://pages.cloudflare.com/)** - Application hosting with edge computing
  - Automatic deployments from master branch
  - Global CDN distribution
  - Built-in SSL/TLS certificates
  - See [Cloudflare Deployment Guide](docs/cloudflare-deployment.md) for setup details

## Getting Started Locally

### Prerequisites
- Node.js 22.14.0 (see `.nvmrc`)
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd chronos
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Create .env file with required Supabase and Openrouter.ai configuration
# (Environment variables configuration details to be added)
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run astro` - Run Astro CLI commands
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run test` - Run the Vitest suite (jsdom + shared setup)
- `npm run test:watch` - Watch and rerun Vitest on file saves
- `npm run test:ui` - Open the Vitest UI explorer
- `npm run test:e2e` - Execute Playwright (Chromium/Chrome) suites
- `npm run test:e2e:headed` - Run Playwright in headed mode for troubleshooting
- `npm run test:e2e:codegen` - Launch Playwright codegen for recording

## Testing

- See `docs/testing-environment.md` for how we align the stack described in `.ai/tech-stack.md` with the Vitest and Playwright guidelines stored under `.cursor/rules/`.
- Vitest uses `jsdom`, inline snapshots, and the shared setup file (`src/tests/setup/vitest.setup.ts`) so that React components render with the same environment used in development.
- Playwright is locked to Chromium/Chrome, uses browser contexts by default, and emits traces/videos/screenshots to `tests/e2e/test-results` to help debug per the `.cursor/rules/playwright-testing-rules.mdc` guidelines.

## Project Scope

### MVP Features
- **User Account Management**: Registration, email verification, login/logout, password recovery, account deletion
- **Task Management (CRUD)**: Create, read, update, delete tasks with titles and descriptions
- **Scheduling System**: Set recurrence intervals (days, weeks, months, years) with optional weekday enforcement
- **Dashboard Interface**: Overview of overdue and upcoming tasks (next 7 days)
- **Task Lifecycle**: Mark tasks as completed or skipped, automatic next occurrence calculation
- **Onboarding**: Suggested task templates for new users
- **Help System**: FAQ and task suggestions

### Out of Scope (Post-MVP)
- External calendar integrations (Google Calendar, Outlook)
- Native mobile applications (iOS, Android)
- Notification systems (email, push, SMS)
- Snooze functionality
- Task attachments
- Task sharing and team collaboration
- Advanced recurrence options

## API Documentation

The application provides a REST API for task management. See detailed API documentation:

- **[Create Task API Examples](.ai/api-examples-create-task.md)** - Complete testing guide for POST /api/tasks endpoint

### Available Endpoints

#### Tasks
- `POST /api/tasks` - Create a new recurring task
  - **Authentication**: Required (Bearer token)
  - **Input**: CreateTaskCommand (title, interval_value, interval_unit, description, preferred_day_of_week)
  - **Output**: TaskDTO with calculated next_due_date

For more endpoints documentation (coming soon):
- `GET /api/tasks` - List all user tasks
- `GET /api/tasks/:id` - Get specific task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/complete` - Mark task as completed
- `POST /api/tasks/:id/skip` - Mark task as skipped

## Project Status

**Current Status**: MVP in development

### Success Metrics
- **Activation**: >40% of newly registered users create at least 5 tasks within 7 days of registration
- **Engagement**: >70% of overdue tasks are marked as "completed" or "skipped" monthly
- **Retention**: User return rates after 7 days (short-term) and 30 days (long-term) from registration

### User Stories
The project implements 15 core user stories (US-001 to US-015) covering:
- User registration and authentication
- Task management operations
- Dashboard functionality
- Help and account management

## License

[License information to be added]

---

For detailed product requirements and user stories, see the [Product Requirements Document](.ai/prd.md).