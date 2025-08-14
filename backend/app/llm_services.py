import os
import asyncio
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        self.model_name = "gemini-2.0-flash-exp"
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the Gemini model."""
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(self.model_name)
                print("Gemini model initialized successfully")
            except Exception as e:
                print(f"Failed to initialize Gemini model: {e}")
                self.model = None
        else:
            print("Warning: GEMINI_API_KEY not found in environment variables")
    
    def is_available(self) -> bool:
        """Check if LLM service is available."""
        return self.model is not None
    
    async def generate_insights(self, 
                              text: str, 
                              persona: str, 
                              job_to_be_done: str,
                              context: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate AI insights for the given text."""
        if not self.is_available():
            # Return mock insights when LLM is not available
            return [
                {"type": "takeaway", "content": f"This section discusses key concepts relevant to {job_to_be_done}."},
                {"type": "fact", "content": "Research shows that understanding context improves retention by 40%."},
                {"type": "connection", "content": f"This relates to broader themes in {context or 'the document'}."},
                {"type": "info", "content": "Enable LLM service for AI-powered insights."}
            ]
        
        try:
            prompt = f"""
            You are helping a {persona} with their task: {job_to_be_done}
            
            Analyze the following text and provide 3-4 key insights in the form of:
            1. Key takeaways or important facts
            2. "Did you know?" interesting facts
            3. Potential contradictions or counterpoints
            4. Connections to broader concepts
            
            Text to analyze:
            {text[:2000]}  # Limit text length
            
            {f"Additional context: {context}" if context else ""}
            
            Format your response as a JSON array with objects containing "type" (one of: "takeaway", "fact", "contradiction", "connection") and "content" (the insight text, max 2 sentences).
            """
            
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            # Parse response
            try:
                insights_text = response.text.strip()
                # Extract JSON from response if wrapped in markdown
                if "```json" in insights_text:
                    insights_text = insights_text.split("```json")[1].split("```")[0]
                elif "```" in insights_text:
                    insights_text = insights_text.split("```")[1].split("```")[0]
                
                import json
                insights = json.loads(insights_text)
                return insights if isinstance(insights, list) else [insights]
            except:
                # Fallback: parse as plain text
                return [{"type": "info", "content": response.text[:200]}]
                
        except Exception as e:
            print(f"Error generating insights: {e}")
            return [{"type": "error", "content": "Failed to generate insights"}]
    
    async def generate_podcast_script(self,
                                    text: str,
                                    related_sections: List[str],
                                    insights: List[str]) -> str:
        """Generate a podcast script for the given content."""
        if not self.is_available():
            return "LLM service not available for podcast generation."
        
        try:
            prompt = f"""
            Create a 2-5 minute podcast script that narrates and explains the following content.
            Make it engaging, conversational, and educational.
            
            Main content:
            {text[:1500]}
            
            Related sections to reference:
            {chr(10).join(related_sections[:3])}
            
            Key insights to incorporate:
            {chr(10).join(insights[:3])}
            
            Guidelines:
            - Keep it conversational and engaging
            - Explain complex concepts simply
            - Include transitions between ideas
            - Add brief pauses with [PAUSE] markers
            - Target 2-5 minutes when read aloud
            - Don't use markdown formatting
            """
            
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            return response.text.strip()
            
        except Exception as e:
            print(f"Error generating podcast script: {e}")
            return "Failed to generate podcast script."
    
    async def simplify_text(self, text: str, difficulty_level: str = "simple") -> str:
        """Simplify text based on difficulty level."""
        if not self.is_available():
            return text  # Return original if service unavailable
        
        try:
            level_instructions = {
                "simple": "Use very simple words, short sentences, and explain any technical terms.",
                "moderate": "Use clear language but you can include some technical terms with brief explanations.",
                "advanced": "Keep technical terms but make the structure and flow clearer."
            }
            
            instruction = level_instructions.get(difficulty_level, level_instructions["simple"])
            
            prompt = f"""
            Rewrite the following text to make it easier to understand.
            {instruction}
            
            Original text:
            {text[:2000]}
            
            Simplified version:
            """
            
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            return response.text.strip()
            
        except Exception as e:
            print(f"Error simplifying text: {e}")
            return text  # Return original on error
    
    async def define_term(self, term: str, context: str) -> str:
        """Get definition for a complex term within context."""
        if not self.is_available():
            return f"Definition not available for '{term}'"
        
        try:
            prompt = f"""
            Define the term "{term}" in the context of the following text.
            Provide a clear, concise definition in 1-2 sentences.
            
            Context:
            {context[:500]}
            
            Definition:
            """
            
            response = await asyncio.to_thread(
                self.model.generate_content,
                prompt
            )
            
            return response.text.strip()
            
        except Exception as e:
            print(f"Error defining term: {e}")
            return f"Unable to define '{term}'"