"""Supabase clients used by the read API and the write-only ETL pipeline."""

import os
from functools import lru_cache

from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL must be set in the environment")

# Read endpoints should use the least-privileged anon key. The service key is
# accepted as a local fallback so backend-only deployments can still start.
READ_KEY = SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY
if not READ_KEY:
    raise ValueError("SUPABASE_ANON_KEY (or SUPABASE_SERVICE_KEY) must be set")

supabase: Client = create_client(SUPABASE_URL, READ_KEY)


@lru_cache(maxsize=1)
def get_admin_client() -> Client:
    """Return the service-role client required for ETL writes."""
    if not SUPABASE_SERVICE_KEY:
        raise ValueError(
            "SUPABASE_SERVICE_KEY is required for ETL writes; the anon key is read-only"
        )
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
