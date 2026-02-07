import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AuditEntityType =
  | 'asset'
  | 'batch'
  | 'pickup'
  | 'pickup_request'
  | 'pickup_asset'
  | 'payout'
  | 'review'
  | 'facility_qc'
  | 'dispute'
  | 'epr_certificate';

export interface AuditEvent {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  actorId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

interface AuditState {
  events: AuditEvent[];
  record: (event: Omit<AuditEvent, 'id' | 'createdAt'>) => AuditEvent;
  getByEntity: (entityType: AuditEntityType, entityId: string) => AuditEvent[];
}

const genId = () => `aud-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useAuditStore = create<AuditState>()(
  persist(
    (set, get) => ({
      events: [],
      record: (event) => {
        const newEvent: AuditEvent = {
          ...event,
          id: genId(),
          createdAt: new Date(),
        };
        set(state => ({ events: [newEvent, ...state.events].slice(0, 500) }));
        return newEvent;
      },
      getByEntity: (entityType, entityId) => {
        return get().events.filter(e => e.entityType === entityType && e.entityId === entityId);
      },
    }),
    {
      name: 'ecotribe-audit',
      partialize: (state) => ({ events: state.events }),
    }
  )
);
