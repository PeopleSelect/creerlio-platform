"""
Supabase Client Configuration
Provides connection to Supabase for Phase 1 MVP foundation
"""

import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

# Supabase configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", SUPABASE_URL)

# Try to import supabase client
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None


def get_supabase_client(use_service_key: bool = False) -> Optional[Client]:
    """
    Get Supabase client instance
    
    Args:
        use_service_key: If True, use service role key (bypasses RLS)
    
    Returns:
        Supabase client or None if not configured
    """
    if not SUPABASE_AVAILABLE:
        return None
    
    if not SUPABASE_URL:
        return None
    
    key = SUPABASE_SERVICE_KEY if use_service_key else SUPABASE_KEY
    if not key:
        return None
    
    try:
        client: Client = create_client(SUPABASE_URL, key)
        return client
    except Exception as e:
        print(f"Warning: Failed to create Supabase client: {e}")
        return None


# Global client instance (lazy initialization)
_supabase_client: Optional[Client] = None


def get_supabase() -> Optional[Client]:
    """
    Get or create global Supabase client instance
    
    Returns:
        Supabase client or None if not configured
    """
    global _supabase_client
    
    if _supabase_client is None:
        _supabase_client = get_supabase_client()
    
    return _supabase_client
