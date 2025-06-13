# Royal Trainer

A real-time AI-powered training and analysis tool for Clash Royale using advanced computer vision and WebRTC streaming technology.

## 🎯 What is Royal Trainer?

Royal Trainer is a sophisticated web application that provides real-time AI analysis of Clash Royale gameplay. It uses YOLOv8 computer vision models to detect and track troops, buildings, and other game objects during live gameplay sessions, offering players insights and training assistance.

### Key Features

- **🧠 Real-time AI Detection**: Custom-trained YOLOv8 model for Clash Royale object detection
- **📱 Live Video Streaming**: WebRTC-based video capture and streaming
- **📊 Performance Analytics**: Real-time inference statistics and detection history
- **🎮 Session Management**: Secure 4-digit session codes with single-viewer enforcement
- **⚡ Low Latency**: Optimized for minimal delay between gameplay and analysis
- **🔒 Anti-Piracy Protection**: Built-in watermarking and security features

## 🏗️ Architecture

The project consists of two main components:

### Frontend (`royal_trainer_client/`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom animations
- **Real-time**: WebRTC streaming and WebSocket connections
- **Features**: Live dashboard, connection management, inference controls

### Backend (`server/`)
- **Framework**: FastAPI + Python 3.12
- **AI/ML**: YOLOv8 (Ultralytics) for object detection
- **Streaming**: WebRTC with aiortc for video processing
- **Database**: In-memory session management
- **Deployment**: Docker containerization support

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.12+
- **YOLO Model**: Pre-trained Clash Royale detection model (`models/best.pt`)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd royal-trainer
   ```

2. **Install backend dependencies**
   ```bash
   cd server
   pip install -r requirements.txt
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../royal_trainer_client
   npm install
   ```

4. **Add your YOLO model**
   ```bash
   mkdir -p server/models
   # Place your trained Clash Royale detection model at:
   # server/models/best.pt
   ```

### Development Setup

**Option 1: Manual startup**

Terminal 1 (Backend):
```bash
cd server
python main.py
```

Terminal 2 (Frontend):
```bash
cd royal_trainer_client
npm run dev
```

**Option 2: Automated startup**
```bash
chmod +x start.sh
./start.sh
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080

## 🔧 Configuration

### Environment Variables

#### Frontend (`.env`)
```env
VITE_REMOTE_HOST=localhost        # Backend host
VITE_REMOTE_PORT=8080            # Backend port
VITE_FORCE_REMOTE_URL=false      # Force remote connection
```

#### Backend
Configure in `server/core/config.py`:
- `HOST`: Server host (default: "0.0.0.0")
- `PORT`: Server port (default: 8080)
- `MAX_SESSIONS`: Maximum concurrent sessions
- `INFERENCE_FPS_LIMIT`: AI inference rate limiting
- `ENABLE_DETAILED_LOGGING`: Debug logging

### Session Management

Royal Trainer enforces **strict single-viewer sessions**:
- Each 4-digit session code supports exactly 1 viewer
- Session codes are automatically generated
- Automatic cleanup of inactive sessions
- Built-in capacity monitoring

## 🎮 How to Use

1. **Start a Session**
   - Enter a 4-digit session code or generate one
   - Click "Connect" to join the session

2. **Begin Analysis**
   - Enable AI inference from the control panel
   - Start your Clash Royale gameplay
   - View real-time detections and analytics

3. **Monitor Performance**
   - Check inference statistics (FPS, latency, accuracy)
   - View detection history and patterns
   - Monitor connection quality

## 🤖 AI Model Details

### YOLOv8 Integration
- **Model Type**: Custom-trained YOLOv8 for Clash Royale
- **Detection Classes**: Troops, buildings, spells, and game objects
- **Performance**: Optimized for real-time inference
- **Debug Mode**: Saves detection images to `debug_outputs/`

### Inference Features
- Configurable confidence thresholds
- Real-time bounding box visualization
- Performance statistics and monitoring
- Concurrent session support with rate limiting

## 🐳 Docker Deployment

### Build and Run
```bash
cd server
docker build -f docker/Dockerfile -t royal-trainer .
docker run -p 8080:8080 royal-trainer
```

### Production Deployment
```bash
# Build for production
cd royal_trainer_client
npm run build

# Deploy frontend (example with Vercel)
npm run deploy:vercel
```

## 📊 API Endpoints

### Session Management
- `GET /api/sessions/{session_code}` - Check session status
- `POST /api/sessions/{session_code}` - Create/join session
- `GET /api/sessions/available` - List available sessions

### AI Inference
- `POST /api/inference/{session_code}` - Run inference on frame
- `GET /api/inference/{session_code}/status` - Get inference status
- `POST /api/inference/{session_code}/toggle` - Enable/disable inference

### Health & Monitoring
- `GET /health` - Basic health check
- `GET /health-single-viewer` - Detailed server statistics

## 🔌 WebSocket Connections

### Main Stream: `/ws/{session_code}`
- Video frame streaming
- Real-time communication
- Connection management

### Inference Updates: `/inference/ws/{session_code}`
- AI detection results
- Performance metrics
- Status updates

## 🛠️ Development

### Frontend Scripts
```bash
npm run dev              # Development server
npm run dev:remote       # Development with remote backend
npm run build            # Production build
npm run type-check       # TypeScript checking
npm run lint             # ESLint checking
```

### Backend Development
```bash
python main.py           # Start development server
pip install -r requirements.txt  # Install dependencies
```

### Project Structure
```
royal-trainer/
├── royal_trainer_client/    # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom hooks
│   │   └── types/         # TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Python backend
│   ├── api/               # FastAPI routes
│   ├── services/          # Business logic
│   ├── core/              # Configuration
│   ├── models/            # AI model storage
│   └── requirements.txt
└── start.sh               # Development startup script
```

## 🚨 Important Notes

### Security Features
- **Anti-piracy watermarking** embedded in the interface
- **Session-based access control** with automatic cleanup
- **Single-viewer enforcement** to prevent unauthorized sharing
- **Rate limiting** on AI inference to prevent abuse

### Performance Considerations
- Designed for **single concurrent viewer** per session
- AI inference is **rate-limited** to maintain performance
- **Automatic session cleanup** prevents resource leaks
- **WebRTC optimization** for minimal latency

### Model Requirements
- Requires a **custom-trained YOLOv8 model** for Clash Royale
- Model should be placed at `server/models/best.pt`
- Training data should include Clash Royale game objects
- Model performance directly affects real-time analysis quality

## 📝 License

This project is proprietary software for Royal Trainer. Unauthorized distribution or modification is prohibited.

## 🤝 Contributing

This is a closed-source project. For issues or feature requests, please contact the development team.

---

**Royal Trainer** - Elevate your Clash Royale gameplay with AI-powered analysis
