#!/usr/bin/env python3
import os
import secrets
import sys
import uuid
import bcrypt
import psycopg
from psycopg.rows import dict_row

# Configuration for local development
DB_USER = os.getenv("DB_USER", "cdp")
DB_PASSWORD = os.getenv("DB_PASSWORD", "dev_only")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5014")
DB_NAME = os.getenv("DB_NAME", "cdp_authentication")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

SERVICES_TO_SEED = [
    {
        "name": "Capabilities Service",
        "slug": "capabilities",
        "base_url": "http://capabilities:8019"
    },
    {
        "name": "Python Template",
        "slug": "python-template",
        "base_url": "http://python-template:8018"
    }
]

def generate_uuid7() -> str:
    # A simple UUID v4 works as a fallback, but we'll try to generate a v7 if the uuid module supports it.
    # Python 3.13+ supports uuid7, but we can just let postgres server_default handle it if we omit it,
    # or fallback to uuid4 since it's just a seed script.
    return str(uuid.uuid4())

def main():
    print(f"Connecting to {DATABASE_URL}...")
    try:
        conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    except psycopg.OperationalError as e:
        print(f"Error connecting to database: {e}")
        print("Ensure the cdp-authentication-postgres container is running (docker compose up -d authentication-postgres)")
        sys.exit(1)

    print("\n--- Generating Service Credentials ---\n")

    env_output = []

    with conn.cursor() as cur:
        # We simulate the system actor
        sys_uuid = "00000000-0000-7000-8000-000000000000"
        cur.execute(f"SET LOCAL app.current_actor_uuid = '{sys_uuid}'")
        cur.execute("SET LOCAL app.current_actor_type = '2'")

        for svc in SERVICES_TO_SEED:
            plain_secret = secrets.token_urlsafe(32)
            hashed_secret = bcrypt.hashpw(plain_secret.encode(), bcrypt.gensalt()).decode()

            # Insert or update service
            cur.execute("""
                INSERT INTO services (name, slug, base_url)
                VALUES (%s, %s, %s)
                ON CONFLICT (name) DO UPDATE 
                SET slug = EXCLUDED.slug, base_url = EXCLUDED.base_url
                RETURNING uuid;
            """, (svc["name"], svc["slug"], svc["base_url"]))
            
            service_uuid = cur.fetchone()["uuid"]

            # Insert or update credentials
            cur.execute("""
                INSERT INTO service_credentials (service_uuid, hashed_secret)
                VALUES (%s, %s)
                ON CONFLICT (service_uuid) DO UPDATE 
                SET hashed_secret = EXCLUDED.hashed_secret;
            """, (service_uuid, hashed_secret))
            
            env_var_prefix = svc["slug"].replace("-", "_").upper()
            env_output.append(f"# {svc['name']}")
            env_output.append(f"{env_var_prefix}_CLIENT_ID={svc['slug']}")
            env_output.append(f"{env_var_prefix}_CLIENT_SECRET={plain_secret}\n")

            print(f"✅ Registered: {svc['name']} (slug: {svc['slug']})")

        conn.commit()
    
    conn.close()

    print("\n--- Add these to your .env files ---\n")
    print("\n".join(env_output))

if __name__ == "__main__":
    main()
