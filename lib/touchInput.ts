/**
 * Mutable touch-input state shared between the on-screen joystick (DOM) and
 * WalkControls (frame loop). Plain object on purpose: it is written at pointer
 * rate and read every frame, so it must not trigger React renders.
 */
export const touchInput = {
  /** Strafe axis, -1 (left) .. 1 (right) */
  moveX: 0,
  /** Forward axis, -1 (back) .. 1 (forward) */
  moveY: 0,
  /** Sprint toggle */
  run: false,
};

export function resetTouchInput() {
  touchInput.moveX = 0;
  touchInput.moveY = 0;
  touchInput.run = false;
}
