import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { FRAME_FILL } from '@/features/baseplate/components/BaseplatePreview/cameraUtils';

// Fit all eight corners against the horizontal and vertical planes of the view.
// Including each corner's depth prevents the near end of a long spacer clipping.
export function frameSpacer(
  camera: PerspectiveCamera | OrthographicCamera,
  spans: readonly number[],
  direction: Vector3,
  aspect: number
) {
  const eye = direction.clone().normalize();
  const right = new Vector3().crossVectors(camera.up, eye).normalize();
  const up = new Vector3().crossVectors(eye, right);
  const tan = Math.tan(Math.PI / 8);
  const center = new Vector3(0, 0, spans[2] / 2);
  let distance = 0,
    halfView = 0;
  for (const x of [-1, 1])
    for (const y of [-1, 1])
      for (const z of [-1, 1]) {
        const corner = new Vector3((x * spans[0]) / 2, (y * spans[1]) / 2, (z * spans[2]) / 2);
        const projected =
          Math.max(Math.abs(corner.dot(right)) / aspect, Math.abs(corner.dot(up))) / FRAME_FILL;
        halfView = Math.max(halfView, projected);
        distance = Math.max(distance, corner.dot(eye) + projected / tan);
      }
  camera.position.copy(center).addScaledVector(eye, distance);
  camera.lookAt(center);
  camera.far = Math.max(2000, distance * 8 + Math.hypot(...spans));
  if (camera instanceof OrthographicCamera)
    camera.zoom = (camera.top - camera.bottom) / (2 * halfView);
  camera.updateProjectionMatrix();
  return center;
}
