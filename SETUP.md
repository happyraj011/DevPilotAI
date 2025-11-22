# Quick Setup Guide

## One-Time Setup

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
npm run prisma:generate
npm run prisma:migrate
# Enter migration name: init
npm run dev
```

### 2. Frontend Setup

```bash
# From project root
npm install
npm run dev
```

## Running the Application

1. **Backend** should be running on `http://localhost:3001`
2. **Frontend** should be running on `http://localhost:3000`

## Testing

1. Open `http://localhost:3000` in your browser
2. Enter a prompt: "Write a Python function to reverse a string"
3. Select language: Python
4. Click "Generate Code"
5. View the generated code and check the history panel

## Troubleshooting

- **Backend won't start**: Check that PORT 3001 is not in use
- **Database errors**: Run `npm run prisma:migrate` again
- **OpenAI errors**: Verify your API key in `.env` file
- **Frontend can't connect**: Check `NEXT_PUBLIC_API_URL` in `.env.local` or ensure backend is running


