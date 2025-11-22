# Code Generation Copilot

A full-stack web application that generates code from natural language prompts using AI.

## 🚀 Quick Start

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
npm install
```

2. Create `.env` file:
```
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=your_postgresql_connection_string
PORT=3001
```

3. Setup database:
```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Start server:
```bash
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

## 📄 License

MIT
