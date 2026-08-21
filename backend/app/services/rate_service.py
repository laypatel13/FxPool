from datetime import date

# Placeholder base spot rate + interest rates.
# Swap for a live spot-rate feed later; formula/shape stays the same.
SPOT_RATE_INR_PER_UNIT = {"USD": 84.00, "EUR": 91.00, "GBP": 106.00}
DOMESTIC_INTEREST_RATE = 0.065   # INR
FOREIGN_INTEREST_RATE = {"USD": 0.045, "EUR": 0.035, "GBP": 0.04}


def compute_indicative_forward_rate(currency: str, due_date: date) -> float:
    """Interest-rate-differential forward pricing:
    Forward = Spot * (1 + r_domestic * t) / (1 + r_foreign * t)
    """
    currency = currency.upper()
    if currency not in SPOT_RATE_INR_PER_UNIT:
        raise ValueError(f"Unsupported currency: {currency}")

    days = max((due_date - date.today()).days, 0)
    t = days / 365

    spot = SPOT_RATE_INR_PER_UNIT[currency]
    r_dom = DOMESTIC_INTEREST_RATE
    r_for = FOREIGN_INTEREST_RATE[currency]

    forward = spot * (1 + r_dom * t) / (1 + r_for * t)
    return round(forward, 4)
