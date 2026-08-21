from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    rates,
    invoices,
    pools,
    admin_pools,
    admin_invoices,
    admin_settings,
    admin_overview,
    admin_analytics,
    admin_exporters,
    admin_banks,
    bank_pools,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(rates.router)
api_router.include_router(invoices.router)
api_router.include_router(pools.router)
api_router.include_router(admin_pools.router)
api_router.include_router(admin_invoices.router)
api_router.include_router(admin_settings.router)
api_router.include_router(admin_overview.router)
api_router.include_router(admin_analytics.router)
api_router.include_router(admin_exporters.router)
api_router.include_router(admin_banks.router)
api_router.include_router(bank_pools.router)
