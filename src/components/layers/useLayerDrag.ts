import { useCallback, useEffect, useRef, useState, type RefObject, type PointerEvent as ReactPointerEvent } from 'react';
import { batch } from 'nanostores';
import { $layers, moveLayerToGroup, reorderLayer, toggleGroupCollapsed } from '../../store/iconStore';
import { $hoveredLayerId } from '../../store/uiStore';
import type { Layer } from '../../types/index';

export type DropTarget =
  | { kind: 'between'; parentId: string | null; targetId: string; position: 'before' | 'after'; depth: number; y: number }
  | { kind: 'inside'; groupId: string };

export const LAYER_INDENT = 18;     // px per depth level
const DRAG_THRESHOLD = 4;           // px
const EXPAND_DELAY = 600;           // ms
const SCROLL_EDGE = 40;             // px
const SCROLL_SPEED = 14;            // px per frame
const OUTDENT_X = 52;               // px from the row edge: left of it = root

type Row = { id: string; empty: boolean; layer: Layer; rect: DOMRect };

const targetKey = (t: DropTarget | null) =>
  !t ? '' : t.kind === 'inside' ? `in:${t.groupId}` : `${t.parentId}:${t.targetId}:${t.position}:${t.y}`;

function computeTarget(list: HTMLElement, draggedId: string, x: number, y: number): DropTarget | null {
  const layers = $layers.get();
  const byId = new Map(layers.map((l) => [l.id, l]));
  const dragged = byId.get(draggedId);
  if (!dragged) return null;
  const rows: Row[] = [];
  for (const el of list.querySelectorAll<HTMLElement>('[data-row-id]')) {
    const layer = byId.get(el.dataset.rowId!);
    if (!layer || layer.parentId === draggedId) continue;
    rows.push({ id: layer.id, empty: el.dataset.rowKind === 'empty', layer, rect: el.getBoundingClientRect() });
  }
  if (!rows.length) return null;

  const listRect = list.getBoundingClientRect();
  const toContent = (clientY: number) => Math.round(clientY - listRect.top + list.scrollTop);
  const between = (parentId: string | null, targetId: string, position: 'before' | 'after', depth: number, edge: number): DropTarget =>
    ({ kind: 'between', parentId, targetId, position, depth, y: toContent(edge) });

  let i = rows.findIndex((r) => y < r.rect.bottom);
  let t = 1;
  if (i === -1) i = rows.length - 1;
  else t = Math.min(1, Math.max(0, (y - rows[i].rect.top) / rows[i].rect.height));
  const row = rows[i];

  // ── Groups move between root blocks (header + children) ──
  if (dragged.type === 'group') {
    const rootId = row.layer.parentId ?? row.id;
    if (rootId === draggedId) return null;
    const block = rows.filter((r) => r.id === rootId || r.layer.parentId === rootId);
    const top = block[0].rect.top;
    const bottom = block[block.length - 1].rect.bottom;
    return y < (top + bottom) / 2 ? between(null, rootId, 'before', 0, top) : between(null, rootId, 'after', 0, bottom);
  }

  const outdent = t >= 0.5 && x < row.rect.left + OUTDENT_X;
  if (row.empty) {
    return outdent ? between(null, row.id, 'after', 0, row.rect.bottom) : { kind: 'inside', groupId: row.id };
  }

  const layer = row.layer;
  if (layer.type === 'group') {
    if (t < 0.25) return between(null, layer.id, 'before', 0, row.rect.top);
    if (layer.collapsed && t > 0.75) return between(null, layer.id, 'after', 0, row.rect.bottom);
    return { kind: 'inside', groupId: layer.id };
  }

  const position = t < 0.5 ? 'before' : 'after';
  const next = rows[i + 1];
  const lastChild = layer.parentId !== null && (!next || next.layer.parentId !== layer.parentId);
  if (lastChild && position === 'after' && outdent) {
    return between(null, layer.parentId!, 'after', 0, row.rect.bottom);
  }
  if (layer.id === draggedId) return null;
  return between(layer.parentId, layer.id, position, layer.parentId ? 1 : 0, position === 'before' ? row.rect.top : row.rect.bottom);
}

function applyDrop(draggedId: string, target: DropTarget) {
  const layers = $layers.get();
  const dragged = layers.find((l) => l.id === draggedId);
  if (!dragged) return;
  const childrenOf = (parentId: string | null) =>
    layers.filter((l) => l.parentId === parentId).sort((a, b) => b.order - a.order);

  if (target.kind === 'inside') {
    const first = childrenOf(target.groupId)[0];
    if (dragged.type === 'group' || first?.id === draggedId) return;
    batch(() => {
      if (dragged.parentId !== target.groupId) moveLayerToGroup(draggedId, target.groupId);
      if (first) reorderLayer(draggedId, first.id, 'before');
    });
    return;
  }

  const { parentId, targetId, position } = target;
  if (targetId === draggedId || (dragged.type === 'group' && parentId !== null)) return;
  if (dragged.parentId === parentId) {
    const siblings = childrenOf(parentId);
    const from = siblings.indexOf(dragged);
    const to = siblings.findIndex((l) => l.id === targetId);
    if (from === to + (position === 'before' ? -1 : 1)) return;
  }
  batch(() => {
    if (dragged.parentId !== parentId) moveLayerToGroup(draggedId, parentId);
    reorderLayer(draggedId, targetId, position);
  });
}

