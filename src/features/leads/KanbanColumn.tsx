
import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { Lead, LeadStatus } from '../../types';
import { LeadCard } from './LeadCard';

interface KanbanColumnProps {
    id: LeadStatus;
    title: string;
    leads: Lead[];
    color: string; // Tailwind color class backbone e.g. "blue"
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({ id, title, leads, color }) => {
    const { setNodeRef, isOver } = useDroppable({
        id: id,
    });

    const colorClasses = {
        bg: `bg-${color}-50`,
        text: `text-${color}-700`,
        border: `border-${color}-200`,
        dot: `bg-${color}-500`
    };

    // Need to handle dynamic classes properly with Tailwind, but for now we'll stick to a mapping or passed props.
    // Actually, passing "blue" and doing `bg-${color}-50` creates uncompiled classes in JIT if they aren't safe-listed.
    // I will use a helper or just mapping inside.
    const getColors = (c: string) => {
        switch (c) {
            case 'blue': return 'bg-blue-50 text-blue-700 border-blue-200 decoration-blue-500';
            case 'yellow': return 'bg-yellow-50 text-yellow-700 border-yellow-200 decoration-yellow-500';
            case 'purple': return 'bg-purple-50 text-purple-700 border-purple-200 decoration-purple-500';
            case 'orange': return 'bg-orange-50 text-orange-700 border-orange-200 decoration-orange-500';
            case 'green': return 'bg-green-50 text-green-700 border-green-200 decoration-green-500';
            case 'red': return 'bg-red-50 text-red-700 border-red-200 decoration-red-500';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    return (
        <div
            ref={setNodeRef}
            className={`
                min-w-[320px] w-84 flex flex-col h-full rounded-2xl bg-slate-50/50 border border-slate-100
                transition-colors duration-200
                ${isOver ? 'ring-2 ring-promed-primary/20 bg-slate-100' : ''}
            `}
        >
            {/* Header */}
            <div className={`p-4 border-b border-slate-100 flex items-center justify-between`}>
                <div className="flex items-center space-x-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color === 'blue' ? 'bg-blue-500' : color === 'green' ? 'bg-green-500' : color === 'orange' ? 'bg-orange-500' : color === 'red' ? 'bg-red-500' : color === 'purple' ? 'bg-purple-500' : 'bg-yellow-500'}`}></div>
                    <span className="font-semibold text-sm text-slate-700">{title}</span>
                </div>
                <span className="bg-white text-slate-500 text-xs px-2 py-0.5 rounded-full border border-slate-100 font-medium">
                    {leads.length}
                </span>
            </div>

            {/* Droppable Area */}
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4 pb-32">
                {leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} />
                ))}
            </div>
        </div>
    );
};
