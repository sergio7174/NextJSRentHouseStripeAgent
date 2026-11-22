import base64
import json
import os
from typing import Any
import httpx
from langchain_core.tools import tool


def _format_house(h: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(h.get("_id") or h.get("id") or ""),
        "houseCode": h.get("houseCode") or h.get("code") or "N/A",
        "city": h.get("city") or "",
        "state": h.get("state") or h.get("stateRegion") or "",
        "street": h.get("street") or "",
        "rentPrice": h.get("rentPrice") if h.get("rentPrice") is not None else h.get("price"),
        "totalRooms": h.get("totalRooms") if h.get("totalRooms") is not None else h.get("rooms"),
        "booked": bool(h.get("booked") or h.get("isBooked")),
        "description": h.get("description") or "",
    }


def _format_booking(b: dict[str, Any]) -> dict[str, Any]:
    house_ref = b.get("houseId") or b.get("house")
    tenant_ref = b.get("tenantId") or b.get("tenant") or b.get("userId")
    return {
        "id": str(b.get("_id") or b.get("id") or ""),
        "houseId": _clean_id(house_ref.get("_id") if isinstance(house_ref, dict) else house_ref),
        "houseCode": house_ref.get("houseCode") if isinstance(house_ref, dict) else b.get("houseCode"),
        "tenantId": _clean_id(tenant_ref.get("_id") if isinstance(tenant_ref, dict) else tenant_ref),
        "tenantName": tenant_ref.get("fullName") or tenant_ref.get("name") if isinstance(tenant_ref, dict) else b.get("tenantName"),
        "checkInDate": b.get("checkInDate") or b.get("startDate") or b.get("fromDate") or "",
        "checkOutDate": b.get("checkOutDate") or b.get("endDate") or b.get("toDate") or "",
        "status": b.get("status") or ("Active" if b.get("booked") else "Confirmed"),
    }

def _clean_id(val: str | None) -> str | None:
    if not val:
        return None
    cleaned = str(val).strip()
    if cleaned.lower() in ("", "none", "null", "undefined"):
        return None
    return cleaned

def _id_from_jwt(token: str | None) -> str | None:
    if not token:
        return None
    try:
        parts = token.split(".")
        if len(parts) < 2:
            return None
        payload_b64 = parts[1] + "=" * (-len(parts[1]) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
        return _clean_id(payload.get("id") or payload.get("_id") or payload.get("userId"))
    except Exception:
        return None


def _extract_list(payload: Any, keys: tuple[str, ...]) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        for key in keys:
            val = payload.get(key)
            if isinstance(val, list):
                return val
    return []

async def _resolve_house_details(
    client: httpx.AsyncClient,
    base_url: str,
    house_id_or_code: str,
    headers: dict[str, str],
) -> tuple[str, str | None]:
    cleaned = (house_id_or_code or "").strip()

    for endpoint in (
        f"{base_url}/api/house/listAllHouses",
        f"{base_url}/api/house/getAllHouses",
        f"{base_url}/api/house",
    ):
        try:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                payload = resp.json()
                items = (
                    payload
                    if isinstance(payload, list)
                    else (
                        payload.get("data")
                        or payload.get("houses")
                        or payload.get("allHouses")
                        or []
                    )
                )
                for h in items:
                    oid = str(h.get("_id") or h.get("id") or "").strip()
                    code = str(h.get("houseCode") or h.get("code") or "").strip()
                    if oid == cleaned or (code and code.lower() == cleaned.lower()):
                        owner_email = (
                            h.get("owneremail")
                            or h.get("ownerEmail")
                            or h.get("email")
                        )
                        return (
                            oid or cleaned,
                            str(owner_email).strip() if owner_email else None,
                        )
        except httpx.HTTPError:
            continue

    return cleaned, None


@tool
async def search_available_houses(
    city: str | None = None,
    max_rent: float | None = None,
    min_rooms: int | None = None,
    auth_token: str | None = None,
) -> dict[str, Any]:
    """Search unbooked rental houses from the Node.js backend with optional filters."""
    base_url = os.getenv("NODE_API_BASE_URL", "http://localhost:3001").rstrip("/")
    headers: dict[str, str] = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{base_url}/api/house/listAllHousesBookedFalse",
            headers=headers,
        )
        response.raise_for_status()
        payload = response.json()

    # Handle either a raw list or { data: [...] } / { houses: [...] }
    if isinstance(payload, list):
        houses = payload
    else:
        houses = payload.get("data") or payload.get("houses") or []

    filtered: list[dict[str, Any]] = []
    for house in houses:
        house_city = str(house.get("city", "")).lower()
        rent = house.get("rentPrice")
        if rent is None:
            rent = house.get("price")
        rooms = house.get("totalRooms")
        if rooms is None:
            rooms = house.get("rooms")

        if city and city.lower() not in house_city:
            continue
        if max_rent is not None and rent is not None and float(rent) > max_rent:
            continue
        if min_rooms is not None and rooms is not None and int(rooms) < min_rooms:
            continue

        filtered.append(house)

    return {
        "count": len(filtered),
        "houses": filtered[:10],
    }

