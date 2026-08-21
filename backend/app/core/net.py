"""
Forces IPv4-only DNS resolution for this process.

Why this exists: on some networks (this Mac included), the machine has an
IPv6 route that *looks* valid but goes nowhere. Tools like curl and browsers
use "happy eyeballs" — they race IPv4 and IPv6 connection attempts in
parallel and use whichever answers first, so a dead IPv6 route is invisible
to them. Python's standard networking stack (used by httpx, requests,
urllib, and therefore by supabase-py and PyJWT's PyJWKClient) does not do
this — it tries addresses one at a time, in the order the OS returns them.
If IPv6 is tried first and is dead, every outbound call from this process
hangs until the OS-level IPv6 connection attempt times out (commonly 60-150s)
before it falls back to IPv4.

Importing this module patches socket.getaddrinfo so only IPv4 addresses are
ever returned, process-wide. This must be imported before any other module
that might open a network connection (see app/main.py).
"""

import socket

_original_getaddrinfo = socket.getaddrinfo


def _ipv4_only_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
    return _original_getaddrinfo(host, port, socket.AF_INET, type, proto, flags)


socket.getaddrinfo = _ipv4_only_getaddrinfo
