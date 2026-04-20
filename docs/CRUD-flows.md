# CRUD Flows — Grocery Buddy

End-to-end traces of operations through the full stack. Each flow follows the Clean Architecture layers: client → AppSync → handler → service → repository → DynamoDB.

---

## Add Item to Grocery List

```
User taps "Add Item" → fills in name, quantity → submits
          │
          ▼
listContext.tsx
  calls AppSync mutation: addItem(listId, input)
  attaches ID token from SecureStore to Authorization header
          │
          ▼
AppSync
  validates JWT (signature, expiry, issuer against Cognito JWKS)
  injects event.identity.sub → invokes Lambda
          │
          ▼
handler/index.ts
  event.fieldName === 'addItem'
  calls itemService.addItem(userId, listId, input)
          │
          ▼
services/itemService.ts
  1. userRepository.getProfile(userId)                    → resolves householdId
  2. householdRepository.getMember(householdId, userId)   → membership check
  3. builds GroceryItem { id: uuid(), ...input, createdAt, updatedAt }
  4. itemRepository.put(item)
          │
          ▼
repositories/itemRepository.ts
  PutCommand({
    PK: HOUSEHOLD#<householdId>
    SK: ITEM#<listId>#<itemId>
    entityType: ITEM
    ...item
  }) → DynamoDB
          │
          ▼
handler/index.ts
  returns GroceryItem to AppSync
          │
          ▼
AppSync
  fires onListUpdated subscription → pushes to all household members
          │
          ▼
listContext.tsx (all household members' devices)
  receives updated list via subscription
  updates local state → UI re-renders
```

**DynamoDB calls:** 3 — `getProfile`, `getMember`, `putItem`

`getProfile` and `getMember` happen on every household-scoped mutation — this is the membership check pattern from `data-model.md §4`.

---
