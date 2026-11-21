import { render, screen, fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SpacersPage from './SpacersPage';
import { triggerDownload } from '@/shared/generation/exportUtils';
vi.mock('@/shared/generation/exportUtils', () => ({ triggerDownload: vi.fn() }));
it('converts units, enforces minimum lift and exports the selected underside', () => {
  render(<SpacersPage />);
  fireEvent.change(screen.getByLabelText('Lift (U)'), { target: { value: '2' } });
  fireEvent.click(screen.getByLabelText('Custom height'));
  const mm = screen.getByLabelText('Lift (mm)');
  expect(mm).toHaveValue(14);
  const download = screen.getByRole('button', { name: 'Download STL' });
  fireEvent.change(mm, { target: { value: '6.5' } });
  expect(download).toBeDisabled();
  fireEvent.change(mm, { target: { value: '12.5' } });
  fireEvent.change(screen.getByLabelText('Underside'), { target: { value: 'flat' } });
  fireEvent.click(download);
  expect(triggerDownload).toHaveBeenCalledWith(expect.any(Blob), 'spacer-1x1-12.5mm-flat.stl');
});
