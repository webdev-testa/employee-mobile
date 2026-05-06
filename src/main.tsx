import './index.css'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { Providers } from '@/providers'
import { router } from '@/router'

createRoot(document.getElementById('root')!).render(
  <Providers>
    <RouterProvider router={router} />
  </Providers>
)