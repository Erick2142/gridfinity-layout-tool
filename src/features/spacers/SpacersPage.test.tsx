import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SpacersPage from './SpacersPage';
import { triggerDownload } from '@/shared/generation/exportUtils';
vi.mock('@/shared/generation/exportUtils', () => ({ triggerDownload: vi.fn() }));
it('converts units, enforces minimum lift and exports the selected underside', () => {
  render(<SpacersPage />);
  fireEvent.change(screen.getByLabelText('Lift (U)'), { target: { value: '2' } });
  fireEvent.blur(screen.getByLabelText('Lift (U)'));
  fireEvent.click(screen.getByRole('switch', { name: 'Custom height' }));
  const mm = screen.getByLabelText('Lift (mm)');
  expect(mm).toHaveValue(14);
  const download = screen.getByRole('button', { name: 'Download STL' });
  fireEvent.change(mm, { target: { value: '6.5' } });
  fireEvent.blur(mm);
  expect(mm).toHaveValue(7);
  fireEvent.change(mm, { target: { value: '12.5' } });
  fireEvent.blur(mm);
  fireEvent.click(screen.getByRole('button', { name: 'Increase Width (cells)' }));
  fireEvent.change(screen.getByLabelText('Underside'), { target: { value: 'flat' } });
  fireEvent.click(download);
  expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), 'spacer-2x1-12.5mm-flat.stl');
});

it('exports a perimeter with independent opt-in notches', () => {
  render(<SpacersPage />);
  fireEvent.click(screen.getByRole('button', { name: 'Increase Width (cells)' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Perimeter only' }));
  const bottom = screen.getByRole('switch', { name: 'Underside clearance notches' });
  const top = screen.getByRole('switch', { name: 'Top locating notches' });
  expect(bottom).not.toBeChecked();
  expect(top).not.toBeChecked();
  fireEvent.click(top);
  expect(bottom).not.toBeChecked();
  fireEvent.click(bottom);
  fireEvent.click(top);
  fireEvent.click(screen.getByRole('button', { name: 'Download STL' }));
  expect(triggerDownload).toHaveBeenLastCalledWith(
    expect.any(Blob),
    'spacer-2x1-7mm-feet-perimeter-underside-notches.stl'
  );
});
