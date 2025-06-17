# BenchMark My Website

A powerful tool to test how well AI agents can navigate and interact with your website. Get detailed performance metrics, execution times, and actionable insights to improve your website's AI-friendliness.

![BenchMark My Website](https://via.placeholder.com/800x400/2563eb/ffffff?text=BenchMark+My+Website)

## ✨ Features

- 🚀 **Lightning Fast**: Get benchmark results in seconds with optimized AI agent testing
- 📊 **Detailed Analytics**: Comprehensive metrics including execution time, success rates, and error logs
- 📱 **Modern UI**: Beautiful, responsive design built with Tailwind CSS
- 🔐 **Secure Authentication**: User accounts and data protection with Supabase
- 📸 **Screenshot Capture**: Visual evidence of AI agent interactions
- 🌐 **Cross-Platform**: Works with any website URL
- 📈 **Progress Tracking**: Historical data and performance trends

## 🛠 Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: FastAPI (Python) with real BrowserUse library
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for screenshots)
- **AI/Automation**: [BrowserUse](https://github.com/browser-use/browser-use) with LangChain & Playwright

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+ (for BrowserUse)
- A Supabase project
- An OpenAI API key or Anthropic API key (for BrowserUse)

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd benchmark-my-website
npm install
npx playwright install
\`\`\`

### 2. Environment Setup

Create a \`.env.local\` file in the root directory:

\`\`\`env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration (for BrowserUse)
OPENAI_API_KEY=your_openai_api_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### 3. Database Setup

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the SQL commands from \`supabase-schema.sql\` to set up the database schema

### 4. Set up Python Backend

\`\`\`bash
cd python-backend
pip install -r requirements.txt
playwright install chromium --with-deps --no-shell
\`\`\`

Create a `.env` file in the `python-backend` directory with your API keys.

### 5. Start Both Services

**Terminal 1 - Python Backend:**
\`\`\`bash
cd python-backend
python main.py
\`\`\`

**Terminal 2 - NextJS Frontend:**
\`\`\`bash
npm run dev
\`\`\`

Visit [http://localhost:3000](http://localhost:3000) to see the application.
The Python API runs on [http://localhost:8000](http://localhost:8000).

## 📋 Usage

### Running a Benchmark Test

1. **Sign Up/Sign In**: Create an account or log in to get started
2. **Enter Website URL**: Input the website you want to test
3. **Describe the Task**: Tell the AI what it should try to accomplish
4. **Run the Test**: Click "Run Benchmark Test" and wait for results
5. **View Results**: See detailed metrics, screenshots, and logs

### Common Test Scenarios

- **Navigation Tests**: "Find the contact page", "Navigate to pricing"
- **Search Functionality**: "Search for a specific product"
- **Form Interactions**: "Fill out the contact form"
- **Account Operations**: "Find login page", "Locate account settings"
- **E-commerce**: "Add item to cart", "Find checkout process"

## 🔧 Configuration

### Customizing AI Behavior

The AI agent behavior can be customized by modifying the \`BrowserUseService\` class in \`src/lib/browser-use.ts\`. You can:

- Add new task patterns
- Modify element selectors
- Adjust timeout values
- Customize success criteria

### Database Schema

The application uses the following main tables:

- \`profiles\`: User profile information
- \`benchmarks\`: Test results and metrics
- \`benchmark-screenshots\` (storage): Screenshot images

## 📊 Understanding Results

### Metrics Explained

- **Success Rate**: Whether the AI agent completed the task
- **Execution Time**: Total time from start to completion
- **Error Messages**: Detailed error information if the test failed
- **Browser Logs**: Console logs, network errors, and other browser events
- **Screenshots**: Visual evidence of the final state

### Performance Indicators

- ✅ **Success + Fast**: Your website is AI-friendly
- ✅ **Success + Slow**: Task completed but could be optimized
- ❌ **Failure + Error**: Specific issues need to be addressed
- ❌ **Timeout**: Website may be too complex or slow

## 🚀 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Docker Deployment

\`\`\`dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
\`\`\`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: \`git checkout -b feature/amazing-feature\`
3. Commit your changes: \`git commit -m 'Add amazing feature'\`
4. Push to the branch: \`git push origin feature/amazing-feature\`
5. Open a Pull Request

## 📝 API Documentation

### POST /api/benchmark

Run a new benchmark test.

**Request Body:**
\`\`\`json
{
  "websiteUrl": "https://example.com",
  "taskDescription": "Find the contact form",
  "userId": "user-uuid"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "id": "benchmark-uuid",
    "success": true,
    "executionTimeMs": 5432,
    "screenshotUrl": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
\`\`\`

### GET /api/benchmark?userId=uuid

Fetch benchmark history for a user.

## 🐛 Troubleshooting

### Common Issues

1. **Playwright Installation**: Run \`npx playwright install\` if you see browser errors
2. **Environment Variables**: Double-check all required env vars are set
3. **Supabase Setup**: Ensure RLS policies are properly configured
4. **Port Conflicts**: Change the port if 3000 is already in use

### Browser Issues

- Some websites may block automated browsers
- Consider using different browser types (Chrome, Firefox, Safari)
- Adjust timeout values for slow websites

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [BrowserUse](https://github.com/browser-use/browser-use) for AI browser automation
- [Supabase](https://supabase.com) for backend services
- [Playwright](https://playwright.dev) for browser automation
- [Next.js](https://nextjs.org) for the amazing framework
- [Tailwind CSS](https://tailwindcss.com) for beautiful styling

## 📞 Support

If you have any questions or need help:

1. Check the [FAQ](docs/FAQ.md)
2. Search existing [GitHub Issues](issues)
3. Create a new issue if needed
4. Join our [Discord Community](https://discord.gg/...)

---

**Made with ❤️ for better AI-website compatibility**
