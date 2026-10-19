# 🎨 Intelligent Support Platform Frontend

Intelligent Support Platform Frontend is a modern Angular application that provides a user-friendly interface for the intelligent support platform. It features JWT authentication, AI-powered ticket analysis, conversational AI agent, real-time streaming, and comprehensive dashboard capabilities with role-based access control.

## ✨ Key Features

- **JWT Authentication**: Secure login with access and refresh token management.
- **Role-Based Access Control**: Different features for ADMIN and USER roles.
- **AI-Powered Ticket Analysis**: Integration with FastAPI service for intelligent ticket categorization and analysis.
- **Conversational AI Agent**: Interactive chat interface for ticket management with tool-driven AI assistance.
- **Real-Time Streaming**: Server-Sent Events (SSE) for real-time progress updates during bulk ticket creation.
- **Multi-Format File Support**: Upload and process tickets from TXT, CSV, DOCX, and PDF files.
- **Dashboard**: Comprehensive dashboard with ticket management, statistics, and user administration.
- **Statistics Visualization**: Interactive charts using Chart.js for ticket analytics.
- **File Attachments**: Supabase integration for storing and managing ticket attachments.
- **PDF Export**: Generate PDF reports using jsPDF with auto-table support.
- **Responsive Design**: Mobile-first responsive design using Tailwind CSS.
- **Zoneless Performance**: Optimized with Angular's zoneless change detection.

## 🧰 Technology Stack

- **Angular 20.2.0**: Modern web framework with standalone components
- **TypeScript 5.9.2**: Type-safe JavaScript superset
- **Tailwind CSS 4.3.2**: Utility-first CSS framework for styling
- **Angular CDK 20.2.0**: Component Development Kit for advanced UI patterns
- **Chart.js 4.5.1**: Charting library for data visualization
- **ng2-charts 9.0.0**: Angular wrapper for Chart.js
- **jsPDF 3.0.2**: PDF generation library
- **jsPDF-autotable 5.0.2**: Auto-table plugin for jsPDF
- **Supabase SDK 2.110.7**: Backend-as-a-Service for file storage
- **RxJS 7.8.0**: Reactive programming library
- **Nginx**: Web server for production deployment
- **Docker**: Containerization for consistent deployment

## 🏗️ Architecture

The project follows Angular's best practices with a modular structure:

- **src/app/components**:
  - **pages**: Route components (login, register, dashboard, create-ticket, agent-chat, etc.)
  - **layout**: Layout components (app-shell, navigation, sidebar)
  - **shared**: Reusable UI components
- **src/app/services**: Business logic and API communication
- **src/app/guards**: Route protection (auth, no-auth, role)
- **src/app/models**: TypeScript interfaces and data models
- **src/app/config**: Application configuration
- **src/environments**: Environment-specific configuration

## 💼 Main Business Modules

### 🔐 Authentication & Authorization

- **Login/Registration**: Secure authentication with JWT tokens
- **Password Reset**: Forgot password and reset password flows
- **Token Management**: Automatic token refresh with interceptors
- **Route Guards**: Protect routes based on authentication status and user roles
- **Role-Based Access**: Admin-only routes and features

### 🎫 Ticket Management

- **Ticket Dashboard**: View and manage tickets with filtering and pagination
- **Create Ticket**: Manual ticket creation with optional AI analysis
- **File Upload**: Bulk ticket creation from multiple file formats
- **Real-Time Progress**: SSE streaming for bulk upload progress
- **Ticket Details**: View complete ticket information with AI analysis
- **Ticket Status**: Track ticket status (OPEN, IN_PROGRESS, RESOLVED, CLOSED)

### 🤖 AI-Powered Features

- **Ticket Analysis**: Automatic categorization, priority assignment, sentiment analysis
- **Conversational Agent**: AI chat interface for interactive ticket management
- **Keyword Extraction**: Automatic keyword extraction from ticket content
- **Confidence Scoring**: AI confidence levels for analysis results
- **Advice Generation**: Resolution suggestions from AI analysis

### 📊 Dashboard & Analytics

- **Ticket Statistics**: Visual overview of ticket metrics
- **Charts**: Interactive charts for status, category, priority distribution
- **User Management** (Admin): View and manage platform users
- **Performance Metrics**: Track key performance indicators

### 👤 User Profile

- **Profile Management**: Update user information
- **Profile Photo**: Upload and manage profile pictures via Supabase
- **Role Display**: Show user role and permissions

### 📎 File Management

- **Supabase Integration**: Store and retrieve files from Supabase storage
- **Attachment Support**: Attach files to tickets
- **Multiple Formats**: Support for various file types
- **Secure Upload**: Authenticated file uploads

## 🌐 Application Routes

### Public Routes
- `/login` - User login page
- `/register` - User registration page
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset with token

### Protected Routes
- `/dashboard/tickets` - Ticket management dashboard
- `/dashboard/statistics` - Statistics and analytics dashboard
- `/dashboard/users` - User management (Admin only)
- `/create-ticket` - Create new ticket
- `/agent` - AI conversational agent
- `/profile` - User profile management

## 🎨 UI/UX Features

- **Responsive Design**: Mobile-first design that works on all devices
- **Modern UI**: Clean, intuitive interface with Tailwind CSS
- **Loading States**: Visual feedback during async operations
- **Error Handling**: User-friendly error messages and notifications
- **Form Validation**: Client-side validation with Angular forms
- **Accessibility**: WCAG-compliant UI components
- **Dark Mode Support**: Theme switching capability

