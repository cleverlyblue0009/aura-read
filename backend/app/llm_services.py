import os
import asyncio
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        # Support hackathon environment variables
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        self.model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
        self.provider = os.getenv("LLM_PROVIDER", "gemini").lower()
        
        # Handle Google Application Credentials for service account
        google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        if google_creds and os.path.exists(google_creds):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_creds
        
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
                              context: Optional[str] = None,
                              related_sections: Optional[List[Dict]] = None) -> List[Dict[str, Any]]:
        """Generate AI insights for the given text with cross-document analysis."""
        if not self.is_available():
            return [{"type": "info", "content": "LLM service not available. Please configure GEMINI_API_KEY."}]
        
        try:
            # Enhanced prompt for better insights
            related_context = ""
            if related_sections:
                related_context = "\n\nRelated sections from other documents:\n"
                for i, section in enumerate(related_sections[:3]):
                    related_context += f"{i+1}. From '{section.get('doc_name', 'Unknown')}': {section.get('snippet', '')[:300]}\n"
            
            prompt = f"""
            You are an expert analyst helping a {persona} with their task: {job_to_be_done}
            
            Analyze the following selected text and provide 4-6 comprehensive insights:
            
            SELECTED TEXT:
            {text[:2000]}
            
            {f"DOCUMENT CONTEXT: {context[:1000]}" if context else ""}
            {related_context}
            
            Generate insights in these categories:
            1. **Key Takeaways** - Most important points and implications
            2. **Did You Know?** - Surprising or lesser-known facts
            3. **Contradictions/Counterpoints** - Alternative perspectives or conflicting evidence
            4. **Cross-Document Connections** - How this relates to other documents or broader themes
            5. **Practical Applications** - How this knowledge can be applied
            6. **Questions to Explore** - Areas for further investigation
            
            For each insight, consider:
            - Relevance to the {persona}'s perspective
            - Practical value for {job_to_be_done}
            - Connections between documents
            - Contradictory evidence or viewpoints
            - Real-world applications
            
            Format as JSON array with objects: {{"type": "takeaway|fact|contradiction|connection|application|question", "content": "insight text (2-3 sentences max)", "confidence": 0.8, "sources": ["doc1", "doc2"]}}
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
                                    related_sections: List[str] = None,
                                    insights: List[str] = None,
                                    podcast_style: str = "single") -> str:
        """Generate an engaging 2-5 minute podcast script."""
        if not self.is_available():
            return "LLM service not available for podcast generation."
        
        try:
            # Handle different podcast styles
            if podcast_style == "conversation" or podcast_style == "two-speaker":
                return await self._generate_conversation_script(text, related_sections, insights)
            else:
                return await self._generate_single_speaker_script(text, related_sections, insights)
                
        except Exception as e:
            print(f"Error generating podcast script: {e}")
            return "Failed to generate podcast script."
    
    async def _generate_single_speaker_script(self, text: str, related_sections: List[str] = None, insights: List[str] = None) -> str:
        """Generate single speaker podcast script."""
        related_content = ""
        if related_sections:
            related_content = f"\n\nRelated information from other documents:\n{chr(10).join(related_sections[:3])}"
        
        insights_content = ""
        if insights:
            insights_content = f"\n\nKey insights to weave in:\n{chr(10).join(insights[:4])}"
        
        prompt = f"""
        Create an engaging 2-5 minute podcast-style audio overview script. This will be converted to speech, so write it to be spoken naturally.
        
        MAIN CONTENT:
        {text[:2000]}
        {related_content}
        {insights_content}
        
        SCRIPT REQUIREMENTS:
        - Write as if speaking directly to the listener
        - Start with a compelling hook that draws attention
        - Use conversational, natural language (contractions, casual tone)
        - Include verbal transitions like "Now here's what's interesting..." or "But wait, there's more..."
        - Add natural pauses with [PAUSE] markers for emphasis
        - Explain complex terms simply with analogies
        - Connect ideas across documents when relevant
        - End with a thought-provoking conclusion or call to action
        - Target exactly 2-5 minutes when spoken (roughly 300-750 words)
        - Use varied sentence lengths for natural rhythm
        - Include rhetorical questions to engage the listener
        
        STYLE:
        - Educational but accessible
        - Enthusiastic but not over-the-top  
        - Professional yet conversational
        - Include "aha moments" and surprising insights
        
        Write ONLY the script text, no stage directions or formatting.
        """
            
         response = await asyncio.to_thread(
             self.model.generate_content,
             prompt
         )
         
         return response.text.strip()
    
    async def _generate_conversation_script(self, text: str, related_sections: List[str] = None, insights: List[str] = None) -> str:
        """Generate two-speaker conversation podcast script."""
        related_content = ""
        if related_sections:
            related_content = f"\n\nRelated information from other documents:\n{chr(10).join(related_sections[:3])}"
        
        insights_content = ""
        if insights:
            insights_content = f"\n\nKey insights to weave in:\n{chr(10).join(insights[:4])}"
        
        prompt = f"""
        Create a 2-5 minute conversational podcast script between two speakers discussing the content. This should feel like a natural, engaging dialogue.
        
        MAIN CONTENT:
        {text[:2000]}
        {related_content}
        {insights_content}
        
        SPEAKERS:
        - ALEX: The curious questioner who asks clarifying questions
        - JORDAN: The knowledgeable explainer who provides insights
        
        SCRIPT REQUIREMENTS:
        - Natural back-and-forth conversation
        - ALEX asks questions listeners would ask
        - JORDAN explains concepts clearly with examples
        - Include interruptions and natural speech patterns
        - Use [PAUSE] for dramatic effect
        - Connect information across documents
        - Target 2-5 minutes (roughly 400-800 words total)
        - End with both speakers reflecting on key takeaways
        
        FORMAT:
        ALEX: [What they say]
        JORDAN: [What they say]
        
        Make it sound like two real people having an interesting conversation about the topic.
        """
        
        response = await asyncio.to_thread(
            self.model.generate_content,
            prompt
        )
        
        return response.text.strip()
    
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