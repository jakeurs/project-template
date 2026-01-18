import os
import asyncio
import json
import logging
from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from neo4j import GraphDatabase, basic_auth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Neo4j Configuration
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://neo4j:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")

driver = None

async def wait_for_neo4j(retries=5, delay=5):
    global driver
    for i in range(retries):
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=basic_auth(NEO4J_USER, NEO4J_PASSWORD))
            driver.verify_connectivity()
            logger.info("Successfully connected to Neo4j")
            return True
        except Exception as e:
            logger.warning(f"Failed to connect to Neo4j (Attempt {i+1}/{retries}): {e}")
            await asyncio.sleep(delay)
    return False

def seed_database():
    if not driver:
        return
    query = """
    MERGE (n:DebugMessage {id: 1})
    ON CREATE SET n.message = 'Hello World from Neo4j'
    RETURN n
    """
    try:
        with driver.session() as session:
            result = session.run(query)
            logger.info("Database seeded successfully.")
    except Exception as e:
        logger.error(f"Failed to seed database: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup logic
    connected = await wait_for_neo4j()
    if connected:
        seed_database()
    else:
        logger.error("Could not connect to Neo4j after multiple retries.")
    
    yield
    
    # Shutdown logic
    if driver:
        driver.close()

app = FastAPI(lifespan=lifespan)

@app.get("/")
def read_root():
    return {"message": "Hello World from FastAPI"}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

def get_debug_messages():
    if not driver:
        return []
    query = "MATCH (n:DebugMessage) RETURN n.message as message"
    messages = []
    try:
        with driver.session() as session:
            result = session.run(query)
            messages = [record["message"] for record in result]
    except Exception as e:
        logger.error(f"Error fetching messages: {e}")
    return messages

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    # Send initial status
    status = {
        "type": "STATUS",
        "connected": driver is not None
    }
    await manager.send_personal_message(json.dumps(status), websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                if message.get("type") == "GET_DEBUG_MESSAGES":
                    debug_messages = get_debug_messages()
                    response = {
                        "type": "DEBUG_MESSAGES",
                        "data": debug_messages
                    }
                    await manager.send_personal_message(json.dumps(response), websocket)
            except json.JSONDecodeError:
                logger.error("Received invalid JSON")
    except WebSocketDisconnect:
        manager.disconnect(websocket)