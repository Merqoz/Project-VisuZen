// Enhanced CameraManager.js with stability improvements

const CameraManager = {
    // Store all available cameras in the Blender scene
    availableCameras: [],
    isAddingCamera: false, // Flag to prevent multiple camera operations
    
    // Method to fetch all cameras from Blender
    async fetchAvailableCameras() {
        try {
            const result = await eel.get_all_cameras_in_scene()();
            if (result.success) {
                this.availableCameras = result.cameras;
                return result.cameras;
            } else {
                console.error("Failed to fetch cameras:", result.message);
                return [];
            }
        } catch (error) {
            console.error("Error fetching cameras:", error);
            return [];
        }
    },

    async addCamera(sectionId) {
        // Prevent multiple simultaneous camera operations
        if (this.isAddingCamera) {
            alert("Please wait while the previous camera operation completes.");
            return null;
        }
        
        this.isAddingCamera = true;
        
        try {
            const sectionContent = document.querySelector(`#section-content-${sectionId}`);
            if (!sectionContent) {
                this.isAddingCamera = false;
                return null;
            }
            
            // Show loading indicator
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            // Pre-allocate space for better UX
            this.preAllocateSpace(sectionContent);
            
            // Fetch available cameras first
            await this.fetchAvailableCameras();
            
            // Ask user if they want to use the current Blender view or select an existing camera
            const cameraChoice = confirm('Do you want to use the current Blender view for this camera?\n\nOK = Current View\nCancel = Select Existing Camera');
            
            if (cameraChoice) {
                // Current view option - ALWAYS use simple screenshot (no rendering) for stability
                const renderPreview = false; // Always false for stability
                
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
                    alert('An error occurred while adding the camera. Blender may need to be restarted.');
                    return null;
                }
            } else {
                // Select existing camera option
                if (this.availableCameras.length === 0) {
                    alert("No cameras found in the scene. Please create a camera first.");
                    this.isAddingCamera = false;
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                    return null;
                }
                
                // Create a simple camera selection dialog
                const selectedCamera = await this.showCameraSelectionDialog(this.availableCameras);
                if (!selectedCamera) {
                    this.isAddingCamera = false;
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                    return null;
                }
                
                // Get existing cameras for this section
                const existingCameras = this.getSectionCameras(sectionId);
                const cameraNumber = existingCameras.length + 1;
                
                try {
                    // Get current frame from the timeline slider
                    const currentFrame = parseInt(document.getElementById('timeline-slider').value);
                    
                    // Call Python function to link existing camera
                    const result = await eel.link_existing_camera(sectionId, cameraNumber, selectedCamera, currentFrame)();
                    
                    if (result.success) {
                        this.renderCamera(sectionContent, sectionId, cameraNumber, result.camera_data);
                        return result.camera_data;
                    } else {
                        alert(`Failed to link camera: ${result.message}`);
                        return null;
                    }
                } catch (error) {
                    console.error('Error linking camera:', error);
                    alert('An error occurred while linking the camera. Blender may need to be restarted.');
                    return null;
                }
            }
        } finally {
            // Always reset the flag and hide loading indicator
            this.isAddingCamera = false;
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            
            // Clean up any placeholders
            const placeholders = document.querySelectorAll('.camera-placeholder');
            placeholders.forEach(placeholder => {
                if (placeholder.parentNode) {
                    placeholder.parentNode.removeChild(placeholder);
                }
            });
        }
    },
    
    preAllocateSpace(sectionContent) {
        // Create a placeholder to reserve space
        const placeholder = document.createElement('div');
        placeholder.className = 'camera-placeholder';
        placeholder.style.height = '400px';
        placeholder.style.width = '100%';
        placeholder.style.backgroundColor = '#2a2a2a';
        placeholder.style.borderRadius = '8px';
        placeholder.style.marginBottom = '20px';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.innerHTML = '<div style="color: #e0e0e0; text-align: center;">Loading camera preview...<br><div class="spinner" style="width: 40px; height: 40px; border: 3px solid #333; border-top: 3px solid #3498db; border-radius: 50%; margin: 20px auto; animation: spin 1s linear infinite;"></div></div>';
        
        // Add style for spinner animation if needed
        if (!document.getElementById('camera-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'camera-spinner-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        
        sectionContent.appendChild(placeholder);
        
        // Remove the placeholder after 5 seconds (failsafe)
        setTimeout(() => {
            if (placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }
        }, 5000);
    },
    
    async showCameraSelectionDialog(cameras) {
        return new Promise((resolve) => {
            // Create modal container
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            modal.style.zIndex = '1000';
            
            // Create modal content
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.backgroundColor = '#383838';
            content.style.padding = '20px';
            content.style.borderRadius = '5px';
            content.style.maxWidth = '500px';
            content.style.color = '#e0e0e0';
            
            const title = document.createElement('h3');
            title.textContent = 'Select Camera';
            title.style.marginTop = '0';
            content.appendChild(title);
            
            const select = document.createElement('select');
            select.style.width = '100%';
            select.style.padding = '10px';
            select.style.marginBottom = '20px';
            select.style.backgroundColor = '#4a4a4a';
            select.style.color = '#e0e0e0';
            select.style.border = '1px solid #5a5a5a';
            select.style.borderRadius = '4px';
            
            cameras.forEach(camera => {
                const option = document.createElement('option');
                option.value = camera.name;
                option.textContent = camera.name;
                select.appendChild(option);
            });
            
            content.appendChild(select);
            
            const buttonContainer = document.createElement('div');
            buttonContainer.style.display = 'flex';
            buttonContainer.style.justifyContent = 'flex-end';
            buttonContainer.style.gap = '10px';
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.style.padding = '8px 16px';
            cancelButton.style.backgroundColor = '#e74c3c';
            cancelButton.style.color = '#fff';
            cancelButton.style.border = 'none';
            cancelButton.style.borderRadius = '4px';
            cancelButton.style.cursor = 'pointer';
            cancelButton.onclick = () => {
                document.body.removeChild(modal);
                resolve(null);
            };
            
            const selectButton = document.createElement('button');
            selectButton.textContent = 'Select';
            selectButton.style.padding = '8px 16px';
            selectButton.style.backgroundColor = '#2ecc71';
            selectButton.style.color = '#fff';
            selectButton.style.border = 'none';
            selectButton.style.borderRadius = '4px';
            selectButton.style.cursor = 'pointer';
            selectButton.onclick = () => {
                document.body.removeChild(modal);
                resolve(select.value);
            };
            
            buttonContainer.appendChild(cancelButton);
            buttonContainer.appendChild(selectButton);
            content.appendChild(buttonContainer);
            
            modal.appendChild(content);
            document.body.appendChild(modal);
        });
    },
    
    renderCamera(sectionContent, sectionId, cameraNumber, cameraData) {
        const cameraWrapper = document.createElement('div');
        cameraWrapper.className = 'camera-wrapper';
        cameraWrapper.id = `camera-wrapper-${sectionId}-${cameraNumber}`;
        
        // Create the camera reference
        const cameraReference = document.createElement('span');
        cameraReference.className = 'camera-reference';
        cameraReference.textContent = `Camera ${this.generateCameraReference(sectionId, cameraNumber)}`;
        
        // Create camera title with dropdown
        const cameraTitleContainer = document.createElement('div');
        cameraTitleContainer.className = 'camera-title-container';
        
        // Create camera dropdown for scene cameras
        const cameraSelect = document.createElement('select');
        cameraSelect.className = 'camera-select';
        
        // Add option for current camera
        const currentOption = document.createElement('option');
        currentOption.value = cameraData.blender_name || "";
        currentOption.textContent = cameraData.name || `Camera ${cameraNumber}`;
        currentOption.selected = true;
        cameraSelect.appendChild(currentOption);
        
        // Add other cameras from scene
        this.availableCameras.forEach(camera => {
            if (camera.name !== (cameraData.blender_name || "")) {
                const option = document.createElement('option');
                option.value = camera.name;
                option.textContent = camera.name;
                cameraSelect.appendChild(option);
            }
        });
        
        // Add change event to update camera view
        cameraSelect.addEventListener('change', async () => {
            // Prevent changes if another operation is in progress
            if (this.isAddingCamera) {
                alert("Please wait while the previous camera operation completes.");
                cameraSelect.value = cameraData.blender_name || "";
                return;
            }
            
            this.isAddingCamera = true;
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            try {
                const result = await eel.change_camera_view(sectionId, cameraNumber, cameraSelect.value)();
                if (result.success) {
                    this.refreshCamera(sectionId, cameraNumber, result.camera_data);
                } else {
                    alert(`Failed to change camera: ${result.message}`);
                    // Reset to previous selection
                    cameraSelect.value = cameraData.blender_name || "";
                }
            } catch (error) {
                console.error('Error changing camera view:', error);
                alert('An error occurred while changing the camera view. Blender may need to be restarted.');
                // Reset to previous selection
                cameraSelect.value = cameraData.blender_name || "";
            } finally {
                this.isAddingCamera = false;
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        });
        
        cameraTitleContainer.appendChild(cameraSelect);
        
        // Add position info label
        const positionInfo = document.createElement('span');
        positionInfo.className = 'position-info';
        positionInfo.textContent = `Pos: ${formatVector(cameraData.position)}`;
        cameraTitleContainer.appendChild(positionInfo);
        
        // Create camera preview container
        const cameraPreview = document.createElement('div');
        cameraPreview.className = 'camera-preview';
        
        // Add loading indicator first
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'camera-loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="spinner"></div>
            <div>Loading preview...</div>
        `;
        cameraPreview.appendChild(loadingIndicator);
        
        // If we have a preview image, display it
        if (cameraData.preview_image) {
            const img = document.createElement('img');
            img.style.opacity = '0'; // Start hidden
            img.src = `data:image/png;base64,${cameraData.preview_image}`;
            img.alt = `Camera ${cameraNumber} Preview`;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '300px';
            img.style.transition = 'opacity 0.3s ease';
            
            // When image loads, show it and remove loading indicator
            img.onload = () => {
                img.style.opacity = '1';
                loadingIndicator.style.display = 'none';
                
                // Mark wrapper as rendered
                cameraWrapper.classList.add('rendered');
            };
            
            // Add click handler to open full-size image
            img.style.cursor = 'pointer';
            img.addEventListener('click', () => {
                window.open(img.src, '_blank');
            });
            
            cameraPreview.appendChild(img);
        } else {
            // If no preview, show a message
            loadingIndicator.innerHTML = '<div style="text-align: center; padding: 20px; color: #e0e0e0;">No preview available</div>';
            
            // Mark wrapper as rendered anyway
            setTimeout(() => {
                cameraWrapper.classList.add('rendered');
            }, 100);
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
        updateButton.title = 'Update this camera with the current viewport position in Blender';
        updateButton.onclick = async () => {
            // Prevent multiple operations
            if (this.isAddingCamera) {
                alert("Please wait while the previous camera operation completes.");
                return;
            }
            
            this.isAddingCamera = true;
            const indicator = document.getElementById('loading-indicator');
            if (indicator) indicator.style.display = 'block';
            
            try {
                const currentFrame = parseInt(document.getElementById('timeline-slider').value);
                const result = await eel.update_camera_from_current_view(sectionId, cameraNumber, currentFrame, false)();
                
                if (result.success) {
                    // Refresh the camera display
                    this.refreshCamera(sectionId, cameraNumber, result.camera_data);
                    
                    // Update the position info label
                    const positionInfo = cameraWrapper.querySelector('.position-info');
                    if (positionInfo) {
                        positionInfo.textContent = `Pos: ${formatVector(result.camera_data.position)}`;
                    }
                } else {
                    alert(`Failed to update camera: ${result.message}`);
                }
            } catch (error) {
                console.error('Error updating camera:', error);
                alert('An error occurred while updating the camera. Blender may need to be restarted.');
            } finally {
                this.isAddingCamera = false;
                if (indicator) indicator.style.display = 'none';
            }
        };
        
        const jumpToButton = document.createElement('button');
        jumpToButton.textContent = 'Jump To Camera View';
        jumpToButton.className = 'camera-jump-button';
        jumpToButton.title = 'Jump to this camera\'s view in Blender';
        jumpToButton.onclick = async () => {
            // Prevent multiple operations
            if (this.isAddingCamera) {
                alert("Please wait while the previous camera operation completes.");
                return;
            }
            
            this.isAddingCamera = true;
            const indicator = document.getElementById('loading-indicator');
            if (indicator) indicator.style.display = 'block';
            
            try {
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
            } catch (error) {
                console.error('Error jumping to camera view:', error);
                alert('An error occurred while jumping to the camera view. Blender may need to be restarted.');
            } finally {
                this.isAddingCamera = false;
                if (indicator) indicator.style.display = 'none';
            }
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Remove Camera';
        deleteButton.className = 'camera-delete-button';
        deleteButton.title = 'Remove this camera from the section';
        deleteButton.onclick = async () => {
            // Prevent multiple operations
            if (this.isAddingCamera) {
                alert("Please wait while the previous camera operation completes.");
                return;
            }
            
            this.isAddingCamera = true;
            
            try {
                // Ask user whether to just remove from section or delete from Blender too
                const deleteChoice = confirm("Remove camera reference only (OK) or delete camera from Blender (Cancel)?");
                
                if (deleteChoice) {
                    // Remove from section only
                    const result = await eel.remove_camera_reference(sectionId, cameraNumber)();
                    if (result.success) {
                        cameraWrapper.remove();
                        cameraReference.remove();
                    } else {
                        alert(`Failed to remove camera: ${result.message}`);
                    }
                } else {
                    // Delete from Blender too
                    if (confirm('Are you sure you want to delete this camera from Blender? This cannot be undone.')) {
                        const result = await eel.delete_camera(sectionId, cameraNumber, true)();
                        if (result.success) {
                            cameraWrapper.remove();
                            cameraReference.remove();
                        } else {
                            alert(`Failed to delete camera: ${result.message}`);
                        }
                    }
                }
            } catch (error) {
                console.error('Error removing camera:', error);
                alert('An error occurred while removing the camera. Blender may need to be restarted.');
            } finally {
                this.isAddingCamera = false;
            }
        };
        
        cameraControls.appendChild(updateButton);
        cameraControls.appendChild(jumpToButton);
        cameraControls.appendChild(deleteButton);
        
        // Assemble the camera wrapper
        cameraWrapper.appendChild(cameraTitleContainer);
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
        
        // Update camera select value
        const cameraSelect = cameraWrapper.querySelector('.camera-select');
        if (cameraSelect) {
            // Check if option exists, if not create it
            let option = Array.from(cameraSelect.options).find(opt => opt.value === cameraData.blender_name);
            if (!option) {
                option = document.createElement('option');
                option.value = cameraData.blender_name;
                cameraSelect.appendChild(option);
            }
            option.textContent = cameraData.name || `Camera ${cameraNumber}`;
            cameraSelect.value = cameraData.blender_name;
        }
        
        // Update position info
        const positionInfo = cameraWrapper.querySelector('.position-info');
        if (positionInfo) {
            positionInfo.textContent = `Pos: ${formatVector(cameraData.position)}`;
        }
        
        // Update camera preview if available
        if (cameraData.preview_image) {
            const cameraPreview = cameraWrapper.querySelector('.camera-preview');
            if (cameraPreview) {
                // Keep existing loading indicator
                const loadingIndicator = cameraPreview.querySelector('.camera-loading-indicator');
                
                // Remove existing image
                const existingImg = cameraPreview.querySelector('img');
                if (existingImg) {
                    existingImg.remove();
                }
                
                // Add new image
                const img = document.createElement('img');
                img.style.opacity = '0'; // Start hidden
                img.src = `data:image/png;base64,${cameraData.preview_image}`;
                img.alt = `Camera ${cameraNumber} Preview`;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '300px';
                img.style.transition = 'opacity 0.3s ease';
                
                // When image loads, show it and remove loading indicator
                img.onload = () => {
                    img.style.opacity = '1';
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                };
                
                // Add click handler to open full-size image
                img.style.cursor = 'pointer';
                img.addEventListener('click', () => {
                    window.open(img.src, '_blank');
                });
                
                cameraPreview.appendChild(img);
            }
        }
        
        // Update camera info
        const cameraInfo = cameraWrapper.querySelector('.camera-info');
        if (cameraInfo) {
            cameraInfo.innerHTML = `
                <div>Position: X: ${cameraData.position.x.toFixed(2)}, Y: ${cameraData.position.y.toFixed(2)}, Z: ${cameraData.position.z.toFixed(2)}</div>
                <div>Rotation: X: ${cameraData.rotation.x.toFixed(2)}, Y: ${cameraData.rotation.y.toFixed(2)}, Z: ${cameraData.rotation.z.toFixed(2)}</div>
                <div>Frame: ${cameraData.frame}</div>
            `;
        }
        
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
        // Prevent multiple operations
        if (this.isAddingCamera) {
            console.warn("Skipping camera restoration while another operation is in progress");
            return;
        }
        
        this.isAddingCamera = true;
        
        try {
            // Fetch available cameras first to populate dropdown options
            await this.fetchAvailableCameras();
            
            const sectionContent = document.querySelector(`#section-content-${sectionId}`);
            if (!sectionContent) {
                this.isAddingCamera = false;
                return;
            }
            
            const cameras = DataStore.getTableData(sectionId, 'cameras') || {};
            
            for (const [cameraNumber, cameraData] of Object.entries(cameras)) {
                this.renderCamera(sectionContent, sectionId, parseInt(cameraNumber), cameraData);
                
                // Add a small delay between camera additions to prevent overload
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        } catch (error) {
            console.error('Error restoring cameras:', error);
        } finally {
            this.isAddingCamera = false;
        }
    }
};

// Helper function to format position vectors more concisely
function formatVector(vector) {
    return `(${vector.x.toFixed(1)}, ${vector.y.toFixed(1)}, ${vector.z.toFixed(1)})`;
}