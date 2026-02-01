<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# EstateFlow Pro

A comprehensive real estate management platform built with React, TypeScript, and Appwrite.

## 🚀 Features

- **Project Management**: Track real estate projects from start to finish
- **Document Management**: Secure document storage and management
- **Task Management**: Organize and assign tasks across projects
- **User Management**: Role-based access control (Admin, Agent, Buyer, Seller)
- **Form Builder**: Dynamic form creation with AI assistance
- **Contract Management**: Create and manage contracts
- **Real-time Collaboration**: Multi-user project collaboration

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Appwrite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: SurveyJS
- **PDF Generation**: jsPDF
- **AI**: Google Gemini API

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Appwrite account and project
- Gemini API key (optional, for AI features)

## 🏃 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd estately
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your configuration:

```env
# Gemini API (for AI features)
VITE_GEMINI_API_KEY=your_gemini_api_key

# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id

# Add other required environment variables
```

### 4. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run type-check` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run validate` | Run all checks (type-check, lint, format) |
| `npm run analyze` | Analyze bundle size |

## 🏗️ Project Structure

```
estately/
├── components/          # Reusable UI components
│   ├── form-builder/   # Form builder components
│   └── ...
├── views/              # Page-level components
├── contexts/           # React contexts (Auth, etc.)
├── services/           # API and service integrations
│   ├── appwrite.ts    # Appwrite configuration
│   ├── geminiService.ts
│   └── ...
├── utils/              # Utility functions
├── types.ts            # TypeScript type definitions
├── constants.tsx       # Application constants
└── App.tsx            # Main application component
```

## 🔧 Development Guidelines

### Code Quality

This project uses:
- **TypeScript** for type safety
- **ESLint** for code linting
- **Prettier** for code formatting
- **Husky** for pre-commit hooks
- **lint-staged** for staged file linting

### Before Committing

Run validation to ensure code quality:

```bash
npm run validate
```

This will:
1. Check TypeScript types
2. Run ESLint
3. Check code formatting

### VSCode Setup

Install recommended extensions when prompted. The workspace is configured with:
- Auto-formatting on save
- ESLint integration
- TypeScript support
- Tailwind CSS IntelliSense

## 🎨 Code Style

- Use **functional components** with hooks
- Follow **TypeScript strict mode**
- Use **Tailwind CSS** for styling
- Write **clear, descriptive** variable names
- Add **JSDoc comments** for complex functions
- Keep components **small and focused**

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## 🔐 Environment Variables

Required environment variables:

| Variable | Description |
|----------|-------------|
| `VITE_GEMINI_API_KEY` | Google Gemini API key for AI features |
| `VITE_APPWRITE_ENDPOINT` | Appwrite API endpoint |
| `VITE_APPWRITE_PROJECT_ID` | Appwrite project ID |
| `VITE_APPWRITE_DATABASE_ID` | Appwrite database ID |

See `.env.example` for complete list.

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm test -- --watch
```

## 📊 Bundle Analysis

Analyze bundle size:

```bash
npm run analyze
```

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Appwrite](https://appwrite.io/) - Backend as a Service
- [React](https://react.dev/) - UI Framework
- [Vite](https://vitejs.dev/) - Build Tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS Framework
- [SurveyJS](https://surveyjs.io/) - Form Builder
- [Lucide](https://lucide.dev/) - Icon Library

## 📧 Support

For support, please open an issue in the GitHub repository.

---

**View in AI Studio**: https://ai.studio/apps/drive/1eDwT-oibi7PAS0gaI1WfhfcF44bi_Mvg

Made with ❤️ by the EstateFlow Team
