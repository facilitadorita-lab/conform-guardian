"""Exporta buckets privados do Supabase com manifesto SHA-256.

Uso exclusivo no runner protegido do GitHub. Nenhuma chave e gravada no repositorio.
"""
from __future__ import annotations

import hashlib
import json
import os
import pathlib
import sys
import urllib.parse
import urllib.request


BASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OUTPUT = pathlib.Path(os.environ.get("STORAGE_BACKUP_DIR", "storage-backup"))
BUCKETS = [
    item.strip()
    for item in os.environ.get("STORAGE_BUCKETS", "evidencias,lgpd-exports").split(",")
    if item.strip()
]


def request_json(url: str, payload: dict) -> list[dict]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={
            "Authorization": f"Bearer {SERVICE_KEY}",
            "apikey": SERVICE_KEY,
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def list_objects(bucket: str, prefix: str = "") -> list[dict]:
    result: list[dict] = []
    offset = 0
    while True:
        page = request_json(
            f"{BASE_URL}/storage/v1/object/list/{urllib.parse.quote(bucket)}",
            {
                "prefix": prefix,
                "limit": 1000,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"},
            },
        )
        if not page:
            break
        for item in page:
            name = str(item.get("name", ""))
            full_name = f"{prefix}/{name}".strip("/")
            if item.get("id"):
                result.append({**item, "full_name": full_name})
            else:
                result.extend(list_objects(bucket, full_name))
        if len(page) < 1000:
            break
        offset += len(page)
    return result


def download(bucket: str, path: str, destination: pathlib.Path) -> tuple[str, int]:
    encoded_path = "/".join(urllib.parse.quote(part, safe="") for part in path.split("/"))
    request = urllib.request.Request(
        f"{BASE_URL}/storage/v1/object/authenticated/{urllib.parse.quote(bucket)}/{encoded_path}",
        headers={"Authorization": f"Bearer {SERVICE_KEY}", "apikey": SERVICE_KEY},
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256()
    size = 0
    with urllib.request.urlopen(request, timeout=120) as response, destination.open("wb") as target:
        while chunk := response.read(1024 * 1024):
            target.write(chunk)
            digest.update(chunk)
            size += len(chunk)
    return digest.hexdigest(), size


def main() -> int:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest: dict = {"schema_version": 1, "buckets": {}, "files": []}
    for bucket in BUCKETS:
        objects = list_objects(bucket)
        manifest["buckets"][bucket] = len(objects)
        for item in objects:
            path = item["full_name"]
            digest, size = download(bucket, path, OUTPUT / bucket / pathlib.PurePosixPath(path))
            manifest["files"].append(
                {"bucket": bucket, "path": path, "sha256": digest, "size": size}
            )
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({"files": len(manifest["files"]), "buckets": manifest["buckets"]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
