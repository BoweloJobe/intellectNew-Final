import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { AppProviders } from './state/AppProviders';
import { AppErrorBoundary } from './components/error/AppErrorBoundary';

export default function App() {
  return (
    <AppProviders>
      <AppErrorBoundary area="app shell" className="py-20">
        <RouterProvider router={router} />
      </AppErrorBoundary>
    </AppProviders>
  );
}