const DataStore = {
    sections: [
        { id: 1, title: "Section 1", steps: 10, level: 0 },
        { id: 2, title: "Section 2", steps: 20, level: 0 },
        { id: 3, title: "Section 3", steps: 30, level: 0 }
    ],
    maxTimelineValue: 250,
    tableDatas: {},

    getSections() {
        return this.sections;
    },

    setSections(newSections) {
        this.sections = newSections;
    },

    getMaxTimelineValue() {
        return this.maxTimelineValue;
    },

    setMaxTimelineValue(value) {
        this.maxTimelineValue = value;
    },

    addSection(section) {
        this.sections.push(section);
    },

    removeSection(id) {
        this.sections = this.sections.filter(s => s.id !== id);
        delete this.tableDatas[id];
    },

    updateSection(id, updates) {
        const index = this.sections.findIndex(s => s.id === id);
        if (index !== -1) {
            this.sections[index] = { ...this.sections[index], ...updates };
        }
    },

    getNextId() {
        return Math.max(...this.sections.map(s => s.id), 0) + 1;
    },

    setTableData(sectionId, key, data) {
        if (!this.tableDatas[sectionId]) {
            this.tableDatas[sectionId] = {};
        }
        this.tableDatas[sectionId][key] = data;
    },

    getTableData(sectionId, key) {
        return this.tableDatas[sectionId] && this.tableDatas[sectionId][key] 
            ? this.tableDatas[sectionId][key] 
            : null;
    },

    
    // Removed saveData, loadData, and clearData methods

    resetToDefault() {
        this.sections = [
            { id: 1, title: "Section 1", steps: 10, level: 0 },
            { id: 2, title: "Section 2", steps: 20, level: 0 },
            { id: 3, title: "Section 3", steps: 30, level: 0 }
        ];
        this.maxTimelineValue = 250;
        this.tableDatas = {};
    },

    getSections() {
        return [...this.sections]; // Return a copy to prevent unintended modifications
    },

    setSections(newSections) {
        this.sections = [...newSections]; // Set a copy to ensure we're not affected by external references
    }
};

// Export the DataStore object if you're using ES6 modules
// export default DataStore;