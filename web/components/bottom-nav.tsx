'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Inbox, Landmark, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const pathname = usePathname()

  const items = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/inbox', label: 'Inbox', icon: Inbox },
    { href: '/assets', label: 'Assets', icon: Landmark },
    { href: '/admin', label: 'Admin', icon: Settings },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-t border-divider pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200",
                isActive ? "text-primary" : "text-default-500 hover:text-default-900"
              )}
            >
              {/* アイコンの太さを調整して洗練させる */}
              <Icon strokeWidth={isActive ? 2.5 : 1.5} className="h-6 w-6" />
              <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}