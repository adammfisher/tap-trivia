"""
Resolve an IP address to a normalized geo dict using the MaxMind
GeoLite2-City database stored in S3 and a bundled zip-to-DMA lookup.

resolve_ip(ip) -> {city, state, zip, lat, lng, timezone, dma}

The .mmdb is downloaded from s3://taptrivia-internal/geoip/GeoLite2-City.mmdb
into /tmp on cold start and reused across invocations. It is re-downloaded
only if the S3 object's LastModified is newer than the cached copy.
"""
import json
import os
import threading
from pathlib import Path
from typing import Any, Optional

import boto3
import maxminddb

GEOIP_BUCKET = os.environ.get("GEOIP_BUCKET", "taptrivia-internal")
GEOIP_KEY = os.environ.get("GEOIP_KEY", "geoip/GeoLite2-City.mmdb")
LOCAL_MMDB = Path(os.environ.get("GEOIP_LOCAL_PATH", "/tmp/GeoLite2-City.mmdb"))

_lock = threading.Lock()
_reader: Optional[maxminddb.Reader] = None
_local_mtime: float = 0.0
_zip_to_dma: Optional[dict] = None

_DATA_DIR = Path(__file__).parent / "data"
_ZIP_DMA_PATH = _DATA_DIR / "zip_to_dma.json"


class GeoIPError(Exception):
    pass


def _load_zip_to_dma() -> dict:
    global _zip_to_dma
    if _zip_to_dma is None:
        with open(_ZIP_DMA_PATH, "r") as f:
            _zip_to_dma = json.load(f)
    return _zip_to_dma


def _ensure_mmdb() -> maxminddb.Reader:
    global _reader, _local_mtime

    s3 = boto3.client("s3")

    # Check S3 LastModified to decide if a refresh is needed.
    try:
        head = s3.head_object(Bucket=GEOIP_BUCKET, Key=GEOIP_KEY)
        s3_mtime = head["LastModified"].timestamp()
    except Exception as e:
        if _reader is not None:
            return _reader
        raise GeoIPError(f"GeoLite2-City.mmdb not found in S3: {e}") from e

    with _lock:
        need_download = (
            _reader is None
            or not LOCAL_MMDB.exists()
            or s3_mtime > _local_mtime
        )
        if need_download:
            tmp = LOCAL_MMDB.with_suffix(".mmdb.tmp")
            s3.download_file(GEOIP_BUCKET, GEOIP_KEY, str(tmp))
            tmp.replace(LOCAL_MMDB)
            _local_mtime = s3_mtime
            if _reader is not None:
                try:
                    _reader.close()
                except Exception:
                    pass
            _reader = maxminddb.open_database(str(LOCAL_MMDB))
        elif _reader is None:
            _reader = maxminddb.open_database(str(LOCAL_MMDB))

    return _reader


def _pick_subdivision_iso(record: dict) -> Optional[str]:
    subs = record.get("subdivisions") or []
    if not subs:
        return None
    return subs[0].get("iso_code")


def _dma_for_zip(zip_code: Optional[str]) -> dict:
    if not zip_code:
        return {"dma_code": None, "dma_name": None}
    z = zip_code.split("-")[0].zfill(5)
    entry = _load_zip_to_dma().get(z)
    if not entry:
        return {"dma_code": None, "dma_name": None}
    return {"dma_code": entry["dma_code"], "dma_name": entry["dma_name"]}


def resolve_ip(ip: str) -> dict[str, Any]:
    """
    Resolve an IPv4/IPv6 address to:
      {city, state, zip, lat, lng, timezone, dma_code, dma_name}

    Returns all-None fields if MaxMind has no record for the IP. Never
    raises for missing data (only for missing infra: S3 / mmdb).
    """
    reader = _ensure_mmdb()
    record = reader.get(ip)
    if record is None:
        return {
            "city": None,
            "state": None,
            "zip": None,
            "lat": None,
            "lng": None,
            "timezone": None,
            "dma_code": None,
            "dma_name": None,
        }

    city = (record.get("city") or {}).get("names", {}).get("en")
    state = _pick_subdivision_iso(record)
    postal = (record.get("postal") or {}).get("code")
    location = record.get("location") or {}
    lat = location.get("latitude")
    lng = location.get("longitude")
    tz = location.get("time_zone")

    dma = _dma_for_zip(postal)

    return {
        "city": city,
        "state": state,
        "zip": postal,
        "lat": lat,
        "lng": lng,
        "timezone": tz,
        "dma_code": dma["dma_code"],
        "dma_name": dma["dma_name"],
    }