#  second tool to get_owner_houses_and_bookings

@tool
async def get_owner_houses_and_bookings(
    owner_id: str | None = None,
    auth_token: str | None = None,
) -> dict[str, Any]:
    """Fetch an Owner's houses and related booking records from the Node.js backend."""
    base_url = os.getenv("NODE_API_BASE_URL", "http://localhost:3001").rstrip("/")
    resolved_owner_id = _clean_id(owner_id) or _id_from_jwt(auth_token)

    print("tools - resolved_owner_id:", resolved_owner_id)

    headers: dict[str, str] = {}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    if not resolved_owner_id:
        return {
            "error": "Could not determine owner_id from user_id or auth_token.",
            "house_count": 0,
            "houses": [],
            "booking_count": 0,
            "bookings": [],
        }

    houses: list[dict[str, Any]] = []
    bookings: list[dict[str, Any]] = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        house_endpoints = [
            f"{base_url}/api/house/GetListAllHousesByOwnerId/{resolved_owner_id}",
            f"{base_url}/api/house/listAllbyOwnerBtrue/{resolved_owner_id}",
          
        ]
        
        for endpoint in house_endpoints:
            resp = await client.get(endpoint, headers=headers)
            print(f"HOUSE ENDPOINT {endpoint} -> {resp.status_code}")
            if resp.status_code == 200:
                raw_json = resp.json()
                houses = _extract_list(
                    raw_json,
                    ("data", "houses", "allHouses", "ownerHouses", "result", "listHouses"),
                )
                if houses:
                    print("SAMPLE HOUSE KEYS:", list(houses[0].keys()))
                    break

        booking_endpoints = [
            f"{base_url}/api/booking/listAllBookingsByOwnerId/{resolved_owner_id}",
            
        ]
        
        for endpoint in booking_endpoints:
            resp = await client.get(endpoint, headers=headers)
            print(f"BOOKING ENDPOINT {endpoint} -> {resp.status_code}")
            if resp.status_code == 200:
                raw_json = resp.json()
                bookings = _extract_list(
                    raw_json,
                    ("data", "bookings", "allBookings", "result", "listBookings"),
                )
                if bookings:
                    print("SAMPLE BOOKING KEYS:", list(bookings[0].keys()))
                    break

    formatted_houses = [_format_house(h) for h in houses[:10]]
    formatted_bookings = [_format_booking(b) for b in bookings[:10]]

    return {
        "owner_id": resolved_owner_id,
        "house_count": len(houses),
        "houses": formatted_houses,
        "booking_count": len(bookings),
        "bookings": formatted_bookings,
    }
# tools 3 and 4

