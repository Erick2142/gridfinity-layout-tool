import { useEffect, useState } from 'react';

function isSpacersPath(): boolean {
  return window.location.pathname === '/spacers' || window.location.pathname === '/spacers/';
}

export function useSpacersRouting(): { isSpacersRoute: boolean } {
  const [isSpacersRoute, setIsSpacersRoute] = useState(isSpacersPath);

  useEffect(() => {
    const handlePopState = () => setIsSpacersRoute(isSpacersPath());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { isSpacersRoute };
}