export function useLayerDrag(listRef: RefObject<HTMLDivElement | null>) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanupRef.current?.(), []);

  const onRowPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>, id: string) => {
    if (e.button !== 0 || e.pointerType === 'touch' || cleanupRef.current) return;
    if ((e.target as HTMLElement).closest('button, input')) return;
    const row = e.currentTarget;
    const list = listRef.current;
    if (!list) return;
    const pointerId = e.pointerId;
    const start = { x: e.clientX, y: e.clientY };
    const pointer = { ...start };
    let active = false;
    let ghost: HTMLElement | null = null;
    let grab = { x: 0, y: 0 };
    let current: DropTarget | null = null;
    let expandTimer = 0;
    let expandGroup: string | null = null;
    let frame = 0;

    const update = () => {
      const next = computeTarget(list, id, pointer.x, pointer.y);
      if (targetKey(next) === targetKey(current)) return;
      current = next;
      setTarget(next);
      const collapsedGroup = next?.kind === 'inside' && $layers.get().find((l) => l.id === next.groupId)?.collapsed ? next.groupId : null;
      if (collapsedGroup === expandGroup) return;
      clearTimeout(expandTimer);
      expandGroup = collapsedGroup;
      if (collapsedGroup) {
        expandTimer = window.setTimeout(() => {
          if ($layers.get().find((l) => l.id === collapsedGroup)?.collapsed) toggleGroupCollapsed(collapsedGroup);
          requestAnimationFrame(update);
        }, EXPAND_DELAY);
      }
    };

    const autoScroll = () => {
      const rect = list.getBoundingClientRect();
      const up = rect.top + SCROLL_EDGE - pointer.y;
      const down = pointer.y - (rect.bottom - SCROLL_EDGE);
      const delta = up > 0 ? -Math.ceil((Math.min(up, SCROLL_EDGE) / SCROLL_EDGE) * SCROLL_SPEED)
        : down > 0 ? Math.ceil((Math.min(down, SCROLL_EDGE) / SCROLL_EDGE) * SCROLL_SPEED) : 0;
      if (delta) {
        const before = list.scrollTop;
        list.scrollTop += delta;
        if (list.scrollTop !== before) update();
      }
      frame = requestAnimationFrame(autoScroll);
    };

    const begin = () => {
      active = true;
      const rect = row.getBoundingClientRect();
      grab = { x: start.x - rect.left, y: start.y - rect.top };
      ghost = row.cloneNode(true) as HTMLElement;
      ghost.removeAttribute('id');
      ghost.removeAttribute('data-row-id');
      ghost.classList.add('layer-drag-ghost');
      ghost.setAttribute('aria-hidden', 'true');
      Object.assign(ghost.style, { width: `${rect.width}px`, left: '0px', top: '0px' });
      document.body.appendChild(ghost);
      row.setPointerCapture(pointerId);
      $hoveredLayerId.set(null);
      setDragId(id);
      frame = requestAnimationFrame(autoScroll);
    };

    const moveGhost = () => {
      if (ghost) ghost.style.transform = `translate(${pointer.x - grab.x}px, ${pointer.y - grab.y}px)`;
    };

    const finish = (commit: boolean) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('blur', onCancel);
      clearTimeout(expandTimer);
      cancelAnimationFrame(frame);
      ghost?.remove();
      cleanupRef.current = null;
      if (!active) return;
      if (row.hasPointerCapture(pointerId)) row.releasePointerCapture(pointerId);
      if (commit && current) applyDrop(id, current);
      setDragId(null);
      setTarget(null);
    };

    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      pointer.x = ev.clientX;
      pointer.y = ev.clientY;
      if (!active) {
        if (!(ev.buttons & 1)) { finish(false); return; }
        if (Math.hypot(pointer.x - start.x, pointer.y - start.y) < DRAG_THRESHOLD) return;
        begin();
      }
      moveGhost();
      update();
    };
    const onUp = (ev: PointerEvent) => { if (ev.pointerId === pointerId) finish(true); };
    const onCancel = () => finish(false);
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== 'Escape' || !active) return;
      ev.preventDefault();
      ev.stopPropagation();
      finish(false);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('blur', onCancel);
    cleanupRef.current = () => finish(false);
  }, [listRef]);

  return { dragId, target, onRowPointerDown };
}
