// sectionManager.js

const SectionManager = {
    async renderSections() {
        console.log('Rendering sections');
        
        // First, properly cleanup all existing editors
        await EditorManager.destroyAllEditors();
        
        const sections = DataStore.getSections();
        const container = document.getElementById('sections-container');
        
        // Clear container after editor cleanup to prevent interference
        container.innerHTML = '';
        
        // Track rendered sections for content restoration
        const sectionsToRestore = [];
        
        // Render all sections first
        sections.forEach((section, index) => {
            if (!CollapseManager.shouldHide(section.id, section.level)) {
                const sectionElement = this.createSectionElement(section, index);
                container.appendChild(sectionElement);
                
                // If section is not collapsed, add it to restoration queue
                if (!CollapseManager.isCollapsed(section.id)) {
                    sectionsToRestore.push(section.id);
                }
            }
        });
        
        // Setup drag and drop before content restoration
        this.setupDragAndDrop();
        
        // Update UI elements
        UIManager.updateSlider();
        await TimelineManager.updateTimelineSlider();
        
        // Restore content for all sections in queue
        for (const sectionId of sectionsToRestore) {
            try {
                await this.restoreContentForSection(sectionId);
            } catch (error) {
                console.error(`Error restoring content for section ${sectionId}:`, error);
            }
        }
        
        // Verify editor instances after restoration
        const editorElements = container.querySelectorAll('.editor-container');
        editorElements.forEach(async (editorElement) => {
            const editorId = editorElement.id;
            if (!EditorManager.editors[editorId]) {
                console.warn(`Editor instance missing for ${editorId}, attempting recovery`);
                try {
                    const [sectionId, editorNumber] = EditorManager.parseContainerId(editorId);
                    if (sectionId && editorNumber) {
                        const editorData = DataStore.getTableData(sectionId, 'editors')?.[editorNumber];
                        if (editorData) {
                            await EditorManager.restoreEditor(sectionId, editorNumber, editorData);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to recover editor ${editorId}:`, error);
                }
            }
        });
    },

    // Update the restoreContentForSection method to include cameras
    async restoreContentForSection(sectionId) {
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        const tableData = DataStore.getTableData(sectionId, 'tables') || {};
        const editorData = DataStore.getTableData(sectionId, 'editors') || {};
        const cameraData = DataStore.getTableData(sectionId, 'cameras') || {};
        
        const content = [];

        // Prepare tables
        Object.entries(tableData).forEach(([tableNumber, data]) => {
            content.push({
                type: 'table',
                number: parseInt(tableNumber),
                data: data,
                name: data.name || `Table ${tableNumber}`,
                order: data.order || 0
            });
        });

        // Prepare editors
        Object.entries(editorData).forEach(([editorNumber, data]) => {
            content.push({
                type: 'editor',
                number: parseInt(editorNumber),
                data: data,
                name: data.name || `Rich Text Editor ${editorNumber}`,
                order: data.order || 0
            });
        });
        
        // Prepare cameras
        Object.entries(cameraData).forEach(([cameraNumber, data]) => {
            content.push({
                type: 'camera',
                number: parseInt(cameraNumber),
                data: data,
                name: data.name || `Camera ${cameraNumber}`,
                order: data.order || 0
            });
        });

        // Sort content based on order
        content.sort((a, b) => a.order - b.order);

        // Clear existing content
        sectionContent.innerHTML = '';

        // Render content
        for (const item of content) {
            if (item.type === 'table') {
                this.renderTable(sectionContent, sectionId, item.number, item.data);
            } else if (item.type === 'editor') {
                await EditorManager.restoreEditor(sectionId, item.number, item.data);
            } else if (item.type === 'camera') {
                CameraManager.renderCamera(sectionContent, sectionId, item.number, item.data);
            }
        }
    },
    
    createSectionElement(section, index) {
        const sectionNumber = this.generateSectionNumber(index);
        const sectionElement = document.createElement('div');
        sectionElement.className = 'section';
        sectionElement.dataset.id = section.id;
        sectionElement.style.marginLeft = `${section.level * 20}px`;

        // Create a separate header element
        const sectionHeader = document.createElement('div');
        sectionHeader.className = 'section-header';
        sectionHeader.draggable = true; // Make only the header draggable
        sectionHeader.innerHTML = `
        <span class="section-title">
            <button class="collapse-button" onclick="CollapseManager.toggleCollapse(${section.id})">
                ${CollapseManager.isCollapsed(section.id) ? '►' : '▼'}
            </button>
            <div class="level-arrows">
                <span class="level-arrow" onclick="SectionManager.changeLevel(${section.id}, -1)">▲</span>
                <span class="level-arrow" onclick="SectionManager.changeLevel(${section.id}, 1)">▼</span>
            </div>
            <span class="section-number">${sectionNumber}</span>
            <span class="section-name" contenteditable="true" onblur="SectionManager.updateSectionName(${section.id}, this.textContent)">${section.title}</span>
        </span>
        <div class="section-tools">
            <button class="add-subsection" data-section-id="${section.id}">Add Sub-section</button>
            <button class="add-feature" data-section-id="${section.id}">Add Feature</button>
            <button class="sections-alignment" onclick="SectionsAlignment.showAlignmentDialog(${section.id})">Sections Alignment</button>
            <span class="steps-counter" contenteditable="true" onblur="SectionManager.updateStepsCounter(${section.id}, this.textContent)">${section.steps}</span>
            <button onclick="TimelineManager.toggleSectionFreeze(${section.id})" class="freeze-button ${section.frozen ? 'frozen' : ''}">
                ${section.frozen ? '🔒L' : '🔓U'}
            </button>
            <button class="remove-section" data-section-id="${section.id}">×</button>
        </div>
    `;

        // Create a separate content element
        const sectionContent = document.createElement('div');
        sectionContent.className = 'section-content';
        sectionContent.id = `section-content-${section.id}`;
        sectionContent.style.display = CollapseManager.isCollapsed(section.id) ? 'none' : 'block';


        // Append header and content to the section element
        sectionElement.appendChild(sectionHeader);
        sectionElement.appendChild(sectionContent);

        // Add event listeners for the buttons
        const addSubsectionBtn = sectionHeader.querySelector('.add-subsection');
        addSubsectionBtn.addEventListener('click', () => this.addSubSection(section.id));

        const addFeatureBtn = sectionHeader.querySelector('.add-feature');
        addFeatureBtn.addEventListener('click', () => this.addFeature(section.id));

        const removeBtn = sectionHeader.querySelector('.remove-section');
        removeBtn.addEventListener('click', () => this.confirmAndRemoveSection(section.id));

        return sectionElement;
    },

    toggleFreezeSteps(id) {
        const sections = DataStore.getSections();
        const section = sections.find(s => s.id === id);
        if (section) {
            section.frozen = !section.frozen;
            DataStore.setSections(sections);
            this.renderSections();
        }
    },

    async addSection() {
        console.log('Adding new section');
        const sections = DataStore.getSections();
        const newId = DataStore.getNextId();
        const lastSection = sections[sections.length - 1];
        const newSteps = lastSection ? lastSection.steps + 10 : 10;
        const newSection = { id: newId, title: `Section ${newId}`, steps: newSteps, level: 0 };
        DataStore.addSection(newSection);
        this.renderSections();
        await TimelineManager.updateTimelineSlider();

        // After adding a section, send the updated markers to Blender
        if (BlenderCommunication) {
            await BlenderCommunication.sendMarkers();
        }
    },

    addSubSection(parentId) {
        console.log('Adding new subsection to parent', parentId);
        const sections = DataStore.getSections();
        const parentIndex = sections.findIndex(s => s.id === parentId);
        const parentSection = sections[parentIndex];
        const newId = DataStore.getNextId();
        const newSection = {
            id: newId,
            title: `Subsection ${newId}`,
            steps: this.calculateSubsectionSteps(parentSection),
            level: parentSection.level + 1,
            frozen: false
        };
        sections.splice(parentIndex + 1, 0, newSection);
        DataStore.setSections(sections);
        this.updateStepCounters();
        this.renderSections();
        TimelineManager.updateTimelineSlider();
    },

    calculateSubsectionSteps(parentSection) {
        const sections = DataStore.getSections();
        const siblingSubsections = sections.filter(s => 
            s.level === parentSection.level + 1 && 
            s.steps > parentSection.steps && 
            s.steps < this.getNextMainSectionSteps(parentSection)
        );
        
        if (siblingSubsections.length === 0) {
            return parentSection.steps + 5;
        } else {
            return Math.max(...siblingSubsections.map(s => s.steps)) + 5;
        }
    },

    getNextMainSectionSteps(currentSection) {
        const sections = DataStore.getSections();
        const nextMainSection = sections.find(s => s.level === 0 && s.steps > currentSection.steps);
        return nextMainSection ? nextMainSection.steps : DataStore.getMaxTimelineValue();
    },

    updateStepCounters() {
        let sections = DataStore.getSections();
        let currentMainSectionSteps = 0;
        
        sections.forEach((section, index) => {
            if (section.level === 0) {
                // Main section
                currentMainSectionSteps += 10;
                section.steps = currentMainSectionSteps;
            } else {
                // Subsection
                const parentSection = sections.slice(0, index).reverse().find(s => s.level < section.level);
                if (parentSection) {
                    section.steps = this.calculateSubsectionSteps(parentSection);
                }
            }
        });

        // Sort sections by steps
        sections.sort((a, b) => a.steps - b.steps);

        DataStore.setSections(sections);
    },

    
    confirmAndRemoveSection(id) {
        const confirmResult = confirm("Are you sure you want to remove this section? This action cannot be undone.");
        if (confirmResult) {
            this.removeSection(id);
        }
    },

    async removeSection(id) {
        console.log(`Removing section ${id}`);
        const sections = DataStore.getSections();
        const sectionIndex = sections.findIndex(s => s.id === id);
        if (sectionIndex === -1) return;

        // Remove the section and its subsections
        const sectionLevel = sections[sectionIndex].level;
        let endIndex = sectionIndex + 1;
        while (endIndex < sections.length && sections[endIndex].level > sectionLevel) {
            endIndex++;
        }
        sections.splice(sectionIndex, endIndex - sectionIndex);

        DataStore.setSections(sections);
        this.updateStepCounters();
        this.renderSections();
        await TimelineManager.updateTimelineSlider();

        // After removing a section, send the updated markers to Blender
        if (BlenderCommunication) {
            await BlenderCommunication.sendMarkers();
        }
    },

    updateSectionName(id, newName) {
        console.log(`Updating section ${id} name to ${newName}`);
        DataStore.updateSection(id, { title: newName });
        UIManager.updateSlider();
    },

    
    async updateStepsCounter(id, newSteps) {
        console.log(`Updating steps for section ${id} to ${newSteps}`);
        const steps = parseInt(newSteps);
        if (!isNaN(steps) && steps > 0) {
            const sections = DataStore.getSections();
            const section = sections.find(s => s.id === id);
            if (section && !section.frozen) {
                DataStore.updateSection(id, { steps: steps });
                this.sortSectionsBySteps();
                this.renderSections();
                await TimelineManager.updateTimelineSlider();

                // After updating steps, send the updated markers to Blender
                if (BlenderCommunication) {
                    await BlenderCommunication.sendMarkers();
                }
            } else if (section && section.frozen) {
                alert("This section is locked. Unlock it to change the steps.");
                this.renderSections(); // Re-render to reset the displayed value
            }
        } else {
            alert("Please enter a valid positive number for steps.");
            this.renderSections(); // Re-render to reset the displayed value
        }
    },



    changeLevel(id, change) {
        console.log(`Changing level for section ${id} by ${change}`);
        const sections = DataStore.getSections();
        const sectionIndex = sections.findIndex(s => s.id === id);
        const section = sections[sectionIndex];
        const newLevel = Math.max(0, section.level + change);
        
        // Check if the level change is valid
        if (newLevel === section.level) return; // No change needed
        if (newLevel > 0) {
            // Check if there's a valid parent section
            const potentialParent = sections.slice(0, sectionIndex).reverse().find(s => s.level < newLevel);
            if (!potentialParent) return; // Can't increase level if there's no valid parent
        }

        // Update the level
        section.level = newLevel;

        // Update levels of child sections
        for (let i = sectionIndex + 1; i < sections.length; i++) {
            if (sections[i].level <= section.level) break;
            sections[i].level = Math.max(sections[i].level - change, section.level + 1);
        }

        // Recalculate steps for all sections
        this.recalculateSteps(sections);

        // Update DataStore
        DataStore.setSections(sections);

        // Re-render sections and update timeline
        this.renderSections();
        TimelineManager.updateTimelineSlider();
    },


    recalculateSteps(sections) {
        let currentMainSection = null;
        let currentStep = 0;

        sections.forEach((section, index) => {
            if (section.frozen) {
                // If the section is frozen, keep its current step value
                currentStep = Math.max(currentStep, section.steps);
            } else if (section.level === 0) {
                // Main section
                currentMainSection = section;
                currentStep = Math.max((index + 1) * 10, currentStep + 10); // Ensure main sections are at least multiples of 10
                section.steps = currentStep;
            } else {
                // Subsection
                if (!currentMainSection) {
                    console.error("Subsection found without a main section");
                    return;
                }

                currentStep += 5; // Increment by 5 for each subsection
                section.steps = currentStep;
            }
        });
    },

    updateStepCounters() {
        let sections = DataStore.getSections();
        this.recalculateSteps(sections);
        DataStore.setSections(sections);
    },

    setupDragAndDrop() {
        const sectionHeaders = document.querySelectorAll('.section-header');
        sectionHeaders.forEach(header => {
            header.addEventListener('dragstart', this.dragStart);
            header.addEventListener('dragover', this.dragOver);
            header.addEventListener('dragleave', this.dragLeave);
            header.addEventListener('drop', this.drop.bind(this));
        });
    },

    dragStart(e) {
        e.dataTransfer.setData('text/plain', e.target.closest('.section').dataset.id);
    },

    dragOver(e) {
        e.preventDefault();
        const section = e.target.closest('.section');
        section.classList.add('drag-over');
        UIManager.updateDropIndicator(e.clientY);
    },

    dragLeave(e) {
        e.target.closest('.section').classList.remove('drag-over');
    },

    drop(e) {
        e.preventDefault();
        const draggedId = parseInt(e.dataTransfer.getData('text'));
        const droppedOnId = parseInt(e.target.closest('.section').dataset.id);
        e.target.closest('.section').classList.remove('drag-over');
        if (draggedId !== droppedOnId) {
            this.reorderSections(draggedId, droppedOnId);
        }
        UIManager.removeDropIndicator();
    },


    reorderSections(draggedId, droppedOnId) {
        console.log(`Reordering section ${draggedId} to position of ${droppedOnId}`);
        let sections = DataStore.getSections();
        const draggedIndex = sections.findIndex(s => s.id === draggedId);
        const droppedOnIndex = sections.findIndex(s => s.id === droppedOnId);
        const draggedSection = sections[draggedIndex];
        const subsections = this.getSubsections(draggedId);
        
        // Remove the dragged section and its subsections
        sections = sections.filter(s => s.id !== draggedId && !subsections.some(sub => sub.id === s.id));
        
        // Insert the dragged section and its subsections at the new position
        sections.splice(droppedOnIndex, 0, draggedSection, ...subsections);
        
        DataStore.setSections(sections);
        this.updateStepCounters();
        this.renderSections();
        TimelineManager.updateTimelineSlider();
    },

    getSubsections(parentId) {
        const sections = DataStore.getSections();
        const parentIndex = sections.findIndex(s => s.id === parentId);
        const parentLevel = sections[parentIndex].level;
        const subsections = [];
        
        for (let i = parentIndex + 1; i < sections.length; i++) {
            if (sections[i].level <= parentLevel) break;
            subsections.push(sections[i]);
        }
        
        return subsections;
    },

    sortSectionsBySteps() {
        let sections = DataStore.getSections();
        const mainSections = sections.filter(s => s.level === 0);
        mainSections.sort((a, b) => a.steps - b.steps);
        
        const newSections = [];
        mainSections.forEach(mainSection => {
            newSections.push(mainSection);
            const subsections = this.getSubsections(mainSection.id);
            newSections.push(...subsections);
        });
        
        DataStore.setSections(newSections);
    },

    generateSectionNumber(index) {
        const sections = DataStore.getSections();
        let number = '';
        let mainSectionCounter = 0;
        let subSectionCounters = [0, 0, 0]; // For up to 3 levels of subsections

        for (let i = 0; i <= index; i++) {
            if (sections[i].level === 0) {
                mainSectionCounter++;
                subSectionCounters = [0, 0, 0];
                if (i === index) number = mainSectionCounter.toString();
            } else {
                subSectionCounters[sections[i].level - 1]++;
                for (let j = sections[i].level; j < 3; j++) {
                    subSectionCounters[j] = 0;
                }
                if (i === index) {
                    number = mainSectionCounter.toString();
                    for (let j = 0; j < sections[i].level; j++) {
                        number += '.' + subSectionCounters[j].toString();
                    }
                }
            }
        }

        return number;
    },

    addFeature(sectionId) {
        console.log(`Adding feature to section ${sectionId}`);
        const featureType = prompt("Choose feature type:\n1. Table\n2. Rich Text Editor\n3. Camera\nEnter 1, 2, or 3:");
        
        if (featureType === "1") {
            this.addTable(sectionId);
        } else if (featureType === "2") {
            this.addEditor(sectionId);
        } else if (featureType === "3") {
            this.addCamera(sectionId);
        } else {
            alert("Invalid choice. Please try again.");
        }
    },
    
    // Add the addCamera method
    async addCamera(sectionId) {
        console.log(`Adding camera to section ${sectionId}`);
        await CameraManager.addCamera(sectionId);
    },
    
 

    addTable(sectionId) {
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        const existingTables = sectionContent.querySelectorAll('.table-container');
        const tableNumber = existingTables.length + 1;
        const tableId = `table-${sectionId}-${tableNumber}`;
        
        const tableContainer = document.createElement('div');
        tableContainer.id = tableId;
        tableContainer.className = 'table-container';
        tableContainer.style.width = '100%';
        
        const tableReference = document.createElement('span');
        tableReference.className = 'table-reference';
        tableReference.textContent = `Table ${this.generateTableReference(sectionId, tableNumber)}`;
        
        sectionContent.appendChild(tableReference);
        sectionContent.appendChild(tableContainer);
    
        const table = TabularManager.createTable(tableId, sectionId, tableNumber);
        const tableName = `Table ${this.generateTableReference(sectionId, tableNumber)}`;
        this.saveTableData(sectionId, tableNumber, { data: table.getData(), name: tableName });
    },
    
    saveTableData(sectionId, tableNumber, tableData) {
        DataStore.setTableData(sectionId, 'tables', {
            ...DataStore.getTableData(sectionId, 'tables'),
            [tableNumber]: tableData
        });
    },
    
    getTableData(sectionId, tableNumber) {
        const tableData = DataStore.getTableData(sectionId, 'tables') || {};
        return tableData[tableNumber] || { data: TabularManager.getInitialData(), name: `Table ${tableNumber}` };
    },
    
    renderTable(sectionContent, sectionId, tableNumber, tableData) {
        const tableContainer = document.createElement('div');
        const tableId = `table-${sectionId}-${tableNumber}`;
        tableContainer.id = tableId;
        tableContainer.className = 'table-container';
        tableContainer.style.width = '100%';
        
        const tableReference = document.createElement('span');
        tableReference.className = 'table-reference';
        tableReference.textContent = `Table ${this.generateTableReference(sectionId, tableNumber)}`;
        
        sectionContent.appendChild(tableReference);
        sectionContent.appendChild(tableContainer);
    
        TabularManager.createTable(tableId, sectionId, tableNumber, tableData);
    },

    refreshSection(sectionId) {
        const sectionElement = document.querySelector(`.section[data-id="${sectionId}"]`);
        if (sectionElement) {
            const sectionContent = sectionElement.querySelector('.section-content');
            sectionContent.innerHTML = '';
            this.restoreContentForSection(sectionId);
        }
    },

    generateTableReference(sectionId, tableNumber) {
        const sections = DataStore.getSections();
        const section = sections.find(s => s.id === parseInt(sectionId));
        if (section) {
            const sectionNumber = this.generateSectionNumber(sections.indexOf(section));
            return `${sectionNumber}.${tableNumber}`;
        }
        return `${sectionId}.${tableNumber}`;
    },


    
    addEditor(sectionId) {
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        const existingEditors = sectionContent.querySelectorAll('.editor-wrapper');
        const editorNumber = existingEditors.length + 1;
        EditorManager.addEditor(sectionId, editorNumber);
        this.saveEditorData(sectionId, editorNumber, { name: `Rich Text Editor ${editorNumber}`, data: {} });
    },

    saveEditorData(sectionId, editorNumber, editorData) {
        const editors = DataStore.getTableData(sectionId, 'editors') || {};
        editors[editorNumber] = editorData;
        DataStore.setTableData(sectionId, 'editors', editors);
    },



    generateEditorReference(sectionId, editorNumber) {
        const sections = DataStore.getSections();
        const section = sections.find(s => s.id === parseInt(sectionId));
        if (section) {
            const sectionNumber = this.generateSectionNumber(sections.indexOf(section));
            return `${sectionNumber}.E${editorNumber}`;
        }
        return `${sectionId}.E${editorNumber}`;
    },


    updateEditorName(sectionId, editorNumber, newName) {
        const editors = DataStore.getTableData(sectionId, 'editors') || {};
        if (editors[editorNumber]) {
            editors[editorNumber].name = newName;
            DataStore.setTableData(sectionId, 'editors', editors);
        }
    },

    async restoreTablesForSection(sectionId) {
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        const tableData = DataStore.getTableData(sectionId, 'tables') || {};
        const editorData = DataStore.getTableData(sectionId, 'editors') || {};
        
        const content = [];
    
        // Prepare tables
        Object.entries(tableData).forEach(([tableNumber, data]) => {
            content.push({
                type: 'table',
                number: parseInt(tableNumber),
                data: data,
                name: data.name || `Table ${tableNumber}`
            });
        });
    
        // Prepare editors
        Object.entries(editorData).forEach(([editorNumber, data]) => {
            content.push({
                type: 'editor',
                number: parseInt(editorNumber),
                data: data,
                name: data.name || `Rich Text Editor ${editorNumber}`
            });
        });
    
        // Sort content based on table numbers and editor position
        content.sort((a, b) => {
            if (a.type === 'table' && b.type === 'table') {
                return a.number - b.number;
            } else if (a.type === 'editor') {
                return editorPosition - (b.type === 'table' ? b.number : content.length);
            } else if (b.type === 'editor') {
                return (a.type === 'table' ? a.number : 0) - editorPosition;
            }
            return 0;
        });
    
        // Clear existing content
        sectionContent.innerHTML = '';
    
        // Render content in the order it was added
        for (const item of content) {
            if (item.type === 'table') {
                this.renderTable(sectionContent, sectionId, item.number, item.data);
            } else if (item.type === 'editor') {
                await EditorManager.restoreEditor(sectionId, item.number, item.data);
            }
        }
    },

    async renderEditor(sectionContent, sectionId, data) {
        await EditorManager.restoreEditor(sectionId, data);
    },

    updateAllSections() {
        console.log('Updating all sections');
        this.updateStepCounters();
        this.sortSectionsBySteps();
        this.renderSections();
    },

    expandAllSections() {
        console.log('Expanding all sections');
        CollapseManager.collapsedSections.clear();
        this.renderSections();
    },

    collapseAllSections() {
        console.log('Collapsing all sections');
        const sections = DataStore.getSections();
        sections.forEach(section => {
            if (section.level === 0) {
                CollapseManager.collapsedSections.add(section.id);
            }
        });
        this.renderSections();
    },

};
