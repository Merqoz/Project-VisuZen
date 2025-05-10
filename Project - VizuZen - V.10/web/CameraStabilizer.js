// CameraStabilizer.js - Prevents layout jumps when adding cameras

const CameraStabilizer = {
    init() {
        console.log('Initializing Camera Stabilizer...');
        // Wait for CameraManager to be defined
        this.waitForCameraManager();
    },
    
    waitForCameraManager() {
        // Check if CameraManager is already defined
        if (typeof CameraManager !== 'undefined') {
            this.enhanceCameraManager();
            this.setupImageObserver();
            this.setupLayoutFixes();
        } else {
            // Poll until CameraManager is defined
            console.log('Waiting for CameraManager to be available...');
            setTimeout(() => this.waitForCameraManager(), 100);
        }
    },
    
    enhanceCameraManager() {
        console.log('Enhancing CameraManager for stability...');
        
        // Store original methods before patching
        if (!CameraManager._originalAddCamera) {
            CameraManager._originalAddCamera = CameraManager.addCamera;
        }
        
        if (!CameraManager._originalRenderCamera) {
            CameraManager._originalRenderCamera = CameraManager.renderCamera;
        }
        
        // Enhance the addCamera method
        CameraManager.addCamera = async function(sectionId) {
            // Show loading indicator while camera is being added
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            
            try {
                // Pre-allocate space for the camera to prevent layout shifts
                CameraStabilizer.preAllocateSpace(sectionId);
                
                // Call the original method
                const result = await CameraManager._originalAddCamera.call(this, sectionId);
                
                // Ensure layout is adjusted after camera is added
                setTimeout(() => {
                    if (typeof LayoutManager !== 'undefined') {
                        LayoutManager.adjustLayout();
                    }
                }, 500);
                
                return result;
            } finally {
                // Hide loading indicator
                if (loadingIndicator) {
                    setTimeout(() => {
                        loadingIndicator.style.display = 'none';
                    }, 300);
                }
            }
        };
        
        // Enhance the renderCamera method
        CameraManager.renderCamera = function(sectionContent, sectionId, cameraNumber, cameraData) {
            // Call the original method
            const result = CameraManager._originalRenderCamera.call(
                this, sectionContent, sectionId, cameraNumber, cameraData
            );
            
            // Add our enhancements after original rendering
            CameraStabilizer.enhanceCameraRendering(sectionContent, sectionId, cameraNumber, cameraData);
            
            return result;
        };
        
        console.log('CameraManager enhanced successfully');
    },
    
    enhanceCameraRendering(sectionContent, sectionId, cameraNumber, cameraData) {
        // Find the camera wrapper that was just added
        const cameraWrapper = document.getElementById(`camera-wrapper-${sectionId}-${cameraNumber}`);
        if (!cameraWrapper) return;
        
        // Find the camera preview container
        const cameraPreview = cameraWrapper.querySelector('.camera-preview');
        if (!cameraPreview) return;
        
        // Add loading indicator to preview if not already present
        if (!cameraPreview.querySelector('.camera-loading-indicator')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'camera-loading-indicator';
            loadingIndicator.innerHTML = `
                <div class="spinner"></div>
                <div>Loading preview...</div>
            `;
            cameraPreview.appendChild(loadingIndicator);
        }
        
        // Find and enhance the preview image
        const previewImage = cameraPreview.querySelector('img');
        if (previewImage) {
            // Hide image until it's loaded
            previewImage.style.opacity = '0';
            
            // When image loads, show it and hide loading indicator
            previewImage.onload = () => {
                // Remove loading indicator
                const loadingIndicator = cameraPreview.querySelector('.camera-loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.remove();
                }
                
                // Mark image as loaded
                previewImage.classList.add('loaded');
                
                // Mark wrapper as rendered
                cameraWrapper.classList.add('rendered');
                
                // Adjust layout
                setTimeout(() => {
                    if (typeof LayoutManager !== 'undefined') {
                        LayoutManager.adjustLayout();
                    }
                }, 100);
            };
            
            // Handle image load errors
            previewImage.onerror = () => {
                // Update loading indicator
                const loadingIndicator = cameraPreview.querySelector('.camera-loading-indicator');
                if (loadingIndicator) {
                    loadingIndicator.innerHTML = `
                        <div style="color: #e74c3c;">Error loading preview</div>
                    `;
                }
                
                // Mark wrapper as rendered anyway
                cameraWrapper.classList.add('rendered');
                
                // Adjust layout
                setTimeout(() => {
                    if (typeof LayoutManager !== 'undefined') {
                        LayoutManager.adjustLayout();
                    }
                }, 100);
            };
        } else {
            // No image found, mark as rendered immediately
            cameraWrapper.classList.add('rendered');
        }
    },
    
    preAllocateSpace(sectionId) {
        console.log(`Pre-allocating space for camera in section ${sectionId}...`);
        const sectionContent = document.querySelector(`#section-content-${sectionId}`);
        if (!sectionContent) return;
        
        // Add a temporary spacer to reserve space for the incoming camera
        const spacerId = `camera-spacer-${Date.now()}`;
        const spacer = document.createElement('div');
        spacer.id = spacerId;
        spacer.className = 'camera-temp-spacer';
        spacer.style.height = '400px'; // Approximate height of a camera component
        spacer.style.width = '100%';
        spacer.style.background = 'transparent';
        spacer.style.marginBottom = '20px';
        
        sectionContent.appendChild(spacer);
        
        // Remove the spacer after the camera is likely added
        setTimeout(() => {
            const spacerElement = document.getElementById(spacerId);
            if (spacerElement && spacerElement.parentNode) {
                spacerElement.parentNode.removeChild(spacerElement);
            }
        }, 2000);
    },
    
    setupImageObserver() {
        console.log('Setting up image observer...');
        // Use MutationObserver to watch for image additions in camera previews
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === 'IMG') {
                            this.enhanceImage(node);
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            // Look for images inside added elements
                            const images = node.querySelectorAll('img');
                            images.forEach(img => this.enhanceImage(img));
                        }
                    });
                }
            });
        });
        
        // Start observing the sections container
        const sectionsContainer = document.getElementById('sections-container');
        if (sectionsContainer) {
            observer.observe(sectionsContainer, {
                childList: true,
                subtree: true
            });
            console.log('Image observer set up successfully');
        } else {
            console.warn('Sections container not found, image observer not initialized');
        }
    },
    
    enhanceImage(img) {
        // Only process images in camera previews that haven't been enhanced yet
        if (!img.closest('.camera-preview') || img.hasAttribute('data-enhanced')) {
            return;
        }
        
        console.log('Enhancing camera preview image...');
        
        // Mark as enhanced to prevent double processing
        img.setAttribute('data-enhanced', 'true');
        
        // Set initial style for stability
        img.style.opacity = '0';
        img.style.maxHeight = '300px';
        img.style.maxWidth = '100%';
        
        // Add loaded class when image loads
        const originalOnload = img.onload;
        img.onload = function() {
            // Call original onload if it exists
            if (originalOnload) originalOnload.call(this);
            
            // Add loaded class
            img.classList.add('loaded');
            
            // Find and remove loading indicator
            const preview = img.closest('.camera-preview');
            if (preview) {
                const loadingIndicator = preview.querySelector('.camera-loading-indicator');
                if (loadingIndicator) loadingIndicator.remove();
                
                // Mark parent wrapper as rendered
                const wrapper = img.closest('.camera-wrapper');
                if (wrapper) wrapper.classList.add('rendered');
            }
            
            // Adjust layout
            setTimeout(() => {
                if (typeof LayoutManager !== 'undefined') {
                    LayoutManager.adjustLayout();
                }
            }, 100);
        };
    },
    
    setupLayoutFixes() {
        console.log('Setting up layout fixes...');
        
        // Monitor for any changes to camera elements
        const observer = new MutationObserver((mutations) => {
            let needsLayoutUpdate = false;
            
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    // Check if any added nodes are camera related
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && 
                                (node.classList.contains('camera-wrapper') || 
                                 node.querySelector('.camera-wrapper'))) {
                                needsLayoutUpdate = true;
                            }
                        }
                    });
                    
                    // Check if any removed nodes are camera related
                    mutation.removedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList && 
                                (node.classList.contains('camera-wrapper') || 
                                 node.classList.contains('camera-temp-spacer'))) {
                                needsLayoutUpdate = true;
                            }
                        }
                    });
                }
            });
            
            // Update layout if needed
            if (needsLayoutUpdate) {
                setTimeout(() => {
                    if (typeof LayoutManager !== 'undefined') {
                        LayoutManager.adjustLayout();
                    }
                }, 300);
            }
        });
        
        // Start observing the sections container
        const sectionsContainer = document.getElementById('sections-container');
        if (sectionsContainer) {
            observer.observe(sectionsContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['style', 'class']
            });
            console.log('Layout mutation observer set up successfully');
        }
    }
};

// Initialize camera stabilizer after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing CameraStabilizer...');
    CameraStabilizer.init();
});