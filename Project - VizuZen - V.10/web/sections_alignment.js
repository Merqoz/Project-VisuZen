// sections_alignment.js

const SectionsAlignment = {
    showAlignmentDialog(sectionId) {
        const section = DataStore.getSections().find(s => s.id === sectionId);
        if (!section) return;

        const sectionNumber = SectionManager.generateSectionNumber(DataStore.getSections().indexOf(section));
        const content = this.getSectionContent(sectionId);

        // Create modal container
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.id = 'alignment-modal';
        modal.setAttribute('data-section-id', sectionId);

        // Create modal content
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalContent.innerHTML = `
            <h2>Content Alignment for Section ${sectionNumber}: ${section.title}</h2>
            <ul class="content-list">
                ${content.map((item, index) => `
                    <li>
                        <span class="content-reference">${item.reference}</span>
                        <span class="content-type">${item.type}</span>
                        <input type="text" class="content-name-input" 
                            value="${item.name}" 
                            placeholder="${item.type} Name"
                            onchange="SectionsAlignment.updateContentName(${sectionId}, '${item.type}', ${item.number}, this.value)">
                        <button onclick="SectionsAlignment.moveContent(${sectionId}, ${index}, 'up')">▲</button>
                        <button onclick="SectionsAlignment.moveContent(${sectionId}, ${index}, 'down')">▼</button>
                        <button onclick="SectionsAlignment.deleteContent(${sectionId}, ${index})">🗑️</button>
                    </li>
                `).join('')}
            </ul>
            <button onclick="SectionsAlignment.closeDialog()">Close</button>
        `;

        // Append modal content to modal container
        modal.appendChild(modalContent);

        // Append modal to body
        document.body.appendChild(modal);

        // Show modal
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    },

    moveContent(sectionId, index, direction) {
        const content = this.getSectionContent(sectionId);
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        
        if (newIndex < 0 || newIndex >= content.length) return;

        // Swap the items
        [content[index], content[newIndex]] = [content[newIndex], content[index]];

        // Update the content order
        this.updateContentOrder(sectionId, content);

        // Update the alignment dialog
        this.updateDialogContent(sectionId);

        // Refresh the section to reflect changes
        SectionManager.refreshSection(sectionId);
    },

    updateContentOrder(sectionId, content) {
        const tables = {};
        const editors = {};
        const cameras = {};
    
        content.forEach((item, index) => {
            if (item.type === 'Table') {
                tables[item.number] = {
                    ...item.data,
                    name: item.name,
                    order: index
                };
            } else if (item.type === 'Text Editor') {
                editors[item.number] = {
                    ...item.data,
                    name: item.name,
                    order: index
                };
            } else if (item.type === 'Camera') {
                cameras[item.number] = {
                    ...item.data,
                    name: item.name,
                    order: index
                };
            }
        });
    
        // Update table data
        DataStore.setTableData(sectionId, 'tables', tables);
    
        // Update editor data
        DataStore.setTableData(sectionId, 'editors', editors);
        
        // Update camera data
        DataStore.setTableData(sectionId, 'cameras', cameras);
    },

    getSectionContent(sectionId) {
        const content = [];
        const tables = DataStore.getTableData(sectionId, 'tables') || {};
        const editors = DataStore.getTableData(sectionId, 'editors') || {};
        const cameras = DataStore.getTableData(sectionId, 'cameras') || {};
    
        // Add tables
        Object.entries(tables).forEach(([tableNumber, tableData]) => {
            content.push({
                type: 'Table',
                reference: `${SectionManager.generateTableReference(sectionId, tableNumber)}`,
                number: parseInt(tableNumber),
                name: tableData.name || `Table ${tableNumber}`,
                data: tableData,
                order: tableData.order || 0
            });
        });
    
        // Add editors
        Object.entries(editors).forEach(([editorNumber, editorData]) => {
            content.push({
                type: 'Text Editor',
                reference: `${SectionManager.generateEditorReference(sectionId, editorNumber)}`,
                number: parseInt(editorNumber),
                name: editorData.name || `Rich Text Editor ${editorNumber}`,
                data: editorData,
                order: editorData.order || 0
            });
        });
        
        // Add cameras
        Object.entries(cameras).forEach(([cameraNumber, cameraData]) => {
            content.push({
                type: 'Camera',
                reference: `${CameraManager.generateCameraReference(sectionId, cameraNumber)}`,
                number: parseInt(cameraNumber),
                name: cameraData.name || `Camera ${cameraNumber}`,
                data: cameraData,
                order: cameraData.order || 0
            });
        });
    
        // Sort content based on order
        content.sort((a, b) => a.order - b.order);
    
        return content;
    },

    updateDialogContent(sectionId) {
        const modal = document.getElementById('alignment-modal');
        if (!modal) return;
    
        const content = this.getSectionContent(sectionId);
        console.log('Updating dialog content with:', content);
        const contentList = modal.querySelector('.content-list');
        
        contentList.innerHTML = content.map((item, index) => `
            <li>
                <span class="content-reference">${item.reference}</span>
                <span class="content-type">${item.type}</span>
                <input type="text" class="content-name-input" 
                    value="${item.name}" 
                    placeholder="${item.type} Name"
                    onchange="SectionsAlignment.updateContentName(${sectionId}, '${item.type}', ${item.number}, this.value)">
                <button onclick="SectionsAlignment.moveContent(${sectionId}, ${index}, 'up')" ${index === 0 ? 'disabled' : ''}>▲</button>
                <button onclick="SectionsAlignment.moveContent(${sectionId}, ${index}, 'down')" ${index === content.length - 1 ? 'disabled' : ''}>▼</button>
                <button onclick="SectionsAlignment.deleteContent(${sectionId}, ${index})">🗑️</button>
            </li>
        `).join('');
    },

    updateContentName(sectionId, contentType, contentNumber, newName) {
        if (contentType === 'Table') {
            const tables = DataStore.getTableData(sectionId, 'tables') || {};
            if (tables[contentNumber]) {
                tables[contentNumber].name = newName;
                DataStore.setTableData(sectionId, 'tables', tables);
            }
        } else if (contentType === 'Text Editor') {
            const editors = DataStore.getTableData(sectionId, 'editors') || {};
            if (editors[contentNumber]) {
                editors[contentNumber].name = newName;
                DataStore.setTableData(sectionId, 'editors', editors);
            }
        } else if (contentType === 'Camera') {
            const cameras = DataStore.getTableData(sectionId, 'cameras') || {};
            if (cameras[contentNumber]) {
                cameras[contentNumber].name = newName;
                DataStore.setTableData(sectionId, 'cameras', cameras);
            }
        }
        this.updateDialogContent(sectionId);
        SectionManager.refreshSection(sectionId);
    },
    
    deleteContent(sectionId, index) {
        const content = this.getSectionContent(sectionId);
        if (index < 0 || index >= content.length) return;

        const item = content[index];
        if (item.type === 'Table') {
            const tables = DataStore.getTableData(sectionId, 'tables') || {};
            delete tables[item.number];
            DataStore.setTableData(sectionId, 'tables', tables);
        } else if (item.type === 'Text Editor') {
            const editors = DataStore.getTableData(sectionId, 'editors') || {};
            delete editors[item.number];
            DataStore.setTableData(sectionId, 'editors', editors);
        }

        content.splice(index, 1);
        this.updateContentOrder(sectionId, content);
        this.updateDialogContent(sectionId);

        // Refresh the section to reflect changes
        SectionManager.refreshSection(sectionId);
    },

    closeDialog() {
        const modal = document.getElementById('alignment-modal');
        if (modal) {
            modal.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(modal);
                // Refresh the section to reflect any changes
                const sectionId = parseInt(modal.getAttribute('data-section-id'));
                if (!isNaN(sectionId)) {
                    SectionManager.refreshSection(sectionId);
                }
            }, 300); // Wait for fade-out animation
        }
    }
};