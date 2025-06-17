import asyncio
from typing import Any
from browser_use import Agent
from services import emit_log

class CustomAgent(Agent):
    """Custom Agent that captures logs for streaming."""
    
    def __init__(self, session_id: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.session_id = session_id
        self.captured_logs = []
    
    async def run(self, max_steps: int = 100):
        """Override run method to capture logs."""
        await emit_log(self.session_id, "info", f"🚀 Starting benchmark task: {self.task}")
        
        try:
            # Initialize browser
            await emit_log(self.session_id, "info", "🌐 Launching browser...")
            
            # Set the session ID for the custom log handler
            from services import CustomLogHandler
            # Note: This would need to be properly connected to the handler instance
            
            result = await super().run(max_steps)
            
            await emit_log(self.session_id, "success", "✅ Benchmark completed successfully!")
            return result
            
        except Exception as e:
            await emit_log(self.session_id, "error", f"❌ Benchmark failed: {str(e)}")
            raise

def patch_agent_methods(agent: CustomAgent):
    """Patch agent methods to capture detailed browser logs."""
    
    # Patch browser controller methods if available
    if hasattr(agent, 'browser') and agent.browser:
        browser = agent.browser
        
        # Note: The controller attribute may not exist in the current browser_use version
        # This is defensive programming to handle potential API changes
        if hasattr(browser, 'controller'):
            controller = browser.controller
            
            # Store original methods
            original_click = getattr(controller, 'click', None)
            original_type = getattr(controller, 'type', None)
            original_scroll = getattr(controller, 'scroll', None)
            original_navigate = getattr(controller, 'navigate', None)
            
            # Create logged versions
            async def logged_click(*args, **kwargs):
                element_info = f"index {args[0]}" if args else "element"
                await emit_log(agent.session_id, "action", f"🖱️ Clicking {element_info}")
                if original_click:
                    result = await original_click(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Click completed on {element_info}")
                    return result
            
            async def logged_type(*args, **kwargs):
                text = args[1] if len(args) > 1 else kwargs.get('text', 'text')
                element_info = f"index {args[0]}" if args else "element"
                await emit_log(agent.session_id, "action", f"⌨️ Typing '{text}' into {element_info}")
                if original_type:
                    result = await original_type(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Text input completed: {element_info}")
                    return result
            
            async def logged_scroll(*args, **kwargs):
                direction = args[0] if args else kwargs.get('direction', 'down')
                await emit_log(agent.session_id, "action", f"📜 Scrolling {direction}")
                if original_scroll:
                    result = await original_scroll(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Scroll completed: {direction}")
                    return result
            
            async def logged_navigate(*args, **kwargs):
                url = args[0] if args else kwargs.get('url', 'page')
                await emit_log(agent.session_id, "action", f"🌐 Navigating to: {url}")
                if original_navigate:
                    result = await original_navigate(*args, **kwargs)
                    await emit_log(agent.session_id, "success", f"✅ Navigation completed: {url}")
                    return result
            
            # Apply patches
            if original_click:
                controller.click = logged_click
            if original_type:
                controller.type = logged_type
            if original_scroll:
                controller.scroll = logged_scroll
            if original_navigate:
                controller.navigate = logged_navigate 