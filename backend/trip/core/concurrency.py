"""Small helpers for parallel I/O."""
from __future__ import annotations

from collections.abc import Callable, Iterable
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import TypeVar

T = TypeVar("T")
R = TypeVar("R")


def run_parallel(
    items: Iterable[T],
    fn: Callable[[T], R],
    *,
    max_workers: int,
) -> list[R]:
    """Run *fn* over *items* and return results in completion order."""
    item_list = list(items)
    if not item_list:
        return []
    workers = min(len(item_list), max_workers)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = [pool.submit(fn, item) for item in item_list]
        return [f.result() for f in as_completed(futures)]


def run_parallel_mapped(
    items: Iterable[T],
    fn: Callable[[T], R],
    *,
    max_workers: int,
) -> dict[T, R]:
    """Run *fn* over *items*; return a map from each item to its result."""
    item_list = list(items)
    if not item_list:
        return {}
    workers = min(len(item_list), max_workers)
    with ThreadPoolExecutor(max_workers=workers) as pool:
        future_to_item = {pool.submit(fn, item): item for item in item_list}
        return {future_to_item[f]: f.result() for f in as_completed(future_to_item)}
