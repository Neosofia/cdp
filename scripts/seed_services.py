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
        "name": "User Service",
        "slug": "user",
        "base_url": "http://user:8018",
    },
    {
        "name": "Python Template",
        "slug": "python-template",
        "base_url": "http://python-template:8900",
    },
]

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
        sys_uuid = uuid.UUID("00000000-0000-7000-8000-000000000000")

        for svc in SERVICES_TO_SEED:
            plain_secret = secrets.token_urlsafe(32)
            hashed_secret = bcrypt.hashpw(plain_secret.encode(), bcrypt.gensalt()).decode()

            # Insert or update service
            cur.execute("""
                INSERT INTO services (name, slug, base_url, changed_by_uuid, changed_by_type)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (name) DO UPDATE 
                SET slug = EXCLUDED.slug, base_url = EXCLUDED.base_url
                RETURNING uuid;
            """, (svc["name"], svc["slug"], svc["base_url"], sys_uuid, 2))

            service_uuid = cur.fetchone()["uuid"]

            # Insert credential only if none exists for this service
            cur.execute("""
                INSERT INTO service_credentials (service_uuid, hashed_secret, changed_by_uuid, changed_by_type)
                SELECT %s, %s, %s, %s
                WHERE NOT EXISTS (
                    SELECT 1 FROM service_credentials WHERE service_uuid = %s
                );
            """, (service_uuid, hashed_secret, sys_uuid, 2, service_uuid))
            
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
