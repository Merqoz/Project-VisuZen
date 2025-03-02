// cameraManager.js

const CameraManager = {
    async addCamera(sectionId) {
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        if (!sectionContent) return null;
        
        // Ask user if they want to use the current Blender view
        const useCurrentView = confirm('Do you want to use the current Blender view for this camera?');
        
        if (useCurrentView) {
            // Ask if user wants a rendered preview
            const renderPreview = confirm('Do you want a rendered preview? (No = simple screenshot, Yes = rendered preview)');
            
            // Get existing cameras for this section
            const existingCameras = this.getSectionCameras(sectionId);
            const cameraNumber = existingCameras.length + 1;
            
            try {
                // Get current frame from the timeline slider
                const currentFrame = parseInt(document.getElementById('timeline-slider').value);
                
                // Call Python function to add camera at current view
                const result = await eel.add_camera_at_current_view(sectionId, cameraNumber, currentFrame, renderPreview)();
                
                if (result.success) {
                    this.renderCamera(sectionContent, sectionId, cameraNumber, result.camera_data);
                    return result.camera_data;
                } else {
                    alert(`Failed to add camera: ${result.message}`);
                    return null;
                }
            } catch (error) {
                console.error('Error adding camera:', error);
                alert('An error occurred while adding the camera');
                return null;
            }
        }
        
        return null;
    },
    
    renderCamera(sectionContent, sectionId, cameraNumber, cameraData) {
        const cameraWrapper = document.createElement('div');
        cameraWrapper.className = 'camera-wrapper';
        cameraWrapper.id = `camera-wrapper-${sectionId}-${cameraNumber}`;
        
        // Create the camera reference
        const cameraReference = document.createElement('span');
        cameraReference.className = 'camera-reference';
        cameraReference.textContent = `Camera ${this.generateCameraReference(sectionId, cameraNumber)}`;
        
        // Create camera title
        const cameraTitle = document.createElement('div');
        cameraTitle.className = 'camera-title';
        cameraTitle.textContent = cameraData.name || `Camera ${cameraNumber}`;
        cameraTitle.contentEditable = true;
        cameraTitle.addEventListener('blur', () => {
            this.updateCameraName(sectionId, cameraNumber, cameraTitle.textContent);
        });
        
        // Create camera preview container
        const cameraPreview = document.createElement('div');
        cameraPreview.className = 'camera-preview';
        
        // If we have a preview image, display it
        if (cameraData.preview_image) {
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${cameraData.preview_image}`;
            img.alt = `Camera ${cameraNumber} Preview`;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            cameraPreview.appendChild(img);
            
            // Add click handler to open full-size image
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                window.open(img.src, '_blank');
            });
        } else {
            cameraPreview.innerHTML = '<div style="text-align: center; padding: 20px; color: #e0e0e0;">No preview available</div>';
        }
        
        // Create camera info
        const cameraInfo = document.createElement('div');
        cameraInfo.className = 'camera-info';
        cameraInfo.innerHTML = `
            <div>Position: X: ${cameraData.position.x.toFixed(2)}, Y: ${cameraData.position.y.toFixed(2)}, Z: ${cameraData.position.z.toFixed(2)}</div>
            <div>Rotation: X: ${cameraData.rotation.x.toFixed(2)}, Y: ${cameraData.rotation.y.toFixed(2)}, Z: ${cameraData.rotation.z.toFixed(2)}</div>
            <div>Frame: ${cameraData.frame}</div>
        `;
        
        // Create camera controls
        const cameraControls = document.createElement('div');
        cameraControls.className = 'camera-controls';
        
        const updateButton = document.createElement('button');
        updateButton.textContent = 'Update From Current View';
        updateButton.className = 'camera-update-button';
        updateButton.onclick = async () => {
            const renderPreview = confirm('Do you want a rendered preview? (No = simple screenshot, Yes = rendered preview)');
            const currentFrame = parseInt(document.getElementById('timeline-slider').value);
            const result = await eel.update_camera_from_current_view(sectionId, cameraNumber, currentFrame, renderPreview)();
            
            if (result.success) {
                // Refresh the camera display
                this.refreshCamera(sectionId, cameraNumber, result.camera_data);
            } else {
                alert(`Failed to update camera: ${result.message}`);
            }
        };
        
        const jumpToButton = document.createElement('button');
        jumpToButton.textContent = 'Jump To Camera View';
        jumpToButton.className = 'camera-jump-button';
        jumpToButton.onclick = async () => {
            await eel.jump_to_camera_view(sectionId, cameraNumber)();
            // Optionally jump to the camera's frame as well
            if (cameraData.frame) {
                const slider = document.getElementById('timeline-slider');
                if (slider) {
                    slider.value = cameraData.frame;
                    // Trigger input event to update everything
                    const event = new Event('input', { bubbles: true });
                    slider.dispatchEvent(event);
                }
            }
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete Camera';
        deleteButton.className = 'camera-delete-button';
        deleteButton.onclick = async () => {
            if (confirm('Are you sure you want to delete this camera?')) {
                const result = await eel.delete_camera(sectionId, cameraNumber)();
                if (result.success) {
                    cameraWrapper.remove();
                    cameraReference.remove();
                } else {
                    alert(`Failed to delete camera: ${result.message}`);
                }
            }
        };
        
        cameraControls.appendChild(updateButton);
        cameraControls.appendChild(jumpToButton);
        cameraControls.appendChild(deleteButton);
        
        // Assemble the camera wrapper
        cameraWrapper.appendChild(cameraTitle);
        cameraWrapper.appendChild(cameraPreview);
        cameraWrapper.appendChild(cameraInfo);
        cameraWrapper.appendChild(cameraControls);
        
        // Add to DOM
        sectionContent.appendChild(cameraReference);
        sectionContent.appendChild(cameraWrapper);
        
        // Save camera data
        this.saveCameraData(sectionId, cameraNumber, cameraData);
    },
    
    refreshCamera(sectionId, cameraNumber, cameraData) {
        const cameraWrapper = document.getElementById(`camera-wrapper-${sectionId}-${cameraNumber}`);
        if (!cameraWrapper) return;
        
        // Update camera preview if available
        if (cameraData.preview_image) {
            const cameraPreview = cameraWrapper.querySelector('.camera-preview');
            cameraPreview.innerHTML = '';
            const img = document.createElement('img');
            img.src = `data:image/png;base64,${cameraData.preview_image}`;
            img.alt = `Camera ${cameraNumber} Preview`;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            
            // Add click handler to open full-size image
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                window.open(img.src, '_blank');
            });
            
            cameraPreview.appendChild(img);
        }
        
        // Update camera info
        const cameraInfo = cameraWrapper.querySelector('.camera-info');
        cameraInfo.innerHTML = `
            <div>Position: X: ${cameraData.position.x.toFixed(2)}, Y: ${cameraData.position.y.toFixed(2)}, Z: ${cameraData.position.z.toFixed(2)}</div>
            <div>Rotation: X: ${cameraData.rotation.x.toFixed(2)}, Y: ${cameraData.rotation.y.toFixed(2)}, Z: ${cameraData.rotation.z.toFixed(2)}</div>
            <div>Frame: ${cameraData.frame}</div>
        `;
        
        // Save updated camera data
        this.saveCameraData(sectionId, cameraNumber, cameraData);
    },
    
    saveCameraData(sectionId, cameraNumber, cameraData) {
        const cameras = DataStore.getTableData(sectionId, 'cameras') || {};
        cameras[cameraNumber] = cameraData;
        DataStore.setTableData(sectionId, 'cameras', cameras);
    },
    
    updateCameraName(sectionId, cameraNumber, newName) {
        const cameras = DataStore.getTableData(sectionId, 'cameras') || {};
        if (cameras[cameraNumber]) {
            cameras[cameraNumber].name = newName;
            DataStore.setTableData(sectionId, 'cameras', cameras);
        }
    },
    
    getSectionCameras(sectionId) {
        const cameras = DataStore.getTableData(sectionId, 'cameras') || {};
        return Object.entries(cameras).map(([number, data]) => ({
            number: parseInt(number),
            ...data
        }));
    },
    
    generateCameraReference(sectionId, cameraNumber) {
        const sections = DataStore.getSections();
        const section = sections.find(s => s.id === parseInt(sectionId));
        if (section) {
            const sectionNumber = SectionManager.generateSectionNumber(sections.indexOf(section));
            return `${sectionNumber}.C${cameraNumber}`;
        }
        return `${sectionId}.C${cameraNumber}`;
    },
    
    async restoreCamerasForSection(sectionId) {
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        if (!sectionContent) return;
        
        const cameras = DataStore.getTableData(sectionId, 'cameras') || {};
        
        for (const [cameraNumber, cameraData] of Object.entries(cameras)) {
            this.renderCamera(sectionContent, sectionId, parseInt(cameraNumber), cameraData);
        }
    }
};

// Export the CameraManager object if you're using ES6 modules
// export default CameraManager;