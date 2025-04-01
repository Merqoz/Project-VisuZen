// top-section.js


const TopSection = {
    autoSaveInterval: null,
    lastSavedData: null,

    init() {
        this.createTopSection();
        this.setupEventListeners();
        this.addStyles();
        this.initAutoSave();
        this.loadLastSession();
    },

    createTopSection() {
        const topSection = document.createElement('div');
        topSection.id = 'top-section';
        topSection.innerHTML = `
            <div class="top-bar">
                <h1>Section Manager</h1>
                <div id="settings-icon">⚙️</div>
            </div>
            <div class="tabs-container">
                <div class="tabs">
                    <button class="tab-btn" data-tab="object-list">Object List</button>
                    <button class="tab-btn" data-tab="settings">Settings</button>
                    <button class="tab-btn" data-tab="table-of-contents">Table of Contents</button>
                </div>
            </div>
            <div id="settings-menu" class="hidden">
                <ul>
                    <li id="reset-to-default">Reset to Default</li>
                    <li id="save-project">Save Project</li>
                    <li id="upload-project">Upload Project</li>
                </ul>
            </div>
            <input type="file" id="file-upload" style="display: none;" accept=".json">
        `;
        document.body.insertBefore(topSection, document.body.firstChild);
    },

    async switchTab(tabId) {
        try {
            const response = await eel.switch_page(tabId)();
            if (response.success) {
                // Update active tab visual state
                const tabs = document.querySelectorAll('.tab-btn');
                tabs.forEach(tab => tab.classList.remove('active'));
                document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
                
                // Handle the page switch
                if (response.page) {
                    // Save any necessary state before switching
                    if (tabId !== 'timeline') {
                        this.saveCurrentState();
                    }
                    
                    // Navigate to the new page
                    window.location.href = response.page;
                }
            }
        } catch (error) {
            console.error('Error switching tabs:', error);
        }
    },

    saveCurrentState() {
        // Save any necessary state data before switching pages
        const currentState = {
            sections: DataStore.getSections(),
            maxTimelineValue: DataStore.getMaxTimelineValue(),
            timelineStartValue: TimelineManager.startValue,
            tableDatas: DataStore.tableDatas
        };
        localStorage.setItem('sectionManagerState', JSON.stringify(currentState));
    },

    loadSavedState() {
        const savedState = localStorage.getItem('sectionManagerState');
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                return state;
            } catch (error) {
                console.error('Error parsing saved state:', error);
                return null;
            }
        }
        return null;
    },

    setupEventListeners() {
        const settingsIcon = document.getElementById('settings-icon');
        const settingsMenu = document.getElementById('settings-menu');
        const resetToDefault = document.getElementById('reset-to-default');
        const saveProject = document.getElementById('save-project');
        const uploadProject = document.getElementById('upload-project');
        const fileUpload = document.getElementById('file-upload');

        settingsIcon.addEventListener('click', () => {
            settingsMenu.classList.toggle('hidden');
        });

        resetToDefault.addEventListener('click', () => {
            this.resetToDefaultSections();
            settingsMenu.classList.add('hidden');
        });

        saveProject.addEventListener('click', () => {
            this.saveProjectAsJson();
            settingsMenu.classList.add('hidden');
        });

        uploadProject.addEventListener('click', () => {
            fileUpload.click();
            settingsMenu.classList.add('hidden');
        });

        fileUpload.addEventListener('change', (event) => {
            this.uploadProjectFromJson(event);
        });

        // Close settings menu when clicking outside
        document.addEventListener('click', (event) => {
            if (!settingsIcon.contains(event.target) && !settingsMenu.contains(event.target)) {
                settingsMenu.classList.add('hidden');
            }
        });

        // Add tab switching functionality
        const tabButtons = document.querySelectorAll('.tab-btn');
        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    },

    resetToDefaultSections() {
        const defaultSections = [
            { id: 1, title: "Section 1", steps: 10, level: 0 },
            { id: 2, title: "Section 2", steps: 20, level: 0 },
            { id: 3, title: "Section 3", steps: 30, level: 0 }
        ];

        // Reset DataStore to default values
        DataStore.resetToDefault();
        DataStore.setSections(defaultSections);

        // Clear all existing content
        const sectionsContainer = document.getElementById('sections-container');
        if (sectionsContainer) {
            sectionsContainer.innerHTML = '';
        }

        // Reset TimelineManager
        if (TimelineManager) {
            TimelineManager.startValue = 1;
            TimelineManager.setCurrentFrame(1);
        }

        // Re-render sections and update UI
        if (SectionManager) {
            SectionManager.renderSections();
        }
        if (UIManager) {
            UIManager.updateSlider();
        }
        if (TimelineManager) {
            TimelineManager.updateTimelineSlider();
            TimelineManager.updateCurrentStep();
        }

        // Clear all tables and editors data
        DataStore.tableDatas = {};

        // Reset max timeline value
        DataStore.setMaxTimelineValue(250);

        // If using Blender communication, update markers
        if (typeof BlenderCommunication !== 'undefined') {
            BlenderCommunication.sendMarkers();
        }

        // Clear saved state
        localStorage.removeItem('sectionManagerState');

        console.log('Reset to default completed');
    },

    saveProjectAsJson() {
        const projectData = {
            sections: DataStore.getSections(),
            maxTimelineValue: DataStore.getMaxTimelineValue(),
            tableDatas: DataStore.tableDatas,
            timelineStartValue: TimelineManager ? TimelineManager.startValue : 1
        };

        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'project.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('Project saved as JSON');
    },

    uploadProjectFromJson(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const projectData = JSON.parse(e.target.result);
                    this.loadProjectData(projectData);
                    console.log('Project loaded successfully');
                } catch (error) {
                    console.error('Error parsing JSON:', error);
                    alert('Invalid project file. Please try again.');
                }
            };
            reader.readAsText(file);
        }
    },

    loadProjectData(projectData) {
        // Load sections
        DataStore.setSections(projectData.sections);

        // Load max timeline value
        DataStore.setMaxTimelineValue(projectData.maxTimelineValue);

        // Load table data
        DataStore.tableDatas = projectData.tableDatas || {};

        // Load timeline start value if TimelineManager exists
        if (TimelineManager) {
            TimelineManager.startValue = projectData.timelineStartValue || 1;
        }

        // Clear all existing content
        const sectionsContainer = document.getElementById('sections-container');
        if (sectionsContainer) {
            sectionsContainer.innerHTML = '';
        }

        // Re-render sections and update UI if components exist
        if (SectionManager) {
            SectionManager.renderSections();
        }
        if (UIManager) {
            UIManager.updateSlider();
        }
        if (TimelineManager) {
            TimelineManager.updateTimelineSlider();
            TimelineManager.updateCurrentStep();
        }

        // If using Blender communication, update markers
        if (typeof BlenderCommunication !== 'undefined') {
            BlenderCommunication.sendMarkers();
        }

        // Save the loaded state
        this.saveCurrentState();
    },

    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #top-section {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background-color: #383838;
                color: #e0e0e0;
                z-index: 1000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            }
            .top-bar {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 20px;
            }
            .tabs-container {
                padding: 0 20px;
            }
            .tabs {
                display: flex;
                justify-content: center;
                border-bottom: 1px solid #4a4a4a;
            }
            .tab-btn {
                background-color: transparent;
                border: none;
                color: #e0e0e0;
                padding: 10px 20px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            .tab-btn:hover, .tab-btn.active {
                background-color: #4a4a4a;
            }
            #settings-menu {
                position: absolute;
                top: 100%;
                right: 20px;
                background-color: #383838;
                border: 1px solid #4a4a4a;
                border-top: none;
                z-index: 1001;
            }
            #settings-menu ul {
                list-style-type: none;
                padding: 0;
                margin: 0;
            }
            #settings-menu li {
                padding: 10px 20px;
                cursor: pointer;
                color: #e0e0e0;
            }
            #settings-menu li:hover {
                background-color: #4a4a4a;
            }
            .hidden {
                display: none !important;
            }
            body {
                padding-top: 100px;
            }
        `;
        document.head.appendChild(style);
    },

    initAutoSave() {
        // Auto-save every 30 seconds
        this.autoSaveInterval = setInterval(() => {
            this.autoSaveProject();
        }, 30000);

        // Save when user leaves the page
        window.addEventListener('beforeunload', () => {
            this.autoSaveProject();
        });
    },

    async autoSaveProject() {
        const currentData = this.gatherProjectData();
        
        // Only save if data has changed
        if (JSON.stringify(currentData) !== JSON.stringify(this.lastSavedData)) {
            console.log('Auto-saving project...');
            localStorage.setItem('projectAutoSave', JSON.stringify({
                timestamp: new Date().toISOString(),
                data: currentData
            }));
            this.lastSavedData = currentData;
        }
    },

    gatherProjectData() {
        const projectData = {
            sections: DataStore.getSections(),
            maxTimelineValue: DataStore.getMaxTimelineValue(),
            tableDatas: DataStore.tableDatas,
            timelineStartValue: TimelineManager ? TimelineManager.startValue : 1,
            editors: {},
            version: '1.0' // For future compatibility
        };

        // Gather editor content
        Object.keys(EditorManager.editors).forEach(async (editorId) => {
            const editor = EditorManager.editors[editorId];
            if (editor) {
                const [sectionId, editorNumber] = EditorManager.parseContainerId(editorId);
                if (!projectData.editors[sectionId]) {
                    projectData.editors[sectionId] = {};
                }
                projectData.editors[sectionId][editorNumber] = {
                    data: await editor.save(),
                    name: document.querySelector(`#${editorId}`).closest('.editor-wrapper')?.querySelector('.editor-title')?.textContent
                };
            }
        });

        return projectData;
    },

    async loadLastSession() {
        try {
            const savedData = localStorage.getItem('projectAutoSave');
            if (savedData) {
                const { timestamp, data } = JSON.parse(savedData);
                const lastSaveDate = new Date(timestamp);
                const now = new Date();
                const hoursSinceSave = (now - lastSaveDate) / (1000 * 60 * 60);

                if (hoursSinceSave < 24) { // Only load if save is less than 24 hours old
                    const shouldRestore = confirm(
                        `Found a recent session from ${lastSaveDate.toLocaleString()}.\nWould you like to restore it?`
                    );

                    if (shouldRestore) {
                        await this.loadProjectData(data);
                        this.lastSavedData = data;
                        console.log('Session restored successfully');
                    } else {
                        localStorage.removeItem('projectAutoSave');
                    }
                }
            }
        } catch (error) {
            console.error('Error loading last session:', error);
        }
    },

    async saveProjectAsJson() {
        const projectData = this.gatherProjectData();
        const jsonString = JSON.stringify(projectData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const date = new Date().toISOString().split('T')[0];
        a.download = `project-${date}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Also save as auto-save point
        this.lastSavedData = projectData;
        localStorage.setItem('projectAutoSave', JSON.stringify({
            timestamp: new Date().toISOString(),
            data: projectData
        }));

        console.log('Project saved as JSON');
    },

    async loadProjectData(projectData) {
        try {
            // Clear existing content first
            await EditorManager.destroyAllEditors();
            
            // Load basic data
            DataStore.setSections(projectData.sections || []);
            DataStore.setMaxTimelineValue(projectData.maxTimelineValue || 250);
            DataStore.tableDatas = projectData.tableDatas || {};

            if (TimelineManager) {
                TimelineManager.startValue = projectData.timelineStartValue || 1;
            }

            // Clear existing content
            const sectionsContainer = document.getElementById('sections-container');
            if (sectionsContainer) {
                sectionsContainer.innerHTML = '';
            }

            // Re-render sections and update UI
            if (SectionManager) {
                await SectionManager.renderSections();
            }
            if (UIManager) {
                UIManager.updateSlider();
            }
            if (TimelineManager) {
                await TimelineManager.updateTimelineSlider();
                TimelineManager.updateCurrentStep();
            }

            // If using Blender communication, update markers
            if (typeof BlenderCommunication !== 'undefined') {
                await BlenderCommunication.sendMarkers();
            }

            return true;
        } catch (error) {
            console.error('Error loading project data:', error);
            alert('Error loading project data. See console for details.');
            return false;
        }
    },

    resetToDefaultSections() {
        localStorage.removeItem('projectAutoSave');
        this.lastSavedData = null;
        
        const defaultSections = [
            { id: 1, title: "Section 1", steps: 10, level: 0 },
            { id: 2, title: "Section 2", steps: 20, level: 0 },
            { id: 3, title: "Section 3", steps: 30, level: 0 }
        ];

        DataStore.resetToDefault();
        DataStore.setSections(defaultSections);
        
        const sectionsContainer = document.getElementById('sections-container');
        if (sectionsContainer) {
            sectionsContainer.innerHTML = '';
        }

        if (TimelineManager) {
            TimelineManager.startValue = 1;
            TimelineManager.setCurrentFrame(1);
        }

        if (SectionManager) {
            SectionManager.renderSections();
        }
        if (UIManager) {
            UIManager.updateSlider();
        }
        if (TimelineManager) {
            TimelineManager.updateTimelineSlider();
            TimelineManager.updateCurrentStep();
        }

        DataStore.tableDatas = {};
        DataStore.setMaxTimelineValue(250);

        if (typeof BlenderCommunication !== 'undefined') {
            BlenderCommunication.sendMarkers();
        }

        console.log('Reset to default completed');
    }
};

// Initialize the top section when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    TopSection.init();
});