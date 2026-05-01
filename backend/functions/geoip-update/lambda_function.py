"""
geoip-update Lambda

Two actions:
  - "update" (default, EventBridge monthly): download GeoLite2-City.mmdb
    from MaxMind, upload to s3://taptrivia-internal/geoip/GeoLite2-City.mmdb
  - "test": call resolve_ip(ip) for a list of IPs and return results

Credentials come from Secrets Manager: taptrivia/geoip/maxmind-credentials
({"account_id": "...", "license_key": "..."}).
"""
import io
import json
import logging
import os
import tarfile
import time
import urllib.request

import boto3

from geoip_resolver import resolve_ip

log = logging.getLogger()
log.setLevel(logging.INFO)

GEOIP_BUCKET = os.environ.get("GEOIP_BUCKET", "taptrivia-internal")
GEOIP_KEY = os.environ.get("GEOIP_KEY", "geoip/GeoLite2-City.mmdb")
SECRET_ID = os.environ.get(
    "MAXMIND_SECRET_ID", "taptrivia/geoip/maxmind-credentials"
)
DOWNLOAD_URL_TMPL = (
    "https://download.maxmind.com/app/geoip_download"
    "?edition_id=GeoLite2-City&license_key={key}&suffix=tar.gz"
)


def _get_credentials() -> dict:
    sm = boto3.client("secretsmanager")
    resp = sm.get_secret_value(SecretId=SECRET_ID)
    return json.loads(resp["SecretString"])


def _download_tar_gz(license_key: str) -> bytes:
    url = DOWNLOAD_URL_TMPL.format(key=license_key)
    req = urllib.request.Request(url, headers={"User-Agent": "taptrivia-geoip/1.0"})
    with urllib.request.urlopen(req, timeout=120) as r:
        if r.status != 200:
            raise RuntimeError(f"MaxMind download returned HTTP {r.status}")
        return r.read()


def _extract_mmdb(tar_gz_bytes: bytes) -> bytes:
    with tarfile.open(fileobj=io.BytesIO(tar_gz_bytes), mode="r:gz") as tar:
        for member in tar.getmembers():
            if member.isfile() and member.name.endswith("GeoLite2-City.mmdb"):
                f = tar.extractfile(member)
                if f is None:
                    continue
                return f.read()
    raise RuntimeError("GeoLite2-City.mmdb not found in tar.gz")


def _do_update() -> dict:
    creds = _get_credentials()
    license_key = creds["license_key"]

    log.info("Downloading GeoLite2-City tar.gz from MaxMind")
    t0 = time.time()
    tar_bytes = _download_tar_gz(license_key)
    log.info("Downloaded %d bytes in %.1fs", len(tar_bytes), time.time() - t0)

    log.info("Extracting .mmdb")
    mmdb_bytes = _extract_mmdb(tar_bytes)
    log.info("Extracted mmdb size: %d bytes", len(mmdb_bytes))

    s3 = boto3.client("s3")
    s3.put_object(
        Bucket=GEOIP_BUCKET,
        Key=GEOIP_KEY,
        Body=mmdb_bytes,
        ContentType="application/octet-stream",
    )
    log.info("Uploaded to s3://%s/%s", GEOIP_BUCKET, GEOIP_KEY)

    return {
        "ok": True,
        "bucket": GEOIP_BUCKET,
        "key": GEOIP_KEY,
        "mmdb_bytes": len(mmdb_bytes),
        "tar_gz_bytes": len(tar_bytes),
    }


def _do_test(ips: list) -> dict:
    results = {}
    for ip in ips:
        try:
            results[ip] = resolve_ip(ip)
        except Exception as e:
            results[ip] = {"error": str(e)}
    return {"ok": True, "results": results}


def handler(event, context):
    action = (event or {}).get("action", "update")
    log.info("action=%s", action)
    if action == "update":
        return _do_update()
    if action == "test":
        ips = (event or {}).get("ips") or ["8.8.8.8", "1.1.1.1"]
        return _do_test(ips)
    return {"ok": False, "error": f"unknown action: {action}"}
