"""
VelocityMesh AI Engine
Next-generation workflow automation with AI-native capabilities
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from prometheus_client import Counter, Histogram, generate_latest
import structlog

# Import AI services
from services.nlp_processor import NLPProcessor
from services.workflow_optimizer import WorkflowOptimizer  
from services.error_recovery import ErrorRecoveryService
from services.ai_debugger import AIDebugger
from services.vector_store import VectorStoreService
from services.model_manager import ModelManager

# Import data models
from models.workflow import WorkflowModel, NodeModel, EdgeModel
from models.ai_insights import AIInsightModel, OptimizationSuggestion
from models.user import UserModel

# Import utilities
from utils.auth import verify_token
from utils.metrics import setup_metrics
from utils.config import get_settings

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Global settings
settings = get_settings()

# Metrics
workflow_processing_counter = Counter('workflow_processing_total', 'Total workflow processing requests')
optimization_histogram = Histogram('optimization_duration_seconds', 'Time spent optimizing workflows')
error_recovery_counter = Counter('error_recovery_total', 'Total error recovery attempts')

class AIEngineManager:
    """Main AI Engine manager class"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.nlp_processor: Optional[NLPProcessor] = None
        self.workflow_optimizer: Optional[WorkflowOptimizer] = None
        self.error_recovery: Optional[ErrorRecoveryService] = None
        self.ai_debugger: Optional[AIDebugger] = None
        self.vector_store: Optional[VectorStoreService] = None
        self.model_manager: Optional[ModelManager] = None
        
    async def initialize(self):
        """Initialize all AI services"""
        logger.info("Initializing VelocityMesh AI Engine")
        
        # Initialize Redis connection
        self.redis_client = redis.from_url(settings.redis_url)
        await self.redis_client.ping()
        logger.info("Redis connection established")
        
        # Initialize AI services
        self.model_manager = ModelManager()
        await self.model_manager.initialize()
        
        self.vector_store = VectorStoreService()
        await self.vector_store.initialize()
        
        self.nlp_processor = NLPProcessor(
            model_manager=self.model_manager,
            vector_store=self.vector_store
        )
        
        self.workflow_optimizer = WorkflowOptimizer(
            model_manager=self.model_manager,
            vector_store=self.vector_store
        )
        
        self.error_recovery = ErrorRecoveryService(
            model_manager=self.model_manager,
            redis_client=self.redis_client
        )
        
        self.ai_debugger = AIDebugger(
            model_manager=self.model_manager,
            vector_store=self.vector_store
        )
        
        logger.info("AI Engine initialization completed")
    
    async def shutdown(self):
        """Cleanup resources"""
        logger.info("Shutting down AI Engine")
        
        if self.redis_client:
            await self.redis_client.close()
        
        if self.model_manager:
            await self.model_manager.shutdown()
        
        logger.info("AI Engine shutdown completed")

# Global AI engine manager
ai_engine = AIEngineManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    await ai_engine.initialize()
    setup_metrics()
    yield
    # Shutdown
    await ai_engine.shutdown()

# Create FastAPI app
app = FastAPI(
    title="VelocityMesh AI Engine",
    description="Next-generation AI-powered workflow automation engine",
    version="0.1.0",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Pydantic models for API
class WorkflowProcessingRequest(BaseModel):
    natural_language: str = Field(..., description="Natural language description of the workflow")
    context: Optional[Dict[str, Any]] = Field(default=None, description="Additional context")

class WorkflowOptimizationRequest(BaseModel):
    workflow: WorkflowModel = Field(..., description="Workflow to optimize")
    optimization_goals: Optional[List[str]] = Field(default=None, description="Specific optimization goals")

class ErrorRecoveryRequest(BaseModel):
    workflow_id: str = Field(..., description="Workflow ID that encountered error")
    error_details: Dict[str, Any] = Field(..., description="Error details")
    execution_context: Optional[Dict[str, Any]] = Field(default=None, description="Execution context")

class DebugAnalysisRequest(BaseModel):
    workflow: WorkflowModel = Field(..., description="Workflow to debug")
    execution_log: Optional[List[Dict[str, Any]]] = Field(default=None, description="Execution log")

# API Routes

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "services": {
            "nlp_processor": ai_engine.nlp_processor is not None,
            "workflow_optimizer": ai_engine.workflow_optimizer is not None,
            "error_recovery": ai_engine.error_recovery is not None,
            "ai_debugger": ai_engine.ai_debugger is not None,
            "vector_store": ai_engine.vector_store is not None,
            "redis": ai_engine.redis_client is not None,
        }
    }

@app.get("/metrics")
async def get_metrics():
    """Prometheus metrics endpoint"""
    return generate_latest()

