import os
import sys
import uuid
import random
from dotenv import load_dotenv
from supabase import create_client, Client

# Ensure we're running in the right directory
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Missing Supabase credentials in .env")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# We expect a dummy PDF to exist at this path
DUMMY_PDF_PATH = "/Users/lay/.gemini/antigravity-ide/brain/1f08647c-39b5-402d-b0c5-0674315d6f13/.user_uploaded/media_1787327384525.pdf"

def upload_dummy_file() -> str:
    file_id = str(uuid.uuid4())
    file_path = f"dummy_{file_id}.pdf"
    try:
        with open(DUMMY_PDF_PATH, "rb") as f:
            supabase.storage.from_("invoices").upload(file_path, f.read())
        return file_path
    except Exception as e:
        print(f"Error uploading file, using fallback path. Error: {e}")
        return f"fallback_{file_id}.pdf"

def seed_documents():
    print("Fetching profiles...")
    profiles_res = supabase.table("profiles").select("id, role").eq("role", "exporter").execute()
    exporters = profiles_res.data
    
    if not exporters:
        print("No exporters found to seed.")
        return

    print(f"Found {len(exporters)} exporters.")
    
    print("Fetching invoices...")
    invoices_res = supabase.table("invoices").select("id, exporter_id").execute()
    invoices = invoices_res.data
    
    doc_types = {
        "profile": [
            ("business_kyc", "IEC Certificate"),
            ("business_kyc", "GST Registration"),
            ("individual_kyc", "PAN Card"),
        ],
        "invoice": [
            ("commercial", "Commercial Invoice"),
            ("shipment", "Bill of Lading"),
            ("payment_proof", "FIRC Document"),
        ]
    }
    
    docs_created = 0

    # Seed 5 profile documents
    for _ in range(5):
        exporter = random.choice(exporters)
        cat, name = random.choice(doc_types["profile"])
        file_url = upload_dummy_file()
        
        data = {
            "uploader_id": exporter["id"],
            "entity_type": "profile",
            "entity_id": exporter["id"],
            "category": cat,
            "document_name": name,
            "file_url": file_url,
            "status": random.choice(["verified", "pending"])
        }
        supabase.table("documents").insert(data).execute()
        docs_created += 1

    # Seed 10 invoice documents
    if invoices:
        for _ in range(10):
            invoice = random.choice(invoices)
            cat, name = random.choice(doc_types["invoice"])
            file_url = upload_dummy_file()
            
            data = {
                "uploader_id": invoice["exporter_id"],
                "entity_type": "invoice",
                "entity_id": invoice["id"],
                "category": cat,
                "document_name": name,
                "file_url": file_url,
                "status": random.choice(["verified", "pending"])
            }
            supabase.table("documents").insert(data).execute()
            docs_created += 1
            
    print(f"Successfully seeded {docs_created} dummy documents!")

if __name__ == "__main__":
    seed_documents()
