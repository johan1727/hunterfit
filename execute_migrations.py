#!/usr/bin/env python3
"""
Execute food database expansion migrations to Supabase
"""
import os
import sys
from supabase import create_client, Client
import time

# Get credentials from environment
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://ckcjjowscsozyyofpsgn.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_KEY:
    print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment")
    sys.exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# SQL files to execute in order
migrations = [
    ("migrations/0005_expand_foods_5000.sql", "Add icon column and insert fruits, vegetables, proteins, etc."),
    ("migrations/0006_expand_foods_part2.sql", "Insert comidas tipicas and snacks (part 1)"),
    ("migrations/0007_expand_foods_part3.sql", "Insert snacks (part 2), bebidas alcohólicas, and suplementos"),
]

def execute_migration(sql_file: str, description: str) -> bool:
    """Execute a single migration file"""
    try:
        # Read the SQL file
        with open(sql_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        print(f"\n{'='*70}")
        print(f"Executing: {description}")
        print(f"File: {sql_file}")
        print(f"{'='*70}")

        # Execute via RPC or direct SQL
        # For now, we'll just print instructions since direct execution requires setup
        print(f"SQL file ready: {len(sql)} characters")
        print("To execute, run in Supabase SQL Editor:")
        print(f"  1. Go to: {SUPABASE_URL}/project/sql")
        print(f"  2. Paste the content from {sql_file}")
        print(f"  3. Click 'Execute'")

        return True

    except Exception as e:
        print(f"ERROR executing {sql_file}: {e}")
        return False

def verify_foods_count() -> int:
    """Verify total foods in database"""
    try:
        response = supabase.table("foods").select("count").execute()
        # Count is in response if available
        print(f"\nCurrent foods in database: ~{response}")
        return response
    except Exception as e:
        print(f"Could not verify count: {e}")
        return 0

if __name__ == "__main__":
    print("HunterFit Food Database Expansion")
    print("=" * 70)
    print(f"Supabase URL: {SUPABASE_URL}")
    print(f"Project ID: ckcjjowscsozyyofpsgn")

    success_count = 0
    for sql_file, description in migrations:
        full_path = f"supabase/{sql_file}"
        if os.path.exists(full_path):
            if execute_migration(full_path, description):
                success_count += 1
            time.sleep(1)
        else:
            print(f"WARNING: {full_path} not found")

    print(f"\n{'='*70}")
    print(f"Migration files prepared: {success_count}/{len(migrations)}")
    print("Next steps:")
    print("1. Open Supabase SQL Editor at:")
    print(f"   {SUPABASE_URL}/project/sql")
    print("2. Execute each migration file in order")
    print("3. Verify results with:")
    print("   SELECT category, COUNT(*) as count FROM foods GROUP BY category ORDER BY count DESC;")