@app.post("/api/v1/nlp/process")
async def process_natural_language(
    request: WorkflowProcessingRequest,
    current_user: UserModel = Depends(verify_token)
):
    """Convert natural language to workflow structure"""
    workflow_processing_counter.inc()
    
    try:
        logger.info("Processing natural language request", 
                   user_id=current_user.id, 
                   input_length=len(request.natural_language))
        
        if not ai_engine.nlp_processor:
            raise HTTPException(status_code=503, detail="NLP processor not available")
        
        workflow = await ai_engine.nlp_processor.process_natural_language(
            text=request.natural_language,
            context=request.context,
            user_id=current_user.id
        )
        
        return {
            "workflow": workflow,
            "confidence": workflow.confidence_score,
            "suggestions": workflow.improvement_suggestions
        }
        
    except Exception as e:
        logger.error("Error processing natural language", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/workflows/optimize")
async def optimize_workflow(
    request: WorkflowOptimizationRequest,
    current_user: UserModel = Depends(verify_token)
):
    """Optimize workflow for performance and efficiency"""
    with optimization_histogram.time():
        try:
            logger.info("Optimizing workflow", 
                       workflow_id=request.workflow.id, 
                       user_id=current_user.id)
            
            if not ai_engine.workflow_optimizer:
                raise HTTPException(status_code=503, detail="Workflow optimizer not available")
            
            optimizations = await ai_engine.workflow_optimizer.optimize(
                workflow=request.workflow,
                goals=request.optimization_goals,
                user_id=current_user.id
            )
            
            return {
                "optimizations": optimizations,
                "estimated_improvement": {
                    "performance": optimizations.performance_improvement,
                    "cost_reduction": optimizations.cost_reduction,
                    "reliability": optimizations.reliability_improvement
                }
            }
            
        except Exception as e:
            logger.error("Error optimizing workflow", error=str(e), user_id=current_user.id)
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/errors/recover")
async def recover_from_error(
    request: ErrorRecoveryRequest,
    current_user: UserModel = Depends(verify_token)
):
    """AI-powered error recovery and self-healing"""
    error_recovery_counter.inc()
    
    try:
        logger.info("Recovering from error", 
                   workflow_id=request.workflow_id, 
                   user_id=current_user.id)
        
        if not ai_engine.error_recovery:
            raise HTTPException(status_code=503, detail="Error recovery service not available")
        
        recovery_plan = await ai_engine.error_recovery.recover(
            workflow_id=request.workflow_id,
            error_details=request.error_details,
            context=request.execution_context,
            user_id=current_user.id
        )
        
        return {
            "recovery_plan": recovery_plan,
            "auto_apply": recovery_plan.can_auto_apply,
            "confidence": recovery_plan.confidence_score
        }
        
    except Exception as e:
        logger.error("Error in error recovery", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/debug/analyze")
async def debug_workflow(
    request: DebugAnalysisRequest,
    current_user: UserModel = Depends(verify_token)
):
    """AI-powered workflow debugging and analysis"""
    try:
        logger.info("Debugging workflow", 
                   workflow_id=request.workflow.id, 
                   user_id=current_user.id)
        
        if not ai_engine.ai_debugger:
            raise HTTPException(status_code=503, detail="AI debugger not available")
        
        debug_insights = await ai_engine.ai_debugger.analyze(
            workflow=request.workflow,
            execution_log=request.execution_log,
            user_id=current_user.id
        )
        
        return {
            "insights": debug_insights,
            "issues_found": len(debug_insights.issues),
            "recommendations": debug_insights.recommendations
        }
        
    except Exception as e:
        logger.error("Error debugging workflow", error=str(e), user_id=current_user.id)
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/ai-insights")
async def websocket_ai_insights(websocket: WebSocket, token: str):
    """WebSocket endpoint for real-time AI insights"""
    # Verify user authentication
    try:
        user = await verify_token(token)
    except:
        await websocket.close(code=4001, reason="Unauthorized")
        return
    
    await websocket.accept()
    logger.info("AI insights WebSocket connected", user_id=user.id)
    
    try:
        while True:
            # Receive workflow data
            data = await websocket.receive_json()
            
            # Process with AI services
            if data["type"] == "workflow_analysis":
                insights = await ai_engine.ai_debugger.get_realtime_insights(
                    workflow_data=data["workflow"],
                    user_id=user.id
                )
                await websocket.send_json({
                    "type": "insights",
                    "data": insights
                })
            
            elif data["type"] == "optimization_suggestions":
                suggestions = await ai_engine.workflow_optimizer.get_realtime_suggestions(
                    workflow_data=data["workflow"],
                    user_id=user.id
                )
                await websocket.send_json({
                    "type": "suggestions", 
                    "data": suggestions
                })
                
    except WebSocketDisconnect:
        logger.info("AI insights WebSocket disconnected", user_id=user.id)
    except Exception as e:
        logger.error("WebSocket error", error=str(e), user_id=user.id)
        await websocket.close(code=1011, reason="Internal error")

if __name__ == "__main__":
    # Configure logging for development
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    # Run the server
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level="info" if settings.debug else "warning"
    )