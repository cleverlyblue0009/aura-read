import os
import orjson
from typing import Dict, Any
from .util_paths import META_DIR

class ProgressTracker:
    def __init__(self, storage_path: str | None = None) -> None:
        self.storage_path = storage_path or os.path.join(META_DIR, "progress.json")
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        if not os.path.isfile(self.storage_path):
            with open(self.storage_path, "wb") as f:
                f.write(orjson.dumps({}))

    def _load(self) -> Dict[str, Any]:
        try:
            with open(self.storage_path, "rb") as f:
                return orjson.loads(f.read())
        except Exception:
            return {}

    def _save(self, data: Dict[str, Any]) -> None:
        with open(self.storage_path, "wb") as f:
            f.write(orjson.dumps(data))

    def record(self, document_id: str, page: int, seconds_on_page: int) -> None:
        data = self._load()
        doc = data.get(document_id) or {"total_seconds": 0, "per_page": {}}
        doc["total_seconds"] = int(doc.get("total_seconds", 0)) + int(seconds_on_page)
        pp = doc.get("per_page") or {}
        pp[str(page)] = int(pp.get(str(page), 0)) + int(seconds_on_page)
        doc["per_page"] = pp
        data[document_id] = doc
        self._save(data)

    def get(self, document_id: str) -> Dict[str, Any]:
        data = self._load()
        return data.get(document_id, {"total_seconds": 0, "per_page": {}})