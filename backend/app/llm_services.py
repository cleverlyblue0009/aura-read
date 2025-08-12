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
            # Provide better fallback insights based on text analysis
            return self._generate_fallback_insights(text, persona, job_to_be_done)
        
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
    
    def _generate_fallback_insights(self, text: str, persona: str, job_to_be_done: str) -> List[Dict[str, Any]]:
        """Generate insights using text analysis when LLM is not available."""
        insights = []
        
        # Extract key metrics and numbers
        import re
        numbers = re.findall(r'\d+(?:\.\d+)?%|\$\d+(?:,\d+)*(?:\.\d+)?|\d+(?:,\d+)*(?:\.\d+)?\s*(?:million|billion|thousand|times|fold)', text, re.IGNORECASE)
        
        # Extract key sentences (first, last, and sentences with keywords)
        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 20]
        
        # Generate takeaway insight
        if sentences:
            key_sentence = sentences[0] if len(sentences[0]) > 30 else (sentences[1] if len(sentences) > 1 else sentences[0])
            insights.append({
                "type": "takeaway",
                "content": f"As a {persona}, this section highlights: {key_sentence}. This information directly supports your {job_to_be_done.lower()} objectives."
            })
        
        # Generate fact insight from numbers/metrics
        if numbers:
            metrics_text = ', '.join(numbers[:3])
            insights.append({
                "type": "fact",
                "content": f"Key quantitative data: {metrics_text}. These metrics provide concrete evidence that can inform your {job_to_be_done.lower()} strategy."
            })
        
        # Generate connection insight based on keywords
        persona_keywords = self._extract_keywords(persona.lower())
        job_keywords = self._extract_keywords(job_to_be_done.lower())
        text_keywords = self._extract_keywords(text.lower())
        
        common_keywords = (persona_keywords | job_keywords) & text_keywords
        if common_keywords:
            insights.append({
                "type": "connection",
                "content": f"This content relates to your role through: {', '.join(list(common_keywords)[:3])}. Consider how these concepts connect to broader themes in your {job_to_be_done.lower()}."
            })
        
        # Generate contradiction/challenge insight
        challenge_words = ['however', 'but', 'although', 'despite', 'challenge', 'limitation', 'problem', 'difficult', 'issue']
        if any(word in text.lower() for word in challenge_words):
            insights.append({
                "type": "contradiction",
                "content": f"This section presents challenges or limitations that a {persona.lower()} should consider. These factors may impact your {job_to_be_done.lower()} approach and require careful planning."
            })
        
        return insights[:4]  # Return up to 4 insights
    
    def _extract_keywords(self, text: str) -> set:
        """Extract meaningful keywords from text."""
        import re
        # Remove common stop words and extract meaningful terms
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those'}
        
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
        return {word for word in words if word not in stop_words and len(word) > 3}