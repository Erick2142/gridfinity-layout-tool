import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SpacersPage from './SpacersPage';
import type { spacerMesh } from './mesh';

vi.mock('./SpacerPreview', () => ({
  SpacerPreview: ({
    mesh,
    width,
  }: {
    mesh: ReturnType<typeof spacerMesh> | null;
    width: number;
  }) => (
    <output data-testid="preview">
      {width}:{mesh?.vertices.length}
    </output>
  ),
}));

it('keeps the finished mesh and footprint visible through consecutive edits', () => {
  const workers: MockWorker[] = [];
  class MockWorker {
    onmessage: ((event: { data: ReturnType<typeof spacerMesh> }) => void) | null = null;
    constructor() {
      workers.push(this);
    }
    postMessage() {}
    terminate() {}
  }
  vi.stubGlobal('Worker', MockWorker);
  try {
    render(<SpacersPage />);
    const initial = screen.getByTestId('preview').textContent;
    fireEvent.click(screen.getByText('Magnet holes'));
    fireEvent.click(screen.getByRole('switch', { name: 'Top magnet holes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase Width (cells)' }));
    expect(screen.getByTestId('preview').textContent).toBe(initial);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download STL' })).toBeDisabled();
    expect(workers[0].onmessage).toBeNull();
    act(() =>
      workers
        .at(-1)
        ?.onmessage?.({ data: { vertices: new Float32Array(9), indices: new Uint32Array(3) } })
    );
    expect(screen.getByTestId('preview')).toHaveTextContent('2:9');
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.getByRole('button', { name: 'Download STL' })).toBeEnabled();
  } finally {
    vi.unstubAllGlobals();
  }
});
