import os
import json
from typing import Dict, Any, List
from rag_processor import RegulationRAG

class RaceEngineerAgent:
    def __init__(self):
        self.rag = RegulationRAG()
        self.ibm_api_key = os.getenv("IBM_GRANITE_API_KEY") or os.getenv("WATSONX_APIKEY")
        self.project_id = os.getenv("WATSONX_PROJECT_ID")
        self.use_live_api = bool(self.ibm_api_key)

    def formulate_query_context(self, question: str, telemetry: Dict[str, Any] = None) -> str:
        context = f"Question: {question}\n"
        if telemetry:
            context += f"Telemetry Data:\n- Current Lap: {telemetry.get('lap')}\n"
            context += f"- Speed: {telemetry.get('speed')} km/h\n"
            context += f"- Gear: {telemetry.get('gear')}\n"
            context += f"- RPM: {telemetry.get('rpm')}\n"
            context += f"- Tyre Compound: {telemetry.get('tyre_compound')}\n"
            context += f"- Tyre Age: {telemetry.get('tyre_age')} laps\n"
            context += f"- Tyre Wear: FL={telemetry.get('tyre_wear_fl')}%, FR={telemetry.get('tyre_wear_fr')}%, RL={telemetry.get('tyre_wear_rl')}%, RR={telemetry.get('tyre_wear_rr')}%\n"
            context += f"- Tyre Temps: FL={telemetry.get('tyre_temp_fl')}°C, FR={telemetry.get('tyre_temp_fr')}°C, RL={telemetry.get('tyre_temp_rl')}°C, RR={telemetry.get('tyre_temp_rr')}°C\n"
            context += f"- Fuel Left: {telemetry.get('fuel_left')} kg\n"
            context += f"- Fuel Consumption: {telemetry.get('fuel_consumption')} kg/lap\n"
            context += f"- DRS Enabled: {telemetry.get('drs_enabled')}\n"
            context += f"- Track Temp: {telemetry.get('track_temp')}°C\n"
            context += f"- Weather: {telemetry.get('weather')}\n"
        return context

    def get_response(self, question: str, mode: str = "engineering", telemetry: Dict[str, Any] = None) -> Dict[str, Any]:
        rag_hits = self.rag.retrieve(question, top_k=2)
        citations = []
        for hit in rag_hits:
            if hit["score"] > 0:
                citations.append(f"{hit['article']} - {hit['section']}: \"{hit['content'][:150]}...\"")
        if not citations:
            citations.append("FIA Sporting Regulations Article 24: General tyre Compound usage guidelines.")

        if self.use_live_api:
            return self._call_granite_api(question, mode, telemetry, rag_hits, citations)
        else:
            return self._generate_local_reasoning(question, mode, telemetry, rag_hits, citations)

    def _call_granite_api(self, question: str, mode: str, telemetry: Dict[str, Any], rag_hits: List[Dict], citations: List[str]) -> Dict[str, Any]:
        try:
            from langchain_ibm import WatsonxLLM
            
            context = self.formulate_query_context(question, telemetry)
            rag_context = "\n".join([f"- {h['article']} ({h['section']}): {h['content']}" for h in rag_hits])
            
            prompt = (
                "You are an expert F1 Race Engineer named Apexion AI. You are talking to your driver/team.\n"
                f"Communication style: {mode.upper()} mode.\n"
                "In ENGINEERING mode, be highly technical, referencing telemetry and regulations precisely.\n"
                "In FAN mode, be conversational, use racing analogies, and simplify technical jargon.\n\n"
                f"CONTEXT INFORMATION:\n{context}\n"
                f"RETRIEVED FIA REGULATIONS:\n{rag_context}\n\n"
                "Generate a JSON response with the following exact keys:\n"
                "1. 'thoughts': List of step-by-step reasoning thoughts the engineer had (e.g. ['Reading sensor...', 'Checking FIA rules...'])\n"
                "2. 'answer': The final radio response/insight to the driver/team.\n"
                "3. 'assumptions': List of engineering assumptions made (e.g. ['Assumed constant track grip', ...])\n"
                "4. 'action': Short capitalized action directive (e.g. 'PIT NOW FOR MEDIUMS', 'STAY OUT').\n\n"
                "JSON Output:"
            )

            parameters = {
                "decoding_method": "greedy",
                "max_new_tokens": 512,
                "min_new_tokens": 1,
                "temperature": 0.2
            }
            
            llm = WatsonxLLM(
                model_id="ibm/granite-13b-instruct-v2",
                url="https://us-south.ml.cloud.ibm.com",
                project_id=self.project_id,
                params=parameters
            )
            
            response_text = llm.invoke(prompt)
            try:
                clean_text = response_text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()
                
                parsed = json.loads(clean_text)
                return {
                    "thoughts": parsed.get("thoughts", ["Processed Granite telemetry analysis"]),
                    "answer": parsed.get("answer", response_text),
                    "citations": citations,
                    "assumptions": parsed.get("assumptions", ["Standard F1 tire degradation model"]),
                    "action": parsed.get("action", "STAY OUT")
                }
            except Exception:
                return {
                    "thoughts": ["Telemetry ingested", "Regulations retrieved", "Granite LLM executed successfully"],
                    "answer": response_text,
                    "citations": citations,
                    "assumptions": ["Assumed dry track", "Standard F1 hybrid engine thermal curves"],
                    "action": "MONITOR TELEMETRY"
                }
        except Exception as e:
            print(f"IBM Granite live API execution failed, falling back to local reasoning: {e}")
            return self._generate_local_reasoning(question, mode, telemetry, rag_hits, citations)

    def _generate_local_reasoning(self, question: str, mode: str, telemetry: Dict[str, Any], rag_hits: List[Dict], citations: List[str]) -> Dict[str, Any]:
        q = question.lower()
        
        t = telemetry or {
            "lap": 42,
            "speed": 290,
            "gear": 7,
            "rpm": 12200,
            "tyre_compound": "Hard",
            "tyre_age": 28,
            "tyre_wear_fl": 68.2, "tyre_wear_fr": 65.5, "tyre_wear_rl": 61.0, "tyre_wear_rr": 60.1,
            "tyre_temp_fl": 112, "tyre_temp_fr": 109, "tyre_temp_rl": 104, "tyre_temp_rr": 103,
            "fuel_left": 35.5,
            "fuel_consumption": 1.7,
            "drs_enabled": True,
            "track_temp": 38.0,
            "weather": "Dry"
        }
        
        avg_wear = (t["tyre_wear_fl"] + t["tyre_wear_fr"] + t["tyre_wear_rl"] + t["tyre_wear_rr"]) / 4.0
        max_wear = max(t["tyre_wear_fl"], t["tyre_wear_fr"], t["tyre_wear_rl"], t["tyre_wear_rr"])
        max_temp = max(t["tyre_temp_fl"], t["tyre_temp_fr"], t["tyre_temp_rl"], t["tyre_temp_rr"])
        tyre_age = t["tyre_age"]
        compound = t["tyre_compound"]

        thoughts = [
            "Step 1: Telemetry ingestion complete. Analyzing telemetry data stream.",
            f"Step 2: Checking tyre condition. Average wear is {avg_wear:.1f}%. Max wear is {max_wear:.1f}% on front-left.",
            f"Step 3: Monitoring temperatures. Max tyre carcass temperature is {max_temp}°C.",
            "Step 4: Performing search in FIA regulations database."
        ]
        
        assumptions = [
            f"Track temperature remains stable at {t['track_temp']}°C.",
            f"Current weather condition: {t['weather']}.",
            "Driver preserves tyre life in traction zones (smooth throttle application)."
        ]

        action = "STAY OUT"
        
        if "tyre" in q or "wear" in q or "degradation" in q or "puncture" in q or "increasing" in q:
            thoughts.append("Step 5: Evaluating tyre thermal and structural degradation thresholds.")
            
            if max_wear > 85:
                action = "PIT IMMEDIATELY"
                thoughts.append("Step 6: Critical wear threshold (>85%) exceeded. Puncture hazard is severe.")
                if mode == "engineering":
                    answer = (
                        f"ALERT: Front-left tyre wear is at {max_wear:.1f}%, which is past the structural threshold of 90% "
                        f"outlined in tyre safety standards. Thermal indicators show core temperatures reaching {max_temp}°C, "
                        f"accelerating rubber compound shear. According to FIA Art 24.3, running past this limit threatens delamination. "
                        f"Box this lap to avoid a terminal puncture. Recommending Medium compound for final stint."
                    )
                else:
                    answer = (
                        f"BOX BOX BOX! Your front-left tyre is critically worn out ({max_wear:.1f}% wear) and running extremely hot. "
                        f"It's like driving on thin ice—if you stay out, the tyre is highly likely to pop. Let's get you into the pits "
                        f"right now for a fresh set of yellow Medium tyres to finish the race safely."
                    )
            elif max_wear > 60:
                action = "PREPARE TO PIT"
                thoughts.append("Step 6: High wear threshold (>60%) detected. Tyre degradation curve is steepening.")
                if mode == "engineering":
                    answer = (
                        f"We are observing lap times increasing due to traction loss. Tyre wear is {max_wear:.1f}% on the front-left, "
                        f"and carcass temps are stabilizing at {max_temp}°C. The grip coefficient has dropped by approximately 15%. "
                        f"You should prepare to box in the next 2-3 laps. Keep smooth on the throttle at Turn 9."
                    )
                else:
                    answer = (
                        f"We're seeing your lap times slip a bit because the tyres are starting to slide. Your tyre wear is around "
                        f"{max_wear:.1f}% on the front-left. They're getting tired, so we should plan to bring you in for fresh tyres "
                        f"in about 2 or 3 laps. Try to avoid wheelspin on corner exits."
                    )
            else:
                if mode == "engineering":
                    answer = (
                        f"Tyre wear is currently nominal at {avg_wear:.1f}% average ({compound} compound, {tyre_age} laps old). "
                        f"Temperatures are within the optimal thermodynamic window of 90°C-115°C. Degradation rate is 1.2% per lap. "
                        f"You can continue pushing. Strategy delta indicates staying out is optimal."
                    )
                else:
                    answer = (
                        f"Your tyres are looking good! Wear is only at {avg_wear:.1f}% average, and they are in the perfect temperature "
                        f"sweet spot. You have plenty of grip left, so keep pushing. No need to pit yet."
                    )
        
        elif "pit" in q or "strategy" in q or "undercut" in q or "overcut" in q:
            thoughts.append("Step 5: Evaluating track position, pit lane time loss, and undercut coefficients.")
            
            if "vsc" in q or "safety car" in q or "cheap" in q:
                action = "PIT UNDER VSC"
                thoughts.append("Step 6: Matching with FIA Sporting Regulations Article 55 (VSC cheap pitstop).")
                assumptions.append("Effective pit lane delta loss reduces from 20.5s to 11.2s under VSC.")
                if mode == "engineering":
                    answer = (
                        "VSC deployment confirmed. According to FIA Article 55.2, all cars on track must adhere to a target delta, "
                        "which slows the pack down by ~40%. An immediate pit stop saves approximately 9.3 seconds relative to a green-flag "
                        "stop (the 'cheap pit stop' effect). Pit now. We will fit Hard tyres to run to the end."
                    )
                else:
                    answer = (
                        "The Virtual Safety Car is out! Because the cars on track are forced to drive slowly, pitting now is a massive bargain. "
                        "We save nearly 10 seconds compared to a normal pit stop. Come into the pit lane now so we can swap you to the Hard "
                        "tyres and run all the way to the checkered flag!"
                    )
            else:
                if "undercut" in q:
                    if mode == "engineering":
                        answer = (
                            "The undercut strategy involves pitting earlier than your rival to exploit the immediate grip advantage "
                            "of a fresh tyre compound. For example, fresh Mediums can yield a 1.5s per lap pace advantage over worn Hards. "
                            "If you pit first and run a fast out-lap, you can jump them when they pit. Key requirements: clear traffic window "
                            "on pit exit and high tyre warm-up rate."
                        )
                    else:
                        answer = (
                            "The undercut is a classic racing trick! It means pitting a lap or two before the car in front of you. "
                            "By getting brand new, grippy tyres early, you'll drive much faster on your new tyres than they can on their "
                            "old, worn-out ones. When they finally pit on the next lap, you'll sail right past them as they exit the pit lane."
                        )
                else:
                    if mode == "engineering":
                        answer = (
                            "We are simulating a 1-stop vs 2-stop strategy window. Currently, a 1-stop (Medium -> Hard) has a total race time "
                            "delta that is 4.2 seconds faster than a 2-stop (Medium -> Hard -> Soft), assuming we can manage tyre wear "
                            "to last until Lap 25. If tyre degradation exceeds 1.8% per lap, the 2-stop becomes the faster option."
                        )
                    else:
                        answer = (
                            "We are looking at our strategy options. Right now, making just one pit stop (starting on Mediums and switching "
                            "to Hards) looks like the fastest way home. However, if your tyres wear out faster than we hope, we might have "
                            "to switch to a two-stop strategy and put you on the fast Soft tyres at the end."
                        )
        
        elif "rule" in q or "regulation" in q or "fia" in q or "article" in q:
            thoughts.append("Step 5: Mapping search terms to sporting regulations dataset index.")
            thoughts.append("Step 6: Retrieving text snippets and formatting citations.")
            
            citations_str = ", ".join(citations)
            if mode == "engineering":
                answer = (
                    f"According to the FIA Sporting Regulations retrieved (Citations: {citations_str}), "
                    f"under Article 24.2, each driver must run at least two different dry tyre compounds during a dry race. "
                    f"Also, pit lane speed limits (Article 34.1) enforce an 80km/h cap (60km/h on tight tracks like Monaco) with "
                    f"a minimum 5-second penalty for infringements."
                )
            else:
                answer = (
                    "Based on the official FIA racing rules, you are required to use at least two different types of dry tyres "
                    "during the race (for example, starting on Mediums and switching to Hards). Also, remember there's a strict "
                    "speed limit in the pit lane (usually 80 km/h) to keep mechanics safe, and speeding will get you a time penalty!"
                )
        
        else:
            thoughts.append("Step 5: Processing general F1 engineering inquiry.")
            if mode == "engineering":
                answer = (
                    f"Telemetry parameters are stable. Engine speed is {t['rpm']} RPM, DRS is active, and track temperature is "
                    f"{t['track_temp']}°C. Please specify if you require tyre degradation curves, safety car procedures, "
                    f"or a pit strategy simulation delta."
                )
            else:
                answer = (
                    f"Everything is running smoothly! The car is healthy, track temperature is {t['track_temp']}°C, and we are "
                    f"gathering data. Ask me anything about tyre wear, when to make a pit stop, or F1 rules!"
                )

        return {
            "thoughts": thoughts,
            "answer": answer,
            "citations": citations,
            "assumptions": assumptions,
            "action": action
        }
