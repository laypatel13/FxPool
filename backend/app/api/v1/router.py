from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    rates,
    invoices,
    pools,
    bank_pools,
    documents,
)
from app.api.v1.endpoints.admin import (
    pools as admin_pools,
    invoices as admin_invoices,
    settings as admin_settings,
    overview as admin_overview,
    analytics as admin_analytics,
    exporters as admin_exporters,
    banks as admin_banks,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(rates.router)
api_router.include_router(invoices.router)
api_router.include_router(pools.router)
api_router.include_router(bank_pools.router)
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])

api_router.include_router(admin_pools.router)
api_router.include_router(admin_invoices.router)
api_router.include_router(admin_settings.router)
api_router.include_router(admin_overview.router)
api_router.include_router(admin_analytics.router)
api_router.include_router(admin_exporters.router)
api_router.include_router(admin_banks.router)
