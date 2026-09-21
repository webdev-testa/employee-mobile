import './index.css'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/providers'
import { router } from '@/router'
import {
  checkForUpdates,
  markLiveUpdateReady,
} from '@/lib/live-update'

const root = createRoot(document.getElementById('root')!)

root.render(
  <Providers>
    <RouterProvider router={router} />
  </Providers>,
)

// Mark the current bundle as healthy first.
// Then check whether a newer bundle exists.
void (async () => {
  await markLiveUpdateReady()
  await checkForUpdates()
})()