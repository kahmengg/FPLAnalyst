"""Supabase clients used by the read API and the write-only ETL pipeline."""

import os
import socket
import time
from functools import lru_cache
from urllib.parse import urlparse

from httpx import ConnectError
from postgrest.exceptions import APIError
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_PUBLIC_KEY = (
    os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
    or os.getenv("SUPABASE_ANON_KEY", "").strip()
)
SUPABASE_ADMIN_KEY = (
    os.getenv("SUPABASE_SECRET_KEY", "").strip()
    or os.getenv("SUPABASE_SERVICE_KEY", "").strip()
)

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL must be set in the environment")

# Read endpoints use a least-privileged publishable key. Legacy anon and
# service-role variables remain supported during Supabase's key migration.
READ_KEY = SUPABASE_PUBLIC_KEY or SUPABASE_ADMIN_KEY
if not READ_KEY:
    raise ValueError(
        "SUPABASE_PUBLISHABLE_KEY (or legacy SUPABASE_ANON_KEY) must be set"
    )

supabase: Client = create_client(SUPABASE_URL, READ_KEY)


def validate_supabase_connection() -> None:
    """Fail early with an actionable message when DNS or schema setup is invalid."""
    parsed = urlparse(SUPABASE_URL)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError(
            "SUPABASE_URL must be a complete URL such as "
            "https://your-project-ref.supabase.co"
        )

    # Retry DNS briefly because Windows can occasionally return a transient
    # getaddrinfo failure even when the project URL is valid.
    dns_error = None
    for attempt in range(3):
        try:
            socket.getaddrinfo(parsed.hostname, parsed.port or 443)
            dns_error = None
            break
        except socket.gaierror as error:
            dns_error = error
            if attempt < 2:
                time.sleep(1)
    if dns_error:
        raise ConnectionError(
            "The hostname in SUPABASE_URL cannot be resolved. Copy the Project URL "
            "from Supabase Settings > API, check your internet/DNS connection, and retry."
        ) from dns_error

    try:
        # A tiny query verifies PostgREST, the service key, and the core schema
        # before the pipeline replaces either local CSV.
        get_admin_client().table("teams").select("id").limit(1).execute()
    except ConnectError as error:
        raise ConnectionError(
            "Supabase could not be reached. Verify SUPABASE_URL and your network, then retry."
        ) from error
    except APIError as error:
        code = str(getattr(error, "code", ""))
        message = str(error)
        if code in {"401", "403"} or "Invalid API key" in message:
            raise RuntimeError(
                "The Supabase admin key is invalid for this SUPABASE_URL. Copy a "
                "secret key (or legacy service_role key) from the same project's API Keys page."
            ) from error
        if code in {"PGRST205", "42P01"} or "schema cache" in message:
            raise RuntimeError(
                "The FPL database schema is missing. Open the Supabase SQL Editor, "
                "run supabase_schema.sql, then rerun the pipeline."
            ) from error
        raise RuntimeError(
            "Supabase rejected the preflight query. Verify that SUPABASE_SECRET_KEY "
            "belongs to the project referenced by SUPABASE_URL."
        ) from error


@lru_cache(maxsize=1)
def get_admin_client() -> Client:
    """Return the secret/service-role client required for ETL writes."""
    if not SUPABASE_ADMIN_KEY:
        raise ValueError(
            "SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_KEY) is required for ETL writes"
        )
    return create_client(SUPABASE_URL, SUPABASE_ADMIN_KEY)
