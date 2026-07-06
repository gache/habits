"""Minimal in-memory stand-in for the google-cloud-firestore client.

Supports just the chain of calls the routers use (collection/document,
add/get/set/update/delete, where/order_by/limit/stream) so router logic can
be unit-tested without real Firebase credentials.
"""
from uuid import uuid4


def _matches(value, op, target):
    if op == "==":
        return value == target
    if op == ">=":
        return value >= target
    if op == "<=":
        return value <= target
    raise NotImplementedError(f"unsupported operator: {op}")


class FakeDocSnapshot:
    def __init__(self, doc_id, data, store=None, coll_path=None):
        self.id = doc_id
        self._data = data
        self.exists = data is not None
        self._store = store
        self._coll_path = coll_path

    def to_dict(self):
        return dict(self._data) if self._data is not None else None

    @property
    def reference(self):
        return FakeDocRef(self._store, self._coll_path, self.id)


class FakeDocRef:
    def __init__(self, store, coll_path, doc_id):
        self._store = store
        self._coll_path = coll_path
        self.id = doc_id

    def get(self):
        data = self._store.get(self._coll_path, {}).get(self.id)
        return FakeDocSnapshot(self.id, data, self._store, self._coll_path)

    def set(self, data, merge=False):
        coll = self._store.setdefault(self._coll_path, {})
        if merge and self.id in coll:
            coll[self.id].update(data)
        else:
            coll[self.id] = dict(data)

    def update(self, data):
        coll = self._store.setdefault(self._coll_path, {})
        coll.setdefault(self.id, {}).update(data)

    def delete(self):
        self._store.get(self._coll_path, {}).pop(self.id, None)

    def collection(self, name):
        return FakeCollectionRef(self._store, f"{self._coll_path}/{self.id}/{name}")


class FakeCollectionRef:
    def __init__(self, store, path, filters=None, order=None, limit_n=None):
        self._store = store
        self._path = path
        self._filters = filters or []
        self._order = order
        self._limit_n = limit_n

    def document(self, doc_id=None):
        return FakeDocRef(self._store, self._path, doc_id or str(uuid4()))

    def add(self, data):
        doc_id = str(uuid4())
        self._store.setdefault(self._path, {})[doc_id] = dict(data)
        return (None, FakeDocRef(self._store, self._path, doc_id))

    def where(self, field, op, value):
        return FakeCollectionRef(self._store, self._path, self._filters + [(field, op, value)], self._order, self._limit_n)

    def order_by(self, field):
        return FakeCollectionRef(self._store, self._path, self._filters, field, self._limit_n)

    def limit(self, n):
        return FakeCollectionRef(self._store, self._path, self._filters, self._order, n)

    def _matching(self):
        items = list(self._store.get(self._path, {}).items())
        for field, op, value in self._filters:
            items = [(doc_id, data) for doc_id, data in items if _matches(data.get(field), op, value)]
        if self._order:
            items.sort(key=lambda kv: kv[1].get(self._order))
        if self._limit_n is not None:
            items = items[: self._limit_n]
        return items

    def stream(self):
        return [FakeDocSnapshot(doc_id, data, self._store, self._path) for doc_id, data in self._matching()]

    def get(self):
        return self.stream()


class FakeFirestoreClient:
    def __init__(self):
        self._store = {}

    def collection(self, name):
        return FakeCollectionRef(self._store, name)