@tool
async def create_booking(
    house_id: str,
    tenant_id: str | None = None,
    check_in_date: str | None = None,
    check_out_date: str | None = None,
    role: str = "Tenant",
    auth_token: str | None = None,
) -> dict[str, Any]:
    """Create a house booking in the Node.js backend. Only allowed when role is 'Tenant'."""
    """Create a house booking in the Node.js backend after resolving house_id."""
    base_url = os.getenv("NODE_API_BASE_URL", "http://localhost:3001").rstrip("/")
    resolved_tenant_id = _clean_id(tenant_id) or _id_from_jwt(auth_token)

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    timeout = httpx.Timeout(30.0, connect=10.0)
    async with httpx.AsyncClient(timeout=timeout) as client:
        #resolved_house_id, resolved_owner_email = await _resolve_house_object_id(
        #    client, base_url, house_id, headers)
        resolved_house_id, resolved_owner_email = await _resolve_house_details(
        client, base_url, house_id, headers ) # this is the new function to resolve the house_id and owner_email
        
    if role != "Tenant":
        return {
            "ok": False,
            "error": f"Permission denied: role '{role}' cannot create bookings. Only 'Tenant' can book houses.",
        }
    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
         resolved_house_id = await _resolve_house_object_id(
           client, base_url, house_id, headers
    )

    if not house_id.strip():
        return {"ok": False, "error": "house_id is required to create a booking."}

    base_url = os.getenv("NODE_API_BASE_URL", "http://localhost:3001").rstrip("/")
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    house_image = "/uploads/default-house.jpg"

    payload: dict[str, Any] = {"houseId": resolved_house_id,
                               "image": house_image}
    if resolved_owner_email:
        payload["owneremail"] = resolved_owner_email
    if tenant_id:
        payload["tenantId"] = tenant_id.strip()
    if check_in_date:
        payload["checkInDate"] = check_in_date.strip()
    if check_out_date:
        payload["checkOutDate"] = check_out_date.strip()

    booking_endpoints = [
        f"{base_url}/api/booking/createbooking",
        
    ]

    async with httpx.AsyncClient(timeout=15.0) as client:
        last_error = ""
        for endpoint in booking_endpoints:
            resp = await client.post(endpoint, json=payload, headers=headers)
            if resp.status_code in (200, 201):
                return {
                    "ok": True,
                    "endpoint": endpoint,
                    "response": resp.json() if resp.content else {},
                }
            last_error = f"{endpoint} returned {resp.status_code}: {resp.text}"

    return {"ok": False, "error": last_error or "Failed to create booking."}


@tool
async def create_house_listing(
    house_code: str,
    rent_price: float,
    city: str,
    state_region: str = "Carabobo",
    street: str = "",
    zip_code: str = "",
    landmark: str = "",
    total_rooms: int = 1,
    legal_documents: str = "",
    description: str = "",
    owner_id: str | None = None,
    role: str = "Owner",
    auth_token: str | None = None,
) -> dict[str, Any]:
    """Create a new house listing in the Node.js backend. Only allowed when role is 'Owner'."""
    if role != "Owner":
        return {
            "ok": False,
            "error": f"Permission denied: role '{role}' cannot create house listings. Only 'Owner' can create houses.",
        }

    if not house_code.strip() or not city.strip():
        return {"ok": False, "error": "house_code and city are required to create a house."}

    base_url = os.getenv("NODE_API_BASE_URL", "http://localhost:3001").rstrip("/")
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if auth_token:
        headers["Authorization"] = f"Bearer {auth_token}"

    payload: dict[str, Any] = {
        "houseCode": house_code.strip(),
        "rentPrice": rent_price,
        "city": city.strip(),
        "state": state_region.strip(),
        "street": street.strip(),
        "zipCode": zip_code.strip(),
        "landmark": landmark.strip(),
        "totalRooms": total_rooms,
        "legalDocuments": legal_documents.strip(),
        "description": description.strip(),
    }
    if owner_id:
        payload["ownerId"] = owner_id.strip()

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            f"{base_url}/api/house/createhouse",
            json=payload,
            headers=headers,
        )
        if resp.status_code in (200, 201):
            return {
                "ok": True,
                "response": resp.json() if resp.content else {},
            }
        return {
            "ok": False,
            "error": f"POST /api/house/createhouse returned {resp.status_code}: {resp.text}",
        }

import re

OBJECT_ID_RE = re.compile(r"^[0-9a-fA-F]{24}$")


async def _resolve_house_object_id(
    client: httpx.AsyncClient,
    base_url: str,
    house_id_or_code: str,
    headers: dict[str, str],
) -> str:
    cleaned = (house_id_or_code or "").strip()
    if OBJECT_ID_RE.match(cleaned):
        return cleaned

    for endpoint in (
        f"{base_url}/api/house/listAllHouses",
        f"{base_url}/api/house/getAllHouses",
        f"{base_url}/api/house",
    ):
        try:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code == 200:
                payload = resp.json()
                items = (
                    payload
                    if isinstance(payload, list)
                    else (
                        payload.get("data")
                        or payload.get("houses")
                        or payload.get("allHouses")
                        or []
                    )
                )
                for h in items:
                    code = str(h.get("houseCode") or h.get("code") or "").strip()
                    oid = str(h.get("_id") or h.get("id") or "").strip()
                    if code.lower() == cleaned.lower() and oid:
                        return oid
        except httpx.HTTPError:
            continue

    return cleaned


    # to run this script
    # uvicorn main:app --reload --port 8000