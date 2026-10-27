export function searchBoxes(boxes, query) {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return boxes;
  return boxes.filter(box => {
    const haystack = [
      box.boxId, box.description, box.destination, box.currentLocation,
      box.notes, box.status, ...(box.items || [])
    ].join(" ").toLocaleLowerCase();
    return haystack.includes(q);
  });
}
