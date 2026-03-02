# Attendance Tab — Frontend Integration Guide

This document covers the three API endpoints needed to build the attendance tab on an event detail page.

## 1. Load the attendance list

Fetches all invitees for an event along with a stats summary.

```
GET /api/attendances/event/:eventId
Authorization: Bearer <token>
```

### Path params

| Param | Type | Description |
|---|---|---|
| `eventId` | number | Numeric ID of the event |

### Response `200`

```json
{
  "attendances": [
    {
      "documentId": "abc123",
      "status": "confirmed",
      "is_present": false,
      "notes": null,
      "invited_date": "2026-02-20T10:00:00.000Z",
      "response_date": "2026-02-21T08:30:00.000Z",
      "attended_date": null,
      "person": {
        "first_name": "Juan",
        "last_name": "Pérez",
        "email": "juan@example.com",
        "phone": "555-1234",
        "photo": { "url": "/uploads/juan.jpg" }
      }
    }
  ],
  "stats": {
    "total": 12,
    "confirmed": 8,
    "declined": 1,
    "pending": 3,
    "maybe": 0,
    "present": 2
  }
}
```

### Status values

| Value | Meaning |
|---|---|
| `pending` | Invited, no response yet |
| `confirmed` | Will attend |
| `declined` | Will not attend |
| `maybe` | Uncertain |

### `is_present`

Boolean set to `true` once the user physically checks in on event day. Independent of `status`.

---

## 2. Set attendance status (Responder)

The logged-in user sets (or updates) their own response. Can be called multiple times — it upserts.

```
POST /api/attendances/respond
Authorization: Bearer <token>
Content-Type: application/json
```

### Request body

```json
{
  "eventId": 42,
  "status": "confirmed",
  "notes": "Llegaré 10 minutos tarde"
}
```

| Field | Type | Required | Values |
|---|---|---|---|
| `eventId` | number | ✅ | Numeric event ID |
| `status` | string | ✅ | `confirmed` \| `declined` \| `maybe` \| `pending` |
| `notes` | string | ❌ | Free text, optional |

### Response `200`

```json
{
  "success": true,
  "message": "Respuesta registrada exitosamente",
  "attendance": {
    "documentId": "abc123",
    "status": "confirmed",
    "notes": "Llegaré 10 minutos tarde",
    "response_date": "2026-02-27T14:22:00.000Z"
  }
}
```

### Error cases

| Status | Meaning |
|---|---|
| `400` | User has no linked `person` record, or event has no choir assigned |
| `403` | Logged-in user is not a member of the event's choir |

> **Who can respond?** Only choir members linked to the event. The backend validates membership automatically — do not show the button for users who are not members.

---

## 3. Check in (marcar presente)

Marks the user as physically present. Only the user themselves can check in their own record.

```
PUT /api/attendances/:attendanceId/check-in
Authorization: Bearer <token>
```

### Path params

| Param | Type | Description |
|---|---|---|
| `attendanceId` | string | `documentId` from the attendance record (e.g. `"abc123"`) |

> Use the `documentId` field from the list response — **not** the numeric `id`.

### Response `200`

```json
{
  "success": true,
  "message": "Presencia registrada exitosamente",
  "attendance": {
    "documentId": "abc123",
    "is_present": true,
    "attended_date": "2026-02-27T18:05:00.000Z"
  }
}
```

### Error cases

| Status | Meaning |
|---|---|
| `403` | Trying to check in someone else's attendance |
| `404` | Attendance record not found |

---

## Suggested component logic

```
onMount:
  → GET /api/attendances/event/:eventId
  → display list + stats header
  → find current user's attendance record from the list
      (match person.email or store attendanceId after login)

"Responder" button (current user's row only):
  → show a dropdown: Confirmar / No asisto / Tal vez
  → POST /api/attendances/respond  { eventId, status }
  → refetch list or update local state

"Check-in" button (current user's row only, on event day):
  → PUT /api/attendances/:attendanceId/check-in
  → update is_present = true in local state
  → hide the button (already checked in)
```

---

## Identifying the current user's attendance record

After loading the list, find the current user's entry by matching `person.email` against the logged-in user's email (available from the JWT payload or a `/users/me` call). Store the `documentId` from that record — you'll need it for the check-in call.

```js
const myAttendance = attendances.find(a => a.person.email === currentUser.email);
// myAttendance.documentId  → used for check-in
// myAttendance.status      → shown in UI
// myAttendance.is_present  → hide check-in button if true
```