## ⚙️ Configuration

### Environment Configuration

Environment variables are configured in `src/environments/`:

**Development** (`environment.ts`):
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8081',
  aiUrl: 'http://localhost:8000',
  supabase: {
    url: 'your-supabase-url',
    anonKey: 'your-anon-key',
    bucket: 'support-images',
  },
};
```

**Production** (`environment.prod.ts`):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://your-backend-api.com',
  aiUrl: 'https://your-ai-service.com',
  supabase: {
    url: 'your-supabase-url',
    anonKey: 'your-anon-key',
    bucket: 'support-images',
  },
};
```

### API Configuration

Backend API endpoints are configured in `src/app/config/api.config.ts`:
- `API_BASE_URL`: Spring Boot backend URL
- `AI_BASE_URL`: FastAPI AI service URL

## ✅ Prerequisites

- Node.js 20 or higher
- npm or yarn package manager
- Angular CLI (installed via npm)
- Access to the backend services (Spring Boot and FastAPI)
- Supabase project for file storage

## 🚀 Run Locally

### Clone the repository

```bash
git clone https://github.com/aminejguirim10/intelligent-support-platform-frontend.git
cd intelligent-support-platform-frontend
```

### Install dependencies

```bash
npm install
```

### Configure environment

Edit `src/environments/environment.ts` with your local configuration:
- Update `apiUrl` to point to your Spring Boot backend
- Update `aiUrl` to point to your FastAPI AI service
- Configure Supabase credentials

### Run development server

```bash
npm start
# or
ng serve
```

The application will be available at http://localhost:4200

### Build for production

```bash
npm run build
# or
ng build --configuration=production
```

The production build will be in the `dist/` directory.

### Run tests

```bash
npm test
# or
ng test
```

## 🐳 Docker

The repository includes a multi-stage Dockerfile for production deployment.

### Build the image

```bash
docker build -t intelligent-support-platform-frontend .
```

### Run the container

```bash
docker run --rm -p 80:80 intelligent-support-platform-frontend
```

The application will be available at http://localhost

### Docker Configuration

- **Multi-stage build**: Separate build and runtime stages for optimized image size
- **Nginx**: Serves the static Angular application
- **Gzip compression**: Enabled for better performance
- **Cache control**: Static assets cached for 1 year with immutable flag
- **SPA routing**: Nginx configured for Angular client-side routing

## 📌 Performance Optimizations

- **Zoneless Change Detection**: Angular's zoneless mode for improved performance
- **Lazy Loading**: Routes configured for lazy loading (future enhancement)
- **Tree Shaking**: Dead code elimination in production builds
- **AOT Compilation**: Ahead-of-Time compilation for faster rendering
- **Budgets**: Build budgets configured to prevent bundle size bloat
- **Asset Optimization**: Images and fonts optimized during build
- **HTTP Interceptors**: Centralized token management and error handling

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Token Refresh**: Automatic token refresh before expiration
- **Route Guards**: Protection of authenticated and role-based routes
- **HTTP Interceptors**: Automatic token injection in API requests
- **Secure Storage**: Tokens stored in localStorage (consider HttpOnly cookies for production)
- **CORS Configuration**: Proper CORS setup for API communication
- **Input Validation**: Client-side validation for all forms
- **Supabase Security**: Secure file upload with proper bucket policies

## 📊 Statistics & Visualization

The dashboard includes interactive charts powered by Chart.js:

- **Ticket Status Distribution**: Pie chart showing ticket by status
- **Category Breakdown**: Bar chart for ticket categories
- **Priority Analysis**: Visual representation of ticket priorities
- **Time-based Trends**: Line charts for ticket creation over time
- **PDF Export**: Export statistics as PDF reports

## 🤝 Contributing

1. Create a feature branch
2. Implement your changes following Angular best practices
3. Ensure code follows the existing style guide
4. Test your changes thoroughly
5. Update documentation as needed
6. Open a pull request with a clear description

## 🧪 Testing

The project is configured with Karma and Jasmine for unit testing:

```bash
# Run unit tests
npm test

# Run tests with coverage
ng test --code-coverage

# Run e2e tests (if configured)
ng e2e
```

## 📦 Build Configuration

### Production Build Settings

- **Output Hashing**: All files hashed for cache busting
- **Source Maps**: Disabled in production
- **Optimization**: Enabled for minification and tree shaking
- **Budgets**:
  - Initial bundle: 500kB warning, 2MB error
  - Component styles: 4kB warning, 30kB error

### Development Build Settings

- **Optimization**: Disabled for faster builds
- **Source Maps**: Enabled for debugging
- **Extract Licenses**: Disabled

## 🌐 Browser Support

The application supports modern browsers:
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 📄 Code Style

The project uses Prettier for code formatting:
- Print width: 100 characters
- Single quotes for strings
- Angular parser for HTML files

## � Collaborators

- Mohamed Amine Jguirim
- Fares Tekaya
- Firas Hizem

## 📄 License

This project is part of the Intelligent Support Platform internship project.

## �🔗 Related Projects

- [Backend Service](https://github.com/aminejguirim10/intelligent-support-platform-backend) - Spring Boot REST API
- [AI Service](https://github.com/aminejguirim10/intelligent-support-platform-ai) - FastAPI AI Analysis Service
