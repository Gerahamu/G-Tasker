import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { useT, type TranslationKey } from '../../lib/i18n';
import type { SidebarSectionId } from './sidebar-section-state';

interface CollapsibleSidebarSectionProps {
  id: SidebarSectionId;
  label: TranslationKey;
  expanded: boolean;
  onToggle: () => void;
  trailing?: ReactNode;
  children: ReactNode;
}

export function CollapsibleSidebarSection({
  id,
  label,
  expanded,
  onToggle,
  trailing,
  children,
}: CollapsibleSidebarSectionProps) {
  const { t } = useT();
  const headingId = `sidebar-${id}-heading`;
  const contentId = `sidebar-${id}-content`;

  return (
    <section
      className={`sidebar-navigation-section sidebar-collapsible-section ${expanded ? 'is-expanded' : 'is-collapsed'}`}
      aria-labelledby={headingId}
    >
      <div className="sidebar-section-title-row">
        <button
          type="button"
          className="sidebar-section-toggle"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={contentId}
          aria-label={t(expanded ? 'collapseSidebarSection' : 'expandSidebarSection', {
            section: t(label),
          })}
        >
          <span id={headingId} className="sidebar-section-heading">
            {t(label)}
          </span>
          <ChevronDown className="sidebar-section-chevron" size={14} aria-hidden="true" />
        </button>
        {trailing}
      </div>

      <div id={contentId} className="sidebar-section-content" aria-hidden={!expanded}>
        <div className="sidebar-section-content-inner">{children}</div>
      </div>
    </section>
  );
}
