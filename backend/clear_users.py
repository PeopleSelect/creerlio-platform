"""
Script to clear all users from the database
"""

import sys
import os
from pathlib import Path

# Load environment variables if .env exists
env_path = Path(__file__).parent.parent / '.env'
if env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(env_path)

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db, DATABASE_URL
from app.models import User

def clear_all_users():
    """Delete all users from the database"""
    print(f"Database URL: {DATABASE_URL}")
    print("Connecting to database...")
    
    db = SessionLocal()
    try:
        # Get count before deletion
        count = db.query(User).count()
        print(f"Found {count} user(s) in database")
        
        if count == 0:
            print("No users to delete.")
            return
        
        # Delete all users
        db.query(User).delete()
        db.commit()
        
        print(f"Successfully deleted {count} user(s) from the database")
        
        # Verify deletion
        remaining = db.query(User).count()
        print(f"Remaining users: {remaining}")
        
    except Exception as e:
        db.rollback()
        print(f"Error clearing users: {str(e)}")
        print("\nTip: Make sure your database is running and DATABASE_URL is correct.")
        print("For SQLite, use: sqlite:///./creerlio.db")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    print("Clearing all users from database...")
    print("-" * 50)
    clear_all_users()
    print("-" * 50)
    print("Done!")
