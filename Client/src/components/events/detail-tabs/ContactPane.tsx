import type { Coordinator, Organizer } from '@/types/event'

interface ContactPaneProps {
  organizers?: Organizer[]
  coordinators?: Coordinator[]
}

export function ContactPane({
  organizers = [],
  coordinators = [],
}: ContactPaneProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 border-b border-bone/15 pb-4">
        <span className="font-mono text-xs uppercase tracking-widest text-volt font-bold block">
          CREW & DIRECTORS
        </span>
        <h3 className="font-display text-2xl font-black uppercase text-bone">
          Contact & Organizers
        </h3>
      </div>

      {organizers.length > 0 && (
        <div className="space-y-3">
          <span className="font-mono text-xs uppercase text-bone/50 tracking-wider block">
            HOSTING ORGANIZATIONS
          </span>
          <div className="flex flex-wrap gap-2.5">
            {organizers.map((org, idx) => (
              <div
                key={idx}
                className="px-4 py-2 border border-bone/25 bg-bone/[0.03] font-mono text-xs text-bone font-bold flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 bg-volt rotate-45" />
                <span>{org.name}</span>
                {org.org_type && (
                  <span className="text-[10px] text-bone/50 uppercase ml-1">
                    ({org.org_type})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {coordinators.length > 0 && (
        <div className="space-y-3 pt-2">
          <span className="font-mono text-xs uppercase text-bone/50 tracking-wider block">
            STUDENT LEAD COORDINATORS
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coordinators.map((coord, idx) => (
              <div
                key={idx}
                className="p-4 border-2 border-bone/20 bg-bone/[0.02] space-y-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="text-bone font-bold text-sm block">{coord.name}</span>
                  <span className="text-volt font-mono text-[10px] uppercase font-bold">
                    #{String(idx + 1).padStart(2, '0')}
                  </span>
                </div>
                {coord.role && (
                  <span className="text-bone/60 block text-[11px] uppercase tracking-wide">
                    {coord.role}
                  </span>
                )}
                {coord.contact && (
                  <div className="pt-2 border-t border-bone/10">
                    <a
                      href={`mailto:${coord.contact}`}
                      className="text-volt hover:text-bone hover:underline font-bold inline-flex items-center gap-1.5 transition-colors"
                    >
                      <span>{coord.contact}</span>
                      <span aria-hidden="true">↗</span>
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {organizers.length === 0 && coordinators.length === 0 && (
        <p className="font-sans text-sm text-bone/70">
          Organizer contact details will be posted shortly. Reach out via the campus helpdesk for urgent queries.
        </p>
      )}
    </div>
  )
}
export default ContactPane
