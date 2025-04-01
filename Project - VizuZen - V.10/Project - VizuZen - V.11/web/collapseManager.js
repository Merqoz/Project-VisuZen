// collapseManager.js

const CollapseManager = {
    collapsedSections: new Set(),

    toggleCollapse(sectionId) {
        if (this.collapsedSections.has(sectionId)) {
            this.collapsedSections.delete(sectionId);
        } else {
            this._collapseSectionAndChildren(sectionId);
        }
        SectionManager.renderSections();
    },

    _collapseSectionAndChildren(sectionId) {
        this.collapsedSections.add(sectionId);
        const sections = DataStore.getSections();
        const sectionIndex = sections.findIndex(s => s.id === sectionId);
        const sectionLevel = sections[sectionIndex].level;

        for (let i = sectionIndex + 1; i < sections.length; i++) {
            if (sections[i].level > sectionLevel) {
                this.collapsedSections.add(sections[i].id);
            } else {
                break;
            }
        }
    },

    isCollapsed(sectionId) {
        return this.collapsedSections.has(sectionId);
    },

    shouldHide(sectionId, currentLevel) {
        if (currentLevel === 0) return false; // Never hide main sections

        const sections = DataStore.getSections();
        let parentId = null;

        // Find the parent section
        for (let i = sections.findIndex(s => s.id === sectionId) - 1; i >= 0; i--) {
            if (sections[i].level < currentLevel) {
                parentId = sections[i].id;
                break;
            }
        }

        // If parent is collapsed, hide this section
        return parentId !== null && this.isCollapsed(parentId);
    }
};
