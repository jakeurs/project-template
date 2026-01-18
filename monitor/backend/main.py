import json
import logging
import os
import asyncio
from typing import List, Dict, Any
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import docker
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import xmltodict

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("monitor-api")

app = FastAPI(title="Ralph Wiggum Monitor API")

# Docker client
try:
    docker_client = docker.from_env()
except Exception as e:
    logger.error(f"Failed to connect to Docker daemon: {e}")
    docker_client = None

# Store connected clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")

manager = ConnectionManager()

def parse_junit_xml(file_path: str) -> Dict[str, Any]:
    """Parse JUnit XML test results."""
    try:
        with open(file_path, 'r') as f:
            data = xmltodict.parse(f.read())
            
        # Extract summary info (simplified for now)
        # Handle both pytest and vitest structures if they differ slightly
        testsuite = data.get('testsuites', {}).get('testsuite', data.get('testsuite', {}))
        
        if isinstance(testsuite, list):
            # Sum up if multiple suites
            passed = sum(int(ts.get('@tests', 0)) - int(ts.get('@failures', 0)) - int(ts.get('@errors', 0)) for ts in testsuite)
            failed = sum(int(ts.get('@failures', 0)) + int(ts.get('@errors', 0)) for ts in testsuite)
        else:
            passed = int(testsuite.get('@tests', 0)) - int(testsuite.get('@failures', 0)) - int(testsuite.get('@errors', 0))
            failed = int(testsuite.get('@failures', 0)) + int(testsuite.get('@errors', 0))
            
        return {"passed": passed, "failed": failed}
    except Exception as e:
        logger.error(f"Error parsing {file_path}: {e}")
        return {"passed": 0, "failed": 0, "error": str(e)}

async def get_project_status():
    """Get status of project containers and test results."""
    status = {
        "containers": [],
        "tests": {
            "backend": {"passed": 0, "failed": 0},
            "frontend": {"passed": 0, "failed": 0}
        }
    }
    
    # Container Status
    if docker_client:
        try:
            project_name = os.getenv("COMPOSE_PROJECT_NAME", "my-dev-env")
            containers = docker_client.containers.list(all=True, filters={"label": f"com.docker.compose.project={project_name}"})
            for c in containers:
                status["containers"].append({
                    "name": c.name,
                    "status": c.status,
                    "id": c.short_id
                })
        except Exception as e:
            logger.error(f"Error getting container status: {e}")

    # Test Results
    backend_xml = "/workspace/backend/test_output/backend_results.xml"
    frontend_xml = "/workspace/frontend/test_output/frontend_results.xml"
    
    if os.path.exists(backend_xml):
        status["tests"]["backend"] = parse_junit_xml(backend_xml)
        
    if os.path.exists(frontend_xml):
        status["tests"]["frontend"] = parse_junit_xml(frontend_xml)
        
    return status

class TestResultHandler(FileSystemEventHandler):
    """Watch for changes in test output files."""
    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith('.xml'):
            logger.info(f"Detected change in {event.src_path}")
            asyncio.run_coroutine_threadsafe(broadcast_status(), asyncio.get_event_loop())

async def broadcast_status():
    status = await get_project_status()
    await manager.broadcast(json.dumps(status))

@app.on_event("startup")
async def startup_event():
    # Setup file watching
    observer = Observer()
    observer.schedule(TestResultHandler(), "/workspace", recursive=True)
    observer.start()
    
    # Periodically poll container status (e.g., every 5 seconds)
    async def poll_containers():
        while True:
            await broadcast_status()
            await asyncio.sleep(5)
            
    asyncio.create_task(poll_containers())

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    # Send initial status
    status = await get_project_status()
    await websocket.send_text(json.dumps(status))
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)