export type MenuRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type MenuGeometryInput = {
  trigger: MenuRect;
  container: MenuRect;
  naturalWidth: number;
  naturalHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  gutter: number;
  offset: number;
  align: "start" | "end";
};

export type MenuGeometry = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  placement: "below" | "above";
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * Places a fixed-position menu against its trigger without measuring the DOM.
 *
 * The menu is never wider than the container or the viewport minus the gutter,
 * is aligned to the trigger's end (right) or start (left) edge, flips above
 * when the space below is too small, and is capped to the space on that side.
 * All values are viewport coordinates; the caller passes measured rects.
 */
export function menuGeometry(input: MenuGeometryInput): MenuGeometry {
  const {
    trigger,
    container,
    naturalWidth,
    naturalHeight,
    viewportWidth,
    viewportHeight,
    gutter,
    offset,
    align,
  } = input;

  const containerLeft = Math.max(gutter, container.left);
  const containerRight = Math.min(viewportWidth - gutter, container.right);
  const containerWidth = Math.max(0, containerRight - containerLeft);
  const viewportWidthMax = Math.max(0, viewportWidth - 2 * gutter);

  const width = Math.min(
    Math.max(naturalWidth, trigger.width),
    containerWidth,
    viewportWidthMax,
  );

  const preferredLeft = align === "end" ? trigger.right - width : trigger.left;
  const left = clamp(
    preferredLeft,
    containerLeft,
    Math.max(containerLeft, containerRight - width),
  );

  const below = Math.max(0, viewportHeight - trigger.bottom - offset - gutter);
  const above = Math.max(0, trigger.top - offset - gutter);
  const placement = naturalHeight > below && above > below ? "above" : "below";
  const space = placement === "above" ? above : below;
  const maxHeight = Math.min(naturalHeight, space);

  const preferredTop =
    placement === "above"
      ? trigger.top - offset - maxHeight
      : trigger.bottom + offset;
  const top = clamp(
    preferredTop,
    gutter,
    Math.max(gutter, viewportHeight - gutter - maxHeight),
  );

  return { left, top, width, maxHeight, placement };
}
