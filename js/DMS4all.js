// Register DMS4all for pendulum physics
// A sheet of paper pinned to the board — pivots around the red pin
// (Overlays/DMSPin.html), not a free-swinging card like SafeSlip. Far
// stiffer and more damped than SafeSlip (gravity .008 / damping .92 /
// swipeScale -.015 / maxAngle 12), and its lower part is tucked under
// other posters, so the swing is small.
window.registerPosterPhysics({
  selector: ".poster.DMS4all",
  pivotSelector: ".overlay-dmspin", // swing around the pin
  pivotOffset: { x: 0, y: 0 }, // px nudge from the pin's center
  gravity: 0.012, // higher than SafeSlip — snaps back to flat
  damping: 0.86, // lower than SafeSlip — friction, dies out fast
  swipeScale: -0.008, // roughly half SafeSlip's reactivity
  maxAngle: 4, // degrees
});
