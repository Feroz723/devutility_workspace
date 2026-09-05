'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  SlidersHorizontal, 
  ListTree, 
  ShieldCheck, 
  Wrench, 
  Radio, 
  Bot, 
  Clock, 
  Activity, 
  HardDriveDownload,
  Cpu,
  FlaskConical
} from 'lucide-react';

const TABS = [
  { href: '/operations', label: 'Command Center', icon: SlidersHorizontal },
  { href: '/operations/runtime', label: 'Runtime & Worker', icon: Cpu },
  { href: '/operations/jobs', label: 'Jobs & Queue', icon: ListTree },
  { href: '/operations/approvals', label: 'Approval Center', icon: ShieldCheck },
  { href: '/operations/manual', label: 'Manual Setup', icon: Wrench },
  { href: '/operations/integrations', label: 'Integrations', icon: Radio },
  { href: '/operations/agents', label: 'Agent Roster', icon: Bot },
  { href: '/operations/timeline', label: 'Audit Timeline', icon: Clock },
  { href: '/operations/reality-test', label: 'Reality Test & Simulation', icon: FlaskConical },
  { href: '/operations/activation', label: 'Real-World Activation', icon: Activity },
  { href: '/operations/backup', label: 'Backup & Export', icon: HardDriveDownload },
];

export function OperationsNav() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 text-sm no-scrollbar">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
