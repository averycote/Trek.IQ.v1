# 🗺️ Trek.IQ - Accessibility-Focused Routing for Halifax

A comprehensive web application for accessible routing and data visualization in Halifax, Nova Scotia. Trek.IQ helps users plan accessible routes with real-time barrier detection and navigation assistance.

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18.0.0 or higher)
- **npm** (v8.0.0 or higher)
- **Git**

### System Requirements

- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB free space
- **Network**: Internet connection for Mapbox tiles and external APIs

## 📋 Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd trek-iq
```

### 2. Install Dependencies

**Option A: Install all dependencies at once (Recommended)**
```bash
npm run install:all
```

**Option B: Install dependencies manually**
```bash
# Root dependencies
npm install

# Server dependencies
cd server
npm install

# Client dependencies
cd ../client
npm install
cd ..
```

### 3. Environment Configuration

#### Server Environment Setup

1. **Copy the environment template:**
```bash
cd server
cp env.example .env
```

2. **Edit `.env` file with your configuration:**
```bash
# Required: Server Configuration
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Required: Admin Authentication (change these!)
ADMIN_USER=your-admin-username
ADMIN_PASS=your-secure-password

# Optional: Email Configuration (for barrier reporting)
CITY_EMAIL=accessibility@halifax.ca
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

#### Client Environment Setup

1. **Create client environment file:**
```bash
cd client
touch .env
```

2. **Add Mapbox access token to `client/.env`:**
```bash
REACT_APP_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
```

**Getting a Mapbox Access Token:**
1. Go to [Mapbox](https://www.mapbox.com/)
2. Create a free account
3. Navigate to Account → Access Tokens
4. Create a new token with `styles:read` and `styles:tiles` scopes
5. Copy the token to your `.env` file

### 4. Database Setup

The application uses SQLite and will automatically create the database on first run. No manual setup required.

## 🏃‍♂️ Running the Application

### Development Mode (Recommended)

**Start both server and client simultaneously:**
```bash
npm run dev
```

This will start:
- **Backend Server**: `http://localhost:3001`
- **Frontend Client**: `http://localhost:3000`

### Alternative: Run Components Separately

**Start server only:**
```bash
npm run server
# or
cd server && npm run dev
```

**Start client only:**
```bash
npm run client
# or
cd client && npm start
```

### Production Build

**Build the client for production:**
```bash
npm run build
```

**Start production server:**
```bash
cd server
npm start
```

## 🌐 Accessing the Application

### Development URLs

- **Main Application**: http://localhost:3001
- **Client Development**: http://localhost:3000
- **API Endpoints**: http://localhost:3001/api/*

### Default Credentials

- **Admin Username**: `admin` (or as configured in `.env`)
- **Admin Password**: `changeme` (or as configured in `.env`)

## 🛠️ Development Workflow

### Project Structure

```
trek-iq/
├── client/                 # React frontend
│   ├── public/            # Static assets
│   ├── src/               # Source code
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   ├── pages/         # Page components
│   │   └── ...
│   └── package.json
├── server/                # Express backend
│   ├── routes/           # API routes
│   ├── data/             # Database and data files
│   ├── middleware/       # Express middleware
│   └── package.json
├── package.json          # Root package.json
└── README.md
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start both server and client in development mode |
| `npm run server` | Start only the backend server |
| `npm run client` | Start only the frontend client |
| `npm run build` | Build client for production |
| `npm run install:all` | Install all dependencies |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests |
| `npm run test:e2e` | Run end-to-end tests |

### Development Tips

1. **Hot Reloading**: Both client and server support hot reloading
2. **Proxy Configuration**: Client automatically proxies API calls to server
3. **Database**: SQLite database is created automatically in `server/data/`
4. **Logs**: Check console for detailed logging

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use
```bash
# Kill processes on ports 3000 and 3001
netstat -ano | findstr :3000
netstat -ano | findstr :3001
taskkill /F /PID <PID>
```

#### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Map Not Loading
1. Check Mapbox token in `client/.env`
2. Verify internet connection
3. Check browser console for errors

#### Database Issues
```bash
# Remove database and restart
cd server
rm data/trek-iq.db
npm run dev
```

### Environment Variables

**Required for Server:**
- `PORT`: Server port (default: 3001)
- `ADMIN_USER`: Admin username
- `ADMIN_PASS`: Admin password

**Required for Client:**
- `REACT_APP_MAPBOX_ACCESS_TOKEN`: Mapbox access token

**Optional:**
- Email configuration for barrier reporting
- CORS settings for production

## 🧪 Testing

### Run Tests
```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# E2E tests only
npm run test:e2e
```

### Test Coverage
```bash
cd client
npm test -- --coverage
```

## 📦 Deployment

### Production Build
```bash
# Build client
npm run build

# Start production server
cd server
npm start
```

### Environment Variables for Production
- Set `NODE_ENV=production`
- Configure proper CORS origins
- Use secure admin credentials
- Set up proper email configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section
2. Review console logs
3. Check browser developer tools
4. Create an issue in the repository

---

**Happy coding! 🚀**
