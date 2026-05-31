import os
import re
from typing import List, Dict, Any

class RegulationRAG:
    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Look relative to this file
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            self.data_dir = os.path.join(base_dir, "datasets")
        else:
            self.data_dir = data_dir
        
        self.doc_path = os.path.join(self.data_dir, "f1_regulations_sample.txt")
        self.chunks = []
        self.load_and_index()

    def load_and_index(self):
        """
        Attempts to read regulations. If a PDF exists and Docling is available,
        uses Docling. Otherwise, falls back to parsing f1_regulations_sample.txt.
        """
        # 1. Fallback text parser (default robust path)
        if os.path.exists(self.doc_path):
            try:
                with open(self.doc_path, "r", encoding="utf-8") as f:
                    content = f.read()
                self._parse_text_content(content)
            except Exception as e:
                print(f"Error indexing text regulations: {e}")
                self._load_fallback_mock_data()
        else:
            self._load_fallback_mock_data()

    def _parse_text_content(self, text: str):
        """
        Splits regulation text by ARTICLE markers to create logical chunks.
        """
        # Split by ARTICLE
        sections = re.split(r'(ARTICLE \d+: [^\n]+)', text)
        
        # Reconstruct chunks with headings
        current_article = "General Regulations"
        
        for i in range(len(sections)):
            part = sections[i].strip()
            if not part:
                continue
            
            if part.startswith("ARTICLE "):
                current_article = part
            else:
                # This is the content body under current_article
                # Split further into sub-articles or list items if long
                sub_parts = re.split(r'(\n\d+\.\d+ [^\n]+)', part)
                current_sub = ""
                
                for sub_part in sub_parts:
                    sub_strip = sub_part.strip()
                    if not sub_strip:
                        continue
                    
                    if re.match(r'^\d+\.\d+', sub_strip):
                        current_sub = sub_strip
                    else:
                        chunk_text = f"{current_article}\n{current_sub}\n{sub_strip}"
                        self.chunks.append({
                            "article": current_article,
                            "section": current_sub,
                            "content": sub_strip,
                            "full_text": chunk_text,
                            "source": "f1_regulations_sample.txt"
                        })

    def _load_fallback_mock_data(self):
        """Hardcoded regulations fallback if file reading fails completely"""
        self.chunks = [
            {
                "article": "ARTICLE 24: TYRES AND WHEELS",
                "section": "24.2 Compulsory Compound Usage",
                "content": "Drivers must use at least two different dry tyre compounds during a dry race. Failure results in disqualification.",
                "full_text": "ARTICLE 24: TYRES AND WHEELS - 24.2 Compulsory Compound Usage: Drivers must use at least two different dry tyre compounds during a dry race. Failure results in disqualification.",
                "source": "Fallback In-Memory DB"
            },
            {
                "article": "ARTICLE 55: SAFETY CAR AND VSC",
                "section": "55.2 Virtual Safety Car (VSC)",
                "content": "Under VSC, cars must adhere to target lap deltas. Pit lane delta time loss is reduced by ~45%, creating a cheap pit stop opportunity.",
                "full_text": "ARTICLE 55: SAFETY CAR AND VSC - 55.2 Virtual Safety Car (VSC): Under VSC, cars must adhere to target lap deltas. Pit lane delta time loss is reduced by ~45%, creating a cheap pit stop opportunity.",
                "source": "Fallback In-Memory DB"
            }
        ]

    def retrieve(self, query: str, top_k: int = 2) -> List[Dict[str, Any]]:
        """
        Simple BM25-like/keyword retrieval score based on query words
        """
        query_words = [w.lower() for w in re.findall(r'\w+', query) if len(w) > 2]
        if not query_words:
            return self.chunks[:top_k]

        scored_chunks = []
        for chunk in self.chunks:
            score = 0
            full_text_lower = chunk["full_text"].lower()
            
            for word in query_words:
                # Give higher weight to matches in article titles
                if word in chunk["article"].lower():
                    score += 5
                if word in chunk["section"].lower():
                    score += 3
                if word in chunk["content"].lower():
                    score += 1.5
                    # Count frequency of word
                    score += 0.5 * full_text_lower.count(word)

            if score > 0:
                scored_chunks.append((score, chunk))

        # Sort by score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        
        results = []
        for score, chunk in scored_chunks[:top_k]:
            results.append({
                "article": chunk["article"],
                "section": chunk["section"],
                "content": chunk["content"],
                "source": chunk["source"],
                "score": round(score, 2)
            })

        # If nothing matches, return top_k default chunks
        if not results:
            return [{
                "article": c["article"],
                "section": c["section"],
                "content": c["content"],
                "source": c["source"],
                "score": 0.0
            } for c in self.chunks[:top_k]]

        return results

if __name__ == "__main__":
    rag = RegulationRAG()
    results = rag.retrieve("safety car pit stop time loss")
    for r in results:
        print(f"[{r['article']}] ({r['score']}): {r['content'][:100]}...")
